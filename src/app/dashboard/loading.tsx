export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-white/30 text-sm">Loading your workspace…</p>
      </div>
    </div>
  );
}