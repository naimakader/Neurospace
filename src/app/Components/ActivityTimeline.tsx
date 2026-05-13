"use client";
import { useTasks } from "@/hooks/useTasks";

function normDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupByDate(
  tasks: { id: string; title: string; completed_at: string | null }[],
) {
  const groups: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    if (!t.completed_at) continue;
    try {
      const key = normDate(new Date(t.completed_at))
        .toISOString()
        .split("T")[0];
      (groups[key] ??= []).push(t);
    } catch {
      continue;
    }
  }
  return groups;
}

function formatLabel(dateKey: string): string {
  try {
    const today = normDate(new Date()).toISOString().split("T")[0];
    const yesterday = normDate(new Date(Date.now() - 86_400_000))
      .toISOString()
      .split("T")[0];
    if (dateKey === today) return "Today";
    if (dateKey === yesterday) return "Yesterday";
    return new Date(dateKey).toLocaleDateString();
  } catch {
    return dateKey;
  }
}

export default function ActivityTimeline() {
  const { tasks } = useTasks();

  const completed = tasks
    .filter((t) => t.completed_at)
    .sort(
      (a, b) =>
        new Date(b.completed_at!).getTime() -
        new Date(a.completed_at!).getTime(),
    );

  const grouped = groupByDate(completed);
  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  if (!dates.length) {
    return (
      <div className="bg-[#0f111a] rounded-2xl p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-3">
          Activity Timeline
        </h2>
        <p className="text-sm text-white/40">No completed tasks yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f111a] rounded-2xl p-6 border border-white/5 space-y-6">
      <h2 className="text-lg font-semibold text-white">Activity Timeline</h2>
      {dates.map((date) => (
        <div key={date} className="space-y-2">
          <div className="text-xs text-white/40 font-medium">
            {formatLabel(date)}
          </div>
          {grouped[date].map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 text-sm text-white/80 group"
            >
              <span className="text-green-400 transition group-hover:scale-110">
                ✔
              </span>
              <span className="truncate">Completed "{task.title}"</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
