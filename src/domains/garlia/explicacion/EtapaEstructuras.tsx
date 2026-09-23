"use client";

/**
 * EtapaEstructuras.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Cuarto tramo: Compuestos → Estructura. Mismo criterio que las etapas
 * anteriores: por ahora solo el Bloque 1 (diagrama animado de la lógica) —
 * la galería con Estructuras reales de Supabase queda para después, a
 * propósito, no está implementada acá todavía.
 *
 * Mismo layout que DiagramaCapas/DiagramaEnlaceCompuesto: gráfico fijo a
 * la izquierda en desktop, texto apilándose en escalera a la derecha a
 * medida que avanza el ciclo, sin borrar los pasos anteriores.
 *
 *   DiagramaCapasEstructura: el salto conceptual de Compuesto a Estructura
 *   no es "mezclarse" (eso ya pasó en Compuestos) sino ORGANIZARSE: varios
 *   Compuestos sueltos se acomodan en capas, en un orden concreto, dentro
 *   de una forma geométrica — ver estructura_subcomponentes (orden,
 *   geometria_id) y estructura_geometrias (forma + parámetros + volumen)
 *   en Supabase. Ej. el Diente real: Esmalte → Dentina → Pulpa, en ese
 *   orden, dentro de una geometría propia. El ciclo:
 *
 *     1. 3 Compuestos sueltos, sin orden, flotando libremente.
 *     2. Se acomodan en capas, una encima de otra, en un orden concreto
 *        (de afuera hacia adentro) — el orden ES la explicación, no
 *        decoración.
 *     3. Aparece el contorno de una forma geométrica envolviendo esas
 *        capas — la Estructura definida, con volumen propio.
 *     4. El conjunto se marca como una Estructura completa (halo +
 *        etiqueta), se sostiene más tiempo que los pasos anteriores, y
 *        el ciclo reinicia.
 *
 * No usa datos reales (Supabase) a propósito: es un diagrama conceptual
 * autocontenido, igual que los diagramas de las 3 etapas previas — mismo
 * trazo/paleta sepia para que se sienta la misma familia visual.
 */

import React, { useEffect, useState } from "react";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoEstructura = "sueltos" | "ordenando" | "conteniendo" | "estructura";

const ORDEN: PasoEstructura[] = ["sueltos", "ordenando", "conteniendo", "estructura"];

const DURACIONES: Record<Exclude<PasoEstructura, "estructura">, number> = {
  sueltos: 1700,
  ordenando: 1300,
  conteniendo: 1300,
};

const TEXTOS: Record<PasoEstructura, { titulo: string; detalle: string }> = {
  sueltos: {
    titulo: "Varios Compuestos, todavía sueltos",
    detalle: "Falta acomodarse en un orden concreto.",
  },
  ordenando: {
    titulo: "Se acomodan en capas, en un orden",
    detalle: "Cada Compuesto ocupa un lugar propio, de afuera hacia adentro.",
  },
  conteniendo: {
    titulo: "Una forma geométrica los contiene",
    detalle: "Las capas toman una geometría con volumen propio.",
  },
  estructura: {
    titulo: "Nace una Estructura",
    detalle: "Capas en orden dentro de una forma — como Esmalte, Dentina y Pulpa en un Diente.",
  },
};

const TONOS = ["#c9a06a", "#8a5a34", "#4e3320"];

/** Un Compuesto individual del diagrama: dos núcleos pequeños unidos por
 *  un enlace corto — mismo lenguaje visual que el "compuesto ya formado"
 *  al final de EtapaCompuestos (dos Elementos enlazados), pero en escala
 *  reducida, para que se lea como continuación directa de esa etapa: lo
 *  que ahí nació como Compuesto, acá es la pieza suelta que se ordena.
 *  El foco de esta etapa es el ORDEN entre Compuestos, no su composición
 *  interna (eso ya se explicó en Compuestos), así que el par se mantiene
 *  simple: sin órbitas ni Sitios de Enlace, solo el par + su enlace. */
