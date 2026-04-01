"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * Tipos de configuración visual.
 */
export type ThemeName   = "default" | "pixel" | "scribble" | "mlm";
export type DarkMode    = "light" | "dark";
export type AccentColor = "purple" | "yellow" | "blue" | "red" | "green";

interface ThemeCtx {
  theme:      ThemeName;
  dark:       DarkMode;
  accent:     AccentColor;
  setTheme:   (t: ThemeName) => void;
  toggleDark: () => void;
  setAccent:  (a: AccentColor) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

// ─── Paletas de acento (colores estándar) ──────────────────────────────────
// Se han restaurado TODAS las variables necesarias (--white-custom, --input-bg, --input-text)
// para evitar que los inputs o modales pierdan su color en Tailwind.
const ACCENT_PALETTES: Record<AccentColor, {
  light: Record<string, string>;
  dark:  Record<string, string>;
}> = {
  purple: {
    light: {
      "--primary":      "#67556d",
      "--accent":       "#be97d1",
      "--bg-main":      "#e4d7e6",
      "--bg-menu":      "#67556d",
      "--foreground":   "#3a2e3d",
      "--white-custom": "#ffffff",
      "--input-bg":     "#ffffff",
      "--input-text":   "#3a2e3d",
    },
    dark: {
      "--primary":      "#be97d1",
      "--accent":       "#67556d",
      "--bg-main":      "#1a161c",
      "--bg-menu":      "#2a242e",
      "--foreground":   "#e4d7e6",
      "--white-custom": "#2a242e",
      "--input-bg":     "#352e3a",
      "--input-text":   "#e4d7e6",
    }
  },
  yellow: {
    light: { 
      "--primary": "#856404", "--accent": "#ffc107", "--bg-main": "#fff3cd", "--bg-menu": "#856404", "--foreground": "#3d2e02",
      "--white-custom": "#ffffff", "--input-bg": "#ffffff", "--input-text": "#3d2e02"
    },
    dark:  { 
      "--primary": "#ffc107", "--accent": "#856404", "--bg-main": "#1a1401", "--bg-menu": "#2b2102", "--foreground": "#fff3cd",
      "--white-custom": "#2b2102", "--input-bg": "#3d2f03", "--input-text": "#fff3cd"
    }
  },
  blue: {
    light: { 
      "--primary": "#004085", "--accent": "#007bff", "--bg-main": "#cce5ff", "--bg-menu": "#004085", "--foreground": "#002752",
      "--white-custom": "#ffffff", "--input-bg": "#ffffff", "--input-text": "#002752"
    },
    dark:  { 
      "--primary": "#74b9ff", "--accent": "#004085", "--bg-main": "#010b1a", "--bg-menu": "#021a35", "--foreground": "#cce5ff",
      "--white-custom": "#021a35", "--input-bg": "#03254c", "--input-text": "#cce5ff"
    }
  },
  red: {
    light: { 
      "--primary": "#721c24", "--accent": "#dc3545", "--bg-main": "#f8d7da", "--bg-menu": "#721c24", "--foreground": "#491217",
      "--white-custom": "#ffffff", "--input-bg": "#ffffff", "--input-text": "#491217"
    },
    dark:  { 
      "--primary": "#ff7675", "--accent": "#721c24", "--bg-main": "#1a0608", "--bg-menu": "#310c0f", "--foreground": "#f8d7da",
      "--white-custom": "#310c0f", "--input-bg": "#491217", "--input-text": "#f8d7da"
    }
  },
  green: {
    light: { 
      "--primary": "#155724", "--accent": "#28a745", "--bg-main": "#d4edda", "--bg-menu": "#155724", "--foreground": "#0b2e13",
      "--white-custom": "#ffffff", "--input-bg": "#ffffff", "--input-text": "#0b2e13"
    },
    dark:  { 
      "--primary": "#55efc4", "--accent": "#155724", "--bg-main": "#051408", "--bg-menu": "#0b2e13", "--foreground": "#d4edda",
      "--white-custom": "#0b2e13", "--input-bg": "#124b1f", "--input-text": "#d4edda"
    }
  }
};

// ─── Paleta especial para el tema MLM ──────────────────────────────────────
// Incluye fallbacks (colores de respaldo hex) por si las variables CSS no cargan
const MLM_PALETTE = {
  light: {
    "--primary":      "var(--mlm-green-dark, #2d4a22)",
    "--accent":       "var(--mlm-purple, #7b4b94)",
    "--bg-main":      "#f4fcf4",
    "--bg-menu":      "var(--mlm-green-dark, #2d4a22)",
    "--foreground":   "#0b2e13",
    "--white-custom": "#ffffff",
    "--input-bg":     "#ffffff",
    "--input-text":   "#0b2e13",
  },
  dark: {
    "--primary":      "var(--mlm-green-light, #a3c995)",
    "--accent":       "var(--mlm-purple-dark, #4a2b5e)",
    "--bg-main":      "#0a0d0a",
    "--bg-menu":      "var(--mlm-green-dark, #152410)",
    "--foreground":   "#d4edda",
    "--white-custom": "#111c0d",
    "--input-bg":     "#152410",
    "--input-text":   "#d4edda",
  }
};

export const ACCENT_OPTIONS: { id: AccentColor; label: string; hex: string }[] = [
  { id: "purple", label: "Lavanda", hex: "#67556d" },
  { id: "yellow", label: "Miel",    hex: "#856404" },
  { id: "blue",   label: "Océano",  hex: "#004085" },
  { id: "red",    label: "Cereza",  hex: "#721c24" },
  { id: "green",  label: "Bosque",  hex: "#155724" },
];

const THEMES: { id: ThemeName; label: string; emoji: string }[] = [
  { id: "default",  label: "Modern",   emoji: "✨" },
  { id: "pixel",    label: "Pixel",    emoji: "👾" },
  { id: "scribble", label: "Boceto",   emoji: "✏️" },
  { id: "mlm",      label: "MLM",      emoji: "🌿" }, 
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme]   = useState<ThemeName>("default");
  const [dark, setDark]     = useState<DarkMode>("light");
  const [accent, setAccent] = useState<AccentColor>("purple");

