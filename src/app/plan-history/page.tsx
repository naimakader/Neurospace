"use client";
import { useMemo, useState } from "react";
import { useTasks, ArchivedTask } from "@/hooks/useTasks";
import { motion } from "framer-motion";

type Filter = "today" | "week" | "month" | "all";

// ─── DATE HELPERS ────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  // Monday-based week — no mutation
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ✅ FIX: each filter compares against its own strict boundary
// so "today" never shows yesterday, "week" never shows last week, etc.
function matchesFilter(task: ArchivedTask, filter: Filter, now: Date): boolean {
  if (!task.archivedAt) return false;
  const taskDate = new Date(task.archivedAt);

  switch (filter) {
    case "today":
      // same calendar day
      return startOfDay(taskDate).getTime() === startOfDay(now).getTime();

    case "week":
      // from Monday of this week up to now
      return taskDate >= startOfWeek(now) && taskDate <= now;

    case "month":
      // from 1st of this month up to now
      return taskDate >= startOfMonth(now) && taskDate <= now;

    case "all":
      return true;
  }
}

function formatDateLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (startOfDay(d).getTime() === today.getTime()) return "Today";
    if (startOfDay(d).getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────────

export default function PlanHistoryPage() {
  const { archivedTasks, clearArchive, deleteArchivedTask } = useTasks();
  const [filter, setFilter] = useState<Filter>("today");

  const now = useMemo(() => new Date(), []);

  // ✅ Each filter shows ONLY its own data — no overlap
  const filtered = useMemo(
    () => archivedTasks.filter((t) => matchesFilter(t, filter, now)),
    [archivedTasks, filter, now],
  );

  // Group by calendar day (descending)
  const grouped = useMemo(() => {
    const map: Record<string, ArchivedTask[]> = {};
    filtered.forEach((t) => {
      const key = startOfDay(new Date(t.archivedAt)).toISOString();
      (map[key] ??= []).push(t);
    });
    return map;
  }, [filtered]);

  const sortedDays = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Stats for current filter
  const stats = useMemo(
    () => ({
      total: filtered.length,
      high: filtered.filter((t) => t.priority === "high").length,
      medium: filtered.filter((t) => t.priority === "medium").length,
      low: filtered.filter((t) => t.priority === "low").length,
    }),
    [filtered],
  );

  const insight = useMemo(() => {
    if (stats.total === 0) {
      if (filter === "today")
        return "No tasks completed today yet — keep going!";
      if (filter === "week") return "No tasks completed this week yet.";
      if (filter === "month") return "No tasks completed this month yet.";
      return "No archived tasks yet.";
    }
    if (stats.total < 3) return "Light activity — push a bit more tomorrow.";
    if (stats.total < 10) return "Good progress — stay consistent!";
    return "🔥 High productivity — excellent work!";
  }, [stats, filter]);

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="min-h-screen bg-[#0f111a] text-white p-6 sm:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">📅 Plan History</h1>
        {archivedTasks.length > 0 && (
          <button
            onClick={clearArchive}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === value
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            }`}
          >
            {label}
            {/* Show count badge on each tab */}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                filter === value ? "bg-white/20" : "bg-white/10"
              }`}
            >
              {archivedTasks.filter((t) => matchesFilter(t, value, now)).length}
            </span>
          </button>
        ))}
      </div>

      {/* Stats — only for current filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 p-4 rounded-xl">
          <div className="text-sm text-gray-400">Completed</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="bg-red-500/10 p-4 rounded-xl">
          <div className="text-sm text-red-300">High Priority</div>
          <div className="text-2xl font-semibold text-red-400">
            {stats.high}
          </div>
        </div>
        <div className="bg-yellow-500/10 p-4 rounded-xl">
          <div className="text-sm text-yellow-300">Medium</div>
          <div className="text-2xl font-semibold text-yellow-400">
            {stats.medium}
          </div>
        </div>
        <div className="bg-green-500/10 p-4 rounded-xl">
          <div className="text-sm text-green-300">Low Priority</div>
          <div className="text-2xl font-semibold text-green-400">
            {stats.low}
          </div>
        </div>
      </div>

      {/* AI insight */}
      <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl text-sm text-white/80">
        💡 {insight}
      </div>

      {/* Empty state */}
      {sortedDays.length === 0 && (
        <div className="text-gray-400 bg-white/5 p-10 rounded-2xl text-center">
          <div className="text-4xl mb-3">📭</div>
          <p>No completed tasks for this period.</p>
          <p className="text-sm mt-1 text-white/30">
            Tasks completed more than 24 hours ago appear here.
          </p>
        </div>
      )}

      {/* Task list grouped by day */}
      <div className="space-y-8">
        {sortedDays.map((dayKey) => (
          <motion.div
            key={dayKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Day header */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-purple-400">
                {formatDateLabel(dayKey)}
              </div>
              <div className="flex-1 h-px bg-white/10" />
              <div className="text-xs text-white/30">
                {grouped[dayKey].length} task
                {grouped[dayKey].length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Tasks for this day */}
            <div className="space-y-2">
              {grouped[dayKey].map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/5 hover:bg-white/8 p-4 rounded-xl flex items-center justify-between gap-4 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-green-400 text-lg flex-shrink-0">
                      ✔
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-white truncate">
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(task.archivedAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        task.priority === "high"
                          ? "bg-red-500/20 text-red-300"
                          : task.priority === "medium"
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-green-500/20 text-green-300"
                      }`}
                    >
                      {task.priority}
                    </span>

                    <button
                      onClick={() => deleteArchivedTask(task.id)}
                      className="text-white/20 hover:text-red-400 transition text-sm"
                      title="Remove from history"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
