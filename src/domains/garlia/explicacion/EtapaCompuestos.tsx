"use client";

/**
 * EtapaCompuestos.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Tercer tramo: Elementos → Compuesto. Mismo criterio que EtapaPolaridades
 * y EtapaElementos: por ahora solo el Bloque 1 (diagrama animado de la
 * lógica) — la galería con Compuestos reales de Supabase queda para
 * después, a propósito, no está implementada acá todavía.
 *
 *   DiagramaEnlaceCompuesto: dos Elementos (mini-átomo con núcleo + 2
 *   capas orbitales, mismo lenguaje visual que AtomoVisual) cada uno con
 *   sus Sitios de Enlace propios (los puntos de la capa externa por donde
 *   un Elemento puede conectarse a otro — ver elemento_sitios_enlace /
 *   enlace_sitios / compuesto_enlaces en Supabase). El ciclo:
 *
 *     1. Los dos Elementos aparecen separados, sus sitios de enlace
 *        pulsando (disponibles, buscando pareja).
 *     2. Un sitio compatible de cada uno se ilumina y una línea de enlace
 *        crece entre ambos — el "encaje".
 *     3. Los átomos se acercan por ese enlace y el conjunto se marca como
 *        un Compuesto (halo unificador + etiqueta), se sostiene un
 *        momento más largo que los pasos anteriores, y el ciclo reinicia.
 *
 * No usa AtomoVisual ni datos reales (Supabase) a propósito: es un
 * diagrama conceptual autocontenido, igual que DiagramaPolaridadesTASI y
 * DiagramaCapas — mismo trazo/paleta sepia para que se sienta la misma
 * familia visual, sin acoplarse a la forma real de un Elemento.
 */

import React, { useEffect, useState } from "react";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoEnlace = "buscando" | "encajando" | "enlazado" | "compuesto";

const DURACIONES: Record<PasoEnlace, number> = {
  buscando: 1700,
  encajando: 900,
  enlazado: 1500,
  // Paso final: se sostiene más tiempo que los anteriores, para que se
  // alcance a leer que el resultado es un Compuesto nuevo.
  compuesto: 3200,
};

const ORDEN: PasoEnlace[] = ["buscando", "encajando", "enlazado", "compuesto"];

/** Un sitio de enlace individual: punto en el borde de un Elemento.
 *  "disponible" pulsa suave (buscando pareja); "activo" es el que
 *  efectivamente encaja con el otro elemento — se enciende y deja de
 *  pulsar porque ya encontró su par. */
function SitioEnlace({
  cx,
  cy,
  activo,
  encajando,
}: {
  cx: number;
  cy: number;
  activo: boolean;
  encajando: boolean;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={activo ? 5.5 : 4}
      style={{
        fill: activo
          ? "color-mix(in srgb, var(--primary) 85%, transparent)"
          : "color-mix(in srgb, var(--primary) 22%, transparent)",
        stroke: "var(--primary)",
        strokeWidth: activo ? 1.5 : 1,
        opacity: activo ? 1 : 0.55,
        transformOrigin: `${cx}px ${cy}px`,
        animation: !activo
          ? "explicacion-sitio-pulso 1.6s ease-in-out infinite"
          : encajando
            ? "explicacion-sitio-encaje 0.5s ease-out both"
            : undefined,
      }}
    />
  );
}

/** Mini-átomo propio del diagrama: núcleo + 2 capas orbitales con puntos
 *  fijos como "partículas", y 3 Sitios de Enlace en el borde exterior
 *  (mismo concepto que elemento_sitios_enlace, simplificado a 3 puntos
 *  visibles). `sitioActivoIdx` marca cuál de los 3 es el que encaja con
 *  el otro elemento en este ciclo. */
function MiniElemento({
  cx,
  cy,
  radio,
  sitioActivoIdx,
  encajando,
  tono,
}: {
  cx: number;
  cy: number;
  radio: number;
  sitioActivoIdx: number;
  encajando: boolean;
  tono: string;
}) {
  const radioOrbitaMedia = radio * 0.42;
  const radioOrbitaExterna = radio * 0.72;
  const radioSitios = radio * 0.98;

  // 3 sitios de enlace repartidos en el borde, dejando el de arriba para
  // el que efectivamente se usa (así el enlace entre ambos elementos se
  // ve prolijo, apuntando uno hacia el otro).
  const angulosSitios = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];

  return (
    <g>
      {/* Órbitas: mismo trazo punteado que AtomoVisual/DiagramaCapas */}
      <circle cx={cx} cy={cy} r={radioOrbitaMedia} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radioOrbitaExterna} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />

      {/* Núcleo */}
      <circle cx={cx} cy={cy} r={radio * 0.16} style={{ fill: `color-mix(in srgb, ${tono} 45%, var(--bg-main))`, stroke: `color-mix(in srgb, ${tono} 85%, black)` }} strokeWidth={1.2} />

      {/* Partículas fijas en las 2 capas (decorativas, dan lectura de átomo) */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        return <circle key={`m${i}`} cx={cx + Math.cos(a) * radioOrbitaMedia} cy={cy + Math.sin(a) * radioOrbitaMedia} r={radio * 0.06} style={{ fill: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />;
      })}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 - 0.3;
        return <circle key={`e${i}`} cx={cx + Math.cos(a) * radioOrbitaExterna} cy={cy + Math.sin(a) * radioOrbitaExterna} r={radio * 0.05} style={{ fill: "color-mix(in srgb, var(--primary) 32%, transparent)" }} />;
      })}

      {/* Sitios de Enlace: puntos en el borde exterior */}
      {angulosSitios.map((a, i) => (
        <SitioEnlace
          key={i}
          cx={cx + Math.cos(a) * radioSitios}
          cy={cy + Math.sin(a) * radioSitios}
          activo={i === sitioActivoIdx}
          encajando={i === sitioActivoIdx && encajando}
        />
      ))}
    </g>
  );
}

