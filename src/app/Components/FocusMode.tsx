"use client";

import {
  useState, useEffect, useRef, useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, SkipForward, Volume2,
  VolumeX, CheckCircle2, Coffee, Zap, Timer,
} from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useToast } from "@/app/Components/Toast";

// ─── TYPES ───────────────────────────────────────────────────────────

export type FocusStep = {
  id:      string;
  title:   string;
  minutes: number;
};

type Phase = "focus" | "break" | "done";

type SessionStat = {
  title:    string;
  minutes:  number;
  completed: boolean;
};

type Props = {
  open:    boolean;
  onClose: () => void;
  steps:   FocusStep[];        // from AI plan or single task
  taskId?: string;             // if from Kanban (single task)
};

// ─── AMBIENT SOUND (Web Audio API — no external deps) ────────────────

function createAmbientSound(ctx: AudioContext): () => void {
  const nodes: AudioNode[] = [];

  // Soft brown noise for focus
  const bufferSize = ctx.sampleRate * 2;
  const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data       = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i]  = (lastOut + 0.02 * white) / 1.02;
    lastOut  = data[i];
    data[i] *= 3.5; // amplify
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop   = true;

  const gainNode  = ctx.createGain();
  gainNode.gain.value = 0.03; // very subtle

  const filter = ctx.createBiquadFilter();
  filter.type            = "lowpass";
  filter.frequency.value = 300;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start();

  nodes.push(source, gainNode, filter);
  return () => { try { source.stop(); } catch {} };
}

function playDing(ctx: AudioContext) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type            = "sine";
  osc.frequency.value = 528; // focus frequency
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 1.5);

  // Second tone
  setTimeout(() => {
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type            = "sine";
    osc2.frequency.value = 432;
    gain2.gain.setValueAtTime(0.2, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start();
    osc2.stop(ctx.currentTime + 1.2);
  }, 300);
}

// ─── CIRCULAR TIMER SVG ──────────────────────────────────────────────

function CircularTimer({
  progress,   // 0–1, where 1 = full circle
  phase,
  timeLeft,
  totalSeconds,
}: {
  progress:     number;
  phase:        Phase;
  timeLeft:     number;
  totalSeconds: number;
}) {
  const size       = 260;
  const stroke     = 8;
  const radius     = (size - stroke) / 2;
  const circ       = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - progress);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const color =
    phase === "focus" ? "#a855f7" :
    phase === "break" ? "#22c55e" : "#f59e0b";

  const glowColor =
    phase === "focus" ? "rgba(168,85,247,0.3)" :
    phase === "break" ? "rgba(34,197,94,0.3)"  : "rgba(245,158,11,0.3)";

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow */}
      <div
        className="absolute rounded-full blur-3xl opacity-40 transition-colors duration-1000"
        style={{
          width:      size + 60,
          height:     size + 60,
          background: glowColor,
        }}
      />

      <svg width={size} height={size} className="relative z-10 -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center z-20">
        <div className="text-5xl font-mono font-bold text-white tabular-nums">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
        <div className={`text-xs font-medium mt-1 uppercase tracking-widest ${
          phase === "focus" ? "text-purple-400" :
          phase === "break" ? "text-green-400"  : "text-yellow-400"
        }`}>
          {phase === "focus" ? "Focus" : phase === "break" ? "Break" : "Done"}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

const BREAK_SECONDS = 5 * 60; // 5 minute break

