"use client";
import React, { useEffect, useState } from "react";

/* ─────────────────────────────────────────────
   Progress bar de lectura — barra finísima al top
   ───────────────────────────────────────────── */
export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop    = window.scrollY;
      const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
      const pct          = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(pct, 100));
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      <div
        className="h-full transition-[width] duration-75 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(to right, var(--accent), var(--primary))",
          boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 60%, transparent)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Vignette — sombra perimetral tipo pergamino
   ───────────────────────────────────────────── */
export function Vignette() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[45]"
      style={{
        background: `radial-gradient(ellipse at center, transparent 50%, var(--bg-main) 100%)`,
        opacity: 0.55,
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Ornamento de número de capítulo
   ───────────────────────────────────────────── */
const ROMAN = ["", "I","II","III","IV","V","VI","VII","VIII","IX","X",
  "XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX",
  "XXI","XXII","XXIII","XXIV","XXV","XXX","XL","L","LX","LXX","LXXX","XC","C"];

function toRoman(n: number): string {
  if (n >= 1 && n <= ROMAN.length - 1) return ROMAN[n];
  // fallback para números grandes
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let result = "";
  let num = n;
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

export function CapituloHeader({ orden, titulo }: { orden: number; titulo?: string }) {
  const roman = toRoman(orden);

  return (
    <header className="mb-14 mt-4 relative select-none">
      {/* Número romano enorme como watermark */}
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 font-serif font-black pointer-events-none leading-none"
        style={{
          fontSize: "clamp(5rem, 20vw, 9rem)",
          color: "color-mix(in srgb, var(--primary) 5%, transparent)",
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}
        aria-hidden
      >
        {roman}
      </div>

      {/* Línea superior con rombo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
        <span className="text-[8px] font-black uppercase tracking-[0.4em]" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          ◆
        </span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
      </div>

      {/* Etiqueta "Capítulo N" */}
      <p
        className="text-center font-black uppercase mb-3"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.5em",
          color: "color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        Capítulo {roman}
      </p>

      {/* Título principal */}
      {titulo && (
        <h1
          className="text-center font-serif italic leading-tight"
          style={{
            fontSize: "clamp(1.4rem, 4vw, 2rem)",
            color: "var(--primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {titulo}
        </h1>
      )}

      {/* Ornamento inferior */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <div className="h-px w-12" style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
        <span className="font-serif text-sm" style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }}>❧</span>
        <div className="h-px w-12" style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
      </div>
    </header>
  );
}