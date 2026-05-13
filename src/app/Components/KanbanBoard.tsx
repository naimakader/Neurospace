"use client";
import { useTasks, Status } from "@/hooks/useTasks";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLUMNS: { label: string; value: Status }[] = [
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "inprogress" },
  { label: "Done", value: "done" },
];

export default function KanbanBoard() {
  const {
    tasks,
    startDrag,
    drop,
    remove,
    update,
    selectedIndex,
    setSelectedIndex,
  } = useTasks();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [overColumn, setOverColumn] = useState<Status | null>(null);

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setEditValue(title);
  }

  function saveEdit(id: string) {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    update(id, editValue.trim());
    setEditingId(null);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.value);

        return (
          <div
            key={col.value}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(col.value);
            }}
            onDragLeave={() => setOverColumn(null)}
            onDrop={() => {
              // ✅ BUG FIX: was `drop(tasks.length, col.value)` which always
              // dropped the card at the very end of the ALL-tasks array —
              // not just the column. Now we insert at end of this column's slice.
              const colEndIndex = tasks.reduce(
                (acc, t, i) => (t.status === col.value ? i + 1 : acc),
                tasks.findIndex((t) => t.status === col.value) === -1
                  ? tasks.length
                  : tasks.findIndex((t) => t.status === col.value),
              );
              drop(colEndIndex, col.value);
              setOverColumn(null);
            }}
            className={`p-4 rounded-xl min-h-[300px] transition-colors ${
              overColumn === col.value ? "bg-[#1a1e2e]" : "bg-[#12141d]"
            }`}
          >
            <h3 className="text-white mb-4 font-semibold flex items-center gap-2">
              {col.label}
              <span className="text-xs text-white/40 font-normal">
                ({colTasks.length})
              </span>
            </h3>

            <AnimatePresence>
              {colTasks.map((task) => {
                const globalIndex = tasks.findIndex((t) => t.id === task.id);
                const isSelected = selectedIndex === globalIndex;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    draggable
                    onDragStart={() => startDrag(globalIndex)}
                    onClick={() => setSelectedIndex(globalIndex)}
                    className={`p-3 mb-2 rounded-lg cursor-pointer border transition-colors ${
                      isSelected
                        ? "border-purple-500 bg-[#202336]"
                        : "border-transparent bg-[#1a1d29] hover:border-white/10"
                    }`}
                  >
                    {editingId === task.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(task.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full bg-transparent text-white outline-none text-sm"
                      />
                    ) : (
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-sm text-white/90 flex-1">
                          {task.title}
                        </span>
                        <div className="flex gap-2 text-xs flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(task.id, task.title);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(globalIndex);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          task.priority === "high"
                            ? "bg-red-500/20    text-red-300"
                            : task.priority === "medium"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-green-500/20  text-green-300"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {colTasks.length === 0 && (
              <p className="text-xs text-white/20 text-center mt-8">
                Drop tasks here
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