export default function FocusMode({ open, onClose, steps, taskId }: Props) {
  const { update, drop, tasks } = useTasks();
  const toast                   = useToast();

  const [stepIndex,    setStepIndex]    = useState(0);
  const [phase,        setPhase]        = useState<Phase>("focus");
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [running,      setRunning]      = useState(false);
  const [soundOn,      setSoundOn]      = useState(false);
  const [sessions,     setSessions]     = useState(0);  // completed focus blocks
  const [stats,        setStats]        = useState<SessionStat[]>([]);
  const [showSummary,  setShowSummary]  = useState(false);

  const audioCtxRef  = useRef<AudioContext | null>(null);
  const stopNoiseRef = useRef<(() => void) | null>(null);
  const timerRef     = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[stepIndex];

  // ─── INIT STEP ───────────────────────────────────────────────────
  const initStep = useCallback((idx: number, autoStart = false) => {
    if (idx >= steps.length) {
      // All steps done
      setPhase("done");
      setShowSummary(true);
      setRunning(false);
      return;
    }
    const secs = steps[idx].minutes * 60;
    setStepIndex(idx);
    setPhase("focus");
    setTimeLeft(secs);
    setTotalSeconds(secs);
    if (autoStart) setRunning(true);
  }, [steps]);

  // ─── INIT ON OPEN ─────────────────────────────────────────────────
  useEffect(() => {
    if (open && steps.length > 0) {
      initStep(0, false);
      setStats([]);
      setSessions(0);
      setShowSummary(false);
    }
  }, [open, steps, initStep]);

  // ─── CLEANUP ON CLOSE ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setRunning(false);
      stopNoiseRef.current?.();
      stopNoiseRef.current = null;
    }
  }, [open]);

  // ─── AMBIENT SOUND ────────────────────────────────────────────────
  useEffect(() => {
    if (soundOn && running && phase === "focus") {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      stopNoiseRef.current?.();
      stopNoiseRef.current = createAmbientSound(audioCtxRef.current);
    } else {
      stopNoiseRef.current?.();
      stopNoiseRef.current = null;
    }
    return () => { stopNoiseRef.current?.(); };
  }, [soundOn, running, phase]);

  // ─── TIMER TICK ───────────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, stepIndex]);

  // ─── PHASE END ────────────────────────────────────────────────────
  function handlePhaseEnd() {
    setRunning(false);

    // Play completion sound
    if (audioCtxRef.current || soundOn) {
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      playDing(ctx);
    }

    if (phase === "focus") {
      // Mark step complete
      const step = steps[stepIndex];
      setSessions((s) => s + 1);
      setStats((prev) => [...prev, {
        title:    step.title,
        minutes:  step.minutes,
        completed: true,
      }]);

      toast.success(`✓ "${step.title}" complete! Take a 5 minute break.`);

      // Start break
      setPhase("break");
      setTimeLeft(BREAK_SECONDS);
      setTotalSeconds(BREAK_SECONDS);
      setRunning(true);
    } else if (phase === "break") {
      // Break done — move to next step
      const nextIdx = stepIndex + 1;
      if (nextIdx >= steps.length) {
        setPhase("done");
        setShowSummary(true);
        toast.success("🎉 All steps completed! Amazing focus session.");
      } else {
        toast.info(`Break over — starting "${steps[nextIdx].title}"`);
        initStep(nextIdx, true);
      }
    }
  }

  // ─── SKIP ─────────────────────────────────────────────────────────
  function skip() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    if (phase === "focus") {
      setStats((prev) => [...prev, {
        title:    currentStep?.title ?? "",
        minutes:  currentStep?.minutes ?? 0,
        completed: false,
      }]);
      setPhase("break");
      setTimeLeft(BREAK_SECONDS);
      setTotalSeconds(BREAK_SECONDS);
      setRunning(true);
    } else {
      const nextIdx = stepIndex + 1;
      if (nextIdx >= steps.length) {
        setShowSummary(true);
      } else {
        initStep(nextIdx, true);
      }
    }
  }

  // ─── CLOSE HANDLER ────────────────────────────────────────────────
  function handleClose() {
    if (timerRef.current) clearInterval(timerRef.current);
    stopNoiseRef.current?.();
    stopNoiseRef.current = null;
    setRunning(false);
    onClose();
  }

  const progress = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;

  if (!open) return null;

  // ─── SUMMARY SCREEN ───────────────────────────────────────────────
  if (showSummary) {
    const totalMinutes  = stats.reduce((s, st) => s + st.minutes, 0);
    const completedCount = stats.filter((s) => s.completed).length;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#080a12] px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 24 }}
            animate={{ scale: 1,   opacity: 1, y: 0  }}
            className="w-full max-w-md bg-[#0d0f1a] border border-white/10 rounded-3xl p-8 text-center shadow-2xl"
          >
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-1">Session Complete!</h2>
            <p className="text-white/40 text-sm mb-8">Here's what you accomplished</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="text-2xl font-bold text-purple-400">{sessions}</div>
                <div className="text-xs text-white/40 mt-1">Focus blocks</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="text-2xl font-bold text-green-400">{completedCount}</div>
                <div className="text-xs text-white/40 mt-1">Steps done</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="text-2xl font-bold text-blue-400">{totalMinutes}</div>
                <div className="text-xs text-white/40 mt-1">Minutes focused</div>
              </div>
            </div>

            <div className="space-y-2 mb-8 text-left">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                  <span className={s.completed ? "text-green-400" : "text-white/20"}>
                    {s.completed ? "✔" : "○"}
                  </span>
                  <span className="text-sm text-white/70 flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-white/30">{s.minutes}m</span>
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm"
            >
              Back to Dashboard
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── FOCUS / BREAK SCREEN ─────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#080a12] px-4"
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Timer className="w-4 h-4" />
            <span>{sessions} session{sessions !== 1 ? "s" : ""} completed</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Ambient sound toggle */}
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={`p-2 rounded-xl transition ${
                soundOn
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-white/5 text-white/30 hover:text-white/60"
              }`}
              title={soundOn ? "Mute ambient sound" : "Enable ambient sound"}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Phase label */}
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2"
        >
          {phase === "focus" ? (
            <>
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium uppercase tracking-widest">
                Focus Time
              </span>
            </>
          ) : (
            <>
              <Coffee className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium uppercase tracking-widest">
                Break Time
              </span>
            </>
          )}
        </motion.div>

        {/* Circular timer */}
        <CircularTimer
          progress={progress}
          phase={phase}
          timeLeft={timeLeft}
          totalSeconds={totalSeconds}
        />

        {/* Current task */}
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center max-w-sm"
        >
          {phase === "focus" && currentStep && (
            <>
              <p className="text-white/30 text-xs uppercase tracking-wider mb-2">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <h2 className="text-xl font-semibold text-white leading-snug">
                {currentStep.title}
              </h2>
              <p className="text-white/30 text-sm mt-1">
                {currentStep.minutes} minute session
              </p>
            </>
          )}
          {phase === "break" && (
            <>
              <h2 className="text-xl font-semibold text-white">Rest your eyes</h2>
              <p className="text-white/30 text-sm mt-1">
                {stepIndex + 1 < steps.length
                  ? `Next: "${steps[stepIndex + 1].title}"`
                  : "Last break — almost done!"}
              </p>
            </>
          )}
        </motion.div>

        {/* Step progress dots */}
        <div className="flex items-center gap-2 mt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < stepIndex        ? "w-2 h-2 bg-green-400"    :
                i === stepIndex      ? "w-3 h-3 bg-purple-400"   :
                                       "w-2 h-2 bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRunning((r) => !r)}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition ${
              phase === "focus"
                ? "bg-gradient-to-br from-purple-600 to-pink-600 shadow-purple-500/30"
                : "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30"
            }`}
          >
            {running
              ? <Pause className="w-6 h-6" />
              : <Play  className="w-6 h-6 ml-0.5" />
            }
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={skip}
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition"
            title="Skip"
          >
            <SkipForward className="w-5 h-5" />
          </motion.button>
        </div>

        <p className="text-white/20 text-xs mt-6">
          Press Space to pause · Esc to exit
        </p>

        {/* Keyboard shortcuts */}
        {/* eslint-disable-next-line react-hooks/exhaustive-deps */}
        {/* handled via useEffect below */}
      </motion.div>
    </AnimatePresence>
  );
}