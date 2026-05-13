"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";

// ─── HELPERS ────────────────────────────────────────────────────────

function getHour(iso: string | null): number | null {
  if (!iso) return null;
  try {
    return new Date(iso).getHours();
  } catch {
    return null;
  }
}

function peakHourLabel(tasks: { completed_at: string | null }[]): string {
  const counts: Record<number, number> = {};
  tasks.forEach((t) => {
    const h = getHour(t.completed_at);
    if (h !== null) counts[h] = (counts[h] ?? 0) + 1;
  });
  const entries = Object.entries(counts);
  if (!entries.length) return "9 AM – 11 AM";
  const peak = Number(
    entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0][0],
  );
  const fmt = (h: number) =>
    h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
  return `${fmt(peak)} – ${fmt(peak + 2)}`;
}

function weeklyDelta(tasks: { completed_at: string | null }[]): number {
  const now = Date.now();
  const week = 7 * 86_400_000;
  const thisW = tasks.filter(
    (t) => t.completed_at && now - new Date(t.completed_at).getTime() <= week,
  ).length;
  const lastW = tasks.filter((t) => {
    if (!t.completed_at) return false;
    const age = now - new Date(t.completed_at).getTime();
    return age > week && age <= 2 * week;
  }).length;
  if (lastW === 0) return thisW > 0 ? 100 : 0;
  return Math.round(((thisW - lastW) / lastW) * 100);
}

function procrastinationTarget(
  tasks: { title: string; status: string }[],
): string {
  const pending = tasks.filter((t) => t.status !== "done");
  const keywords = ["research", "read", "review", "learn", "study", "plan"];
  const match = pending.find((t) =>
    keywords.some((k) => t.title.toLowerCase().includes(k)),
  );
  return match
    ? `"${match.title.split(" ").slice(0, 4).join(" ")}…"`
    : pending.length
      ? `${pending.length} pending task${pending.length > 1 ? "s" : ""}`
      : "None";
}

function suggestion(tasks: { completed_at: string | null }[]): string {
  const hours = tasks
    .map((t) => getHour(t.completed_at))
    .filter((h): h is number => h !== null);
  if (!hours.length)
    return "Schedule deep work in the morning for best results.";
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  if (avg < 10) return "You're a morning achiever — protect that early window.";
  if (avg < 14)
    return "Your peak is mid-morning. Block it for your hardest tasks.";
  if (avg < 18) return "You thrive in the afternoon — plan deep work then.";
  return "You tend to work late — try shifting one task to the morning.";
}

// ─── COMPONENT ──────────────────────────────────────────────────────

export default function AIInsightsPanel() {
  const { tasks } = useTasks();

  const insights = useMemo(() => {
    const completed = tasks.filter((t) => t.completed_at);
    const delta = weeklyDelta(tasks);
    const deltaText =
      delta > 0
        ? `↑ ${delta}% vs last week`
        : delta < 0
          ? `↓ ${Math.abs(delta)}% vs last week`
          : "Same pace as last week";

    return [
      {
        icon: "🔥",
        title: "Peak Focus Time",
        text: completed.length
          ? `You complete most tasks around ${peakHourLabel(completed)}.`
          : "Complete tasks to discover your peak focus window.",
      },
      {
        icon: "⚠️",
        title: "Procrastination Alert",
        text: tasks.filter((t) => t.status !== "done").length
          ? `Most delayed: ${procrastinationTarget(tasks)}`
          : "No delayed tasks — great consistency!",
      },
      {
        icon: "⚡",
        title: "Efficiency Score",
        text: `${deltaText}. ${completed.length} task${completed.length !== 1 ? "s" : ""} completed total.`,
      },
      {
        icon: "💡",
        title: "AI Suggestion",
        text: suggestion(completed),
      },
    ];
  }, [tasks]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
      <h2 className="text-white text-lg font-semibold">
        AI Productivity Insights
      </h2>
      <div className="grid gap-4">
        {insights.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 border border-white/5 rounded-xl p-4 flex gap-3"
          >
            <div className="text-xl">{item.icon}</div>
            <div>
              <div className="text-white font-medium text-sm">{item.title}</div>
              <div className="text-white/60 text-sm mt-0.5">{item.text}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
