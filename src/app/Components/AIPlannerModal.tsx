"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks, Task } from "@/hooks/useTasks";
import {
  X,
  Zap,
  Clock,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import FocusMode, { FocusStep } from "@/app/Components/FocusMode";

// ─── TYPES ───────────────────────────────────────────────────────────

type MoodEnergy = "low" | "medium" | "high";
type MoodFocus = "light" | "balanced" | "deep";

type Step = {
  title: string;
  minutes: number;
};

type ScheduleItem = {
  time: string;
  title: string;
};

type PlanResult = {
  priority: string;
  energy: string;
  steps: Step[];
  schedule: ScheduleItem[];
  confidence: number;
  fallback?: boolean;
};

type Props = {
  task: Task | null;
  open: boolean;
  onClose: () => void;
};

// ─── HELPERS ─────────────────────────────────────────────────────────

const ENERGY_OPTIONS: {
  value: MoodEnergy;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  { value: "low", label: "Low", emoji: "😴", desc: "Short steps, easy wins" },
  { value: "medium", label: "Medium", emoji: "😊", desc: "Balanced & focused" },
  { value: "high", label: "High", emoji: "⚡", desc: "Deep work, big chunks" },
];

const FOCUS_OPTIONS: { value: MoodFocus; label: string; emoji: string }[] = [
  { value: "light", label: "Light", emoji: "🌤" },
  { value: "balanced", label: "Balanced", emoji: "⚖️" },
  { value: "deep", label: "Deep", emoji: "🎯" },
];

function priorityColor(p: string) {
  if (p === "high") return "text-red-400 bg-red-400/10";
  if (p === "medium") return "text-yellow-400 bg-yellow-400/10";
  return "text-green-400 bg-green-400/10";
}

function durationBar(minutes: number, max: number) {
  const pct = Math.round((minutes / max) * 100);
  return Math.max(8, pct);
}

// ─── COMPONENT ───────────────────────────────────────────────────────

export default function AIPlannerModal({ task, open, onClose }: Props) {
  const { tasks, add } = useTasks();

  const [energy, setEnergy] = useState<MoodEnergy>("medium");
  const [focus, setFocus] = useState<MoodFocus>("balanced");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedSteps, setAddedSteps] = useState<Set<number>>(new Set());
  const [allAdded, setAllAdded] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  // Streaming display text
  const [streamText, setStreamText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const streamRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when task changes
  useEffect(() => {
    if (open) {
      setPlan(null);
      setError(null);
      setStreamText("");
      setStreaming(false);
      setAddedSteps(new Set());
      setAllAdded(false);
      setFocusOpen(false);
    }
  }, [open, task?.id]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) clearTimeout(streamRef.current);
    };
  }, []);

  // ── Typewriter effect ─────────────────────────────────────────────
  function typewriterReveal(text: string, onDone: () => void) {
    setStreaming(true);
    setStreamText("");
    let i = 0;

    function tick() {
      if (i <= text.length) {
        setStreamText(text.slice(0, i));
        i++;
        streamRef.current = setTimeout(tick, 18);
      } else {
        setStreaming(false);
        onDone();
      }
    }
    tick();
  }

  // ── Generate plan ─────────────────────────────────────────────────
  const generatePlan = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    setStreamText("");
    setAddedSteps(new Set());
    setAllAdded(false);

    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: task.title,
          tasks: tasks
            .slice(0, 10)
            .map((t) => ({ title: t.title, status: t.status })),
          history: [],
          mood: { energy, focusStyle: focus },
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data: PlanResult = await res.json();
      setLoading(false);

      // Typewriter reveal of a summary sentence
      const summary = `Generating a ${data.energy} work plan for "${task.title}" with ${data.steps.length} steps...`;
      typewriterReveal(summary, () => setPlan(data));
    } catch (e: any) {
      setLoading(false);
      setError(e.message ?? "Something went wrong. Please try again.");
    }
  }, [task, tasks, energy, focus]);

  // ── Add a single step to the board ───────────────────────────────
  async function addStep(step: Step, index: number) {
    await add(`${step.title} (${step.minutes} min)`);
    setAddedSteps((prev) => new Set([...prev, index]));
  }

  // ── Add all steps to the board ───────────────────────────────────
  async function addAllSteps() {
    if (!plan) return;
    for (let i = 0; i < plan.steps.length; i++) {
      if (!addedSteps.has(i)) await addStep(plan.steps[i], i);
    }
    setAllAdded(true);
  }

  const maxMinutes = plan ? Math.max(...plan.steps.map((s) => s.minutes)) : 1;

  if (!open || !task) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        >
          <motion.div
            key="modal"
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d0f1a] border border-white/10 rounded-2xl shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#0d0f1a]/95 backdrop-blur border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">
                    AI Planner
                  </div>
                  <div className="text-white/40 text-xs truncate max-w-[260px]">
                    {task.title}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ── Mood Selector ── */}
              {!plan && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                      Energy Level
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {ENERGY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setEnergy(opt.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            energy === opt.value
                              ? "border-purple-500 bg-purple-500/15"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div className="text-xl mb-1">{opt.emoji}</div>
                          <div className="text-white text-xs font-medium">
                            {opt.label}
                          </div>
                          <div className="text-white/40 text-[10px] mt-0.5">
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                      Focus Style
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {FOCUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFocus(opt.value)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            focus === opt.value
                              ? "border-purple-500 bg-purple-500/15"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div className="text-lg">{opt.emoji}</div>
                          <div className="text-white text-xs mt-1">
                            {opt.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={generatePlan}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:opacity-90 transition"
                  >
                    <Zap className="w-4 h-4" />
                    Generate AI Plan
                  </motion.button>
                </motion.div>
              )}

              {/* ── Loading State ── */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-4"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                    <Zap className="absolute inset-0 m-auto w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-white font-medium">
                      Analysing your task...
                    </div>
                    <div className="text-white/40 text-sm mt-1">
                      GPT-4o-mini is building your personalised plan
                    </div>
                  </div>

                  {/* Skeleton bars */}
                  <div className="w-full space-y-2 mt-4">
                    {[80, 60, 90, 50].map((w, i) => (
                      <div
                        key={i}
                        className="h-3 rounded-full bg-white/5 animate-pulse"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Streaming text ── */}
              {streamText && !plan && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-purple-300 text-sm font-mono bg-purple-500/10 border border-purple-500/20 rounded-xl p-4"
                >
                  {streamText}
                  {streaming && (
                    <span className="inline-block w-1.5 h-4 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />
                  )}
                </motion.div>
              )}

              {/* ── Error State ── */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <div className="text-center">
                    <div className="text-white font-medium">
                      Plan generation failed
                    </div>
                    <div className="text-white/40 text-sm mt-1">{error}</div>
                  </div>
                  <button
                    onClick={generatePlan}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition"
                  >
                    Try again
                  </button>
                </motion.div>
              )}

              {/* ── Plan Result ── */}
              {plan && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-6"
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${priorityColor(plan.priority)}`}
                    >
                      {plan.priority} priority
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/60 capitalize">
                      {plan.energy} energy
                    </span>
                    {plan.fallback && (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400">
                        Offline mode
                      </span>
                    )}

                    {/* Confidence */}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-white/40">Confidence</span>
                      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.round(plan.confidence * 100)}%`,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        />
                      </div>
                      <span className="text-xs text-white/60">
                        {Math.round(plan.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Steps with duration bars */}
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                      Work Steps
                    </div>
                    <div className="space-y-2">
                      {plan.steps.map((step, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="group relative bg-white/5 hover:bg-white/8 border border-white/5 rounded-xl p-3 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm leading-snug">
                                  {step.title}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Clock className="w-3 h-3 text-white/30" />
                                  <span className="text-xs text-white/40">
                                    {step.minutes} min
                                  </span>
                                  {/* Duration bar */}
                                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${durationBar(step.minutes, maxMinutes)}%`,
                                      }}
                                      transition={{
                                        delay: i * 0.07 + 0.3,
                                        duration: 0.6,
                                        ease: "easeOut",
                                      }}
                                      className="h-full bg-gradient-to-r from-purple-500/60 to-pink-500/60 rounded-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Add single step button */}
                            <button
                              onClick={() => addStep(step, i)}
                              disabled={addedSteps.has(i)}
                              className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                                addedSteps.has(i)
                                  ? "text-green-400 bg-green-400/10"
                                  : "text-white/30 hover:text-purple-400 hover:bg-purple-400/10 opacity-0 group-hover:opacity-100"
                              }`}
                              title={
                                addedSteps.has(i)
                                  ? "Added to board"
                                  : "Add to board"
                              }
                            >
                              {addedSteps.has(i) ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Schedule timeline */}
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3">
                      Suggested Schedule
                    </div>
                    <div className="space-y-1">
                      {plan.schedule.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 + 0.2 }}
                          className="flex items-center gap-3"
                        >
                          <div className="text-xs text-purple-400 font-mono w-12 flex-shrink-0">
                            {item.time}
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                            <div className="text-sm text-white/70 truncate">
                              {item.title}
                            </div>
                          </div>
                          {i < plan.schedule.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={addAllSteps}
                      disabled={allAdded}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                        allAdded
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:opacity-90"
                      }`}
                    >
                      {allAdded ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> All steps added
                          to board
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Add all steps to board
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setPlan(null);
                        setStreamText("");
                      }}
                      className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition"
                    >
                      Regenerate
                    </motion.button>
                  </div>

                  {/* 🎯 Start Focus Session */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setFocusOpen(true)}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Timer className="w-4 h-4" />
                    Start Focus Session
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Focus Mode — full screen, outside the modal */}
      {plan && focusOpen && (
        <FocusMode
          open={focusOpen}
          onClose={() => setFocusOpen(false)}
          steps={plan.steps.map(
            (s, i) =>
              ({
                id: `step-${i}`,
                title: s.title,
                minutes: s.minutes,
              }) as FocusStep,
          )}
          taskId={task?.id}
        />
      )}
    </>
  );
}
