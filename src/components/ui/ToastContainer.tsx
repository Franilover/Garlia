"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { ToastType } from "@/hooks/ui/useToast";
import { Text } from "@/components/ui/Tiopgrafia";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const CONFIG: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <CheckCircle2 size={14} />,
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  error: {
    icon: <AlertCircle size={14} />,
    classes: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    classes: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  info: {
    icon: <Info size={14} />,
    classes: "bg-primary/8 text-primary border-primary/20",
  },
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const { icon, classes } = CONFIG[t.type];
          return (
            <MotionDiv
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className={`
                pointer-events-auto
                flex items-center gap-3 px-5 py-3 rounded-[var(--radius-btn)]
                border text-[11px] font-black uppercase tracking-widest
                shadow-lg backdrop-blur-sm whitespace-nowrap
                ${classes}
              `}
            >
              {icon}
              <span>{t.message}</span>
              <button
                onClick={() => onDismiss(t.id)}
                className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </MotionDiv>
          );
        })}
      </AnimatePresence>
    </div>
  );
}