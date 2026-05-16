import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/* ── SAVE ──────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // ✅ ROOT FIX: Accept the new { tasks, archived } object shape.
    // Old code only accepted Array — but TasksProvider now sends an object.
    // That mismatch caused every save to return 400, so nothing ever persisted.
    // Now we accept both shapes for backward compatibility.
    const snapshot = body?.snapshot;

    const isValidObject =
      snapshot !== null &&
      typeof snapshot === "object" &&
      !Array.isArray(snapshot) &&
      Array.isArray(snapshot.tasks);

    const isValidArray = Array.isArray(snapshot);

    if (!isValidObject && !isValidArray) {
      console.error(
        "[POST /api/history] invalid snapshot shape:",
        typeof snapshot,
      );
      return NextResponse.json(
        { error: "snapshot must be { tasks: [], archived: [] } or an array" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("task_history")
      .upsert({ user_id: userId, snapshot }, { onConflict: "user_id" });

    if (error) {
      console.error(
        "[POST /api/history] Supabase error:",
        JSON.stringify(error),
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[POST /api/history] crash:", err?.message ?? err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ── LOAD ──────────────────────────────────────────────────────── */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("task_history")
      .select("snapshot")
      .eq("user_id", userId)
      .single();

    // PGRST116 = no row yet — fine on first visit
    if (error && error.code !== "PGRST116") {
      console.error(
        "[GET /api/history] Supabase error:",
        JSON.stringify(error),
      );
    }

    return NextResponse.json({ snapshot: data?.snapshot ?? null });
  } catch (err: any) {
    console.error("[GET /api/history] crash:", err?.message ?? err);
    return NextResponse.json({ snapshot: null });
  }
}
