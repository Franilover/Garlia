"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeName   = "default" | "pixel" | "scribble";
export type DarkMode    = "light" | "dark";
export type AccentColor = "purple" | "yellow" | "blue" | "red" | "green" | "trans" | "lesbian" | "gay" | "aromantic" | "mlm";

interface ThemeCtx {
  theme:      ThemeName;
  dark:       DarkMode;
  accent:     AccentColor;
  setTheme:   (t: ThemeName) => void;
  toggleDark: () => void;
  setAccent:  (a: AccentColor) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

// ─── Paletas de color por acento ─────────────────────────────────────────────
// Cada acento define primary, accent y bg-main para light y dark.
// El resto de variables (bg-menu, foreground, etc.) se derivan del primary.

const ACCENT_PALETTES: Record<AccentColor, {
  light: Record<string, string>;
  dark:  Record<string, string>;
}> = {
  purple: {
    light: {
      "--primary":    "#67556d",
      "--accent":     "#be97d1",
      "--bg-main":    "#e4d7e6",
      "--bg-menu":    "#67556d",
      "--foreground": "#3a2e3d",
      "--white-custom":"#ffffff",
      "--input-bg":   "#ffffff",
      "--input-text": "#3a2e3d",
      "--btn-text":   "#ffffff",
    },
    dark: {
      "--primary":    "#b89ec8",
      "--accent":     "#9d70b5",
      "--bg-main":    "#1c1720",
      "--bg-menu":    "#251e2c",
      "--foreground": "#e8daf2",
      "--white-custom":"#28202f",
      "--input-bg":   "#32273c",
      "--input-text": "#e8daf2",
      "--btn-text":   "#1c1720",
    },
  },
  yellow: {
    light: {
      "--primary":    "#7a6530",
      "--accent":     "#e8c84a",
      "--bg-main":    "#f5edcd",
      "--bg-menu":    "#7a6530",
      "--foreground": "#3d300f",
      "--white-custom":"#fffef5",
      "--input-bg":   "#fffef5",
      "--input-text": "#3d300f",
      "--btn-text":   "#fffef5",
    },
    dark: {
      "--primary":    "#d4aa45",
      "--accent":     "#f0c93a",
      "--bg-main":    "#1a1608",
      "--bg-menu":    "#231e0a",
      "--foreground": "#f5e9c0",
      "--white-custom":"#26200e",
      "--input-bg":   "#302810",
      "--input-text": "#f5e9c0",
      "--btn-text":   "#1a1608",
    },
  },
  blue: {
    light: {
      "--primary":    "#2d5580",
      "--accent":     "#5ba3e0",
      "--bg-main":    "#d6e8f5",
      "--bg-menu":    "#2d5580",
      "--foreground": "#0d2540",
      "--white-custom":"#f0f7fd",
      "--input-bg":   "#f0f7fd",
      "--input-text": "#0d2540",
      "--btn-text":   "#f0f7fd",
    },
    dark: {
      "--primary":    "#6aaad4",
      "--accent":     "#4488cc",
      "--bg-main":    "#080f1a",
      "--bg-menu":    "#0d1826",
      "--foreground": "#d0e8f8",
      "--white-custom":"#101c2e",
      "--input-bg":   "#162438",
      "--input-text": "#d0e8f8",
      "--btn-text":   "#080f1a",
    },
  },
  red: {
    light: {
      "--primary":    "#8b3030",
      "--accent":     "#d96060",
      "--bg-main":    "#f5d8d8",
      "--bg-menu":    "#8b3030",
      "--foreground": "#3d0f0f",
      "--white-custom":"#fff5f5",
      "--input-bg":   "#fff5f5",
      "--input-text": "#3d0f0f",
      "--btn-text":   "#fff5f5",
    },
    dark: {
      "--primary":    "#c87070",
      "--accent":     "#b04444",
      "--bg-main":    "#1a0808",
      "--bg-menu":    "#260e0e",
      "--foreground": "#f5d8d8",
      "--white-custom":"#2e1010",
      "--input-bg":   "#3c1414",
      "--input-text": "#f5d8d8",
      "--btn-text":   "#1a0808",
    },
  },
  green: {
    light: {
      "--primary":    "#2d6b45",
      "--accent":     "#5ab87a",
      "--bg-main":    "#d4eddc",
      "--bg-menu":    "#2d6b45",
      "--foreground": "#0d2d1a",
      "--white-custom":"#f0faf3",
      "--input-bg":   "#f0faf3",
      "--input-text": "#0d2d1a",
      "--btn-text":   "#f0faf3",
    },
    dark: {
      "--primary":    "#68b887",
      "--accent":     "#3d9960",
      "--bg-main":    "#08140d",
      "--bg-menu":    "#0d1f13",
      "--foreground": "#c8ecd6",
      "--white-custom":"#102016",
      "--input-bg":   "#142a1c",
      "--input-text": "#c8ecd6",
      "--btn-text":   "#08140d",
    },
  },
  // ── Bandera Trans ⚧ ──────────────────────────────────────────────────────
  trans: {
    light: {
      "--primary":     "#5bbcd4",
      "--accent":      "#f4a7b9",
      "--bg-main":     "#ddf0f6",
      "--bg-menu":     "#5bbcd4",
      "--foreground":  "#0d3a45",
      "--white-custom":"#f0fafd",
      "--input-bg":    "#f0fafd",
      "--input-text":  "#0d3a45",
      "--btn-text":    "#ffffff",
    },
    dark: {
      "--primary":     "#7dd4e8",
      "--accent":      "#f4a7b9",
      "--bg-main":     "#071418",
      "--bg-menu":     "#0c1f25",
      "--foreground":  "#d8f2f8",
      "--white-custom":"#0f2028",
      "--input-bg":    "#152830",
      "--input-text":  "#d8f2f8",
      "--btn-text":    "#071418",
    },
  },
  // ── Bandera Lésbica 🏳️‍🌈 ──────────────────────────────────────────────────
  lesbian: {
    light: {
      "--primary":     "#b3306a",
      "--accent":      "#f4803a",
      "--bg-main":     "#fce8f0",
      "--bg-menu":     "#b3306a",
      "--foreground":  "#3d0a1e",
      "--white-custom":"#fff0f5",
      "--input-bg":    "#fff0f5",
      "--input-text":  "#3d0a1e",
      "--btn-text":    "#ffffff",
    },
    dark: {
      "--primary":     "#e0608a",
      "--accent":      "#f4803a",
      "--bg-main":     "#190710",
      "--bg-menu":     "#240d18",
      "--foreground":  "#fcd8e8",
      "--white-custom":"#2c1020",
      "--input-bg":    "#381428",
      "--input-text":  "#fcd8e8",
      "--btn-text":    "#190710",
    },
  },
  // ── Bandera Gay (arcoíris) 🌈 ─────────────────────────────────────────────
  gay: {
    light: {
      "--primary":     "#7e3fa8",
      "--accent":      "#e8473f",
      "--bg-main":     "#f2e8fa",
      "--bg-menu":     "#7e3fa8",
      "--foreground":  "#280d40",
      "--white-custom":"#faf2fe",
      "--input-bg":    "#faf2fe",
      "--input-text":  "#280d40",
      "--btn-text":    "#ffffff",
    },
    dark: {
      "--primary":     "#c07ae0",
      "--accent":      "#e8473f",
      "--bg-main":     "#110820",
      "--bg-menu":     "#1a0e2e",
      "--foreground":  "#ecdcfa",
      "--white-custom":"#20103a",
      "--input-bg":    "#2a1548",
      "--input-text":  "#ecdcfa",
      "--btn-text":    "#110820",
    },
  },
  // ── Bandera Aromantic 💚 ──────────────────────────────────────────────────
  aromantic: {
    light: {
      "--primary":     "#3d7a44",
      "--accent":      "#a8c090",
      "--bg-main":     "#e0eddc",
      "--bg-menu":     "#3d7a44",
      "--foreground":  "#0f2212",
      "--white-custom":"#f0f8ee",
      "--input-bg":    "#f0f8ee",
      "--input-text":  "#0f2212",
      "--btn-text":    "#ffffff",
    },
    dark: {
      "--primary":     "#70b878",
      "--accent":      "#a8c090",
      "--bg-main":     "#080f09",
      "--bg-menu":     "#0d180e",
      "--foreground":  "#cce8d0",
      "--white-custom":"#101e12",
      "--input-bg":    "#162818",
      "--input-text":  "#cce8d0",
      "--btn-text":    "#080f09",
    },
  },
  // ── Bandera MLM / Gay Masc 🩵💚 ──────────────────────────────────────────
  mlm: {
    light: {
      "--primary":     "#2d6899",
      "--accent":      "#4db885",
      "--bg-main":     "#d8eaf8",
      "--bg-menu":     "#2d6899",
      "--foreground":  "#082035",
      "--white-custom":"#eaf4fd",
      "--input-bg":    "#eaf4fd",
      "--input-text":  "#082035",
      "--btn-text":    "#ffffff",
    },
    dark: {
      "--primary":     "#5aaad8",
      "--accent":      "#4db885",
      "--bg-main":     "#060f18",
      "--bg-menu":     "#0a1825",
      "--foreground":  "#c8e4f8",
      "--white-custom":"#0e1e30",
      "--input-bg":    "#132840",
      "--input-text":  "#c8e4f8",
      "--btn-text":    "#060f18",
    },
  },
};

// ─── Metadatos de UI para cada acento ────────────────────────────────────────
export const ACCENT_OPTIONS: { id: AccentColor; label: string; hex: string; pride?: boolean; gradient?: string }[] = [
  { id: "purple",    label: "Lila",       hex: "#9d70b5" },
  { id: "yellow",    label: "Dorado",     hex: "#e8c84a" },
  { id: "blue",      label: "Azul",       hex: "#5ba3e0" },
  { id: "red",       label: "Rojo",       hex: "#d96060" },
  { id: "green",     label: "Verde",      hex: "#5ab87a" },
  // Pride flags
  { id: "trans",     label: "Trans",      hex: "#5bbcd4", pride: true, gradient: "linear-gradient(180deg, #5bcefa 0%, #5bcefa 20%, #f5a9b8 20%, #f5a9b8 40%, #ffffff 40%, #ffffff 60%, #f5a9b8 60%, #f5a9b8 80%, #5bcefa 80%)" },
  { id: "lesbian",   label: "Lésbica",    hex: "#b3306a", pride: true, gradient: "linear-gradient(180deg, #d62900 0%, #d62900 20%, #ff9b55 20%, #ff9b55 40%, #ffffff 40%, #ffffff 60%, #d461a6 60%, #d461a6 80%, #a50062 80%)" },
  { id: "gay",       label: "Gay",        hex: "#7e3fa8", pride: true, gradient: "linear-gradient(180deg, #e40303 0%, #e40303 16.6%, #ff8c00 16.6%, #ff8c00 33.2%, #ffed00 33.2%, #ffed00 50%, #008026 50%, #008026 66.6%, #004dff 66.6%, #004dff 83.2%, #750787 83.2%)" },
  { id: "aromantic", label: "Aromantic",  hex: "#3d7a44", pride: true, gradient: "linear-gradient(180deg, #3da542 0%, #3da542 20%, #a8d379 20%, #a8d379 40%, #ffffff 40%, #ffffff 60%, #a9a9a9 60%, #a9a9a9 80%, #000000 80%)" },
  { id: "mlm",       label: "Gay Masc",   hex: "#2d6899", pride: true, gradient: "linear-gradient(180deg, #078d70 0%, #078d70 20%, #98e8c1 20%, #98e8c1 40%, #ffffff 40%, #ffffff 60%, #7bade2 60%, #7bade2 80%, #3d1a8e 80%)" },
];

const THEMES: { id: ThemeName; label: string; emoji: string }[] = [
  { id: "default",  label: "Minimalista", emoji: "🪻" },
  { id: "pixel",    label: "Retro",       emoji: "👾" },
  { id: "scribble", label: "Antiguo",     emoji: "✏️" },
];

// ─── Aplicar paleta al DOM ────────────────────────────────────────────────────
function applyAccentPalette(accent: AccentColor, dark: DarkMode) {
  const palette = ACCENT_PALETTES[accent][dark];
  const root = document.documentElement;
  Object.entries(palette).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,  setThemeState]  = useState<ThemeName>("scribble");
  const [dark,   setDarkState]   = useState<DarkMode>("dark");
  const [accent, setAccentState] = useState<AccentColor>("purple");

