"use client";

/**
 * EtapaTasi.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque 2 del recorrido: Polaridades → TASI. Extraído de lo que antes era
 * el "Paso 2" dentro de DiagramaPolaridadesTASI en EtapaPolaridades.tsx,
 * ahora como su propio tramo numerado (ver EtapaPolaridadesSolo.tsx para
 * el criterio general del rediseño).
 *
 * Corre una vez: las 4 relaciones aparecen en escalera (una tras otra) y
 * quedan quietas — se repite solo si el usuario vuelve a tocar el bloque.
 */

import React, { useEffect, useState } from "react";

import { LETRA_COLOR, type LetraATS } from "@/domains/garlia/fisica/ParticulaVisual";

const RELACIONES: { par: string; resultado: LetraATS; nombre: string }[] = [
  { par: "+ +", resultado: "T", nombre: "Tesis" },
  { par: "− −", resultado: "A", nombre: "Antítesis" },
  { par: "+ → −", resultado: "S", nombre: "Síntesis" },
  { par: "− → +", resultado: "I", nombre: "Invertisis" },
];

function Polo({ signo, size = 28, orbitando = false }: { signo: "+" | "-"; size?: number; orbitando?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background:
          signo === "+"
            ? "color-mix(in srgb, var(--primary) 16%, transparent)"
            : "color-mix(in srgb, var(--primary) 6%, transparent)",
        borderColor: signo === "+" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
        color: signo === "+" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
        animation: orbitando ? "explicacion-polo-pulso 1.8s ease-in-out infinite" : undefined,
      }}
    >
      {signo}
    </div>
  );
}

/** Fila representando una Relación Polar, apareciendo con un pequeño
 *  desfase (index) para leerse como secuencia, no como tabla estática. */
function FilaRelacion({ rel, index, mostrar }: { rel: (typeof RELACIONES)[number]; index: number; mostrar: boolean }) {
  if (!mostrar) return null;
  const signos = rel.par.replace("→", "").trim().split(/\s+/) as ("+" | "-")[];
  const color = LETRA_COLOR[rel.resultado];

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        animation: `explicacion-fade-in 0.5s ease-out ${index * 0.12}s both`,
      }}
    >
      <div className="flex items-center gap-1">
        <Polo signo={signos[0]} size={28} orbitando={signos[0] === "+"} />
        <Polo signo={signos[1]} size={28} orbitando={signos[1] === "+"} />
      </div>
      <svg width="20" height="12" viewBox="0 0 20 12" className="shrink-0 opacity-40">
        <path d="M0 6 H16 M11 1 L16 6 L11 11" stroke="var(--primary)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-black"
        style={{ background: color.bg, borderColor: color.border, color: color.fg, fontSize: 15 }}
      >
        {rel.resultado}
      </div>
      <div className="min-w-0">
        <p className="text-micro font-black uppercase tracking-wide">{rel.nombre}</p>
      </div>
    </div>
  );
}

export function DiagramaTasi({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [idx, setIdx] = useState(0); // cuántas relaciones ya se mostraron
  const terminado = idx >= RELACIONES.length;

  useEffect(() => {
    setIdx(0);
  }, [replayKey]);

  useEffect(() => {
    if (idx >= RELACIONES.length) return;
    const t = setTimeout(() => setIdx((i) => i + 1), 550);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => {
        if (terminado && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className="mx-auto flex max-w-sm flex-col items-center gap-3"
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir la animación" : undefined}
    >
      <div className="grid w-full grid-cols-1 gap-2">
        {RELACIONES.map((rel, i) => (
          <FilaRelacion key={rel.resultado} rel={rel} index={i} mostrar={idx > i} />
        ))}
      </div>
      <p className="max-w-xs text-center text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
        Los polos se combinan en pares y cada combinación colapsa en una de las 4 letras TASI.
      </p>
      {terminado && (
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-40" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
          Toca para repetir
        </span>
      )}
    </div>
  );
}

export default function EtapaTasi({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="tasi" className="scroll-mt-20 px-1">
      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">TASI</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaTasi replayKey={replayKey} onReplay={onReplay} />
      </div>
    </section>
  );
}
