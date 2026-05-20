"use client";
import { useTasks, Status, Task }  from "@/hooks/useTasks";
import { useState }                from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Timer }               from "lucide-react";
import AIPlannerModal              from "./AIPlannerModal";
import FocusMode, { FocusStep }    from "./FocusMode";

const COLUMNS: { label: string; value: Status; color: string }[] = [
  { label: "Todo",        value: "todo",       color: "text-blue-400"   },
  { label: "In Progress", value: "inprogress", color: "text-yellow-400" },
  { label: "Done",        value: "done",       color: "text-green-400"  },
];

export default function KanbanBoard() {
  const {
    tasks, startDrag, drop, remove, update,
    selectedIndex, setSelectedIndex,
  } = useTasks();

  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editValue,    setEditValue]    = useState("");
  const [overColumn,   setOverColumn]   = useState<Status | null>(null);
  const [aiTask,       setAiTask]       = useState<Task | null>(null);
  const [aiModalOpen,  setAiModalOpen]  = useState(false);
  const [focusTask,    setFocusTask]    = useState<Task | null>(null);
  const [focusOpen,    setFocusOpen]    = useState(false);

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setEditValue(title);
  }

  function saveEdit(id: string) {
    if (!editValue.trim()) { setEditingId(null); return; }
    update(id, editValue.trim());
    setEditingId(null);
  }

  function openFocus(task: Task) {
    setFocusTask(task);
    setFocusOpen(true);
  }

  function openAI(task: Task) {
    setAiTask(task);
    setAiModalOpen(true);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.value);

          return (
            <div
              key={col.value}
              onDragOver={(e) => { e.preventDefault(); setOverColumn(col.value); }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={() => {
                const colEnd = tasks.reduce(
                  (acc, t, i) => (t.status === col.value ? i + 1 : acc),
                  tasks.findIndex((t) => t.status === col.value) === -1
                    ? tasks.length
                    : tasks.findIndex((t) => t.status === col.value),
                );
                drop(colEnd, col.value);
                setOverColumn(null);
              }}
              className={`p-4 rounded-2xl min-h-[300px] transition-colors duration-150 ${
                overColumn === col.value
                  ? "bg-[#1a1e2e] ring-1 ring-purple-500/30"
                  : "bg-[#12141d]"
              }`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold text-sm ${col.color}`}>
                  {col.label}
                </h3>
                <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <AnimatePresence>
                {colTasks.map((task) => {
                  const globalIndex = tasks.findIndex((t) => t.id === task.id);
                  const isSelected  = selectedIndex === globalIndex;

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0  }}
                      exit={{   opacity: 0, scale: 0.95 }}
                      draggable
                      onDragStart={() => startDrag(globalIndex)}
                      onClick={() => setSelectedIndex(globalIndex)}
                      className={`group p-3 mb-2 rounded-xl cursor-pointer border transition-all duration-150 ${
                        isSelected
                          ? "border-purple-500/60 bg-[#202336] shadow-lg shadow-purple-500/10"
                          : "border-transparent bg-[#1a1d29] hover:border-white/10 hover:bg-[#1e2133]"
                      }`}
                    >
                      {editingId === task.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  saveEdit(task.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent text-white text-sm outline-none"
                        />
                      ) : (
                        <>
                          {/* Task title */}
                          <p className="text-sm text-white/90 leading-snug mb-2">
                            {task.title}
                          </p>

                          {/* Bottom row */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Priority badge */}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              task.priority === "high"
                                ? "bg-red-500/20 text-red-300"
                                : task.priority === "medium"
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : "bg-green-500/20 text-green-300"
                            }`}>
                              {task.priority}
                            </span>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* ✨ AI Plan button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); openAI(task); }}
                                title="Generate AI plan for this task"
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-[10px] font-medium transition-all"
                              >
                                <Zap className="w-3 h-3" />
                                AI Plan
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); openFocus(task); }}
                                title="Start a focus session for this task"
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-[10px] font-medium transition-all"
                              >
                                <Timer className="w-3 h-3" />
                                Focus
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); startEdit(task.id, task.title); }}
                                className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] transition"
                              >
                                Edit
                              </button>

                              <button
                                onClick={(e) => { e.stopPropagation(); remove(globalIndex); }}
                                className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {colTasks.length === 0 && (
                <p className="text-xs text-white/15 text-center mt-10 select-none">
                  {col.value === "todo" ? "Add a task above ↑" : "Drop tasks here"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Focus Mode — single task Pomodoro */}
      <FocusMode
        open={focusOpen}
        onClose={() => { setFocusOpen(false); setFocusTask(null); }}
        steps={focusTask ? [{
          id:      focusTask.id,
          title:   focusTask.title,
          minutes: 25,
        }] : []}
        taskId={focusTask?.id}
      />

      {/* AI Planner Modal */}
      <AIPlannerModal
        task={aiTask}
        open={aiModalOpen}
        onClose={() => { setAiModalOpen(false); setAiTask(null); }}
      />
    </>
  );}\