"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTasks } from "@/hooks/useTasks";
import KanbanBoard from "./KanbanBoard";
import ProductivityDashboard from "./ProductivityDashboard";
import AIInsightsPanel from "./AIInsightsPanel";
import WeeklyReportCard from "./WeeklyReportCard";
import ActivityTimeline from "./ActivityTimeline";
import {
  KanbanSkeleton,
  StatsSkeleton,
  InsightsSkeleton,
} from "./LoadingSkeleton";

export default function SmartPlanner() {
  const { add, undo, redo, setSelectedIndex } = useTasks();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "Z"))
      ) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Escape") setSelectedIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, setSelectedIndex]);

  function handleAdd() {
    if (!input.trim()) return;
    add(input.trim());
    setInput("");
  }

  return (
    <div className="bg-[#0f111a] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl border border-white/5">
      <h1 className="text-xl sm:text-2xl font-semibold text-white">
        Smart Planner
      </h1>

      <div className="flex gap-3 flex-col sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task…"
          className="flex-1 px-4 py-3 bg-[#1a1d29] border border-white/10 rounded-xl text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
        />
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAdd}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-white transition"
        >
          Add
        </motion.button>
      </div>

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <KanbanSkeleton />
          <StatsSkeleton />
          <InsightsSkeleton />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <KanbanBoard />
          <ProductivityDashboard />
          <AIInsightsPanel />
          <WeeklyReportCard />
          <ActivityTimeline />
        </motion.div>
      )}
    </div>
  );
}
