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
 *   4. ALINEACIÓN VERTICAL DEL TEXTO: el bloque de texto se centra
 *      verticalmente respecto al alto del gráfico (`md:justify-center` +
 *      `md:self-stretch` en la columna) — así el medio del texto queda
 *      siempre a la misma altura que el medio del gráfico, crezca la
 *      escalera hacia arriba o hacia abajo desde ese centro según cuántas
 *      filas haya visibles en cada momento.
 *
 *   5. ESCALERA: sangría por fila (ESCALERA_PX), tipografía de título y
 *      detalle, y la línea "Toca para repetir" — idénticas en todas.
 *
 *   6. CAJA QUE SE CONTRAE: muchos gráficos empiezan ocupando todo el ancho
 *      (ej. dos piezas, una en cada borde) y terminan compactos en el
 *      centro. Si la caja se quedara del ancho inicial, el texto quedaría
 *      lejos del dibujo final. Por eso la caja tiene DOS anchos: el
 *      inicial (GRAFICO_W) y el final (ancho del contenido final + un
 *      margen igual para todas, MARGEN_FINAL). Cuando la etapa pasa
 *      `contraido`, la caja se achica con una transición y el texto
 *      se acerca. El dibujo NO se escala ni se mueve: el <svg> conserva su
 *      tamaño y queda centrado, solo el contenedor cambia de ancho.
 *
 * Para ajustar el aspecto de TODAS las etapas a la vez, se cambian las
 * constantes de abajo; nada más.
 */

import React from "react";

// ─── Constantes de la base (única fuente de verdad) ───────────────────────

/** Caja reservada para el gráfico, en px (desktop, md+). */
export const GRAFICO_W = 640;
export const GRAFICO_H = 352;

/** Aire (px, a cada lado) entre el borde del dibujo final y el borde de la
 *  caja una vez contraída. Igual en todas: así la distancia final dibujo↔
 *  texto es la misma en todas las etapas (MARGEN_FINAL + gap). */
export const MARGEN_FINAL = 8;

/** Duración de la contracción de la caja (ms). */
const CONTRACCION_MS = 700;

/** Retardo (ms) antes de empezar a contraer: deja terminar el fade de las
 *  piezas que desaparecen (ej. los Materiales sueltos de Objetos). */
const CONTRACCION_RETARDO_MS = 250;

/** Ancho en px que ocupa, dentro de la caja, algo que mide `anchoUnidades`
 *  en un svg de viewBox `vbW`×`vbH` (el svg se ajusta a la caja con "meet"). */
export function anchoEnCaja(anchoUnidades: number, vbW: number, vbH: number): number {
  return anchoUnidades * Math.min(GRAFICO_W / vbW, GRAFICO_H / vbH);
}

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

function CajaGrafico({ children, anchoFinal, contraido }: { children: React.ReactNode; anchoFinal?: number; contraido: boolean }) {
  // Ancho de la caja en desktop: el inicial, o el final si ya se contrajo.
  // (En mobile la caja sigue siendo columna a ancho completo, sin cambios.)
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
      {/* El svg conserva SIEMPRE el tamaño de la caja inicial y queda
          centrado: si la caja se contrae, se recorta el aire vacío de los
          costados (overflow visible), no el dibujo. */}
      <div className="h-full w-full shrink-0 md:h-[var(--caja-h)] md:w-[var(--svg-w)]" style={{ "--svg-w": `${GRAFICO_W}px` } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

// ─── Texto ─────────────────────────────────────────────────────────────────

export interface FilaTexto {
  /** Clave estable de la fila. */
  id: string;
  /** Una sola oración corta y coherente: qué ocurre en este paso. */
  titulo: string;
  /** Contenido extra opcional debajo (ej. "Categoría: ..."). */
  extra?: React.ReactNode;
}

function FilaEscalera({ fila, indice }: { fila: FilaTexto; indice: number }) {
  return (
    <div
      className="text-center md:text-left"
      style={{ animation: "explicacion-fade-in 0.4s ease-out both", paddingLeft: `${indice * ESCALERA_PX}px` }}
    >
      <p className="text-sm font-black uppercase tracking-[0.15em]" style={{ color: "var(--primary)" }}>
        {fila.titulo}
      </p>
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
  anchoFinal,
  contraido = false,
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
  /** Ancho en px del dibujo FINAL dentro de la caja (usar `anchoEnCaja`).
   *  Si se omite, la caja no se contrae nunca. */
  anchoFinal?: number;
  /** true cuando el dibujo ya llegó a su posición final compacta. */
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
      className={`flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-start ${GAP_CLASE}`}
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir la animación" : undefined}
    >
      <CajaGrafico anchoFinal={anchoFinal} contraido={contraido}>
        {grafico}
      </CajaGrafico>

      {/* Columna de texto: ancho fijo y alto mínimo = alto del gráfico, con
          el contenido centrado verticalmente — el medio del bloque de
          texto queda siempre a la misma altura que el medio del gráfico,
          sin importar cuántas filas de la escalera estén visibles. */}
      <div className={`flex w-full max-w-sm flex-col gap-3 md:justify-center md:self-stretch ${TEXTO_W_CLASE}`}>
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
