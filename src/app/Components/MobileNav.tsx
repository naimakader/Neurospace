"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, BarChart2, MessageSquare } from "lucide-react";

type Tab = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  Icon: any;
};

export default function MobileNav({ onOpenChat }: { onOpenChat: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  // ✅ Removed: Your Chats, Your Notes
  // ✅ Added: Plan History → /plan-history
  const tabs: Tab[] = [
    { id: "home", label: "Home", href: "/dashboard", Icon: Home },
    {
      id: "plan-history",
      label: "History",
      href: "/plan-history",
      Icon: Calendar,
    },
    { id: "progress", label: "Progress", href: "/dashboard", Icon: BarChart2 },
    { id: "chat", label: "Chat", onClick: onOpenChat, Icon: MessageSquare },
  ];

  function isActive(tab: Tab): boolean {
    if (!tab.href) return false;
    const base = tab.href.split("#")[0];
    return pathname === base || pathname?.startsWith(base + "/");
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1117]/90 backdrop-blur-xl border-t border-white/10 lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <li key={tab.id}>
              <button
                onClick={() => {
                  if (tab.onClick) tab.onClick();
                  if (tab.href) router.push(tab.href);
                }}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-xs transition ${
                  active ? "text-purple-400" : "text-gray-400 hover:text-white"
                }`}
              >
                <tab.Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
