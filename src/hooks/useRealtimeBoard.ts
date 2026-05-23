"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Task } from "@/hooks/useTasks";
import { useToast } from "@/app/Components/Toast";

// ─── CLIENT ──────────────────────────────────────────────────────────

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── TYPES ───────────────────────────────────────────────────────────

export type PresenceUser = {
  userId: string;
  name: string;
  color: string;
  joinedAt: number;
};

type BroadcastPayload =
  | { event: "task_added"; task: Task }
  | { event: "task_updated"; task: Task }
  | { event: "task_deleted"; taskId: string }
  | { event: "tasks_reordered"; tasks: Task[] };

// ─── USER COLORS ─────────────────────────────────────────────────────

const COLORS = [
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ─── HOOK ────────────────────────────────────────────────────────────

export function useRealtimeBoard({
  boardId, // unique board identifier (use userId for personal boards)
  currentUserId,
  currentUserName,
  tasks,
  onTaskAdded,
  onTaskUpdated,
  onTaskDeleted,
  onTasksReordered,
  onPresenceChange,
}: {
  boardId: string;
  currentUserId: string;
  currentUserName: string;
  tasks: Task[];
  onTaskAdded: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  onTasksReordered: (tasks: Task[]) => void;
  onPresenceChange: (users: PresenceUser[]) => void;
}) {
  const toast = useToast();
  const supabase = useRef(getSupabaseClient());
  const channelRef = useRef<ReturnType<typeof supabase.current.channel> | null>(
    null,
  );
  const isMeRef = useRef(false);

  // ── SETUP CHANNEL ──────────────────────────────────────────────────
  useEffect(() => {
    if (!boardId || !currentUserId) return;

    const channel = supabase.current.channel(`board:${boardId}`, {
      config: { presence: { key: currentUserId } },
    });

    channelRef.current = channel;

    // ── PRESENCE ───────────────────────────────────────────────────
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const users = Object.values(state)
        .flat()
        .filter((u) => u.userId !== currentUserId);
      onPresenceChange(users);
    });

    // ── BROADCAST — receive changes from OTHER users ───────────────
    channel.on(
      "broadcast",
      { event: "board_update" },
      ({ payload }: { payload: BroadcastPayload & { senderId: string } }) => {
        // Ignore own broadcasts
        if (payload.senderId === currentUserId) return;

        switch (payload.event) {
          case "task_added":
            onTaskAdded(payload.task);
            toast.info(`✨ New task added by another user`);
            break;
          case "task_updated":
            onTaskUpdated(payload.task);
            break;
          case "task_deleted":
            onTaskDeleted(payload.taskId);
            toast.info(`🗑 A task was deleted by another user`);
            break;
          case "tasks_reordered":
            onTasksReordered(payload.tasks);
            break;
        }
      },
    );

    // ── SUBSCRIBE & TRACK PRESENCE ─────────────────────────────────
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: currentUserId,
          name: currentUserName,
          color: colorForUser(currentUserId),
          joinedAt: Date.now(),
        } as PresenceUser);
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, currentUserId, currentUserName]);

  // ── BROADCAST helpers — call these after every local mutation ─────

  const broadcastTaskAdded = useCallback(
    (task: Task) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "board_update",
        payload: { event: "task_added", task, senderId: currentUserId },
      });
    },
    [currentUserId],
  );

  const broadcastTaskUpdated = useCallback(
    (task: Task) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "board_update",
        payload: { event: "task_updated", task, senderId: currentUserId },
      });
    },
    [currentUserId],
  );

  const broadcastTaskDeleted = useCallback(
    (taskId: string) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "board_update",
        payload: { event: "task_deleted", taskId, senderId: currentUserId },
      });
    },
    [currentUserId],
  );

  const broadcastTasksReordered = useCallback(
    (tasks: Task[]) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "board_update",
        payload: { event: "tasks_reordered", tasks, senderId: currentUserId },
      });
    },
    [currentUserId],
  );

  return {
    broadcastTaskAdded,
    broadcastTaskUpdated,
    broadcastTaskDeleted,
    broadcastTasksReordered,
  };
}
