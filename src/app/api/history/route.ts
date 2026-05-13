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
    if (!Array.isArray(body?.snapshot)) {
      return NextResponse.json(
        { error: "snapshot must be an array" },
        { status: 400 },
      );
    }

    // ✅ FIX: removed updated_at — that column does not exist in task_history.
    // Table only has: user_id (text, primary key) + snapshot (jsonb).
    const { error } = await supabaseAdmin
      .from("task_history")
      .upsert(
        { user_id: userId, snapshot: body.snapshot },
        { onConflict: "user_id" },
      );

    if (error) {
      console.error("[POST /api/history]", JSON.stringify(error));
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

    // PGRST116 = no row yet — normal on first visit
    if (error && error.code !== "PGRST116") {
      console.error("[GET /api/history]", JSON.stringify(error));
    }

    return NextResponse.json({ snapshot: data?.snapshot ?? null });
  } catch (err: any) {
    console.error("[GET /api/history] crash:", err?.message ?? err);
    return NextResponse.json({ snapshot: null });
  }
}
