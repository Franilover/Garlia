"use client";

/**
 * EtapaPolaridadesSolo.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque 1 del recorrido: solo Polaridades (los dos polos + y −). Extraído
 * de lo que antes era el "Paso 1" dentro de DiagramaPolaridadesTASI en
 * EtapaPolaridades.tsx, ahora como su propio tramo numerado e independiente
 * (ver rediseño de EtapaExplicacion con BloqueEtapaClickeable).
 *
 * A diferencia del ciclo automático original, esta animación corre UNA vez
 * (el + orbita durante un tiempo, se asienta) y queda quieta — se repite
 * solo si el usuario vuelve a tocar el gráfico (onReplay, via replayKey).
 */

import React, { useEffect, useState } from "react";

/** Un polo (+ o −), mismo criterio visual que el resto del recorrido: el +
 *  orbita (activo/emisor) mientras la animación está en curso; el − queda
 *  fijo (receptivo/estable) siempre. */
function Polo({ signo, size = 56, orbitando = false }: { signo: "+" | "-"; size?: number; orbitando?: boolean }) {
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

export function DiagramaPolaridades({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  // Un solo paso con dos momentos: "activo" (el + orbita, se explica el
  // porqué) y "asentado" (se detiene, queda quieto — fin de la pasada).
  const [asentado, setAsentado] = useState(false);

  useEffect(() => {
    setAsentado(false);
    const t = setTimeout(() => setAsentado(true), 2600);
    return () => clearTimeout(t);
  }, [replayKey]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => asentado && onReplay()}
      onKeyDown={(e) => {
        if (asentado && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className="mx-auto flex max-w-md flex-col items-center gap-3"
      style={{ cursor: asentado ? "pointer" : "default" }}
      title={asentado ? "Toca para repetir la animación" : undefined}
    >
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <Polo signo="+" size={64} orbitando={!asentado} />
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">Activo</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Polo signo="-" size={64} />
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">Receptivo</span>
        </div>
      </div>
      <p className="max-w-xs text-center text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
        El + se mueve porque emite. El − se queda quieto porque recibe. Todo en Garlia nace de estos dos polos.
      </p>
      {asentado && (
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-40" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
          Toca para repetir
        </span>
      )}
    </div>
  );
}

export default function EtapaPolaridadesSolo({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="polaridades" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-polo-pulso {
          0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 25%, transparent); }
          50% { transform: translateY(-3px) scale(1.05); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 0%, transparent); }
        }
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-5">
        <h2 className="text-base font-black uppercase tracking-wide">Polaridades</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaPolaridades replayKey={replayKey} onReplay={onReplay} />
      </div>
    </section>
  );
}
