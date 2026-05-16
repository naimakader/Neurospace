"use client";
import { useState }         from "react";
import Sidebar              from "../Components/Sidebar";
import SmartPlanner         from "../Components/SmartPlanner";
import MobileNav            from "../Components/MobileNav";
import { UserButton,
         useUser }          from "@clerk/nextjs";

export default function Dashboard() {
  const { user }           = useUser();
  const [, setChatOpen]    = useState(false);

  const firstName = user?.firstName ?? user?.username ?? "there";
  const hour      = new Date().getHours();
  const greeting  =
    hour < 12 ? "Good morning" :
    hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <MobileNav />

      <div className="hidden lg:block">
        <Sidebar onOpenChat={() => setChatOpen(true)} />
      </div>

      <div className="fixed top-4 right-6 z-50">
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="lg:ml-64 transition-all duration-300">
        <section className="min-h-screen bg-[#0f111a] text-white px-4 sm:px-8 py-20 pb-24 lg:pb-20">
          <header className="mb-10">
            {/* ✅ Shows user's actual name from Clerk */}
            <h2 className="text-2xl sm:text-3xl font-bold">
              {greeting}, {firstName} 👋
            </h2>
            <p className="text-white/30 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month:   "long",
                day:     "numeric",
              })}
            </p>
          </header>

          <SmartPlanner />
        </section>
      </div>
    </>
  );
}