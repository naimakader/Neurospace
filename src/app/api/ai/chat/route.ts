import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

    // Build rich context from user's real data
    const {
      tasks = [],
      archived = [],
      streak = 0,
      completionRate = 0,
    } = context ?? {};

    const todoTasks = tasks.filter((t: any) => t.status === "todo");
    const inProgressTasks = tasks.filter((t: any) => t.status === "inprogress");
    const doneTasks = tasks.filter((t: any) => t.status === "done");

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
- Direct, warm, and motivating — like a senior colleague who wants you to succeed
- Give concrete, actionable advice based on their ACTUAL tasks (use task names)
- Keep responses concise — 2-4 sentences max unless they ask for a detailed plan
- Use their streak and stats to personalise encouragement
- If they ask what to work on, recommend SPECIFIC tasks by name
- Never make up tasks that aren't in their list
- Use occasional emojis to keep the tone friendly but not excessive

TODAY'S DATE: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;

    if (!openai) {
      // Fallback response without OpenAI
      return NextResponse.json({
        content: `Hey! I'm Neuro, your AI productivity coach. I can see you have ${tasks.length} active task${tasks.length !== 1 ? "s" : ""}${streak > 0 ? ` and a ${streak}-day streak` : ""}. Add your OpenAI API key to enable full AI responses!`,
      });
    }

    // ✅ STREAMING — response types out word by word like ChatGPT
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

    // Return a streaming response
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
  } catch (err: any) {
    console.error("[ai/chat]", err?.message ?? err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
