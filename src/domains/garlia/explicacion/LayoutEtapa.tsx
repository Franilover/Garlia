"use client";

/**
 * LayoutEtapa.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Base ÚNICA de distribución para las etapas de /explicacion que tienen
 * "gráfico a la izquierda + texto a la derecha". Antes cada etapa repetía
 * a mano su propio flex/gap/ancho/tamaño de svg, y por eso cada una
 * quedaba a una distancia, tamaño o alineación distinta.
 *
 * Esta base decide TODO lo que es distribución; cada etapa solo aporta:
 *   - su gráfico (el <svg> con su dibujo, intacto)
 *   - sus filas de texto (título + detalle, en escalera)
 *
 * ── Qué fija esta base ────────────────────────────────────────────────────
 *
 *   1. CAJA DEL GRÁFICO (GRAFICO_W × GRAFICO_H): todas las etapas reservan
 *      exactamente el mismo espacio para el gráfico. El <svg> de cada
 *      etapa se ajusta dentro con width/height 100% y preserveAspectRatio
 *      (por defecto "xMidYMid meet"): el dibujo se escala para caber y
 *      queda centrado, sin deformarse ni tocar su viewBox interno. Así un
 *      gráfico angosto (Estructuras) y uno ancho (Materiales) ocupan la
 *      misma caja y el texto queda siempre a la misma distancia.
 *
 *   2. DISTANCIA gráfico↔texto (GAP): una sola.
 *
 *   3. COLUMNA DE TEXTO (TEXTO_W): ancho fijo — no cambia al aparecer cada
 *      paso, así el conjunto no se corre de lado durante la animación.
 *
 *   4. ALINEACIÓN VERTICAL DEL TEXTO: el bloque de texto arranca siempre
 *      arriba (`md:items-start` en la columna, alto mínimo = alto del
 *      gráfico) — así el primer título de cada etapa cae a la misma altura
 *      relativa al gráfico, y la escalera crece hacia abajo desde ahí.
 *      Antes estaba centrado verticalmente, por eso el texto "saltaba"
 *      distinto según cuántas filas hubiera.
 *
 *   5. ESCALERA: sangría por fila (ESCALERA_PX), tipografía de título y
 *      detalle, y la línea "Toca para repetir" — idénticas en todas.
 *
 * Para ajustar el aspecto de TODAS las etapas a la vez, se cambian las
 * constantes de abajo; nada más.
 */

import React from "react";

// ─── Constantes de la base (única fuente de verdad) ───────────────────────

/** Caja reservada para el gráfico, en px (desktop, md+). */
export const GRAFICO_W = 400;
export const GRAFICO_H = 220;

/** Distancia horizontal gráfico ↔ texto (Tailwind gap, en px reales: 16). */
const GAP_CLASE = "md:gap-4";

/** Ancho fijo de la columna de texto (desktop). */
const TEXTO_W_CLASE = "md:w-[260px]";

/** Sangría por fila de la escalera de texto, en px. */
export const ESCALERA_PX = 14;

// ─── Gráfico ───────────────────────────────────────────────────────────────

/** Envuelve el <svg> de una etapa en la caja fija. El svg de la etapa debe
 *  pasar `className={CLASE_SVG_EN_CAJA}` (o width/height 100%) para
 *  ajustarse a la caja; su viewBox y su dibujo no se tocan. */
export const CLASE_SVG_EN_CAJA = "h-full w-full";

function CajaGrafico({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: "100%", maxWidth: GRAFICO_W, aspectRatio: `${GRAFICO_W} / ${GRAFICO_H}` }}
    >
      {children}
    </div>
  );
}

// ─── Texto ─────────────────────────────────────────────────────────────────

export interface FilaTexto {
  /** Clave estable de la fila. */
  id: string;
  titulo: string;
  detalle?: string;
  /** Contenido extra opcional debajo del detalle (ej. "Categoría: ..."). */
  extra?: React.ReactNode;
}

function FilaEscalera({ fila, indice }: { fila: FilaTexto; indice: number }) {
  return (
    <div
      className="text-center md:text-left"
      style={{ animation: "explicacion-fade-in 0.4s ease-out both", paddingLeft: `${indice * ESCALERA_PX}px` }}
    >
      <p className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
        {fila.titulo}
      </p>
      {fila.detalle && (
        <p
          className="mx-auto mt-0.5 max-w-xs text-[11px] leading-relaxed md:mx-0"
          style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
        >
          {fila.detalle}
        </p>
      )}
      {fila.extra}
    </div>
  );
}

// ─── Layout completo ───────────────────────────────────────────────────────

export function LayoutEtapa({
  grafico,
  filas,
  terminado,
  pasoActual,
  totalPasos,
  onReplay,
}: {
  /** El <svg> de la etapa, con className={CLASE_SVG_EN_CAJA}. */
  grafico: React.ReactNode;
  /** Filas de texto ya visibles (las que la escalera ha revelado hasta ahora). */
  filas: FilaTexto[];
  /** true cuando la animación terminó: habilita el click y "Toca para repetir". */
  terminado: boolean;
  /** Índice del paso actual (0-based) y total de pasos — para los puntitos mobile. */
  pasoActual: number;
  totalPasos: number;
  onReplay: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => {
        if (terminado && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className={`flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center ${GAP_CLASE}`}
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir la animación" : undefined}
    >
      <CajaGrafico>{grafico}</CajaGrafico>

      {/* Columna de texto: ancho fijo y alto mínimo = alto del gráfico, con
          el contenido pegado ARRIBA — la escalera crece hacia abajo. */}
      <div className={`flex w-full max-w-sm flex-col gap-3 md:justify-start md:self-stretch ${TEXTO_W_CLASE}`}>
        {filas.map((f, i) => (
          <FilaEscalera key={f.id} fila={f} indice={i} />
        ))}
        {terminado && (
          <p
            className="text-center text-[10px] font-bold uppercase tracking-wide opacity-40 md:text-left"
            style={{ paddingLeft: `${(filas.length - 1) * ESCALERA_PX}px` }}
          >
            Toca para repetir
          </p>
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
