"use client";
import { createContext, useContext } from "react";

export type Status = "todo" | "inprogress" | "done";
export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  created_at: string;
  completed_at: string | null;
};

// ArchivedTask uses completed_at as the archive date
// so we don't need a separate archivedAt field
export type ArchivedTask = Task & {
  archivedAt: string; // equals completed_at at time of archiving
};

export type TasksContextType = {
  tasks: Task[];
  archivedTasks: ArchivedTask[];

  selectedIndex: number | null;
  selectedTask: Task | null;

  setSelectedIndex: (i: number | null) => void;

  add: (title: string) => Promise<void>;
  remove: (index: number) => Promise<void>;
  update: (id: string, title: string) => Promise<void>;
  updatePriority: (id: string, priority: Priority) => void;
  autoOrganize: () => void;

  restoreTask: (task: ArchivedTask) => void;
  deleteArchivedTask: (id: string) => void;
  clearArchive: () => void;

  startDrag: (index: number) => void;
  drop: (targetIndex: number, newStatus: Status) => Promise<void>;

  undo: () => void;
  redo: () => void;
};

export const TasksContext = createContext<TasksContextType | null>(null);

export function useTasks(): TasksContextType {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside <TasksProvider>");
  return ctx;
}
