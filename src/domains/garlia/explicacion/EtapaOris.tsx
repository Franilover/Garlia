"use client";

/**
 * EtapaOris.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Rama Iums, paso 2 y final (paralelo a EtapaEstructuras/Compuestos —
 * acá el salto de Iums a Ori pasa por dos cosas juntas, no una etapa
 * intermedia separada): 2+ Iums se acomodan según una TOPOLOGÍA (ver
 * topologias_oris — T01 Cadena lineal, T02 Cadena dinámica, T03
 * Ramificación, T04 Ciclo con salida, T07 Retroalimentación, etc.) y
 * cada uno confirma su rol dentro de ella (ver oris_iums.rol/posicion en
 * Supabase) hasta que el conjunto cierra como un Ori — la fuerza cósmica
 * funcional completa, equivalente no material de una Estructura.
 *
 * Última etapa de esta columna: al terminar, queda revelada y quieta,
 * igual que el resto de las etapas finales del recorrido.
 *
 * Versión compacta, mismo lenguaje visual sepia, para columna angosta.
 */

import React, { useEffect, useState } from "react";

type Paso = "sueltos" | "topologia" | "confirmando" | "estable" | "ori";
const ORDEN: Paso[] = ["sueltos", "topologia", "confirmando", "estable", "ori"];
const DURACIONES: Record<Exclude<Paso, "ori">, number> = {
  sueltos: 900,
  topologia: 900,
  confirmando: 1000,
  estable: 900,
};

const TEXTOS: Record<Paso, { titulo: string; detalle: string }> = {
  sueltos: { titulo: "Varios Iums, sin acomodar", detalle: "Cada uno ya es una unidad funcional — falta el orden entre ellos." },
  topologia: { titulo: "Se elige una topología", detalle: "Cadena, ramificación, ciclo… una plantilla concreta de cómo se conectan." },
  confirmando: { titulo: "Cada Ium confirma su rol", detalle: "Núcleo, nodo, salida… cada posición se fija dentro de esa topología." },
  estable: { titulo: "El conjunto se estabiliza", detalle: "Ya no son Iums sueltos acomodándose: la configuración cierra sobre sí misma." },
  ori: { titulo: "Nace un Ori", detalle: "Iums combinados según una topología, estables entre sí — una fuerza cósmica funcional completa." },
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
        transition: "x 0.6s cubic-bezier(0.22,1,0.36,1), y 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease-out, stroke-width 0.4s ease-out",
      }}
    />
  );
}

function DiagramaEstabilizacion({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<Paso>("sueltos");
  const terminado = paso === "ori";

  useEffect(() => setPaso("sueltos"), [replayKey]);
  useEffect(() => {
    if (paso === "ori") return;
    const t = setTimeout(() => setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]), DURACIONES[paso as Exclude<Paso, "ori">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const acomodado = paso !== "sueltos";
  const confirmando = paso === "confirmando" || paso === "estable" || paso === "ori";

  const POS_SUELTOS = [{ x: 30, y: 30 }, { x: 150, y: 40 }, { x: 90, y: 90 }];
  // Ramificación simple: un nodo central con 2 ramas — evoca T03 sin
  // comprometerse a una topología real específica (es un diagrama
  // conceptual, igual que hexagonoPoints en EtapaEstructuras).
  const POS_RAMA = [{ x: 90, y: 30 }, { x: 45, y: 90 }, { x: 135, y: 90 }];
  const POS = acomodado ? POS_RAMA : POS_SUELTOS;
  const filas = ORDEN.slice(0, idx + 1);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => { if (terminado && (e.key === "Enter" || e.key === " ")) onReplay(); }}
      className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-center md:gap-5"
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir" : undefined}
    >
      <svg viewBox="0 0 180 120" width={180} height={120} className="shrink-0">
        {acomodado && (
          <>
            <line x1={POS_RAMA[0].x} y1={POS_RAMA[0].y} x2={POS_RAMA[1].x} y2={POS_RAMA[1].y} strokeWidth={1.6} style={{ stroke: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
            <line x1={POS_RAMA[0].x} y1={POS_RAMA[0].y} x2={POS_RAMA[2].x} y2={POS_RAMA[2].y} strokeWidth={1.6} style={{ stroke: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
          </>
        )}

        {POS.map((p, i) => (
          <IumNodo key={i} x={p.x} y={p.y} tono={TONOS[i]} confirmado={confirmando} />
        ))}
      </svg>

      <div className="flex w-full max-w-[220px] flex-col gap-2 md:max-w-[200px]">
        {filas.map((p) => {
          const t = TEXTOS[p];
          return (
            <div key={p} className="text-center md:text-left" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
              <p className="text-micro font-black uppercase tracking-[0.15em]" style={{ color: "var(--primary)" }}>
                {t.titulo}
              </p>
              <p className="mx-auto mt-0.5 max-w-[200px] text-[10px] leading-relaxed md:mx-0" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                {t.detalle}
              </p>
            </div>
          );
        })}
        {terminado && (
          <p className="text-center text-[9px] font-bold uppercase tracking-wide opacity-40 md:text-left">Toca para repetir</p>
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
