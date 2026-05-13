"use client";
import { useState } from "react";
import Sidebar from "../Components/Sidebar";
import SmartPlanner from "../Components/SmartPlanner";
import MobileNav from "../Components/MobileNav";
import { UserButton } from "@clerk/nextjs";

export default function Dashboard() {
  const [chatOpen] = useState(false);

  function openChat() {
    // wire up your chat modal/drawer here
  }

  return (
    <>
      {/* Bottom nav — visible only on small screens */}
      <MobileNav onOpenChat={openChat} />

      {/* Sidebar — hidden on mobile, shown lg+ */}
      <div className="hidden lg:block">
        <Sidebar onOpenChat={openChat} />
      </div>

      {/* User avatar */}
      <div className="fixed top-4 right-6 z-50">
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* ✅ BUG FIX: was hardcoded `ml-64` which pushes content 256 px even on
           mobile where the sidebar is hidden. Now:
           - mobile: no left margin (sidebar not visible)
           - lg+:    ml-64 matches the 256 px sidebar width                     */}
      <div className="lg:ml-64 transition-all duration-300">
        <section className="min-h-screen bg-[#0f111a] text-white px-4 sm:px-8 py-20 pb-24 lg:pb-20">
          <header className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Welcome back</h2>
          </header>
          <SmartPlanner />
        </section>
      </div>
    </>
  );
}
