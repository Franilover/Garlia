"use client";

/**
 * EtapaMateriales.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Quinto tramo: Estructuras → Material. Mismo criterio que las etapas
 * anteriores: por ahora solo el Bloque 1 (diagrama animado de la lógica) —
 * la galería con Materiales reales de Supabase queda para después, a
 * propósito, no está implementada acá todavía.
 *
 * Mismo layout que los diagramas previos: gráfico fijo a la izquierda en
 * desktop, texto apilándose en escalera a la derecha a medida que avanza
 * el ciclo, sin borrar los pasos anteriores.
 *
 *   DiagramaMezclaMaterial: una o más Estructuras (u otros componentes,
 *   ver material_estructuras / material_componentes en Supabase) se
 *   combinan en proporciones concretas — cada una con su propio rol
 *   (proporcion, rol) — y de esa mezcla salen propiedades propias
 *   (propiedades_calculadas, estado_fisico). El ciclo:
 *
 *     1. Varias Estructuras sueltas, cada una ya completa por su cuenta.
 *     2. Se acercan y empiezan a mezclarse en una proporción concreta —
 *        no es una capa ordenada (eso ya pasó en Estructuras) sino una
 *        MEZCLA, cada componente con un peso propio.
 *     3. La mezcla se asienta y toma un estado físico propio (sólido,
 *        líquido, etc.) — el resultado ya no se ve como sus partes.
 *     4. El conjunto se marca como un Material completo (halo + etiqueta),
 *        se sostiene más tiempo que los pasos anteriores, y el ciclo
 *        reinicia.
 *
 * No usa datos reales (Supabase) a propósito: es un diagrama conceptual
 * autocontenido, igual que los diagramas de las etapas previas — mismo
 * trazo/paleta sepia para que se sienta la misma familia visual.
 */

import React, { useEffect, useState } from "react";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoMaterial = "sueltas" | "mezclando" | "asentando" | "material";

const ORDEN: PasoMaterial[] = ["sueltas", "mezclando", "asentando", "material"];

const DURACIONES: Record<PasoMaterial, number> = {
  sueltas: 1700,
  mezclando: 1300,
  asentando: 1300,
};

const TEXTOS: Record<PasoMaterial, { titulo: string; detalle: string }> = {
  sueltas: {
    titulo: "Varias Estructuras, todavía sueltas",
    detalle: "Cada una ya es una cosa completa — falta el paso siguiente: combinarse con otras.",
  },
  mezclando: {
    titulo: "Se combinan en una proporción concreta",
    detalle: "No se apilan en capas (eso ya pasó en Estructuras): se mezclan, cada una con un peso propio.",
  },
  asentando: {
    titulo: "La mezcla se asienta",
    detalle: "El conjunto toma un estado físico propio — sólido, líquido, lo que sea — y ya no se distinguen las partes.",
  },
  material: {
    titulo: "Nace un Material",
    detalle: "Estructuras combinadas en proporciones, con propiedades propias que no tenía ninguna por separado.",
  },
};

const TONOS = ["#c9a06a", "#8a5a34", "#4e3320"];

/** Una Estructura individual del diagrama: cuadrado simple con su propio
 *  tono sepia (mismo criterio de valores claro/medio/oscuro que
 *  CompuestoDiagrama en EtapaEstructuras) — no necesita más detalle que
 *  "una cosa ya completa", porque el foco de esta etapa es la MEZCLA, no
 *  su organización interna (eso ya se explicó en Estructuras). Usa un
 *  cuadrado (en vez del círculo de Compuesto) para que se distinga a
 *  simple vista de la etapa anterior. */
