"use client";
import { useEffect, useState } from "react";
import { Task } from "@/hooks/useTasks";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, title: string) => void;
};

export default function TaskModal({ task, open, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
    }
  }, [task]);

  function handleSave() {
    if (!title.trim() || !task) return;
    onSave(task.id, title.trim());
    onClose();
  }

  return (
    <AnimatePresence>
      {open && task && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl bg-[#0b0d14] border border-white/10 p-6 shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Task Details</h2>
            </div>

            <div className="mb-5">
              <label className="block text-xs text-white/40 mb-2">
                Task title
              </label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 rounded-lg bg-[#12141d] border border-white/10 text-white outline-none focus:border-purple-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs text-white/40 mb-2">Status</label>

              <div className="text-sm text-white/70 capitalize">
                {task.status}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
              >
                Cancel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm"
              >
                Save
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
