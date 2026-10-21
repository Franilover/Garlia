"use client";

/**
 * LayoutEtapa3Col.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Variante de LayoutEtapa para la rama Material (Compuestos, Estructuras,
 * Materiales, Objetos) y la rama Energética (Iums, Oris): en vez de una
 * escalera de título+detalle que se va acumulando, son 3 columnas fijas:
 *
 *   1. Gráfico — misma caja/lógica de contracción que LayoutEtapa.
 *   2. Frase — una sola frase o palabra corta que cambia con cada paso de
 *      la animación (reemplaza al título+descripción de la escalera).
 *      Describe qué está ocurriendo EN ESE INSTANTE de la animación.
 *   3. Info — texto de "más info" que solo aparece cuando la animación
 *      termina (mismo criterio narrativo que antes vivía en el detalle
 *      del último paso), como tercera columna a la derecha.
 *
 * No reemplaza LayoutEtapa (Polaridades/TASI/Partículas lo siguen usando
 * tal cual) — es un layout hermano, mismas constantes de caja de gráfico
 * para que el tamaño del dibujo no cambie de una rama a otra.
 */

import React from "react";

import { GRAFICO_W, GRAFICO_H, MARGEN_FINAL } from "./LayoutEtapa";

const CONTRACCION_MS = 700;
const CONTRACCION_RETARDO_MS = 250;

export const CLASE_SVG_EN_CAJA = "h-full w-full";

function CajaGrafico({ children, anchoFinal, contraido }: { children: React.ReactNode; anchoFinal?: number; contraido: boolean }) {
  const ancho = contraido && anchoFinal !== undefined ? anchoFinal + MARGEN_FINAL * 2 : GRAFICO_W;
  return (
    <div
      className="flex w-full shrink-0 items-center justify-center md:h-[var(--caja-h)] md:w-[var(--caja-w)] md:transition-[width]"
      style={
        {
          maxWidth: GRAFICO_W,
          aspectRatio: `${GRAFICO_W} / ${GRAFICO_H}`,
          "--caja-h": `${GRAFICO_H}px`,
          "--caja-w": `${ancho}px`,
          transitionDuration: `${CONTRACCION_MS}ms`,
          transitionDelay: contraido ? `${CONTRACCION_RETARDO_MS}ms` : "0ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        } as React.CSSProperties
      }
    >
      <div className="h-full w-full shrink-0 md:h-[var(--caja-h)] md:w-[var(--svg-w)]" style={{ "--svg-w": `${GRAFICO_W}px` } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

export function LayoutEtapa3Col({
  grafico,
  frase,
  info,
  terminado,
  pasoActual,
  totalPasos,
  onReplay,
  anchoFinal,
  contraido = false,
}: {
  /** El <svg> de la etapa, con className={CLASE_SVG_EN_CAJA}. */
  grafico: React.ReactNode;
  /** Frase o palabra corta del paso actual (columna 2) — cambia con cada paso. */
  frase: string;
  /** Texto de más info (columna 3) — solo se muestra cuando `terminado`. */
  info: React.ReactNode;
  terminado: boolean;
  pasoActual: number;
  totalPasos: number;
  onReplay: () => void;
  anchoFinal?: number;
  contraido?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => {
        if (terminado && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-6"
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir la animación" : undefined}
    >
      <CajaGrafico anchoFinal={anchoFinal} contraido={contraido}>
        {grafico}
      </CajaGrafico>

      {/* Columna 2: frase corta del paso actual, centrada en su propio
          espacio — sin escalera, cambia de contenido con key para
          re-disparar el fade a cada paso. */}
      <div className="flex w-full max-w-sm items-center justify-center md:w-[180px] md:self-stretch">
        <p
          key={frase}
          className="text-center text-sm font-black uppercase tracking-[0.15em] md:text-left"
          style={{ color: "var(--primary)", animation: "explicacion-fade-in 0.4s ease-out both" }}
        >
          {frase}
        </p>
      </div>

      {/* Columna 3: más info — aparece solo al terminar la animación. */}
      <div className="flex w-full max-w-sm flex-col justify-center gap-2 md:w-[220px] md:self-stretch">
        {terminado && (
          <div style={{ animation: "explicacion-fade-in 0.5s ease-out both" }}>
            <div className="text-center text-[11px] leading-relaxed md:text-left" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
              {info}
            </div>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide opacity-40 md:text-left">Toca para repetir</p>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 md:hidden">
        {Array.from({ length: totalPasos }).map((_, i) => (
          <div
            key={i}
            className="h-1 w-8 rounded-full transition-colors"
            style={{ background: i <= pasoActual ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)" }}
          />
        ))}
      </div>
    </div>
  );
}
