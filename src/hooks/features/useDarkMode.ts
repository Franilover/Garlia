/**
 * DEPRECADO — usar useTheme() de @/providers/ThemeProvider directamente.
 * Este archivo existe solo para no romper imports existentes mientras se migra.
 *
 * Migración:
 *   ANTES: const { isDark, toggle } = useDarkMode()
 *   AHORA: const { dark, toggleDark } = useTheme()
 *          isDark  → dark === "dark"
 *          toggle  → toggleDark
 */
"use client";
import { useTheme } from "@/providers/ThemeProvider";

export function useDarkMode() {
  const { dark, toggleDark } = useTheme();
  return {
    theme:  dark,
    isDark: dark === "dark",
    toggle: toggleDark,
  };
}