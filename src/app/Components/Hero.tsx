"use client";
import { motion }              from "framer-motion";
import { Cpu, Sparkles, ShieldCheck } from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter }           from "next/navigation";

export default function Hero() {
  const { isSignedIn } = useUser();
  const router         = useRouter();

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-black text-white text-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 w-full max-w-3xl flex flex-col items-center"
      >
        {/* LOGO */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="absolute w-12 h-12 animate-pulse" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="40" stroke="url(#g1)" strokeWidth="3" />
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="100" y2="100">
                  <stop offset="0%"   stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">NS</span>
            </div>
          </div>

          {/* ✅ BUG FIX: was text-4xl md:text-2xl — bigger on mobile than desktop!
               Corrected to text-2xl md:text-4xl */}
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-wide bg-gradient-to-r from-white via-purple-300 to-white bg-clip-text text-transparent">
            NeuroSpace
          </h1>
        </div>

        {/* TAGLINE */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-lg md:text-2xl font-semibold text-purple-400 mb-6"
        >
          Step into the world of intelligent innovation 🚀
        </motion.h2>

        {/* BODY COPY */}
        <div className="text-gray-300 text-base md:text-lg space-y-2 mb-10 leading-relaxed">
          <p>Discover next-generation AI tools.</p>
          <p>Collaborate effortlessly with technology.</p>
          <p>Explore a universe where imagination meets code.</p>
        </div>

        {/* FEATURE ICONS */}
        <div className="grid grid-cols-3 gap-8 mb-10">
          {[
            { Icon: Cpu,         label: "AI Power",     color: "text-cyan-400"    },
            { Icon: Sparkles,    label: "Smooth Design", color: "text-pink-400"    },
            { Icon: ShieldCheck, label: "Secure",        color: "text-emerald-400" },
          ].map(({ Icon, label, color }) => (
            <motion.div
              key={label}
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center gap-2"
            >
              <Icon className={`w-8 h-8 ${color}`} />
              <p className="text-sm font-medium text-white">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        {isSignedIn ? (
          <motion.button
            onClick={() => router.push("/dashboard")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 px-14 py-3 rounded-3xl font-bold text-xl text-white"
          >
            Get started →
          </motion.button>
        ) : (
          <SignInButton mode="modal">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-14 py-3 rounded-3xl font-bold text-xl shadow-[0_0_40px_-10px_rgba(236,72,153,0.6)]"
            >
              Sign In →
            </motion.button>
          </SignInButton>
        )}
      </motion.div>
    </section>
  );
}