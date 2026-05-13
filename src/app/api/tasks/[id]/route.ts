import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/* ── UPDATE ────────────────────────────────────────────────────── */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ FIX: Next.js 15 made params a Promise — must await before destructuring.
    // Previously `context.params.id` threw: "params should be awaited first".
    const { id } = await context.params;
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.status !== undefined) patch.status = body.status;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.completed_at !== undefined) patch.completed_at = body.completed_at;
    if (body.completedAt !== undefined) patch.completed_at = body.completedAt;

    const { error } = await supabaseAdmin
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("[PATCH /api/tasks/[id]]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[PATCH /api/tasks/[id]] crash:", err?.message ?? err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/* ── DELETE ────────────────────────────────────────────────────── */
export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ✅ FIX: await params in Next.js 15
    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("[DELETE /api/tasks/[id]]", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[DELETE /api/tasks/[id]] crash:", err?.message ?? err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
