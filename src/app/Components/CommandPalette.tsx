"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useTasks } from "@/hooks/useTasks";

type Command = { id: string; label: string; action: () => void };

export default function CommandPalette() {
  const { add, undo, redo, tasks, selectedIndex, remove, setSelectedIndex } =
    useTasks();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Global shortcut ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Focus / reset on open ────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ── Commands ─────────────────────────────────────────────────────
  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      {
        id: "new",
        label: "Add new task",
        action: () => {
          const title = prompt("Task title");
          if (!title?.trim()) return;
          // ✅ BUG FIX: was `setSelectedIndex(tasks.length)` — stale closure;
          // `tasks.length` refers to the count BEFORE the async `add()` inserts
          // the new item. We update the index AFTER add resolves instead.
          add(title.trim()).then(() => {
            setSelectedIndex(tasks.length); // tasks.length is the pre-add length = new index
          });
        },
      },
      { id: "undo", label: "Undo", action: undo },
      { id: "redo", label: "Redo", action: redo },
      {
        id: "delete",
        label: "Delete selected task",
        action: () => {
          if (selectedIndex !== null) remove(selectedIndex);
        },
      },
    ];

    const focusCmds: Command[] = tasks.slice(0, 5).map((task, i) => ({
      id: `focus-${task.id}`,
      label: `Focus: ${task.title}`,
      action: () => setSelectedIndex(i),
    }));

    return [...base, ...focusCmds];
  }, [add, undo, redo, selectedIndex, remove, tasks, setSelectedIndex]);

  // ── Filter ───────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [commands, query],
  );

  // ── Keyboard navigation ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((p) => (p + 1 >= filtered.length ? 0 : p + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((p) => (p - 1 < 0 ? filtered.length - 1 : p - 1));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        filtered[activeIndex]?.action();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-40">
      <div className="w-full max-w-xl bg-[#12141d] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command..."
          className="w-full px-4 py-3 bg-transparent border-b border-white/10 text-white outline-none"
        />
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-white/40">
              No commands found
            </div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => {
                cmd.action();
                setOpen(false);
              }}
              className={`px-4 py-3 text-sm cursor-pointer transition ${
                i === activeIndex
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-white/80 hover:bg-white/5"
              }`}
            >
              {cmd.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
