"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeName = "default" | "pixel" | "scribble";
export type DarkMode  = "light" | "dark";

interface ThemeCtx {
  theme:     ThemeName;
  dark:      DarkMode;
  setTheme:  (t: ThemeName) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

const THEMES: { id: ThemeName; label: string; emoji: string }[] = [
  { id: "default",  label: "Minimalista",  emoji: "🪻" },
  { id: "pixel",    label: "Retro",    emoji: "👾" },
  { id: "scribble", label: "Manuscrito", emoji: "✏️" },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("default");
  const [dark,  setDarkState]  = useState<DarkMode>("light");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("app-theme") as ThemeName | null;
      const savedDark  = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      if (savedTheme) setThemeState(savedTheme);
      if (savedDark === "dark" || (!savedDark && prefersDark)) setDarkState("dark");
    } catch {}
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    if (dark === "dark") {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const setTheme = (t: ThemeName) => setThemeState(t);
  const toggleDark = () => setDarkState(d => d === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, dark, setTheme, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}

export function ThemeSelector() {
  const { theme, setTheme, toggleDark, dark } = useTheme();

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Tema</p>
      <div className="flex flex-col gap-2">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
              theme === t.id
                ? "bg-primary text-white border-primary"
                : "bg-bg-main border-primary/15 text-primary/60 hover:border-primary/40 hover:text-primary"
            }`}
          >
            <span className="text-lg leading-none">{t.emoji}</span>
            <p className="text-[11px] font-black uppercase tracking-wide leading-none">{t.label}</p>
          </button>
        ))}
      </div>
      <button
        onClick={toggleDark}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-primary/15 bg-bg-main text-primary/60 hover:border-primary/40 hover:text-primary transition-all mt-1"
      >
        <span className="text-lg leading-none">{dark === "dark" ? "☀️" : "🌙"}</span>
        <p className="text-[11px] font-black uppercase tracking-wide">
          {dark === "dark" ? "Modo claro" : "Modo oscuro"}
        </p>
      </button>
    </div>
  );
}