function EstructuraDiagrama({
  cx,
  cy,
  s,
  tono,
  etiqueta,
}: {
  cx: number;
  cy: number;
  s: number;
  tono: string;
  etiqueta: string;
}) {
  return (
    <g style={{ transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}>
      <rect
        x={cx - s / 2}
        y={cy - s / 2}
        width={s}
        height={s}
        rx={s * 0.18}
        style={{
          fill: `color-mix(in srgb, ${tono} 40%, var(--bg-main))`,
          stroke: `color-mix(in srgb, ${tono} 85%, black)`,
          transition:
            "x 0.6s cubic-bezier(0.22, 1, 0.36, 1), y 0.6s cubic-bezier(0.22, 1, 0.36, 1), width 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        strokeWidth={1.4}
      />
      <title>{etiqueta}</title>
    </g>
  );
}

function DiagramaMezclaMaterial({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoMaterial>("sueltas");
  const terminado = paso === "material";

  useEffect(() => {
    setPaso("sueltas");
  }, [replayKey]);

  useEffect(() => {
    if (paso === "material") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const mezclando = paso !== "sueltas";
  const asentado = paso === "asentando" || paso === "material";
  const completo = paso === "material";

  const cx = 210;
  const cy = 118;

  // Posiciones "sueltas": 3 Estructuras flotando sin combinarse, en
  // distintos puntos y tamaños levemente distintos entre sí (para
  // leerse como objetos independientes, no como una mezcla todavía).
  const POS_SUELTAS = [
    { x: cx - 80, y: cy - 30, s: 46 },
    { x: cx + 66, y: cy + 24, s: 38 },
    { x: cx - 6, y: cy + 54, s: 42 },
  ];

  // Posiciones "mezcladas": las 3 se superponen hacia el centro, cada una
  // conservando algo de su tamaño (proporción) pero ya entremezcladas.
  const POS_MEZCLADAS = [
    { x: cx - 18, y: cy - 10, s: 52 },
    { x: cx + 20, y: cy + 6, s: 40 },
    { x: cx + 2, y: cy + 22, s: 34 },
  ];

  // Posiciones "asentadas": convergen casi al mismo punto, ya leídas
  // como una sola masa con un límite común.
  const POS_ASENTADAS = [
    { x: cx, y: cy, s: 58 },
    { x: cx, y: cy, s: 42 },
    { x: cx, y: cy, s: 26 },
  ];

  const posiciones = asentado ? POS_ASENTADAS : mezclando ? POS_MEZCLADAS : POS_SUELTAS;

  // Filas de texto en escalera: se apilan hacia abajo a medida que se
  // avanza en la secuencia, sin borrar los pasos ya alcanzados.
  const filasTexto = ORDEN.slice(0, idx + 1);

  const grafico = (
    <svg viewBox="0 0 420 200" width={340} height={162} className="shrink-0">
      {/* Halo unificador: aparece solo en el paso final */}
      {completo && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={92}
          ry={84}
          style={{ fill: "color-mix(in srgb, var(--primary) 6%, transparent)", stroke: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
          strokeWidth={1.2}
          strokeDasharray="3 5"
        >
          <animate attributeName="opacity" from="0" to="1" dur="0.6s" fill="freeze" />
        </ellipse>
      )}

      {/* Borde de "masa asentada": un círculo de contorno suave que
          aparece a partir de "asentando", indicando que el conjunto ya
          se lee como una sola cosa con límite propio (el Material),
          no como piezas superpuestas. */}
      {asentado && (
        <circle
          cx={cx}
          cy={cy}
          r={66}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          pathLength={100}
          style={{
            strokeDasharray: 100,
            strokeDashoffset: paso === "asentando" ? 100 : 0,
            transition: "stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            opacity: 0.5,
          }}
        />
      )}

      {posiciones.map((p, i) => (
        <EstructuraDiagrama key={i} cx={p.x} cy={p.y} s={p.s} tono={TONOS[i]} etiqueta={`Estructura ${i + 1}`} />
      ))}
    </svg>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => terminado && onReplay()}
      onKeyDown={(e) => {
        if (terminado && (e.key === "Enter" || e.key === " ")) onReplay();
      }}
      className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-8"
      style={{ cursor: terminado ? "pointer" : "default" }}
      title={terminado ? "Toca para repetir la animación" : undefined}
    >
      {grafico}

      <div className="flex w-full max-w-sm flex-col gap-3 md:w-auto md:min-w-[280px]">
        {filasTexto.map((p, i) => {
          const t = TEXTOS[p];
          return (
            <div
              key={p}
              className="text-center md:text-left"
              style={{ animation: "explicacion-fade-in 0.4s ease-out both", paddingLeft: `${i * 14}px` }}
            >
              <p className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
                {t.titulo}
              </p>
              <p className="mx-auto mt-0.5 max-w-xs text-[11px] leading-relaxed md:mx-0" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                {t.detalle}
              </p>
            </div>
          );
        })}
        {terminado && (
          <p className="text-center text-[10px] font-bold uppercase tracking-wide opacity-40 md:text-left" style={{ paddingLeft: `${(filasTexto.length - 1) * 14}px` }}>
            Toca para repetir
          </p>
        )}
      </div>

      <div className="flex gap-1.5 md:hidden">
        {ORDEN.map((p, i) => (
          <div
            key={p}
            className="h-1 w-8 rounded-full transition-colors"
            style={{ background: i <= idx ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaMateriales({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="materiales" className="scroll-mt-20 px-1">
      <div className="mb-5">
        <h2 className="text-base font-black uppercase tracking-wide">Materiales</h2>
        <p className="text-micro" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
          Las Estructuras no solo se apilan: se combinan en proporciones concretas, se asientan, y nace un Material con propiedades propias.
        </p>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaMezclaMaterial replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Los Materiales reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que las etapas anteriores
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
