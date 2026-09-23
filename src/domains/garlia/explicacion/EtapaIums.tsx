"use client";

/**
 * EtapaIums.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Rama Iums, paso 1 (paralelo a EtapaElementos). Mismas Partículas que en
 * la rama de Elementos, pero organizadas en régimen FUNCIONAL en vez de
 * material — no capas núcleo/media/externa, sino Partículas que se
 * acoplan en una configuración de comportamiento (ver iums_particulas en
 * Supabase). Versión compacta: pensada para vivir en una columna angosta
 * dentro de BloqueRamasParalelas, al lado de EtapaElementos.
 *
 *   DiagramaAcople: 3 Partículas sueltas → se acoplan en línea, una a
 *   una → nace un Ium. Mismo lenguaje visual sepia que el resto del
 *   recorrido, pero con cuadrados en vez de círculos, para diferenciar
 *   "unidad funcional" de "unidad material".
 */

import React, { useEffect, useState } from "react";

const DURACIONES = [1100, 1100, 1100]; // ms por paso de acople

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
  const [paso, setPaso] = useState(0); // 0..3, 3 = completo
  const terminado = paso >= 3;

  useEffect(() => setPaso(0), [replayKey]);

  useEffect(() => {
    if (paso >= DURACIONES.length) return;
    const t = setTimeout(() => setPaso((p) => p + 1), DURACIONES[paso]);
    return () => clearTimeout(t);
  }, [paso]);

  const cy = 60;
  const posiciones = [{ x: 40, y: cy }, { x: 90, y: cy }, { x: 140, y: cy }];

  const TEXTOS = [
    { titulo: "3 Partículas sueltas", detalle: "Se acoplan por función, no por masa." },
    { titulo: "Se acoplan en línea", detalle: "Cada una encaja en un orden funcional concreto." },
    { titulo: "El acople cierra", detalle: "Las 3 quedan enlazadas en una sola configuración." },
    { titulo: "Nace un Ium", detalle: "Una unidad funcional propia — el equivalente de un Elemento." },
  ];
  const filas = TEXTOS.slice(0, paso + 1);

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
        {paso >= 1 && (
          <line
            x1={49} y1={cy} x2={131} y2={cy}
            style={{ stroke: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
            strokeWidth={2}
            strokeDasharray={paso >= 2 ? undefined : "3 4"}
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
          <ParticulaCuadrado key={i} x={p.x} y={p.y} tono={TONOS[i]} activa={paso >= 0} />
        ))}
      </svg>

      <div className="flex w-full max-w-[220px] flex-col gap-2 md:max-w-[200px]">
        {filas.map((t, i) => (
          <div key={i} className="text-center md:text-left" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
            <p className="text-micro font-black uppercase tracking-[0.15em]" style={{ color: "var(--primary)" }}>
              {t.titulo}
            </p>
            <p className="mx-auto mt-0.5 max-w-[200px] text-[10px] leading-relaxed md:mx-0" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
              {t.detalle}
            </p>
          </div>
        ))}
        {terminado && (
          <p className="text-center text-[9px] font-bold uppercase tracking-wide opacity-40 md:text-left">Toca para repetir</p>
        )}
      </div>
    </div>
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
