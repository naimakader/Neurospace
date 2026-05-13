"use client";
import { useState } from "react";
import { TasksProvider } from "@/providers/TasksProvider";
import CommandPalette from "@/app/Components/CommandPalette";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TasksProvider>
      <CommandPalette />
      {children}
    </TasksProvider>
  );
}
