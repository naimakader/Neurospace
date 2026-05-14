"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextType = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

// ─── CONTEXT ─────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── ICONS + STYLES ──────────────────────────────────────────────────

const CONFIG: Record<
  ToastType,
  { Icon: any; bar: string; icon: string; bg: string; border: string }
> = {
  success: {
    Icon: CheckCircle2,
    bar: "bg-green-500",
    icon: "text-green-400",
    bg: "bg-[#0f111a]",
    border: "border-green-500/30",
  },
  error: {
    Icon: AlertCircle,
    bar: "bg-red-500",
    icon: "text-red-400",
    bg: "bg-[#0f111a]",
    border: "border-red-500/30",
  },
  info: {
    Icon: Info,
    bar: "bg-purple-500",
    icon: "text-purple-400",
    bg: "bg-[#0f111a]",
    border: "border-purple-500/30",
  },
};

// ─── PROVIDER ────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const success = useCallback((m: string) => push("success", m), [push]);
  const error = useCallback((m: string) => push("error", m), [push]);
  const info = useCallback((m: string) => push("info", m), [push]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}

      {/* Toast container — bottom right */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        <AnimatePresence>
          {toasts.map((toast) => {
            const { Icon, bar, icon, bg, border } = CONFIG[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 260 }}
                className={`relative flex items-start gap-3 p-3.5 rounded-xl border shadow-xl overflow-hidden ${bg} ${border}`}
              >
                {/* Animated progress bar */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-0.5 ${bar}`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4, ease: "linear" }}
                />

                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${icon}`} />

                <p className="text-sm text-white/80 flex-1 leading-snug">
                  {toast.message}
                </p>

                <button
                  onClick={() => dismiss(toast.id)}
                  className="text-white/20 hover:text-white/60 transition flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
