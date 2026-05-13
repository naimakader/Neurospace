import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─── HELPERS ────────────────────────────────────────────────────────

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

function analyzeHistory(history: any[]) {
  if (!Array.isArray(history) || !history.length)
    return { average: 30, deep: 60, light: 10 };
  const total = history.reduce(
    (s, h) => s + (typeof h.minutes === "number" ? h.minutes : 0),
    0,
  );
  const avg = Math.max(5, Math.round(total / history.length));
  return {
    average: avg,
    deep: Math.min(120, Math.max(45, Math.round(avg * 1.5))),
    light: Math.min(20, Math.max(5, Math.round(avg * 0.3))),
  };
}

function adaptToMood(mood: any, l: ReturnType<typeof analyzeHistory>) {
  const mul = mood?.energy === "low" ? 0.6 : mood?.energy === "high" ? 1.3 : 1;
  return {
    average: Math.max(5, Math.round(l.average * mul)),
    deep: Math.max(5, Math.round(l.deep * mul)),
    light: Math.max(5, Math.round(l.light * mul)),
  };
}

type Learning = ReturnType<typeof adaptToMood>;

function buildSchedule(steps: { title: string; minutes: number }[]) {
  let cursor = 9 * 60;
  return steps.map((s) => {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    cursor += s.minutes;
    return { time, title: s.title };
  });
}

function fallbackPlan(task: string, learning: Learning, mood: any) {
  const base = learning.average;
  const low = mood?.energy === "low";
  const steps = low
    ? [
        {
          title: `Start: ${task}`,
          minutes: Math.max(5, Math.round(base * 0.5)),
        },
        {
          title: `Continue: ${task}`,
          minutes: Math.max(5, Math.round(base * 0.6)),
        },
      ]
    : [
        {
          title: `Understand: ${task}`,
          minutes: Math.max(5, Math.round(base * 0.6)),
        },
        { title: `Deep work: ${task}`, minutes: Math.max(5, base) },
        {
          title: `Refactor & polish`,
          minutes: Math.max(5, Math.round(base * 0.8)),
        },
        {
          title: `Finalize & review`,
          minutes: Math.max(5, Math.round(base * 0.5)),
        },
      ];
  return {
    priority: low ? "low" : "medium",
    energy: low ? "light" : "deep",
    steps,
    schedule: buildSchedule(steps),
    confidence: 0.5,
    fallback: true,
    adaptive: true,
  };
}

// ─── ROUTE ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const task = body?.task as string;
    const tasks = (body?.tasks as any[]) ?? [];
    const history = (body?.history as any[]) ?? [];
    const mood = body?.mood ?? null;

    if (!task || typeof task !== "string") {
      return NextResponse.json({ error: "Invalid task" }, { status: 400 });
    }

    const learning = adaptToMood(mood, analyzeHistory(history));
    const summary = tasks
      .slice(0, 10)
      .map((t: any) => `- ${t.title} (${t.status})`)
      .join("\n");

    if (!openai) return NextResponse.json(fallbackPlan(task, learning, mood));

    try {
      const chat = await openai.chat.completions.create({
        // ✅ BUG FIX: "gpt-4.1-mini" does not exist — correct name is "gpt-4o-mini"
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content: `You are an intelligent productivity planner.
User pattern: avg ${learning.average} min, deep ${learning.deep} min, light ${learning.light} min.
Mood: energy=${mood?.energy ?? "medium"}, focus=${mood?.focusStyle ?? "balanced"}.
Rules: adapt steps to energy. Low energy → 2-3 short steps. High → 4-5 deeper steps.
Return ONLY valid JSON (no markdown fences):
{ "priority":"high"|"medium"|"low", "energy":"deep"|"light", "steps":[{"title":string,"minutes":number}], "confidence":number }`,
          },
          {
            role: "user",
            content: `Task: "${task}"\nExisting tasks:\n${summary || "None"}\nReturn ONLY JSON.`,
          },
        ],
      });

      const raw = chat.choices[0]?.message?.content ?? "";
      const parsed = extractJSON(raw);
      const steps =
        Array.isArray(parsed?.steps) && (parsed!.steps as any[]).length
          ? (parsed!.steps as any[]).map((s) => ({
              title: String(s.title || task),
              minutes: Math.min(
                180,
                Math.max(5, Math.round(s.minutes || learning.average)),
              ),
            }))
          : [{ title: task, minutes: learning.average }];

      return NextResponse.json({
        priority: parsed?.priority || "medium",
        energy: parsed?.energy || "deep",
        steps,
        schedule: buildSchedule(steps),
        confidence:
          typeof parsed?.confidence === "number"
            ? Math.max(0, Math.min(1, parsed.confidence as number))
            : 0.85,
        adaptive: true,
      });
    } catch (e: any) {
      console.error("[ai-plan] OpenAI error:", e?.message);
      return NextResponse.json(fallbackPlan(task, learning, mood));
    }
  } catch (e) {
    console.error("[ai-plan] crash:", e);
    return NextResponse.json({
      priority: "medium",
      energy: "deep",
      steps: [{ title: "Work on task", minutes: 25 }],
      schedule: [{ time: "09:00", title: "Work on task" }],
      confidence: 0.4,
      fallback: true,
      adaptive: true,
    });
  }
}
