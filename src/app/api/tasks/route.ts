import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/* ── GET all tasks ─────────────────────────────────────────────── */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

/* ── CREATE task ───────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body?.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const insertData: any = {
      title: body.title.trim(),
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      user_id: userId,
      created_at: body.created_at ?? new Date().toISOString(),
      completed_at: body.completed_at ?? null,
    };

    // ✅ Allow caller to pass a specific id (used when re-inserting
    // a deleted task during undo so it keeps its original UUID).
    if (body.id) insertData.id = body.id;

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If the task already exists (undo called twice), just return ok
      if (error.code === "23505") {
        return NextResponse.json({ data: insertData });
      }
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