  // Cargar preferencias guardadas
  useEffect(() => {
    try {
      const savedTheme  = localStorage.getItem("app-theme")  as ThemeName   | null;
      const savedDark   = localStorage.getItem("theme")       as DarkMode    | null;
      const savedAccent = localStorage.getItem("app-accent")  as AccentColor | null;
      if (savedTheme)  setThemeState(savedTheme);
      if (savedDark)   setDarkState(savedDark);
      if (savedAccent) setAccentState(savedAccent);
    } catch {}
  }, []);

  // Aplicar tema (data-theme)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  // Aplicar dark mode
  useEffect(() => {
    if (dark === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    // Re-aplicar paleta cuando cambia el modo
    applyAccentPalette(accent, dark);
  }, [dark, accent]);

  // Aplicar paleta de acento
  useEffect(() => {
    applyAccentPalette(accent, dark);
    localStorage.setItem("app-accent", accent);
  }, [accent, dark]);

  const setTheme  = (t: ThemeName)   => setThemeState(t);
  const setAccent = (a: AccentColor) => setAccentState(a);
  const toggleDark = () => setDarkState(d => d === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, dark, accent, setTheme, toggleDark, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}

// ─── ThemeSelector — panel del sidebar ───────────────────────────────────────
export function ThemeSelector() {
  const { theme, setTheme, toggleDark, dark, accent, setAccent } = useTheme();

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Selector de tema */}
      <div className="flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Diseño</p>
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

      {/* Selector de color */}
      <div className="flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Color</p>
        <div className="flex gap-2 flex-wrap">
          {ACCENT_OPTIONS.filter(a => !a.pride).map(a => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              title={a.label}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                accent === a.id
                  ? "scale-110 border-white shadow-lg"
                  : "border-transparent hover:scale-105 opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: a.hex }}
            />
          ))}
        </div>
      </div>

      {/* Pride flags */}
      <div className="flex flex-col gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Bordes</p>
        <div className="flex gap-2 flex-wrap">
          {ACCENT_OPTIONS.filter(a => a.pride).map(a => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              title={a.label}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                accent === a.id
                  ? "scale-110 border-white shadow-lg"
                  : "border-transparent hover:scale-105 opacity-70 hover:opacity-100"
              }`}
              style={{ background: a.gradient || a.hex, backgroundSize: "100% 100%" }}
            />
          ))}
        </div>
      </div>

      {/* Toggle dark */}
      <button
        onClick={toggleDark}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-primary/15 bg-bg-main text-primary/60 hover:border-primary/40 hover:text-primary transition-all"
      >
        <span className="text-lg leading-none">{dark === "dark" ? "☀️" : "🌙"}</span>
        <p className="text-[11px] font-black uppercase tracking-wide">
          {dark === "dark" ? "Modo claro" : "Modo oscuro"}
        </p>
      </button>

    </div>
  );
}