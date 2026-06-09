# NeuroSpace — AI Productivity Platform

> A full-stack AI productivity system built with Next.js 15, TypeScript, Clerk, Supabase, and GPT-4o-mini.

**[🔴 Live Demo](https://neurospace-zr2n.vercel.app)** · **[GitHub](https://github.com/naimakader/Neurospace)**

---

## Overview

NeuroSpace is not a todo app. It's a system that adapts to how you actually work.

Most productivity tools are passive — they store tasks and wait. NeuroSpace actively analyses your completion patterns, generates AI work plans adapted to your energy level, warns you before your streak breaks, and tells you exactly where you're losing time.

Built as a portfolio project to demonstrate full-stack integration skills: authentication flows, database architecture, AI integration, real-time UI, and production-ready error handling.

---

## Features

### Smart Kanban Board

Drag tasks across Todo → In Progress → Done. Priority is auto-detected from task titles — words like "urgent" or "fix" automatically set high priority. Full undo/redo that survives page refresh by syncing back to Supabase.

### AI Work Planner

Click any task to generate a GPT-4o-mini step-by-step work plan. Adapts to your mood — low energy gives shorter, easier steps. High energy gives deeper, longer sessions. One click adds all steps to your board as real tasks.

### Pomodoro Focus Mode

Start a focus session from any task or AI plan. Full-screen circular timer with animated progress. Ambient brown noise via Web Audio API (no external dependency). Auto-advances through steps with 5-minute breaks. Session summary shows total time focused and steps completed.

### Productivity Intelligence

The feature that separates this from a todo app. Analyses your real task history and computes: 14-day completion velocity, peak productive hour, peak productive day, average time from creation to completion, high-priority completion rate, stale tasks sitting untouched for 3+ days. GPT-4o-mini generates a personalised insight from your actual numbers — not generic advice.

### Neuro AI Chat

Sidebar chat that knows your exact tasks and stats. Ask "what should I work on first?" and it responds with your actual task names. Ask "plan my morning" and it builds a schedule from your real board. Streaming word-by-word response with suggested prompts. Falls back to smart local responses when OpenAI is unavailable.

### Streak Tracking with Warnings

Tracks your daily completion streak across both active and archived tasks. Fires toast warnings at 2 hours, 1 hour, and 30 minutes before midnight if you haven't completed a task. Streak survives refresh because archived tasks are included in the session snapshot.

### Plan History

Completed tasks auto-archive at midnight — the Done column resets every morning so you plan fresh each day. Browse history by Today, This Week, This Month, or All Time. Each filter shows only its own data with count badges.

### Session Snapshots

Every mutation saves a `{ tasks, archived }` snapshot to Supabase. On load, the snapshot is tried first for speed, with fallback to the tasks table. This keeps undo/redo persistent and the UI consistent across devices.

---

## Tech Stack

| Layer      | Technology            | Why                                                         |
| ---------- | --------------------- | ----------------------------------------------------------- |
| Framework  | Next.js 15 App Router | Server components, API routes, file-based routing           |
| Language   | TypeScript            | End-to-end type safety — shared types between API and UI    |
| Auth       | Clerk                 | JWT-based auth with protected middleware routes             |
| Database   | Supabase (PostgreSQL) | Row-level ownership, session snapshots, task history        |
| AI         | OpenAI GPT-4o-mini    | Work plans, productivity analysis, conversational assistant |
| Styling    | Tailwind CSS v4       | Utility-first responsive design                             |
| Animation  | Framer Motion         | Drag-and-drop, modal transitions, micro-interactions        |
| Charts     | Recharts              | Velocity charts, pie charts, productivity visualizations    |
| Audio      | Web Audio API         | Ambient focus sound — no external library                   |
| Deployment | Vercel                | Automatic CI/CD from GitHub pushes                          |

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── plan/       # GPT work plan generation
│   │   │   ├── chat/       # Streaming AI assistant
│   │   │   └── analyze/    # Productivity intelligence engine
│   │   ├── history/        # Session snapshot GET/POST
│   │   └── tasks/          # CRUD + [id] PATCH/DELETE
│   ├── Components/
│   │   ├── AIPlannerModal          # Mood selector + GPT plan + add-to-board
│   │   ├── FocusMode               # Full-screen Pomodoro with ambient sound
│   │   ├── NeuroChat               # Streaming AI chat drawer
│   │   ├── ProductivityIntelligence # Analytics engine + GPT insights
│   │   ├── KanbanBoard             # Drag-and-drop with inline edit
│   │   ├── ProductivityDashboard   # Stats, streak, pie chart
│   │   ├── WeeklyReportCard        # Combined board + archive report
│   │   ├── ActivityTimeline        # Chronological completion history
│   │   ├── AIInsightsPanel         # Data-driven insights from real tasks
│   │   ├── LoadingSkeleton         # Animated skeleton loaders
│   │   ├── Toast                   # Notification system
│   │   └── CommandPalette          # Ctrl+K keyboard navigation
│   ├── dashboard/           # Protected main workspace
│   └── plan-history/        # Archived task browser
├── hooks/
│   ├── useTasks.tsx         # Task types and context
│   ├── useUndoRedo.ts       # Ref-based undo/redo stacks
│   ├── useStreakGuard.ts    # Midnight streak warning system
│   └── useMood.ts           # Mood context for AI adaptation
├── providers/
│   └── TasksProvider.tsx    # All task state, API calls, persistence
└── middleware.ts             # Clerk route protection
```

---

## Key Engineering Decisions

**Why session snapshots instead of always fetching from DB?**
Every mutation saves `{ tasks, archived }` as a JSONB blob to `task_history`. On load, the snapshot loads first — no round-trip to enumerate all tasks. Undo/redo works across refreshes because the full state is preserved, not just individual rows.

**Why refs for undo/redo instead of Zustand?**
Undo/redo stacks don't need to trigger re-renders — only the moment of undo matters. `useRef` keeps both stacks outside React's render cycle. Each mutation calls `structuredClone` on the previous state before writing.

**Why midnight archiving instead of 24 hours?**
A task done at 11pm would still show the next morning under a 24h rule. Midnight is the correct boundary for daily planning — users see a clean Done column every morning.

**Why `completed_at` snake_case everywhere?**
Early in development, the frontend sent `completedAt` (camelCase) but the API read `completed_at` (snake_case). Dates saved silently to nothing — no error, just wrong behavior. Fixed by standardising on snake_case throughout, matching the Supabase column name exactly.

**Why the history API shape mismatch was hard to find?**
The API expected `Array.isArray(body.snapshot)` but the provider sent `{ tasks, archived }` — an object. Every save returned 400 and wrote nothing. Tasks reverted on refresh. Streak reset. The fix was defining one shared type and using it in both places.

---

## Database Schema

```sql
CREATE TABLE tasks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL,
  status       TEXT DEFAULT 'todo',
  priority     TEXT DEFAULT 'medium',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE task_history (
  user_id  TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

---

## Local Development

```bash
git clone https://github.com/naimakader/Neurospace.git
cd Neurospace
npm install
cp .env.example .env.local
# fill in env vars
npm run dev
```

### Environment Variables

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

---

## What I Learned

**Silent failures are the hardest bugs.** A field name mismatch (`completedAt` vs `completed_at`) caused completion dates to never save. No error — just wrong data. Finding it required checking every layer from the DB schema to the API route to the provider.

**Data contracts between client and server need a single source of truth.** The history API and the provider independently defined the snapshot shape and disagreed. Defining one shared TypeScript type and importing it everywhere would have prevented the problem entirely.

**Product decisions matter as much as technical ones.** "Archive after 24 hours" sounds correct but fails at 11pm. Midnight is the right boundary. Small decisions like this are the difference between an app that feels right and one that feels subtly broken.

**Graceful degradation makes AI features production-ready.** Every AI endpoint has a local fallback that generates useful responses without an API call. The app works without OpenAI credits — it just gets smarter when you have them.

---

## Roadmap

- [ ] Google Calendar sync for AI-generated schedules
- [ ] Browser push notifications for streak warnings
- [ ] Mobile app with shared business logic
- [ ] Team workspaces with role-based permissions
- [ ] Weekly email digest via Resend

---

## Author

**Naima** — Frontend Developer  
[GitHub](https://github.com/naimakader) · [Live Demo](https://neurospace-zr2n.vercel.app)

---

## License

MIT
