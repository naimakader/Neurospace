"use client";
import { motion, useInView }         from "framer-motion";
import { useRef }                     from "react";
import { Cpu, Sparkles, ShieldCheck,
         Kanban, BarChart2, Zap,
         Clock, CheckCircle2 }        from "lucide-react";
import { SignInButton, useUser }      from "@clerk/nextjs";
import { useRouter }                  from "next/navigation";

// ─── FEATURE CARDS ───────────────────────────────────────────────────

const FEATURES = [
  {
    Icon:  Kanban,
    title: "Smart Kanban Board",
    desc:  "Drag tasks across Todo, In Progress, and Done. Priority auto-detected from task names.",
    color: "text-cyan-400",
    bg:    "bg-cyan-400/10",
  },
  {
    Icon:  Zap,
    title: "AI Work Planner",
    desc:  "Click any task to generate a GPT-4o-mini step-by-step plan adapted to your energy level.",
    color: "text-purple-400",
    bg:    "bg-purple-400/10",
  },
  {
    Icon:  BarChart2,
    title: "Productivity Analytics",
    desc:  "Track completion rate, daily streak, and weekly performance with real-time charts.",
    color: "text-pink-400",
    bg:    "bg-pink-400/10",
  },
  {
    Icon:  Clock,
    title: "Plan History",
    desc:  "Completed tasks auto-archive at midnight. Browse your history by day, week, or month.",
    color: "text-emerald-400",
    bg:    "bg-emerald-400/10",
  },
  {
    Icon:  CheckCircle2,
    title: "Streak Tracking",
    desc:  "Build daily habits. Get warned before your streak breaks so you never miss a day.",
    color: "text-orange-400",
    bg:    "bg-orange-400/10",
  },
  {
    Icon:  ShieldCheck,
    title: "Secure by Default",
    desc:  "Clerk authentication + Supabase row-level security. Your data is always private.",
    color: "text-green-400",
    bg:    "bg-green-400/10",
  },
];

// ─── ANIMATED SECTION ────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref     = useRef(null);
  const inView  = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── MOCK KANBAN PREVIEW ─────────────────────────────────────────────

function KanbanPreview() {
  const cols = [
    {
      label: "Todo",
      color: "text-blue-400",
      tasks: ["Research competitors", "Write test cases"],
    },
    {
      label: "In Progress",
      color: "text-yellow-400",
      tasks: ["Build AI planner UI"],
    },
    {
      label: "Done",
      color: "text-green-400",
      tasks: ["Setup Supabase", "Clerk auth integration"],
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 p-4 bg-[#0d0f1a] rounded-2xl border border-white/10 shadow-2xl">
      {cols.map((col) => (
        <div key={col.label} className="bg-[#12141d] rounded-xl p-3">
          <div className={`text-xs font-semibold mb-3 ${col.color}`}>{col.label}</div>
          <div className="space-y-2">
            {col.tasks.map((t) => (
              <div
                key={t}
                className="bg-[#1a1d29] rounded-lg p-2.5 text-[10px] text-white/70 border border-white/5"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────

export default function Hero() {
  const { isSignedIn } = useUser();
  const router         = useRouter();

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">NS</span>
          </div>
          <span className="font-semibold text-white">NeuroSpace</span>
        </div>

        {isSignedIn ? (
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-medium transition"
          >
            Go to Dashboard →
          </button>
        ) : (
          <SignInButton mode="modal">
            <button className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition">
              Sign In
            </button>
          </SignInButton>
        )}
      </nav>

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-20">
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" />
            Powered by GPT-4o-mini
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6 bg-gradient-to-br from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
            Plan smarter.<br />Work with AI.
          </h1>

          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            NeuroSpace is an AI-powered productivity system that adapts to your energy,
            plans your work, and keeps your streak alive — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isSignedIn ? (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/dashboard")}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg shadow-lg shadow-purple-500/25 hover:opacity-90 transition"
              >
                Open Dashboard →
              </motion.button>
            ) : (
              <SignInButton mode="modal">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg shadow-lg shadow-purple-500/25 hover:opacity-90 transition"
                >
                  Get Started Free →
                </motion.button>
              </SignInButton>
            )}
            <a
              href="https://github.com/naimakader/Neurospace"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium text-white/70 transition"
            >
              View on GitHub
            </a>
          </div>
        </motion.div>

        {/* ── KANBAN PREVIEW ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="relative z-10 mt-16 w-full max-w-2xl"
        >
          <KanbanPreview />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </motion.div>
      </section>

      {/* ── TRUST BADGES ─────────────────────────────────────────────── */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { Icon: Cpu,         label: "GPT-4o-mini AI",     color: "text-cyan-400"    },
              { Icon: ShieldCheck, label: "Clerk Auth",          color: "text-emerald-400" },
              { Icon: BarChart2,   label: "Supabase Database",   color: "text-purple-400"  },
            ].map(({ Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <Icon className={`w-6 h-6 ${color}`} />
                <span className="text-xs text-white/40 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Everything you need to ship every day
              </h2>
              <p className="text-white/40 max-w-lg mx-auto">
                Built for developers and creators who want to stay in flow and get more done.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/8 transition-all group">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <FadeIn>
          <div className="max-w-2xl mx-auto">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/20">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to plan smarter?
              </h2>
              <p className="text-white/40 mb-8">
                Free to use. No credit card required.
              </p>
              {isSignedIn ? (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg hover:opacity-90 transition"
                >
                  Open Dashboard →
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg hover:opacity-90 transition">
                    Get Started Free →
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="py-8 border-t border-white/5 text-center text-white/20 text-xs px-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-[8px]">NS</span>
          </div>
          <span>NeuroSpace</span>
        </div>
        <p>Built with Next.js · TypeScript · Clerk · Supabase · OpenAI</p>
        <a
          href="https://github.com/naimakader/Neurospace"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block hover:text-white/40 transition"
        >
          github.com/naimakader/Neurospace
        </a>
      </footer>
    </main>
  );
}