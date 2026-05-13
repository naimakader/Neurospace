"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MessageSquare } from "lucide-react";

type Item = {
  id: string;
  label: string;
  Icon: (props: any) => JSX.Element;
  href: string;
  badge?: number;
};

// ✅ Removed: Your Chats, Your Notes
// ✅ Renamed: Your Plans → Plan History, href → /plan-history
const defaultItems: Item[] = [
  {
    id: "plan-history",
    label: "Plan History",
    Icon: Calendar,
    href: "/plan-history",
  },
];

export default function Sidebar({
  onOpenChat,
  itemsOverride,
}: {
  onOpenChat: () => void;
  itemsOverride?: Item[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const items = itemsOverride ?? defaultItems;

  useEffect(() => {
    const saved = localStorage.getItem("ns_sidebar_collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("ns_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  function isActive(href: string): boolean {
    try {
      const base = new URL(href, "http://x").pathname;
      return pathname?.startsWith(base) ?? false;
    } catch {
      return false;
    }
  }

  return (
    <motion.aside
      initial={{ x: -8, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={`fixed left-0 top-0 h-screen flex flex-col gap-4 p-4 border-r border-slate-800 bg-[#0f1117] transition-all duration-300 z-40 ${
        collapsed ? "w-16" : "w-64"
      }`}
      aria-label="Sidebar"
    >
      {/* Header / collapse toggle */}
      <div className="flex items-center justify-between">
        {!collapsed && (
          <div className="text-sm text-gray-300 font-semibold">NeuroSpace</div>
        )}
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500 ml-auto"
        >
          <svg
            className="w-5 h-5 text-gray-200"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 12h16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-3 overflow-y-auto" aria-label="Main">
        <ul className="flex flex-col gap-2">
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <li key={it.id}>
                <Link
                  href={it.href}
                  title={collapsed ? it.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition hover:bg-slate-900 ${
                    active ? "bg-slate-900" : ""
                  }`}
                >
                  <it.Icon className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm text-gray-200">{it.label}</span>
                  )}
                  {!collapsed && it.badge ? (
                    <span className="ml-auto text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                      {it.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Chat button */}
      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={onOpenChat}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 text-white font-medium hover:opacity-90 transition"
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Chat with Neuro</span>}
        </button>
        {!collapsed && (
          <div className="text-xs text-gray-500 px-1">v0.1 • NeuroSpace</div>
        )}
      </div>
    </motion.aside>
  );
}
