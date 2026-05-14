"use client";
import { motion } from "framer-motion";
// ─── BASE SKELETON BLOCK ─────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-white/5 relative overflow-hidden ${className ?? ""}`}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ─── KANBAN SKELETON ─────────────────────────────────────────────────
export function KanbanSkeleton() {
  const COLS = ["Todo", "In Progress", "Done"];
  const CARDS = [3, 2, 1]; // cards per column

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {COLS.map((col, ci) => (
        <div key={col} className="p-4 rounded-2xl bg-[#12141d]">
          {/* Column header */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>

          {/* Task cards */}
          <div className="space-y-2">
            {Array.from({ length: CARDS[ci] }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[#1a1d29] border border-transparent space-y-2"
              >
                <Skeleton className="h-3.5 w-full" />
                {i % 2 === 0 && <Skeleton className="h-3 w-3/4" />}
                <div className="flex justify-between pt-1">
                  <Skeleton className="h-3 w-12 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── STATS SKELETON ──────────────────────────────────────────────────
export function StatsSkeleton() {
  return (
    <div className="bg-[#0f111a] rounded-2xl p-6 border border-white/5 space-y-6">
      <Skeleton className="h-5 w-44" />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#1a1d29] p-4 rounded-xl space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div className="h-56 flex items-center justify-center">
        <Skeleton className="w-40 h-40 rounded-full" />
      </div>
    </div>
  );
}

// ─── INSIGHTS SKELETON ───────────────────────────────────────────────
export function InsightsSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-4 flex gap-3">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