function DiagramaEnlaceCompuesto() {
  const [paso, setPaso] = useState<PasoEnlace>("buscando");

  useEffect(() => {
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[(ORDEN.indexOf(p) + 1) % ORDEN.length]);
    }, DURACIONES[paso]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const acercado = paso === "enlazado" || paso === "compuesto";
  const mostrarEnlace = paso === "encajando" || paso === "enlazado" || paso === "compuesto";
  const mostrarHaloCompuesto = paso === "compuesto";

  // Separación entre los dos átomos: se acercan al encajar el enlace,
  // como si el enlace mismo los atrajera — refuerza visualmente que un
  // Compuesto no es "dos elementos pegados", es dos elementos que
  // encontraron un sitio de enlace compatible entre sí.
  const separacion = acercado ? 108 : 148;
  const cxA = 200 - separacion / 2;
  const cxB = 200 + separacion / 2;
  const cy = 100;
  const radio = 62;

  const TEXTOS: Record<PasoEnlace, { titulo: string; detalle: string }> = {
    buscando: {
      titulo: "Dos Elementos, cada uno con sus Sitios de Enlace",
      detalle: "Cada Elemento tiene puntos propios por donde puede conectarse — pulsando, disponibles, buscando pareja.",
    },
    encajando: {
      titulo: "Un Sitio compatible encuentra su par",
      detalle: "No cualquier sitio conecta con cualquier otro: el encaje depende de su afinidad y geometría.",
    },
    enlazado: {
      titulo: "El enlace se forma",
      detalle: "Los dos Elementos quedan unidos por ese Sitio — un enlace real, con su propia intensidad y estabilidad.",
    },
    compuesto: {
      titulo: "Nace un Compuesto",
      detalle: "Dos Elementos enlazados dejan de ser dos cosas sueltas: juntos son un Compuesto nuevo, con propiedades propias.",
    },
  };

  const texto = TEXTOS[paso];

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 400 200" width={320} height={160}>
        {/* Halo unificador: aparece solo en el paso final, envolviendo a
            ambos átomos para leerse como "una sola cosa nueva". */}
        {mostrarHaloCompuesto && (
          <ellipse
            cx={200}
            cy={cy}
            rx={separacion / 2 + radio + 14}
            ry={radio + 16}
            style={{ fill: "color-mix(in srgb, var(--primary) 6%, transparent)", stroke: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
            strokeWidth={1.2}
            strokeDasharray="3 5"
            opacity={0}
          >
            <animate attributeName="opacity" from="0" to="1" dur="0.5s" fill="freeze" />
          </ellipse>
        )}

        {/* Línea de enlace entre los dos Sitios activos (arriba de cada
            átomo, apuntando uno hacia el otro): crece con un dibujo de
            trazo (strokeDasharray/strokeDashoffset) en vez de aparecer
            de golpe, para que se lea como "se está formando". */}
        {mostrarEnlace && (
          <line
            x1={cxA}
            y1={cy - radio * 0.98}
            x2={cxB}
            y2={cy - radio * 0.98}
            stroke="var(--primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{
              strokeDasharray: separacion,
              strokeDashoffset: paso === "encajando" ? separacion : 0,
              transition: "stroke-dashoffset 0.55s ease-out, x1 0.5s ease-out, x2 0.5s ease-out",
            }}
          />
        )}

        <g style={{ transition: "transform 0.5s ease-out" }}>
          <MiniElemento cx={cxA} cy={cy} radio={radio} sitioActivoIdx={0} encajando={paso === "encajando"} tono="#8a5a34" />
        </g>
        <g style={{ transition: "transform 0.5s ease-out" }}>
          <MiniElemento cx={cxB} cy={cy} radio={radio} sitioActivoIdx={0} encajando={paso === "encajando"} tono="#4e3320" />
        </g>
      </svg>

      <div key={paso} className="max-w-sm text-center" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
        <p className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
          {texto.titulo}
        </p>
        <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
          {texto.detalle}
        </p>
      </div>

      <div className="flex gap-1.5">
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

export default function EtapaCompuestos() {
  return (
    <section id="compuestos" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-sitio-pulso {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.35); opacity: 0.9; }
        }
        @keyframes explicacion-sitio-encaje {
          0% { transform: scale(1); }
          40% { transform: scale(1.6); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="mb-5">
        <h2 className="text-base font-black uppercase tracking-wide">Compuestos</h2>
        <p className="text-micro" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
          Los Elementos no se combinan al azar: se unen por Sitios de Enlace compatibles, y de esa unión nace un Compuesto.
        </p>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaEnlaceCompuesto />
      </div>

      {/* Galería "Los Compuestos reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que Polaridades y Elementos
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
