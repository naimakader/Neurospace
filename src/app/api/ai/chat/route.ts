import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─── SMART FALLBACK ──────────────────────────────────────────────────
// Generates a helpful local response when OpenAI is unavailable
function localResponse(message: string, context: any): string {
  const {
    tasks = [],
    archived = [],
    streak = 0,
    completionRate = 0,
  } = context ?? {};
  const todo = tasks.filter((t: any) => t.status === "todo");
  const inProgress = tasks.filter((t: any) => t.status === "inprogress");
  const msg = message.toLowerCase();

  if (
    msg.includes("what should i") ||
    msg.includes("work on") ||
    msg.includes("first")
  ) {
    if (inProgress.length > 0) {
      return `You already have "${inProgress[0].title}" in progress — finish that first before starting something new. Focus beats multitasking every time. 💪`;
    }
    const high = todo.find((t: any) => t.priority === "high");
    if (high)
      return `Start with "${high.title}" — it's your highest priority task right now. 🔥`;
    if (todo.length > 0)
      return `Tackle "${todo[0].title}" first. Once it's done you'll have momentum for the rest.`;
    return "Your board is clear! Add some tasks and let's get moving. 🚀";
  }

  if (
    msg.includes("30 minute") ||
    msg.includes("quick") ||
    msg.includes("short")
  ) {
    const quick = todo.filter((t: any) => t.priority !== "high").slice(0, 2);
    if (quick.length)
      return `In 30 minutes you could knock out: ${quick.map((t: any) => `"${t.title}"`).join(" and ")}. Small wins build momentum. ⚡`;
    return "No quick tasks on your board right now — try breaking a bigger task into smaller steps.";
  }

  if (
    msg.includes("week") ||
    msg.includes("progress") ||
    msg.includes("produc")
  ) {
    return `This week: ${completionRate}% completion rate${streak > 0 ? `, ${streak}-day streak 🔥` : ""}. You have ${todo.length} task${todo.length !== 1 ? "s" : ""} remaining. ${completionRate >= 70 ? "Strong week — keep it up!" : "Push a bit harder this week to hit your goals."}`;
  }

  if (
    msg.includes("plan") ||
    msg.includes("morning") ||
    msg.includes("today")
  ) {
    const items = [...inProgress, ...todo].slice(0, 3);
    if (!items.length)
      return "Your board is empty — add tasks first and I can help you plan your day!";
    return `Here's your plan: Start with ${items.map((t: any, i: number) => `${i + 1}) "${t.title}"`).join(", ")}. Take a 5 min break between each one. You've got this! 💡`;
  }

  if (
    msg.includes("behind") ||
    msg.includes("falling") ||
    msg.includes("struggling")
  ) {
    return `With ${todo.length} tasks left and ${completionRate}% completion, you're ${completionRate >= 50 ? "actually doing fine" : "a bit behind"}. Pick ONE task right now and just start it — starting is the hardest part.`;
  }

  // Generic response
  if (tasks.length === 0)
    return "Add some tasks to your board and I can give you personalised advice! 📋";
  return `You have ${tasks.length} task${tasks.length !== 1 ? "s" : ""} on your board${streak > 0 ? ` and a ${streak}-day streak` : ""}. Ask me what to work on, how your week is going, or to plan your morning! 🎯`;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { messages, context } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    const {
      tasks = [],
      archived = [],
      streak = 0,
      completionRate = 0,
    } = context ?? {};
    const todoTasks = tasks.filter((t: any) => t.status === "todo");
    const inProgressTasks = tasks.filter((t: any) => t.status === "inprogress");
    const doneTasks = tasks.filter((t: any) => t.status === "done");
    const lastMessage = messages[messages.length - 1]?.content ?? "";

    // ── No API key → local fallback ───────────────────────────────────
    if (!openai) {
      return NextResponse.json({
        content: localResponse(lastMessage, context),
      });
    }

    const systemPrompt = `You are Neuro, an intelligent AI productivity coach built into NeuroSpace.

You have full context about the user's current work:

ACTIVE TASKS:
${todoTasks.length ? todoTasks.map((t: any) => `- [TODO] ${t.title} (${t.priority} priority)`).join("\n") : "No todo tasks"}
${inProgressTasks.length ? inProgressTasks.map((t: any) => `- [IN PROGRESS] ${t.title} (${t.priority} priority)`).join("\n") : ""}
${doneTasks.length ? doneTasks.map((t: any) => `- [DONE] ${t.title}`).join("\n") : ""}

PRODUCTIVITY STATS:
- Current streak: ${streak} day${streak !== 1 ? "s" : ""}
- Completion rate: ${completionRate}%
- Tasks completed this session: ${doneTasks.length}
- Recently archived: ${
      archived
        .slice(0, 5)
        .map((t: any) => t.title)
        .join(", ") || "none"
    }

YOUR PERSONALITY:
- Direct, warm, and motivating
- Give concrete advice based on their ACTUAL tasks (use task names)
- Keep responses under 3 sentences unless they ask for a detailed plan
- Never make up tasks that aren't in their list
- Use occasional emojis

TODAY: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 300,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (aiErr: any) {
      // ✅ FIX: 429 quota / 401 auth errors → use local fallback instead of 500
      const code = aiErr?.status ?? aiErr?.response?.status;
      console.warn(
        "[ai/chat] OpenAI error, using local fallback. Code:",
        code,
        aiErr?.message,
      );

      return NextResponse.json({
        content: localResponse(lastMessage, context),
      });
    }
  } catch (err: any) {
    console.error("[ai/chat] crash:", err?.message ?? err);
    return NextResponse.json({
      content:
        "I'm having trouble connecting right now. Try again in a moment!",
    });
  }
}
