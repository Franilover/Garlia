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
 * Compuestos: núcleo + 2 capas de 3 partículas girando — sin anillos
 * punteados de órbita (sin borde), mismo trazo/paleta sepia.
 *
 * Layout: igual que Compuestos/Materiales — gráfico fijo a la izquierda
 * (desktop), texto apilándose en escalera a la derecha a medida que
 * avanza el ciclo, sin borrar los pasos anteriores.
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

type PasoEstructura = "compuesto" | "patron" | "estructura";

const ORDEN: PasoEstructura[] = ["compuesto", "patron", "estructura"];

const DURACIONES: Record<Exclude<PasoEstructura, "estructura">, number> = {
  compuesto: 1400,
  patron: 1400,
};

const TEXTOS: Record<PasoEstructura, { titulo: string; detalle: string }> = {
  compuesto: {
    titulo: "Un Compuesto",
    detalle: "La unidad de partida, sola.",
  },
  patron: {
    titulo: "Se repite en un patrón",
    detalle: "El mismo Compuesto, ordenado alrededor de sí mismo.",
  },
  estructura: {
    titulo: "Nace una Estructura",
    detalle: "Cristalización radial: composición + patrón, sin mutar ni fusionar nada.",
  },
};

function DiagramaEstructura({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoEstructura>("compuesto");
  const terminado = paso === "estructura";

  useEffect(() => {
    setPaso("compuesto");
  }, [replayKey]);

  useEffect(() => {
    if (paso === "estructura") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso as Exclude<PasoEstructura, "estructura">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const conPatron = paso === "patron" || paso === "estructura";

  // Centro + anillo de 5 mini-átomos alrededor, a 72° de separación —
  // cristalización radial (misma geometría que el boceto: centro en
  // (100,88) dentro de un viewBox 200x176, radio del anillo 46).
  const cx = 100;
  const cy = 88;
  const radioAnillo = 46;
  const anillo = [0, 72, 144, 216, 288].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * radioAnillo, y: cy + Math.sin(rad) * radioAnillo };
  });

  const grafico = (
    <svg viewBox="0 0 200 176" width={220} height={194} className="shrink-0">
      {anillo.map((p, i) => (
        <line
          key={`l${i}`}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="var(--primary)"
          strokeWidth={1.1}
          style={{ opacity: conPatron ? 0.4 : 0, transition: "opacity 0.5s ease-out" }}
        />
      ))}
      <MiniAtomo cx={cx} cy={cy} radio={20} tono="#8a5a34" girar={{ media: "18s", externa: "26s" }} />
      {anillo.map((p, i) => (
        <g key={`n${i}`} style={{ opacity: conPatron ? 1 : 0, transition: `opacity 0.5s ease-out ${i * 0.08}s` }}>
          <MiniAtomo cx={p.x} cy={p.y} radio={13} tono={TONOS[i]} girar={{ media: `${16 + i * 2}s`, externa: `${24 + i * 2}s` }} />
        </g>
      ))}
    </svg>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => {
        if (terminado && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-8"
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir la animación" : undefined}
    >
      {grafico}

      <div className="flex w-full max-w-sm flex-col gap-3 md:w-auto md:min-w-[280px]">
        {ORDEN.slice(0, idx + 1).map((p, i) => {
          const t = TEXTOS[p];
          return (
            <div
              key={p}
              className="text-center md:text-left"
              style={{ animation: "explicacion-fade-in 0.4s ease-out both", paddingLeft: `${i * 14}px` }}
            >
              <p className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
                {t.titulo}
              </p>
              <p className="mx-auto mt-0.5 max-w-xs text-[11px] leading-relaxed md:mx-0" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                {t.detalle}
              </p>
            </div>
          );
        })}
        {terminado && (
          <p className="text-center text-[10px] font-bold uppercase tracking-wide opacity-40 md:text-left" style={{ paddingLeft: `${idx * 14}px` }}>
            Toca para repetir
          </p>
        )}
      </div>

      <div className="flex gap-1.5 md:hidden">
        {ORDEN.map((p, i) => (
          <div
            key={p}
            className="h-1 w-8 rounded-full transition-colors"
            style={{ background: i <= idx ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)" }}
          />
        ))}
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
