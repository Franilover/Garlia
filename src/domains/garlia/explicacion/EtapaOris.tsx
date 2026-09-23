"use client";

/**
 * EtapaOris.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Rama Iums, paso 3 y final (paralelo a EtapaEstructuras). Una Forma
 * (Iums acomodados en una topología) se ESTABILIZA: cada Ium confirma su
 * rol dentro de la topología (ver oris_iums.rol/posicion en Supabase) y
 * el conjunto cierra como un Ori — la fuerza cósmica funcional completa,
 * equivalente no material de una Estructura. Última etapa de esta
 * columna: al terminar, BloqueRamasParalelas ofrece el botón para
 * avanzar (mismo patrón que el resto del recorrido).
 *
 * Versión compacta, mismo lenguaje visual sepia, para columna angosta.
 */

import React, { useEffect, useState } from "react";

type Paso = "forma" | "confirmando" | "estable" | "ori";
const ORDEN: Paso[] = ["forma", "confirmando", "estable", "ori"];
const DURACIONES: Record<Exclude<Paso, "ori">, number> = {
  forma: 900,
  confirmando: 1100,
  estable: 1000,
};

const TEXTOS: Record<Paso, { titulo: string; detalle: string }> = {
  forma: { titulo: "Una Forma ya armada", detalle: "Iums acomodados en una topología concreta — falta que se estabilice." },
  confirmando: { titulo: "Cada Ium confirma su rol", detalle: "Núcleo, nodo, salida… cada posición se fija dentro de la topología." },
  estable: { titulo: "El conjunto se estabiliza", detalle: "Ya no es una Forma en construcción: la configuración cierra sobre sí misma." },
  ori: { titulo: "Nace un Ori", detalle: "Una fuerza cósmica funcional completa — el equivalente no material de una Estructura." },
};

const TONOS = ["#c9a06a", "#8a5a34", "#4e3320"];

function IumNodo({ x, y, tono, confirmado }: { x: number; y: number; tono: string; confirmado: boolean }) {
  return (
    <rect
      x={x - 8} y={y - 8} width={16} height={16} rx={3}
      style={{
        fill: `color-mix(in srgb, ${tono} 45%, var(--bg-main))`,
        stroke: confirmado ? "var(--primary)" : `color-mix(in srgb, ${tono} 90%, black)`,
        strokeWidth: confirmado ? 2 : 1.3,
        transition: "stroke 0.4s ease-out, stroke-width 0.4s ease-out",
      }}
    />
  );
}

function DiagramaEstabilizacion({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<Paso>("forma");
  const terminado = paso === "ori";

  useEffect(() => setPaso("forma"), [replayKey]);
  useEffect(() => {
    if (paso === "ori") return;
    const t = setTimeout(() => setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]), DURACIONES[paso as Exclude<Paso, "ori">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const confirmando = paso === "confirmando" || paso === "estable" || paso === "ori";
  const estable = paso === "estable" || paso === "ori";

  const POS = [{ x: 90, y: 30 }, { x: 45, y: 90 }, { x: 135, y: 90 }];
  const filas = ORDEN.slice(0, idx + 1);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => { if (terminado && (e.key === "Enter" || e.key === " ")) onReplay(); }}
      className="flex flex-col items-center gap-3"
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir" : undefined}
    >
      <svg viewBox="0 0 180 120" width={180} height={120} className="shrink-0">
        <line x1={POS[0].x} y1={POS[0].y} x2={POS[1].x} y2={POS[1].y} strokeWidth={1.6} style={{ stroke: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
        <line x1={POS[0].x} y1={POS[0].y} x2={POS[2].x} y2={POS[2].y} strokeWidth={1.6} style={{ stroke: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />

        {estable && (
          <ellipse
            cx={90} cy={62} rx={82} ry={54}
            style={{ fill: "color-mix(in srgb, var(--primary) 6%, transparent)", stroke: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            strokeWidth={1.2}
          >
            <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" />
          </ellipse>
        )}

        {POS.map((p, i) => (
          <IumNodo key={i} x={p.x} y={p.y} tono={TONOS[i]} confirmado={confirmando} />
        ))}
      </svg>

      <div className="flex w-full max-w-[220px] flex-col gap-2">
        {filas.map((p) => {
          const t = TEXTOS[p];
          return (
            <div key={p} className="text-center" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
              <p className="text-micro font-black uppercase tracking-[0.15em]" style={{ color: "var(--primary)" }}>
                {t.titulo}
              </p>
              <p className="mx-auto mt-0.5 max-w-[200px] text-[10px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                {t.detalle}
              </p>
            </div>
          );
        })}
        {terminado && (
          <p className="text-center text-[9px] font-bold uppercase tracking-wide opacity-40">Toca para repetir</p>
        )}
      </div>
    </div>
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaOris({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="oris" className="scroll-mt-20 px-1">
      <div className="mb-4 text-center">
        <h2 className="text-sm font-black uppercase tracking-wide">Oris</h2>
      </div>

      <div className="py-1">
        <DiagramaEstabilizacion replayKey={replayKey} onReplay={onReplay} />
      </div>
    </section>
  );
}