  useEffect(() => {
    const savedT = localStorage.getItem("app-theme") as ThemeName;
    const savedD = localStorage.getItem("app-dark")  as DarkMode;
    const savedA = localStorage.getItem("app-accent") as AccentColor;
    if (savedT) setTheme(savedT);
    if (savedD) setDark(savedD);
    if (savedA) setAccent(savedA);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem("app-theme", theme);
    localStorage.setItem("app-dark",  dark);
    localStorage.setItem("app-accent", accent);

    root.classList.remove("light", "dark");
    root.classList.add(dark);
    root.setAttribute("data-theme", theme);

    // Selección inteligente de la paleta según el tema y el modo oscuro
    const activePalette = theme === "mlm" ? MLM_PALETTE[dark] : ACCENT_PALETTES[accent][dark];
    
    if (activePalette) {
      Object.entries(activePalette).forEach(([key, val]) => {
        root.style.setProperty(key, val);
      });
    }

  }, [theme, dark, accent]);

  const toggleDark = () => setDark(prev => prev === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, dark, accent, setTheme, toggleDark, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export const ThemeSelector = () => {
  const { theme, setTheme, dark, toggleDark, accent, setAccent } = useTheme();

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all ${
              theme === t.id 
                ? "bg-primary text-white border-primary shadow-md scale-[1.02]" 
                : "bg-bg-main text-primary/70 border-primary/10 hover:border-primary/30"
            }`}
          >
            <span className="text-lg leading-none">{t.emoji}</span>
            <p className="text-[11px] font-black uppercase tracking-wide leading-none">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Selector de color solo visible si NO estamos en el tema especial MLM */}
      {theme !== "mlm" && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Color de Acento</p>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_OPTIONS.map(a => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                title={a.label}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  accent === a.id ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
                }`}
                style={{ backgroundColor: a.hex }}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={toggleDark}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-primary/15 bg-bg-main text-primary/60 hover:text-primary transition-all"
      >
        <span className="text-lg leading-none">{dark === "dark" ? "☀️" : "🌙"}</span>
        <p className="text-[11px] font-black uppercase tracking-widest">
          Modo {dark === "dark" ? "Claro" : "Oscuro"}
        </p>
      </button>
    </div>
  );
};