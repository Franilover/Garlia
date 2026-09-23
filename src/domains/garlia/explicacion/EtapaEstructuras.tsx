"use client";

/**
 * EtapaEstructuras.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Cuarto tramo: Compuestos → Estructura. Mismo criterio que las etapas
 * anteriores: por ahora solo el Bloque 1 (diagrama de la lógica) — la
 * galería con Estructuras reales de Supabase queda para después, a
 * propósito, no está implementada acá todavía.
 *
 * DiagramaEstructura: "cristalización radial" (diseño de Boceto_Materiales_
 * Garlia.html, sección "3 · Estructuras" — diagrama estático, sin fases):
 * un mini-átomo central y 5 mini-átomos en anillo a su alrededor, unidos al
 * centro por líneas rectas — representa Compuestos repetidos en un patrón
 * (dato real de `patron_estructural_id`), no una mutación ni una fusión.
 *
 * Cada mini-átomo reutiliza el mismo lenguaje visual de Elementos/
 * Compuestos: núcleo + anillo medio + anillo externo, con 3 partículas
 * girando en cada anillo — mismo trazo/paleta sepia que las etapas previas.
 */

import React, { useEffect, useState } from "react";

// ─── Bloque 1: diagrama de la lógica (cristalización radial) ──────────────

const TONOS = ["#8a5a34", "#c9a06a", "#4e3320", "#8a5a34", "#c9a06a", "#4e3320"];

/** Mini-átomo: núcleo + anillo medio (3 partículas) + anillo externo
 *  (3 partículas), girando en direcciones opuestas — mismo lenguaje visual
 *  que los Elementos/Compuestos de las etapas anteriores, a escala reducida. */
function MiniAtomo({
  cx,
  cy,
  radio,
  tono,
  girar,
}: {
  cx: number;
  cy: number;
  radio: number;
  tono: string;
  girar: { media: string; externa: string };
}) {
  const radioMedio = radio * 0.58;
  const radioExterno = radio * 1.0;

  return (
    <g>
      <circle cx={cx} cy={cy} r={radioExterno} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radioMedio} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 26%, transparent)" }} />

      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `explicacion-estructura-girar ${girar.externa} linear infinite reverse` }}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          return <circle key={`e${i}`} cx={cx + Math.cos(a) * radioExterno} cy={cy + Math.sin(a) * radioExterno} r={radio * 0.09} style={{ fill: TONOS[i], stroke: "#4e3320", strokeWidth: 0.6 }} />;
        })}
      </g>
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `explicacion-estructura-girar ${girar.media} linear infinite` }}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + 0.5;
          return <circle key={`m${i}`} cx={cx + Math.cos(a) * radioMedio} cy={cy + Math.sin(a) * radioMedio} r={radio * 0.09} style={{ fill: TONOS[(i + 1) % 3], stroke: "#4e3320", strokeWidth: 0.6 }} />;
        })}
      </g>

      <circle cx={cx} cy={cy} r={radio * 0.2} style={{ fill: `color-mix(in srgb, ${tono} 45%, var(--bg-main))`, stroke: `color-mix(in srgb, ${tono} 85%, black)` }} strokeWidth={1.1} />
      <circle cx={cx} cy={cy - radioExterno} r={radio * 0.13} fill="none" style={{ stroke: "var(--primary)" }} strokeWidth={1.4} />
    </g>
  );
}

function DiagramaEstructura({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [replayKey]);

  // Centro + anillo de 5 mini-átomos alrededor, a 72° de separación —
  // cristalización radial (misma geometría que el boceto: centro en
  // (100,88) dentro de un viewBox 200x200, radio del anillo 46).
  const cx = 100;
  const cy = 88;
  const radioAnillo = 46;
  const anillo = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * radioAnillo, y: cy + Math.sin(rad) * radioAnillo };
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => visible && onReplay()}
      onKeyDown={(e) => {
        if (visible && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className="flex flex-col items-center gap-4"
      style={{ cursor: visible ? "pointer" : "default" }}
      title={visible ? "Toca para repetir la animación" : undefined}
    >
      <svg viewBox="0 0 200 176" width={220} height={194} className="shrink-0">
        <g style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease-out" }}>
          {anillo.map((p, i) => (
            <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--primary)" strokeWidth={1.1} opacity={0.4} />
          ))}
          <MiniAtomo cx={cx} cy={cy} radio={20} tono="#8a5a34" girar={{ media: "18s", externa: "26s" }} />
          {anillo.map((p, i) => (
            <MiniAtomo key={`n${i}`} cx={p.x} cy={p.y} radio={13} tono={TONOS[i]} girar={{ media: `${16 + i * 2}s`, externa: `${24 + i * 2}s` }} />
          ))}
        </g>
      </svg>

      <div className="flex max-w-sm flex-col gap-1 text-center">
        <p className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
          Compuestos repetidos en un patrón
        </p>
        <p className="mx-auto max-w-xs text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
          Una Estructura es un mismo Compuesto ordenado alrededor de sí mismo — cristalización radial.
        </p>
      </div>
    </div>
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaEstructuras({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="estructuras" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-estructura-girar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">Estructuras</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaEstructura replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Las Estructuras reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que las etapas anteriores
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
