"use client";

/**
 * EtapaIums.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Rama Iums, paso 1 (paralelo a EtapaElementos). Mismas Partículas que en
 * la rama de Elementos, pero organizadas en régimen FUNCIONAL en vez de
 * material — no capas núcleo/media/externa, sino Partículas que se
 * acoplan en una configuración de comportamiento (ver iums_particulas en
 * Supabase).
 *
 *   DiagramaAcople: 3 Partículas sueltas → se acoplan en línea, una a
 *   una → nace un Ium. Mismo lenguaje visual sepia que el resto del
 *   recorrido, pero con cuadrados en vez de círculos, para diferenciar
 *   "unidad funcional" de "unidad material".
 *
 * Rediseño: mismo layout de 3 columnas (gráfico | frase corta | más info
 * al terminar) que Compuestos/Estructuras/Materiales/Objetos, vía
 * LayoutEtapa3Col — antes era un componente compacto aparte, ahora
 * comparte la misma base de la rama Material.
 */

import React, { useEffect, useState } from "react";

import { anchoEnCaja } from "./LayoutEtapa";
import { LayoutEtapa3Col, CLASE_SVG_EN_CAJA } from "./LayoutEtapa3Col";

type PasoIum = "sueltas" | "acoplando" | "cerrado" | "ium";
const ORDEN: PasoIum[] = ["sueltas", "acoplando", "cerrado", "ium"];
const DURACIONES: Record<Exclude<PasoIum, "ium">, number> = {
  sueltas: 1100,
  acoplando: 1100,
  cerrado: 1100,
};

const TEXTOS: Record<PasoIum, { frase: string; info?: string }> = {
  sueltas: { frase: "3 Partículas sueltas" },
  acoplando: { frase: "Acoplando" },
  cerrado: { frase: "El acople cierra" },
  ium: {
    frase: "Ium",
    info: "3 Partículas se acoplan por función, no por masa, en una configuración que cierra sobre sí misma: nace un Ium, una unidad funcional propia — el equivalente de un Elemento.",
  },
};

const TONOS = ["#c9a06a", "#8a5a34", "#4e3320"];

function ParticulaCuadrado({ x, y, tono, activa }: { x: number; y: number; tono: string; activa: boolean }) {
  return (
    <rect
      x={x - 9}
      y={y - 9}
      width={18}
      height={18}
      rx={3}
      style={{
        fill: activa ? `color-mix(in srgb, ${tono} 45%, var(--bg-main))` : "transparent",
        stroke: activa ? `color-mix(in srgb, ${tono} 90%, black)` : "color-mix(in srgb, var(--primary) 20%, transparent)",
        transition: "fill 0.4s ease-out, stroke 0.4s ease-out, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
      }}
      strokeWidth={1.4}
    />
  );
}

function DiagramaAcople({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoIum>("sueltas");
  const terminado = paso === "ium";

  useEffect(() => setPaso("sueltas"), [replayKey]);

  useEffect(() => {
    if (paso === "ium") return;
    const t = setTimeout(() => setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]), DURACIONES[paso as Exclude<PasoIum, "ium">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const acoplando = paso === "acoplando" || paso === "cerrado" || paso === "ium";
  const cerrado = paso === "cerrado" || paso === "ium";

  const cy = 60;
  const posiciones = [{ x: 40, y: cy }, { x: 90, y: cy }, { x: 140, y: cy }];

  const grafico = (
    <svg viewBox="0 0 180 120" className={CLASE_SVG_EN_CAJA}>
      {acoplando && (
        <line
          x1={49} y1={cy} x2={131} y2={cy}
          style={{ stroke: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
          strokeWidth={2}
          strokeDasharray={cerrado ? undefined : "3 4"}
        />
      )}
      {terminado && (
        <rect
          x={22} y={38} width={136} height={44} rx={10}
          fill="none"
          style={{ stroke: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          strokeDasharray="2 4"
          strokeWidth={1}
        />
      )}
      {posiciones.map((p, i) => (
        <ParticulaCuadrado key={i} x={p.x} y={p.y} tono={TONOS[i]} activa />
      ))}
    </svg>
  );

  return (
    <LayoutEtapa3Col
      grafico={grafico}
      frase={TEXTOS[paso].frase}
      info={TEXTOS.ium.info}
      terminado={terminado}
      pasoActual={idx}
      totalPasos={ORDEN.length}
      onReplay={onReplay}
      anchoFinal={anchoEnCaja(136, 180, 120)}
      contraido
    />
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaIums({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="iums" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-4 text-center">
        <h2 className="text-sm font-black uppercase tracking-wide">Iums</h2>
      </div>

      <div className="py-1">
        <DiagramaAcople replayKey={replayKey} onReplay={onReplay} />
      </div>
    </section>
  );
}
