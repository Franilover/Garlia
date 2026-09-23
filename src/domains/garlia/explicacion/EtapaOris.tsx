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
 * Rediseño: mismo layout de 3 columnas (gráfico | frase corta | más info
 * al terminar) que el resto de la rama Material/Energética, vía
 * LayoutEtapa3Col.
 */

import React, { useEffect, useState } from "react";

import { anchoEnCaja } from "./LayoutEtapa";
import { LayoutEtapa3Col, CLASE_SVG_EN_CAJA } from "./LayoutEtapa3Col";

type Paso = "sueltos" | "topologia" | "confirmando" | "estable" | "ori";
const ORDEN: Paso[] = ["sueltos", "topologia", "confirmando", "estable", "ori"];
const DURACIONES: Record<Exclude<Paso, "ori">, number> = {
  sueltos: 900,
  topologia: 900,
  confirmando: 1000,
  estable: 900,
};

const TEXTOS: Record<Paso, { frase: string; info?: string }> = {
  sueltos: { frase: "Varios Iums sueltos" },
  topologia: { frase: "Eligiendo topología" },
  confirmando: { frase: "Confirmando roles" },
  estable: { frase: "Estabilizando" },
  ori: {
    frase: "Ori",
    info: "Varios Iums se acomodan según una topología (cadena, ramificación, ciclo…) y cada uno confirma su rol dentro de ella hasta cerrar: nace un Ori, una fuerza cósmica funcional.",
  },
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

  const grafico = (
    <svg viewBox="0 0 180 120" className={CLASE_SVG_EN_CAJA}>
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
  );

  return (
    <LayoutEtapa3Col
      grafico={grafico}
      frase={TEXTOS[paso].frase}
      info={TEXTOS.ori.info}
      terminado={terminado}
      pasoActual={idx}
      totalPasos={ORDEN.length}
      onReplay={onReplay}
      anchoFinal={anchoEnCaja(120, 180, 120)}
      contraido
    />
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaOris({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="oris" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-4 text-center">
        <h2 className="text-sm font-black uppercase tracking-wide">Oris</h2>
      </div>

      <div className="py-1">
        <DiagramaEstabilizacion replayKey={replayKey} onReplay={onReplay} />
      </div>
    </section>
  );
}
