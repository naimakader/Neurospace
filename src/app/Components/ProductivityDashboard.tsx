"use client";
import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ─── DATE HELPERS ────────────────────────────────────────────────────

// ✅ FIX: previously used .toISOString() which converts to UTC.
// If you're in UTC+2, local midnight becomes 22:00 the previous UTC day —
// so "today" was being calculated as "yesterday".
// Fix: build the date string from LOCAL year/month/day directly.
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayLocalStr(): string {
  return localDateStr(new Date());
}

// ─── COMPONENT ───────────────────────────────────────────────────────

export default function ProductivityDashboard() {
  const { tasks, archivedTasks } = useTasks();

  const safe = tasks.filter(Boolean);
  const safeArchived = (archivedTasks ?? []).filter(Boolean);

  // Active board counts
  const total = safe.length;
  const done = safe.filter((t) => t.status === "done").length;
  const progress = safe.filter((t) => t.status === "inprogress").length;
  const todo = safe.filter((t) => t.status === "todo").length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  // ✅ FIX: "Today" counts tasks from BOTH active board AND archived tasks
  // that were completed today. Uses local date string — no UTC shift.
  const todayStr = todayLocalStr();

  const completedToday = useMemo(() => {
    const fromActive = safe.filter((t) => {
      if (!t.completed_at) return false;
      // completed_at is ISO UTC — convert to local date string for comparison
      return localDateStr(new Date(t.completed_at)) === todayStr;
    });
    const fromArchived = safeArchived.filter((t) => {
      if (!t.completed_at) return false;
      return localDateStr(new Date(t.completed_at)) === todayStr;
    });
    return fromActive.length + fromArchived.length;
  }, [safe, safeArchived, todayStr]);

  // ✅ FIX: streak uses BOTH active tasks and archived tasks so it doesn't
  // reset after tasks get moved to plan history after 24h.
  const streak = useMemo(() => {
    const allCompleted = [
      ...safe.filter((t) => t.completed_at),
      ...safeArchived.filter((t) => t.completed_at),
    ];

    // Build a set of unique local date strings where something was completed
    const dateSet = new Set(
      allCompleted.map((t) => localDateStr(new Date(t.completed_at!))),
    );

    let count = 0;
    let cursor = new Date();

    // Walk backwards from today until we hit a day with no completions
    while (true) {
      const key = localDateStr(cursor);
      if (!dateSet.has(key)) break;
      count++;
      cursor = new Date(cursor.getTime() - 86_400_000); // go back 1 day
    }

    return count;
  }, [safe, safeArchived]);

  // Chart — only active board tasks
  const chartData = [
    { name: "Todo", value: todo },
    { name: "In Progress", value: progress },
    { name: "Done", value: done },
  ];
  const COLORS = ["#3b82f6", "#f59e0b", "#22c55e"];

  const stats = [
    { label: "Total Tasks", value: total, color: "text-white" },
    { label: "Done (board)", value: done, color: "text-green-400" },
    { label: "Completion Rate", value: `${rate}%`, color: "text-purple-400" },
    { label: "Today", value: completedToday, color: "text-blue-400" },
    { label: "🔥 Streak", value: `${streak}d`, color: "text-orange-400" },
  ];

  return (
    <div className="bg-[#0f111a] rounded-2xl p-6 border border-white/5 space-y-6">
      <h2 className="text-lg font-semibold text-white">
        Productivity Analytics
      </h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#1a1d29] p-4 rounded-xl">
            <div className="text-white/40 text-xs mb-1">{s.label}</div>
            <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pie chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              outerRadius={80}
              label={({ name, value }) =>
                value > 0 ? `${name} (${value})` : ""
              }
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#12141d",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-white/50">
        {chartData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: COLORS[i] }}
            />
            <span>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
