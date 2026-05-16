"use client";
import { useMemo, useRef } from "react";
import { useTasks } from "@/hooks/useTasks";
import * as htmlToImage from "html-to-image";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export default function WeeklyReportCard() {
  // ✅ FIX: pull archivedTasks — previously only `tasks` was read,
  // so archived completions were completely invisible to this component.
  const { tasks, archivedTasks } = useTasks();
  const cardRef = useRef<HTMLDivElement>(null);

  const report = useMemo(() => {
    const startOfWeek = getStartOfWeek();
    const now = new Date();
    const startOfWeekStr = localDateStr(startOfWeek);

    const safeTasks = tasks.filter(Boolean);
    const safeArchived = (archivedTasks ?? []).filter(Boolean);

    // ✅ Completed this week = done column tasks + archived tasks
    // Both checked against completed_at using local date strings (no UTC shift)
    const completedThisWeek = [
      // From done column on the board
      ...safeTasks.filter((t) => {
        if (t.status !== "done" || !t.completed_at) return false;
        return localDateStr(new Date(t.completed_at)) >= startOfWeekStr;
      }),
      // From archive (tasks completed earlier this week, archived after midnight)
      ...safeArchived.filter((t) => {
        if (!t.completed_at) return false;
        return localDateStr(new Date(t.completed_at)) >= startOfWeekStr;
      }),
    ];

    // Created this week — for completion rate denominator
    const createdThisWeek = safeTasks.filter((t) => {
      if (!t.created_at) return false;
      return localDateStr(new Date(t.created_at)) >= startOfWeekStr;
    }).length;

    const done = completedThisWeek.length;
    const rate =
      createdThisWeek === 0 ? 0 : Math.round((done / createdThisWeek) * 100);
    const score = Math.min(100, Math.round(rate * 0.6 + done * 4));

    // Breakdown by priority
    const high = completedThisWeek.filter((t) => t.priority === "high").length;
    const medium = completedThisWeek.filter(
      (t) => t.priority === "medium",
    ).length;
    const low = completedThisWeek.filter((t) => t.priority === "low").length;

    return {
      done,
      createdThisWeek,
      completionRate: rate,
      productivityScore: score,
      high,
      medium,
      low,
    };
  }, [tasks, archivedTasks]);

  async function exportImage() {
    if (!cardRef.current) return;
    const url = await htmlToImage.toPng(cardRef.current, { cacheBust: true });
    const link = document.createElement("a");
    link.download = `weekly-report-${localDateStr(new Date())}.png`;
    link.href = url;
    link.click();
  }

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="bg-[#0f111a] rounded-2xl p-6 border border-white/5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-white mb-1">Weekly Report</h2>
        <p className="text-white/30 text-xs mb-5">
          Board (Done column) + Plan History combined
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Main stats */}
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-white/40 text-xs mb-1">Completed This Week</p>
            <p className="text-white text-2xl font-bold">{report.done}</p>
            <p className="text-white/20 text-[10px] mt-1">board + history</p>
          </div>

          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-white/40 text-xs mb-1">Created This Week</p>
            <p className="text-white text-2xl font-bold">
              {report.createdThisWeek}
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-white/40 text-xs mb-1">Completion Rate</p>
            <p className="text-white text-2xl font-bold">
              {report.completionRate}%
            </p>
          </div>

          {/* Priority breakdown */}
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-white/40 text-xs mb-2">By Priority</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-red-300">High</span>
                <span className="text-white font-medium">{report.high}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-300">Medium</span>
                <span className="text-white font-medium">{report.medium}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-300">Low</span>
                <span className="text-white font-medium">{report.low}</span>
              </div>
            </div>
          </div>

          {/* Productivity score */}
          <div className="bg-white/5 p-4 rounded-xl col-span-2">
            <p className="text-white/40 text-xs mb-2">Productivity Score</p>
            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${report.productivityScore}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-white font-medium">
                {report.productivityScore}/100
              </p>
              <p className="text-white/30 text-xs">
                {report.productivityScore >= 80
                  ? "🔥 Excellent"
                  : report.productivityScore >= 50
                    ? "✨ Good"
                    : "💪 Keep going"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={exportImage}
        className="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-xl font-medium text-white transition"
      >
        Export as Image
      </button>
    </div>
  );
}
