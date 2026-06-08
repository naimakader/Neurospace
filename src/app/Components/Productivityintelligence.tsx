"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Sparkles, Loader2, RefreshCw, TrendingUp } from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────

type Analytics = {
  total: number;
  completed: number;
  rate: number;
  velocity: { date: string; count: number }[];
  peakHour: string | null;
  peakDay: string | null;
  avgHours: number | null;
  priorities: { high: number; medium: number; low: number };
  highRate: number | null;
  staleTasks: number;
  staleList: string[];
};

type Result = { analytics: Analytics | null; insight: string };

// ─── HELPERS ─────────────────────────────────────────────────────────

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function scoreColor(rate: number) {
  if (rate >= 70) return "text-green-400";
  if (rate >= 40) return "text-yellow-400";
  return "text-red-400";
}

// ─── COMPONENT ───────────────────────────────────────────────────────

export default function ProductivityIntelligence() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const a = result?.analytics;

  return (
    <div className="bg-[#0f111a] rounded-2xl border border-white/5 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">
              Productivity Intelligence
            </h2>
            <p className="text-white/30 text-xs">
              AI analysis of your real task patterns
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={analyse}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium disabled:opacity-50 transition"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : result ? (
            <RefreshCw className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {loading ? "Analysing..." : result ? "Re-analyse" : "Analyse my week"}
        </motion.button>
      </div>

      {/* ── Empty state ── */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <p className="text-white/50 text-sm max-w-xs">
            Click "Analyse my week" to get a GPT-powered breakdown of your real
            productivity patterns — peak hours, velocity, bottlenecks.
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="p-6 space-y-4">
          {[80, 60, 90, 50, 70].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded-full bg-white/5 animate-pulse"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}

      {/* ── Results ── */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 space-y-6"
          >
            {/* ── No data ── */}
            {!a && (
              <p className="text-white/50 text-sm text-center py-8">
                {result.insight}
              </p>
            )}

            {a && (
              <>
                {/* ── Key stats ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Completion Rate",
                      value: `${a.rate}%`,
                      color: scoreColor(a.rate),
                    },
                    {
                      label: "Tasks Done",
                      value: `${a.completed}/${a.total}`,
                      color: "text-white",
                    },
                    {
                      label: "Peak Day",
                      value: a.peakDay ?? "—",
                      color: "text-purple-400",
                    },
                    {
                      label: "Peak Hour",
                      value: a.peakHour ?? "—",
                      color: "text-blue-400",
                    },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/5 rounded-xl p-3">
                      <div className="text-white/40 text-[10px] mb-1">
                        {s.label}
                      </div>
                      <div className={`text-lg font-bold ${s.color}`}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Velocity chart ── */}
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                    14-Day Completion Velocity
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={a.velocity} barSize={14}>
                        <XAxis
                          dataKey="date"
                          tickFormatter={shortDate}
                          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={20}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#12141d",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            fontSize: 12,
                          }}
                          labelFormatter={shortDate}
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {a.velocity.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                entry.count > 0
                                  ? "#a855f7"
                                  : "rgba(255,255,255,0.05)"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Additional stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {a.avgHours !== null && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-white/40 text-[10px] mb-1">
                        Avg Time to Complete
                      </div>
                      <div className="text-white font-bold">
                        {a.avgHours < 24
                          ? `${a.avgHours}h`
                          : `${Math.round(a.avgHours / 24)}d`}
                      </div>
                    </div>
                  )}
                  {a.highRate !== null && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-white/40 text-[10px] mb-1">
                        High Priority Done
                      </div>
                      <div className={`font-bold ${scoreColor(a.highRate)}`}>
                        {a.highRate}%
                      </div>
                    </div>
                  )}
                  {a.staleTasks > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <div className="text-red-300 text-[10px] mb-1">
                        Stale Tasks (&gt;3 days)
                      </div>
                      <div className="text-red-400 font-bold">
                        {a.staleTasks}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Stale task names ── */}
                {a.staleList.length > 0 && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                    <div className="text-yellow-400 text-xs font-medium mb-2">
                      ⚠ Sitting too long — tackle or delete:
                    </div>
                    <ul className="space-y-1">
                      {a.staleList.map((title, i) => (
                        <li key={i} className="text-white/60 text-xs">
                          • {title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── GPT Insight ── */}
                {result.insight && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">
                        AI Analysis
                      </span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {result.insight}
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
