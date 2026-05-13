"use client";
import { useMemo, useRef } from "react";
import { useTasks } from "@/hooks/useTasks";
import * as htmlToImage from "html-to-image";

function normDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  // ✅ BUG FIX: original did `now.setDate(diff)` which mutated `now`
  // and then immediately used `now` again — causing wrong date logic.
  // We create a new Date object instead.
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function WeeklyReportCard() {
  const { tasks } = useTasks();
  const cardRef = useRef<HTMLDivElement>(null);

  const report = useMemo(() => {
    const startOfWeek = getStartOfWeek();
    const safe = tasks.filter(Boolean);

    const weeklyCompleted = safe.filter((t) => {
      if (!t.completed_at) return false;
      return normDate(new Date(t.completed_at)) >= startOfWeek;
    });

    const weeklyCreated = safe.filter((t) => {
      if (!t.created_at) return false;
      return normDate(new Date(t.created_at)) >= startOfWeek;
    });

    const done = weeklyCompleted.length;
    const weeklyTotal = weeklyCreated.length;
    const rate = weeklyTotal === 0 ? 0 : Math.round((done / weeklyTotal) * 100);
    const score = Math.min(100, Math.round(rate * 0.6 + done * 4));

    return {
      total: safe.length,
      done,
      weeklyTotal,
      completionRate: rate,
      productivityScore: score,
    };
  }, [tasks]);

  async function exportImage() {
    if (!cardRef.current) return;
    const url = await htmlToImage.toPng(cardRef.current, { cacheBust: true });
    const link = document.createElement("a");
    link.download = "weekly-report.png";
    link.href = url;
    link.click();
  }

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="bg-[#0f111a] rounded-2xl p-6 border border-white/5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Weekly Report</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: "Tasks Completed", value: report.done },
            { label: "Weekly Tasks", value: report.weeklyTotal },
            { label: "Completion Rate", value: `${report.completionRate}%` },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 p-4 rounded-xl">
              <p className="text-white/40">{s.label}</p>
              <p className="text-white text-xl font-bold">{s.value}</p>
            </div>
          ))}

          <div className="bg-white/5 p-4 rounded-xl col-span-2">
            <p className="text-white/40 mb-2">Productivity Score</p>
            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all duration-500"
                style={{ width: `${report.productivityScore}%` }}
              />
            </div>
            <p className="text-white mt-2 font-medium">
              {report.productivityScore}/100
            </p>
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
