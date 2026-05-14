import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─── HELPERS ────────────────────────────────────────────────────────

function extractJSON(text: string): Record<string, unknown> | null {
  try {
    // Strip markdown fences if present
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

function analyzeHistory(history: any[]) {
  if (!Array.isArray(history) || !history.length) {
    return { average: 30, deep: 60, light: 10 };
  }
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
  let cursor = 9 * 60; // 09:00
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
          title: `Start small: ${task}`,
          minutes: Math.max(5, Math.round(base * 0.5)),
        },
        {
          title: `Build momentum`,
          minutes: Math.max(5, Math.round(base * 0.6)),
        },
      ]
    : mood?.energy === "high"
      ? [
          {
            title: `Research & scope: ${task}`,
            minutes: Math.max(5, Math.round(base * 0.5)),
          },
          {
            title: `Deep implementation`,
            minutes: Math.max(5, Math.round(base * 1.2)),
          },
          {
            title: `Quality review`,
            minutes: Math.max(5, Math.round(base * 0.8)),
          },
          {
            title: `Refine & polish`,
            minutes: Math.max(5, Math.round(base * 0.6)),
          },
          {
            title: `Final check & document`,
            minutes: Math.max(5, Math.round(base * 0.4)),
          },
        ]
      : [
          {
            title: `Understand: ${task}`,
            minutes: Math.max(5, Math.round(base * 0.6)),
          },
          { title: `Deep work`, minutes: Math.max(5, base) },
          {
            title: `Review & improve`,
            minutes: Math.max(5, Math.round(base * 0.7)),
          },
          { title: `Finalize`, minutes: Math.max(5, Math.round(base * 0.4)) },
        ];

  return {
    priority: low ? "low" : "medium",
    energy: low ? "light" : "deep",
    steps,
    schedule: buildSchedule(steps),
    confidence: 0.6,
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

    if (!openai) {
      console.warn("[ai/plan] No OPENAI_API_KEY — using fallback plan");
      return NextResponse.json(fallbackPlan(task, learning, mood));
    }

    try {
      const chat = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content: `You are an expert productivity coach and AI planner.

User's working pattern:
- Average session : ${learning.average} min
- Deep work capacity: ${learning.deep} min  
- Light task length : ${learning.light} min

User's current mood:
- Energy    : ${mood?.energy ?? "medium"}
- Focus style: ${mood?.focusStyle ?? "balanced"}

Rules:
- LOW energy → 2-3 short steps, max ${learning.deep} min each, gentle pacing
- MEDIUM energy → 3-4 balanced steps
- HIGH energy → 4-6 steps, push for depth and quality
- Step titles must be specific and actionable (not generic like "Work on task")
- Times must be realistic, not aspirational
- Return ONLY valid JSON, no markdown, no explanation

Required JSON format:
{
  "priority": "high" | "medium" | "low",
  "energy": "deep" | "light",
  "steps": [{ "title": "string", "minutes": number }],
  "confidence": number
}`,
          },
          {
            role: "user",
            content: `Plan this task: "${task}"

Other tasks on my board:
${summary || "None"}

Return ONLY the JSON object.`,
          },
        ],
      });

      const raw = chat.choices[0]?.message?.content ?? "";
      const parsed = extractJSON(raw);

      if (
        !parsed ||
        !Array.isArray(parsed.steps) ||
        !(parsed.steps as any[]).length
      ) {
        console.warn(
          "[ai/plan] GPT returned unparseable response, using fallback",
        );
        return NextResponse.json(fallbackPlan(task, learning, mood));
      }

      const steps = (parsed.steps as any[]).map((s) => ({
        title: String(s.title || task),
        minutes: Math.min(
          180,
          Math.max(5, Math.round(s.minutes || learning.average)),
        ),
      }));

      return NextResponse.json({
        priority: parsed.priority ?? "medium",
        energy: parsed.energy ?? "deep",
        steps,
        schedule: buildSchedule(steps),
        confidence:
          typeof parsed.confidence === "number"
            ? Math.max(0, Math.min(1, parsed.confidence as number))
            : 0.85,
        adaptive: true,
      });
    } catch (aiErr: any) {
      console.error("[ai/plan] OpenAI error:", aiErr?.message);
      return NextResponse.json(fallbackPlan(task, learning, mood));
    }
  } catch (err: any) {
    console.error("[ai/plan] crash:", err?.message ?? err);
    return NextResponse.json(
      fallbackPlan("task", { average: 25, deep: 45, light: 10 }, null),
    );
  }
}
