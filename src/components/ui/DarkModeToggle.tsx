import { MotionButton, MotionSpan } from '@/components/ui/Motion';
"use client";
import { useTheme } from "@/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function DarkModeToggle() {
  const { dark, toggleDark } = useTheme();
  const isDark = dark === "dark";

  return (
    <MotionButton
      onClick={toggleDark}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      className="
        relative w-10 h-10 flex items-center justify-center
        rounded-xl bg-[var(--bg-menu)] text-[var(--foreground)]
        border border-primary/20 shadow-sm
        hover:border-primary/50 transition-colors
      "
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <MotionSpan
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun size={16} />
          </MotionSpan>
        ) : (
          <MotionSpan
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon size={16} />
          </MotionSpan>
        )}
      </AnimatePresence>
    </MotionButton>
  );
}