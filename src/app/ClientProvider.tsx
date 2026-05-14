"use client";

import { useState } from "react";
import { TasksProvider } from "@/providers/TasksProvider";
import CommandPalette from "@/app/Components/CommandPalette";
import { ToastProvider } from "@/app/Components/Toast";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ✅ ToastProvider wraps everything so any component can call useToast()
    <ToastProvider>
      <TasksProvider>
        <CommandPalette />
        {children}
      </TasksProvider>
    </ToastProvider>
  );
}
