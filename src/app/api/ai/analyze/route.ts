import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─── HELPERS ────────────────────────────────────────────────────────

function dayName(d: Date) {
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][d.getDay()];
}

function hourLabel(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// ─── ROUTE ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all tasks for this user
    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    if (!tasks?.length) {
      return NextResponse.json({
        analytics: null,
        insight:
          "Complete some tasks first and I'll analyse your productivity patterns!",
      });
    }

    const completed = tasks.filter((t) => t.completed_at);
    const total = tasks.length;
    const doneCount = completed.length;
    const rate = total === 0 ? 0 : Math.round((doneCount / total) * 100);

    // ── Completion velocity (tasks per day over last 14 days) ───────
    const now = new Date();
    const day14 = new Date(now.getTime() - 14 * 86_400_000);
    const velocity: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(day14.getTime() + i * 86_400_000);
      velocity[d.toISOString().split("T")[0]] = 0;
    }
    completed.forEach((t) => {
      const d = new Date(t.completed_at).toISOString().split("T")[0];
      if (velocity[d] !== undefined) velocity[d]++;
    });

    // ── Peak hour ───────────────────────────────────────────────────
    const hourCounts: Record<number, number> = {};
    completed.forEach((t) => {
      const h = new Date(t.completed_at).getHours();
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    // ── Peak day ────────────────────────────────────────────────────
    const dayCounts: Record<string, number> = {};
    completed.forEach((t) => {
      const day = dayName(new Date(t.completed_at));
      dayCounts[day] = (dayCounts[day] ?? 0) + 1;
    });
    const peakDay = Object.entries(dayCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    // ── Average completion time (created → completed) ───────────────
    const durations = completed
      .filter((t) => t.created_at)
      .map(
        (t) =>
          new Date(t.completed_at).getTime() - new Date(t.created_at).getTime(),
      )
      .filter((ms) => ms > 0);
    const avgHours = durations.length
      ? Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length / 3_600_000,
        )
      : null;

    // ── Priority distribution ───────────────────────────────────────
    const priorities = { high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      priorities[t.priority as keyof typeof priorities]++;
    });

    // ── High priority completion rate ───────────────────────────────
    const highTotal = tasks.filter((t) => t.priority === "high").length;
    const highDone = completed.filter((t) => t.priority === "high").length;
    const highRate =
      highTotal === 0 ? null : Math.round((highDone / highTotal) * 100);

    // ── Stale tasks (todo for more than 3 days) ─────────────────────
    const staleTasks = tasks.filter((t) => {
      if (t.status !== "todo" || !t.created_at) return false;
      const age =
        (now.getTime() - new Date(t.created_at).getTime()) / 86_400_000;
      return age > 3;
    });

    const analytics = {
      total,
      completed: doneCount,
      rate,
      velocity: Object.entries(velocity).map(([date, count]) => ({
        date,
        count,
      })),
      peakHour: peakHour ? hourLabel(Number(peakHour)) : null,
      peakDay,
      avgHours,
      priorities,
      highRate,
      staleTasks: staleTasks.length,
      staleList: staleTasks.slice(0, 3).map((t) => t.title),
    };

    // ── GPT insight generation ──────────────────────────────────────
    let insight = "";

    if (!openai) {
      // Smart local fallback
      const lines: string[] = [];
      if (rate >= 70) lines.push(`Strong week — ${rate}% completion rate.`);
      else if (rate >= 40)
        lines.push(
          `Moderate progress at ${rate}% completion. Push harder on your high-priority items.`,
        );
      else
        lines.push(
          `Only ${rate}% completed. Consider reducing your task load and focusing on fewer things.`,
        );
      if (peakDay) lines.push(`Your most productive day is ${peakDay}.`);
      if (peakHour)
        lines.push(
          `You do your best work around ${hourLabel(Number(peakHour))}.`,
        );
      if (staleTasks.length > 0)
        lines.push(
          `You have ${staleTasks.length} stale task${staleTasks.length > 1 ? "s" : ""} that have been sitting for over 3 days — tackle or delete them.`,
        );
      if (highRate !== null && highRate < 50)
        lines.push(
          `Your high-priority task completion is low at ${highRate}%. Prioritise these first each morning.`,
        );
      insight = lines.join(" ");
    } else {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          max_tokens: 400,
          messages: [
            {
              role: "system",
              content: `You are a productivity coach analysing a user's real task data.
Be direct, specific, and actionable. Use their actual numbers.
Format: 3-4 sentences max. No bullet points. No generic advice.
Identify ONE specific pattern and give ONE specific recommendation.`,
            },
            {
              role: "user",
              content: `My task data:
- Total tasks: ${total}, completed: ${doneCount} (${rate}%)
- Peak productive day: ${peakDay ?? "unknown"}
- Peak productive hour: ${peakHour ? hourLabel(Number(peakHour)) : "unknown"}
- Average time from create to complete: ${avgHours ? `${avgHours} hours` : "unknown"}
- High priority completion rate: ${highRate ?? "unknown"}%
- Stale tasks (>3 days old, not started): ${staleTasks.length} — ${
                staleTasks
                  .slice(0, 3)
                  .map((t) => t.title)
                  .join(", ") || "none"
              }
- Priority breakdown: ${priorities.high} high, ${priorities.medium} medium, ${priorities.low} low

Give me a specific, honest analysis of my productivity patterns and one concrete thing I should change.`,
            },
          ],
        });
        insight = completion.choices[0]?.message?.content ?? "";
      } catch (e: any) {
        console.warn("[analyze] GPT error, using fallback:", e?.message);
        insight = `You've completed ${doneCount} of ${total} tasks (${rate}%). ${peakDay ? `Your strongest day is ${peakDay}.` : ""} ${staleTasks.length > 0 ? `${staleTasks.length} tasks have been sitting untouched for over 3 days — address them or remove them.` : ""}`;
      }
    }

    return NextResponse.json({ analytics, insight });
  } catch (err: any) {
    console.error("[analyze] crash:", err?.message ?? err);
    return NextResponse.json({ error: "Failed to analyse" }, { status: 500 });
  }
}
