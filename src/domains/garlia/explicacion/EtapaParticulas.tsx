"use client";

/**
 * EtapaParticulas.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque 3 del recorrido: TASI → Partículas. Extraído de lo que antes era
 * el "Paso 3" dentro de DiagramaPolaridadesTASI en EtapaPolaridades.tsx,
 * ahora como su propio tramo numerado (ver EtapaPolaridadesSolo.tsx para
 * el criterio general del rediseño).
 *
 * A diferencia del ciclo original (que rotaba ejemplos para siempre), acá
 * se muestran los mismos ejemplos en una sola pasada y el último queda
 * quieto — se repite solo si el usuario vuelve a tocar el bloque.
 */

import React, { useEffect, useState } from "react";

import { ParticulaVisual } from "@/domains/garlia/fisica/ParticulaVisual";

const EJEMPLOS = ["TAS", "AAA", "SSI", "ITA", "TTT", "ASI"];

export function DiagramaParticulas({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [ejemploIdx, setEjemploIdx] = useState(0);
  const terminado = ejemploIdx >= EJEMPLOS.length - 1;

  useEffect(() => {
    setEjemploIdx(0);
  }, [replayKey]);

  useEffect(() => {
    if (terminado) return;
    const t = setTimeout(() => setEjemploIdx((i) => i + 1), 900);
    return () => clearTimeout(t);
  }, [ejemploIdx, terminado]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => {
        if (terminado && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className="mx-auto flex max-w-xs flex-col items-center gap-3"
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir la animación" : undefined}
    >
      <div key={ejemploIdx} style={{ animation: "explicacion-pop-in 0.4s ease-out both" }}>
        <ParticulaVisual formula={EJEMPLOS[ejemploIdx]} size={112} />
      </div>
      <p className="font-mono text-lg font-black tracking-widest">{EJEMPLOS[ejemploIdx]}</p>
      <p className="max-w-xs text-center text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
        Cada letra ocupa un tercio del círculo. Cambiar el orden o las letras da una Partícula distinta.
      </p>
      {terminado && (
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-40" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
          Toca para repetir
        </span>
      )}
    </div>
  );
}

export default function EtapaParticulas({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="particulas" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-pop-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-5">
        <h2 className="text-base font-black uppercase tracking-wide">Partículas</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaParticulas replayKey={replayKey} onReplay={onReplay} />
      </div>
    </section>
  );
}
