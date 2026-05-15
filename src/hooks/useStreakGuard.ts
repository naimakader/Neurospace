"use client";

import { useEffect, useRef } from "react";
import { useToast }          from "@/app/Components/Toast";
import { Task, ArchivedTask } from "@/hooks/useTasks";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hasCompletedToday(tasks: Task[], archived: ArchivedTask[]): boolean {
  const today = localDateStr(new Date());
  const inActive   = tasks.some((t) => t.completed_at && localDateStr(new Date(t.completed_at)) === today);
  const inArchived = archived.some((t) => t.completed_at && localDateStr(new Date(t.completed_at)) === today);
  return inActive || inArchived;
}

function getMinutesUntilMidnight(): number {
  const now      = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 60000);
}

// Warning thresholds in minutes before midnight
const WARN_AT = [120, 60, 30]; // 2h, 1h, 30min before midnight

export function useStreakGuard(
  tasks:         Task[],
  archivedTasks: ArchivedTask[],
  streakDays:    number,
) {
  const toast         = useToast();
  const warnedAt      = useRef<Set<number>>(new Set()); // track which thresholds fired
  const sessionWarned = useRef(false);

  useEffect(() => {
    // Only guard if user has an active streak
    if (streakDays === 0) return;

    function check() {
      const completed       = hasCompletedToday(tasks, archivedTasks);
      const minsLeft        = getMinutesUntilMidnight();
      const hour            = new Date().getHours();

      // No completions today + streak exists = at risk
      if (!completed && streakDays > 0) {
        // Check each threshold
        for (const threshold of WARN_AT) {
          if (minsLeft <= threshold && !warnedAt.current.has(threshold)) {
            warnedAt.current.add(threshold);

            const hoursLeft = Math.floor(minsLeft / 60);
            const label     =
              minsLeft <= 30 ? "30 minutes" :
              minsLeft <= 60 ? "1 hour"     : "2 hours";

            toast.error(
              `🔥 Streak at risk! ${label} left to complete a task and keep your ${streakDays}-day streak alive.`,
            );
          }
        }

        // Additional warning after 8pm if not warned yet this session
        if (hour >= 20 && !sessionWarned.current) {
          sessionWarned.current = true;
          toast.error(
            `⚠️ No tasks completed today. Complete at least one task to maintain your ${streakDays}-day streak!`,
          );
        }
      } else if (completed) {
        // Reset warnings for today if they completed a task
        warnedAt.current.clear();
        sessionWarned.current = false;
      }
    }

    // Check immediately
    check();

    // Then check every 60 seconds
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [tasks, archivedTasks, streakDays, toast]);
}