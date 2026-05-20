"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
// ─── TYPES ───────────────────────────────────────────────────────────

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

// ─── SUGGESTED PROMPTS ───────────────────────────────────────────────

const SUGGESTIONS = [
  "What should I work on first today?",
  "I only have 30 minutes — what can I finish?",
  "Why am I falling behind this week?",
  "Plan my morning for me",
  "How is my productivity this week?",
];

// ─── HELPERS ─────────────────────────────────────────────────────────

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcStreak(tasks: any[], archived: any[]): number {
  const all = [...tasks, ...archived].filter((t) => t.completed_at);
  const dateSet = new Set(
    all.map((t) => localDateStr(new Date(t.completed_at))),
  );
  let count = 0;
  let cursor = new Date();
  while (true) {
    const key = localDateStr(cursor);
    if (!dateSet.has(key)) {
      if (key === localDateStr(new Date())) {
        cursor = new Date(cursor.getTime() - 86_400_000);
        continue;
      }
      break;
    }
    count++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return count;
}

function calcCompletionRate(tasks: any[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

// ─── MESSAGE BUBBLE ──────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-purple-600 text-white rounded-tr-sm"
            : "bg-white/8 text-white/90 border border-white/5 rounded-tl-sm"
        }`}
      >
        {msg.content}
        {msg.content === "" && (
          <span className="inline-flex gap-1 items-center">
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────

export default function NeuroChat({ open, onClose }: Props) {
  const { tasks, archivedTasks } = useTasks();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm Neuro 👋 I can see all your tasks and stats. Ask me anything — what to work on, how your week is going, or to plan your morning.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // ─── SEND MESSAGE ──────────────────────────────────────────────────
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setInput("");

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
      };
      const assistantId = `${Date.now()}-ai`;

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setStreaming(true);

      try {
        const history = messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...history, { role: "user", content: trimmed }],
            context: {
              tasks,
              archived: archivedTasks,
              streak: calcStreak(tasks, archivedTasks),
              completionRate: calcCompletionRate(tasks),
            },
          }),
        });

        if (!res.ok) throw new Error("Request failed");

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("text/event-stream")) {
          // ✅ Streaming SSE response
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") {
                setStreaming(false);
                return;
              }
              try {
                const { text } = JSON.parse(data);
                if (text) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + text }
                        : m,
                    ),
                  );
                }
              } catch {}
            }
          }
        } else {
          // Fallback non-streaming JSON response
          const json = await res.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      json.content ?? "Sorry, I couldn't respond right now.",
                  }
                : m,
            ),
          );
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                }
              : m,
          ),
        );
      } finally {
        setStreaming(false);
      }
    },
    [streaming, messages, tasks, archivedTasks],
  );

  // ─── UI ────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — mobile only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />

          {/* Chat drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm flex flex-col bg-[#0d0f1a] border-l border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Neuro</div>
                  <div className="text-white/30 text-xs">
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""} ·{" "}
                    {calcStreak(tasks, archivedTasks)}d streak
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.map((msg) => (
                <Bubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions — show only when just the welcome message */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 text-white/50 border border-white/10 hover:border-purple-500/30 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-4 border-t border-white/5">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-purple-500/50 transition">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask Neuro anything..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/20"
                  disabled={streaming}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || streaming}
                  className={`flex-shrink-0 transition ${
                    input.trim() && !streaming
                      ? "text-purple-400 hover:text-purple-300"
                      : "text-white/20"
                  }`}
                >
                  {streaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-white/15 text-[10px] text-center mt-2">
                Neuro knows your tasks · Powered by GPT-4o-mini
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