function CompuestoDiagrama({
  cx,
  cy,
  r,
  tono,
  etiqueta,
}: {
  cx: number;
  cy: number;
  r: number;
  tono: string;
  etiqueta: string;
}) {
  const sep = r * 0.85;
  return (
    <g style={{ transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}>
      <line
        x1={cx - sep} y1={cy} x2={cx + sep} y2={cy}
        strokeWidth={Math.max(r * 0.12, 1.4)}
        style={{ stroke: `color-mix(in srgb, ${tono} 70%, black)`, transition: "x1 0.6s cubic-bezier(0.22,1,0.36,1), x2 0.6s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <circle
        cx={cx - sep}
        cy={cy}
        r={r * 0.62}
        style={{
          fill: `color-mix(in srgb, ${tono} 40%, var(--bg-main))`,
          stroke: `color-mix(in srgb, ${tono} 85%, black)`,
          transition: "cx 0.6s cubic-bezier(0.22, 1, 0.36, 1), cy 0.6s cubic-bezier(0.22, 1, 0.36, 1), r 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        strokeWidth={1.4}
      />
      <circle
        cx={cx + sep}
        cy={cy}
        r={r * 0.62}
        style={{
          fill: `color-mix(in srgb, ${tono} 40%, var(--bg-main))`,
          stroke: `color-mix(in srgb, ${tono} 85%, black)`,
          transition: "cx 0.6s cubic-bezier(0.22, 1, 0.36, 1), cy 0.6s cubic-bezier(0.22, 1, 0.36, 1), r 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        strokeWidth={1.4}
      />
      <title>{etiqueta}</title>
    </g>
  );
}

function DiagramaCapasEstructura({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoEstructura>("sueltos");
  const terminado = paso === "estructura";

  useEffect(() => {
    setPaso("sueltos");
  }, [replayKey]);

  useEffect(() => {
    if (paso === "estructura") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso as Exclude<PasoEstructura, "estructura">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const ordenado = paso !== "sueltos";
  const fusionado = paso === "estructura";

  const cx = 210;
  const cy = 118;

  // Posiciones "sueltas": 3 Compuestos flotando sin orden, en distintos
  // puntos y radios levemente distintos entre sí (para leerse como
  // objetos independientes, no como una fila prolija todavía).
  const POS_SUELTOS = [
    { x: cx - 78, y: cy - 34, r: 22 },
    { x: cx + 62, y: cy + 26, r: 18 },
    { x: cx - 8, y: cy + 52, r: 20 },
  ];

  // Posiciones "ordenadas": 3 anillos concéntricos, de afuera (mayor
  // radio, ocupa más espacio) hacia adentro — mismo lenguaje visual que
  // las capas de un Elemento (núcleo/media/externa), reforzando que
  // "capas ordenadas" es un concepto que ya se vio antes en el recorrido.
  const RADIOS_ORDEN = [72, 48, 24];
  const POS_ORDENADOS = RADIOS_ORDEN.map((r) => ({ x: cx, y: cy, r: r * 0.3 }));

  // Paso final: los 3 Compuestos convergen al centro y se leen como una
  // sola cosa — el círculo de la Estructura, no capas concéntricas.
  // Refuerza visualmente el cierre: de "3 piezas ordenadas" a "1 unidad".
  const POS_FUSIONADO = [
    { x: cx, y: cy, r: 8 },
    { x: cx, y: cy, r: 8 },
    { x: cx, y: cy, r: 8 },
  ];

  const posiciones = fusionado ? POS_FUSIONADO : ordenado ? POS_ORDENADOS : POS_SUELTOS;

  // Filas de texto en escalera: se apilan hacia abajo a medida que se
  // avanza en la secuencia, sin borrar los pasos ya alcanzados.
  const filasTexto = ORDEN.slice(0, idx + 1);

  const grafico = (
    <svg viewBox="0 0 420 200" width={340} height={162} className="shrink-0">
      {/* Contorno geométrico: un hexágono que se dibuja con trazo
          (pathLength + strokeDashoffset) envolviendo las capas ya
          ordenadas — la "forma" de estructura_geometrias haciéndose
          visible. Aparece solo en "conteniendo", antes de fusionarse. */}
      {paso === "conteniendo" && (
        <polygon
          points={hexagonoPoints(cx, cy, 88)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinejoin="round"
          pathLength={100}
          style={{
            strokeDasharray: 100,
            strokeDashoffset: paso === "conteniendo" ? 100 : 0,
            transition: "stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            opacity: 0.55,
          }}
        />
      )}

      {/* Círculo de la Estructura: lo que queda cuando los 3 Compuestos
          terminan de fusionarse — una sola forma, con el mismo radio que
          tenía el contorno geométrico que los contuvo un instante antes. */}
      {fusionado && (
        <circle
          cx={cx}
          cy={cy}
          r={70}
          style={{
            fill: "color-mix(in srgb, var(--primary) 14%, var(--bg-main))",
            stroke: "var(--primary)",
          }}
          strokeWidth={2}
        >
          <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" />
        </circle>
      )}

      {posiciones.map((p, i) => (
        <CompuestoDiagrama key={i} cx={p.x} cy={p.y} r={p.r} tono={TONOS[i]} etiqueta={`Compuesto ${i + 1}`} />
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

/** Puntos de un hexágono regular centrado en (cx, cy) con radio r, como
 *  string listo para <polygon points=...> — representa "una forma
 *  geométrica" cualquiera sin comprometerse a una FormaGeometrica real
 *  del catálogo (prisma, esfera, etc.), ya que este es un diagrama
 *  conceptual, no una Estructura real de Supabase. */
function hexagonoPoints(cx: number, cy: number, r: number): string {
  const puntos = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  });
  return puntos.join(" ");
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaEstructuras({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="estructuras" className="scroll-mt-20 px-1">
      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">Estructuras</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaCapasEstructura replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Las Estructuras reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que las etapas anteriores
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
