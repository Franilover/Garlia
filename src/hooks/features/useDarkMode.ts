// hooks/useDarkMode.ts
// Guarda la preferencia en localStorage y la aplica al <html> automáticamente.
// Respeta también la preferencia del sistema operativo del usuario.

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>("light");

  // Al montar: leer preferencia guardada o usar la del sistema
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ?? (systemDark ? "dark" : "light");
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("theme", next);
  };

  return { theme, toggle, isDark: theme === "dark" };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}