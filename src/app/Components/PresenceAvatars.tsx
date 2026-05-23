"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PresenceUser } from "@/hooks/useRealtimeBoard";

export default function PresenceAvatars({ users }: { users: PresenceUser[] }) {
  if (!users.length) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-white/30 mr-1">Also here:</span>
      <AnimatePresence>
        {users.slice(0, 5).map((user) => (
          <motion.div
            key={user.userId}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            title={user.name}
            className="relative group"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-[#0f111a] cursor-default"
              style={{ background: user.color }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f111a] bg-green-400" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-[#1a1d29] text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10">
              {user.name}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {users.length > 5 && (
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-[10px] font-medium border-2 border-[#0f111a]">
          +{users.length - 5}
        </div>
      )}
    </div>
  );
}
