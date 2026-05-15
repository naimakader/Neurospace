"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import {
  TasksContext,
  Task,
  ArchivedTask,
  Priority,
  Status,
} from "@/hooks/useTasks";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useToast }    from "@/app/Components/Toast";

// ─── HELPERS ────────────────────────────────────────────────────────

function detectPriority(title: string): Priority {
  const t = title.toLowerCase();
  if (t.includes("urgent") || t.includes("fix") || t.includes("bug")) return "high";
  if (t.includes("read")   || t.includes("learn") || t.includes("research")) return "low";
  return "medium";
}

function isReadyToArchive(task: Task): boolean {
  if (task.status !== "done" || !task.completed_at) return false;
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  return new Date(task.completed_at) < todayMidnight;
}

// ✅ KEY FIX: snapshot now saves BOTH active tasks AND archived tasks.
// Previously only active tasks were saved, so after a refresh, archived
// tasks (yesterday's completions) vanished from memory — breaking the streak.
type FullSnapshot = {
  tasks:    Task[];
  archived: ArchivedTask[];
};

async function persistSnapshot(tasks: Task[], archived: ArchivedTask[]) {
  try {
    const payload: FullSnapshot = { tasks, archived };
    const res = await fetch("/api/history", {
      method:  "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ snapshot: payload }),
    });
    if (!res.ok) console.error("[persistSnapshot] failed:", res.status);
  } catch (e) { console.error("[persistSnapshot]", e); }
}

async function syncToDb(restored: Task[], previous: Task[]) {
  const prevIds     = new Set(previous.map((t) => t.id));
  const restoredIds = new Set(restored.map((t) => t.id));

  for (const task of restored.filter((t) => !prevIds.has(t.id))) {
    try {
      await fetch("/api/tasks", {
        method:  "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          id: task.id, title: task.title, status: task.status,
          priority: task.priority, created_at: task.created_at,
          completed_at: task.completed_at,
        }),
      });
    } catch (e) { console.error("[syncToDb] reinsert failed:", e); }
  }

  for (const task of previous.filter((t) => !restoredIds.has(t.id))) {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE", credentials: "include",
      });
    } catch (e) { console.error("[syncToDb] delete failed:", e); }
  }
}

