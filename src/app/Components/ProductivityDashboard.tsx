"use client";
import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useStreakGuard } from "@/hooks/useStreakGuard";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ─── HELPERS ─────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── COMPONENT ───────────────────────────────────────────────────────

export default function ProductivityDashboard() {
  const { tasks, archivedTasks } = useTasks();

  const safe = tasks.filter(Boolean);
  const safeArchived = (archivedTasks ?? []).filter(Boolean);
  const todayStr = localDateStr(new Date());

  // Active board counts
  const total = safe.length;
  const done = safe.filter((t) => t.status === "done").length;
  const progress = safe.filter((t) => t.status === "inprogress").length;
  const todo = safe.filter((t) => t.status === "todo").length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  // Today count — both board and archive
  const completedToday = useMemo(() => {
    const fromActive = safe.filter(
      (t) =>
        t.completed_at && localDateStr(new Date(t.completed_at)) === todayStr,
    ).length;
    const fromArchived = safeArchived.filter(
      (t) =>
        t.completed_at && localDateStr(new Date(t.completed_at)) === todayStr,
    ).length;
    return fromActive + fromArchived;
  }, [safe, safeArchived, todayStr]);

  // ✅ STABLE STREAK:
  // Counts both active (done column) and archived tasks.
  // Today with no completions does NOT break streak — day is still ongoing.
  // Only a PAST calendar day with zero completions breaks it.
  const streak = useMemo(() => {
    const all = [
      ...safe.filter((t) => t.completed_at),
      ...safeArchived.filter((t) => t.completed_at),
    ];

    // Build set of unique local date strings where a task was completed
    const dateSet = new Set(
      all.map((t) => localDateStr(new Date(t.completed_at!))),
    );

    let count = 0;
    let cursor = new Date();
    let isFirst = true;

    while (true) {
      const key = localDateStr(cursor);
      const hasTask = dateSet.has(key);
      const isToday = key === todayStr;

      if (!hasTask) {
        // Skip today if no completions yet — day is still ongoing
        if (isToday && isFirst) {
          cursor = new Date(cursor.getTime() - 86_400_000);
          isFirst = false;
          continue;
        }
        break; // Past day with no completions — streak ends here
      }

      count++;
      cursor = new Date(cursor.getTime() - 86_400_000);
      isFirst = false;
    }

    return count;
  }, [safe, safeArchived, todayStr]);

  // ✅ Streak guard — warns user when streak is at risk
  useStreakGuard(safe, safeArchived, streak);

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
    {
      label: "🔥 Streak",
      value: `${streak}d`,
      color:
        streak >= 7
          ? "text-orange-400"
          : streak >= 3
            ? "text-yellow-400"
            : "text-white/60",
    },
  ];

  return (
    <div className="bg-[#0f111a] rounded-2xl p-6 border border-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Productivity Analytics
        </h2>
        {streak >= 3 && (
          <div className="text-xs text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full border border-orange-400/20">
            🔥 {streak} day streak
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#1a1d29] p-4 rounded-xl">
            <div className="text-white/40 text-xs mb-1">{s.label}</div>
            <div className={`text-xl font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Streak warning bar — shows when at risk */}
      {streak > 0 && completedToday === 0 && (
        <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-orange-300 text-sm font-medium">
              Streak at risk — complete a task today to keep your {streak}-day
              streak!
            </p>
            <p className="text-orange-300/50 text-xs mt-0.5">
              Your streak resets at midnight if no tasks are completed today.
            </p>
          </div>
        </div>
      )}

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
