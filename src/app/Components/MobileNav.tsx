"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar } from "lucide-react";

const TABS = [
  { id: "home", label: "Home", href: "/dashboard", Icon: Home },
  {
    id: "plan-history",
    label: "Plan History",
    href: "/plan-history",
    Icon: Calendar,
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1117]/95 backdrop-blur-xl border-t border-white/10 lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around h-14">
        {TABS.map(({ id, label, href, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <li key={id}>
              <button
                onClick={() => router.push(href)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-xs transition ${
                  active ? "text-purple-400" : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