// ─── PROVIDER ───────────────────────────────────────────────────────

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragIndex,     setDragIndex]     = useState<number | null>(null);

  const ur    = useUndoRedo<Task[]>();
  const toast = useToast();

  // ─── LOAD ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const hr = await fetch("/api/history", { credentials: "include" });
        const hj = await hr.json();

        // ✅ Handle both old format (array) and new format (object with tasks+archived)
        if (hj?.snapshot) {
          const snap = hj.snapshot;

          if (snap.tasks && Array.isArray(snap.tasks)) {
            // New format — has both tasks and archived
            const active:   Task[]         = [];
            const archived: ArchivedTask[] = [...(snap.archived ?? [])];

            snap.tasks.forEach((task: Task) => {
              if (isReadyToArchive(task)) {
                archived.push({ ...task, archivedAt: task.completed_at! });
              } else {
                active.push(task);
              }
            });

            setTasks(active);
            setArchivedTasks(archived);
            return;
          }

          if (Array.isArray(snap) && snap.length > 0) {
            // Old format — plain array of tasks
            const active:   Task[]         = [];
            const archived: ArchivedTask[] = [];
            snap.forEach((task: Task) => {
              if (isReadyToArchive(task)) {
                archived.push({ ...task, archivedAt: task.completed_at! });
              } else {
                active.push(task);
              }
            });
            setTasks(active);
            setArchivedTasks(archived);
            return;
          }
        }

        // Fallback to tasks table
        const tr = await fetch("/api/tasks", { credentials: "include" });
        const tj = await tr.json();

        if (Array.isArray(tj?.data)) {
          const active:   Task[]         = [];
          const archived: ArchivedTask[] = [];
          tj.data.forEach((task: Task) => {
            if (isReadyToArchive(task)) {
              archived.push({ ...task, archivedAt: task.completed_at! });
            } else {
              active.push(task);
            }
          });
          setTasks(active);
          setArchivedTasks(archived);
        }
      } catch (e) {
        console.error("[TasksProvider] load error:", e);
        toast.error("Failed to load tasks. Please refresh.");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── KEYBOARD ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((p) => p === null ? 0 : Math.min(p + 1, tasks.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((p) => p === null ? 0 : Math.max(p - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tasks]);

  // ─── ADD ──────────────────────────────────────────────────────────
  const add = useCallback(async (title: string) => {
    if (!title.trim()) return;
    const prev = structuredClone(tasks);
    try {
      const res  = await fetch("/api/tasks", {
        method:  "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:    title.trim(),
          status:   "todo",
          priority: detectPriority(title),
        }),
      });
      const { data } = await res.json();
      if (!data) { toast.error("Failed to add task."); return; }
      const next = [...tasks, data];
      setTasks(next);
      ur.register(prev);
      await persistSnapshot(next, archivedTasks);
      toast.success("Task added.");
    } catch {
      toast.error("Failed to add task. Check your connection.");
    }
  }, [tasks, archivedTasks, ur, toast]);

  // ─── REMOVE ───────────────────────────────────────────────────────
  const remove = useCallback(async (index: number) => {
    const task = tasks[index];
    if (!task) return;
    const prev = structuredClone(tasks);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error();
      const next = tasks.filter((_, i) => i !== index);
      setTasks(next);
      ur.register(prev);
      await persistSnapshot(next, archivedTasks);
      toast.info("Task deleted. Press Ctrl+Z to undo.");
    } catch {
      toast.error("Failed to delete task.");
    }
  }, [tasks, archivedTasks, ur, toast]);

  // ─── UPDATE ───────────────────────────────────────────────────────
  const update = useCallback(async (id: string, title: string) => {
    if (!title.trim()) return;
    const prev     = structuredClone(tasks);
    const priority = detectPriority(title);
    const next     = tasks.map((t) =>
      t.id === id ? { ...t, title: title.trim(), priority } : t,
    );
    setTasks(next);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method:  "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title: title.trim(), priority }),
      });
      if (!res.ok) throw new Error();
      ur.register(prev);
      await persistSnapshot(next, archivedTasks);
      toast.success("Task updated.");
    } catch {
      setTasks(prev);
      toast.error("Failed to update task.");
    }
  }, [tasks, archivedTasks, ur, toast]);

  const updatePriority = useCallback((id: string, priority: Priority) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, priority } : t));
  }, []);

  const autoOrganize = useCallback(() => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    setTasks((prev) => [...prev].sort((a, b) => order[a.priority] - order[b.priority]));
    toast.info("Tasks organised by priority.");
  }, [toast]);

  // ─── DRAG & DROP ──────────────────────────────────────────────────
  const startDrag = useCallback((index: number) => setDragIndex(index), []);

  const drop = useCallback(async (targetIndex: number, newStatus: Status) => {
    if (dragIndex === null) return;
    const prev    = structuredClone(tasks);
    const arr     = [...tasks];
    const dragged = arr[dragIndex];
    if (!dragged) return;

    arr.splice(dragIndex, 1);
    const moved: Task = {
      ...dragged,
      status:       newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    };
    arr.splice(Math.min(targetIndex, arr.length), 0, moved);
    setTasks(arr);
    setDragIndex(null);

    try {
      const res = await fetch(`/api/tasks/${dragged.id}`, {
        method:  "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus, completed_at: moved.completed_at }),
      });
      if (!res.ok) throw new Error();
      ur.register(prev);
      await persistSnapshot(arr, archivedTasks);
      if (newStatus === "done") toast.success("Task completed! 🔥");
    } catch {
      setTasks(prev);
      toast.error("Failed to move task.");
    }
  }, [dragIndex, tasks, archivedTasks, ur, toast]);

  // ─── ARCHIVE ──────────────────────────────────────────────────────
  const restoreTask = useCallback((task: ArchivedTask) => {
    const { archivedAt, ...base } = task;
    const newArchived = archivedTasks.filter((t) => t.id !== task.id);
    const newTasks    = [...tasks, { ...base, status: "todo" as Status }];
    setArchivedTasks(newArchived);
    setTasks(newTasks);
    persistSnapshot(newTasks, newArchived);
    toast.success("Task restored to board.");
  }, [tasks, archivedTasks, toast]);

  const deleteArchivedTask = useCallback((id: string) => {
    const newArchived = archivedTasks.filter((t) => t.id !== id);
    setArchivedTasks(newArchived);
    persistSnapshot(tasks, newArchived);
  }, [tasks, archivedTasks]);

  const clearArchive = useCallback(() => {
    setArchivedTasks([]);
    persistSnapshot(tasks, []);
    toast.info("Archive cleared.");
  }, [tasks, toast]);

  // ─── UNDO / REDO ──────────────────────────────────────────────────
  const undo = useCallback(() => {
    const current = tasks;
    ur.undo(tasks, async (restored) => {
      setTasks(restored);
      await persistSnapshot(restored, archivedTasks);
      await syncToDb(restored, current);
      toast.info("Undo successful.");
    });
  }, [tasks, archivedTasks, ur, toast]);

  const redo = useCallback(() => {
    const current = tasks;
    ur.redo(tasks, async (restored) => {
      setTasks(restored);
      await persistSnapshot(restored, archivedTasks);
      await syncToDb(restored, current);
      toast.info("Redo successful.");
    });
  }, [tasks, archivedTasks, ur, toast]);

  return (
    <TasksContext.Provider value={{
      tasks, archivedTasks, selectedIndex,
      selectedTask: selectedIndex !== null ? (tasks[selectedIndex] ?? null) : null,
      setSelectedIndex, add, remove, update, updatePriority, autoOrganize,
      restoreTask, deleteArchivedTask, clearArchive, startDrag, drop, undo, redo,
    }}>
      {children}
    </TasksContext.Provider>
  );
}