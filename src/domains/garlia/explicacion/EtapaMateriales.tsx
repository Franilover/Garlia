"use client";

/**
 * EtapaMateriales.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Quinto tramo: Estructuras → Material. Mismo criterio que las etapas
 * anteriores: por ahora solo el Bloque 1 (diagrama animado de la lógica) —
 * la galería con Materiales reales de Supabase queda para después, a
 * propósito, no está implementada acá todavía.
 *
 * Mismo layout que los diagramas previos: gráfico fijo a la izquierda en
 * desktop, texto apilándose en escalera a la derecha a medida que avanza
 * el ciclo, sin borrar los pasos anteriores.
 *
 *   DiagramaMaterial: continúa directo desde EtapaEstructuras — el
 *   hexágono es una de las formas con las que cerró esa etapa. El ciclo:
 *
 *     1. "sueltas": 3 hexágonos (Estructuras), cada uno con su propia
 *        rotación, flotando sueltos, sin combinarse todavía.
 *     2. "superpuestas": los 3 se acercan al centro y se superponen, uno
 *        sobre otro, conservando cada uno su rotación distinta — se nota
 *        que son 3 piezas encimadas, no una mezcla difusa.
 *     3. "material": la pila de hexágonos se simplifica y se convierte en
 *        un cuadrado — el Material nuevo, con una forma propia que
 *        ninguna Estructura tenía por separado.
 *
 * No usa datos reales (Supabase) a propósito: es un diagrama conceptual
 * autocontenido, igual que los diagramas de las etapas previas — mismo
 * trazo/paleta sepia para que se sienta la misma familia visual.
 */

import React, { useEffect, useState } from "react";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoMaterial = "sueltas" | "superpuestas" | "material";

const ORDEN: PasoMaterial[] = ["sueltas", "superpuestas", "material"];

const DURACIONES: Record<Exclude<PasoMaterial, "material">, number> = {
  sueltas: 1500,
  superpuestas: 1300,
};

const TEXTOS: Record<PasoMaterial, { titulo: string; detalle: string }> = {
  sueltas: {
    titulo: "Tres Estructuras, todavía sueltas",
    detalle: "Cada una con su propia geometría y orientación.",
  },
  superpuestas: {
    titulo: "Se juntan, una sobre otra",
    detalle: "Cada una conserva su rotación, pero ya están encimadas.",
  },
  material: {
    titulo: "Nace un Material",
    detalle: "La pila se simplifica en una forma propia: un cuadrado.",
  },
};

const TONOS = ["#c9a06a", "#8a5a34", "#4e3320"];

/** Puntos de un hexágono regular centrado en (cx, cy), con radio r y una
 *  rotación propia (para que las 3 Estructuras se distingan entre sí sin
 *  necesitar más que un giro distinto cada una). */
function hexagonoPoints(cx: number, cy: number, r: number, rotacionGrados: number): string {
  const rotacion = (rotacionGrados * Math.PI) / 180 - Math.PI / 2;
  const puntos = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + rotacion;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  });
  return puntos.join(" ");
}

/** Una Estructura individual del diagrama: hexágono con su propio tono y
 *  rotación — mismo lenguaje visual con el que cerró EtapaEstructuras
 *  (una de las 3 geometrías posibles), para que se lea como continuación
 *  directa de esa etapa. */
function EstructuraDiagrama({
  cx,
  cy,
  r,
  rotacion,
  tono,
  etiqueta,
}: {
  cx: number;
  cy: number;
  r: number;
  rotacion: number;
  tono: string;
  etiqueta: string;
}) {
  return (
    <g style={{ transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}>
      <polygon
        points={hexagonoPoints(cx, cy, r, rotacion)}
        style={{
          fill: `color-mix(in srgb, ${tono} 38%, var(--bg-main))`,
          stroke: `color-mix(in srgb, ${tono} 85%, black)`,
          transition: "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <title>{etiqueta}</title>
    </g>
  );
}

function DiagramaMaterial({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoMaterial>("sueltas");
  const terminado = paso === "material";

  useEffect(() => {
    setPaso("sueltas");
  }, [replayKey]);

  useEffect(() => {
    if (paso === "material") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso as Exclude<PasoMaterial, "material">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const superpuestas = paso === "superpuestas";
  const esMaterial = paso === "material";

  const cx = 210;
  const cy = 118;

  // Posiciones "sueltas": 3 hexágonos flotando sin combinarse, cada uno
  // con su propia rotación (para que se distingan a simple vista).
  const POS_SUELTAS = [
    { x: cx - 80, y: cy - 30, r: 34, rot: 0 },
    { x: cx + 66, y: cy + 24, r: 28, rot: 25 },
    { x: cx - 6, y: cy + 54, r: 30, rot: 50 },
  ];

  // Posiciones "superpuestas": las 3 convergen al mismo punto, pero cada
  // una conserva su propia rotación — se leen como piezas encimadas, no
  // como una mezcla difusa (eso ya pasó como concepto en Compuestos).
  const POS_SUPERPUESTAS = [
    { x: cx, y: cy, r: 62, rot: 0 },
    { x: cx, y: cy, r: 62, rot: 25 },
    { x: cx, y: cy, r: 62, rot: 50 },
  ];

  const posiciones = superpuestas || esMaterial ? POS_SUPERPUESTAS : POS_SUELTAS;

  const grafico = (
    <svg viewBox="0 0 420 200" width={340} height={162} className="shrink-0">
      {/* Paso final: la pila de hexágonos se desvanece y en su lugar
          aparece un cuadrado — el Material, con una forma propia que
          ninguna Estructura tenía por separado. */}
      {esMaterial ? (
        <rect
          x={cx - 56}
          y={cy - 56}
          width={112}
          height={112}
          rx={14}
          style={{
            fill: "color-mix(in srgb, var(--primary) 22%, var(--bg-main))",
            stroke: "var(--primary)",
          }}
          strokeWidth={2}
        >
          <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" />
        </rect>
      ) : (
        posiciones.map((p, i) => (
          <EstructuraDiagrama key={i} cx={p.x} cy={p.y} r={p.r} rotacion={p.rot} tono={TONOS[i]} etiqueta={`Estructura ${i + 1}`} />
        ))
      )}
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

export default function EtapaMateriales({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="materiales" className="scroll-mt-20 px-1">
      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">Materiales</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaMaterial replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Los Materiales reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que las etapas anteriores
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
