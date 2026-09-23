"use client";

/**
 * EtapaObjetos.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Octavo tramo: Material → Objeto. Mismo criterio que las etapas anteriores:
 * por ahora solo el Bloque 1 (diagrama animado de la lógica) — la galería
 * con Objetos (Items) reales de Supabase queda para después, a propósito.
 *
 * Basado en el modelo real (Supabase):
 *   - items: la tabla de Objetos. Tiene geometria_fisica (jsonb: forma,
 *     longitud, ancho, grosor...), propiedades_fisicas (jsonb, calculadas)
 *     y estado_fisico ("calculado" / "sin_materiales").
 *   - item_materiales: uno o más Materiales aportan al Objeto, cada uno
 *     con su cantidad/proporcion/rol (ej. rol="composicion_base").
 *   - item_estructuras_fisicas: vínculo explícito Objeto → Estructura
 *     física canónica (principal o no).
 *   - plantillas_geometricas / formas_geometricas_defaults: catálogo de
 *     formas reutilizables (prisma_rectangular, espada_de_una_mano...)
 *     con parámetros base que el Objeto puede heredar o sobreescribir.
 *
 * A diferencia de Materiales (una MEZCLA sin forma), acá el paso nuevo es
 * la GEOMETRÍA: uno o más Materiales, ya mezclados, se vierten en una
 * forma concreta (longitud/ancho/grosor) — y de esa combinación
 * (material + forma) se derivan las propiedades físicas propias del
 * Objeto (peso, densidad, si corta, si protege, etc.), quedando listo
 * para tener una función en el mundo.
 *
 *   1. Uno o más Materiales, ya completos por su cuenta, sueltos.
 *   2. Se acercan a un molde: aparece una forma geométrica vacía
 *      (el contorno de la plantilla) que todavía no tiene relleno.
 *   3. El molde se llena — el Material toma esa forma concreta y deja
 *      de ser una masa sin límites definidos.
 *   4. El conjunto se marca como un Objeto completo (halo + etiqueta):
 *      ya tiene forma, medidas y propiedades físicas propias que ni el
 *      Material ni la forma tenían por separado.
 *
 * No usa datos reales (Supabase) a propósito: es un diagrama conceptual
 * autocontenido, igual que los diagramas de las etapas previas — mismo
 * trazo/paleta sepia para que se sienta la misma familia visual.
 */

import React, { useEffect, useState } from "react";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoObjeto = "sueltos" | "molde" | "llenando" | "objeto";

const ORDEN: PasoObjeto[] = ["sueltos", "molde", "llenando", "objeto"];

const DURACIONES: Record<Exclude<PasoObjeto, "objeto">, number> = {
  sueltos: 1600,
  molde: 1200,
  llenando: 1400,
};

const TEXTOS: Record<PasoObjeto, { titulo: string; detalle: string }> = {
  sueltos: {
    titulo: "Uno o más Materiales, sueltos",
    detalle: "Todavía sin una forma concreta que los contenga.",
  },
  molde: {
    titulo: "Aparece una forma geométrica",
    detalle: "El molde define el contorno donde se vacía el Material.",
  },
  llenando: {
    titulo: "El Material toma esa forma",
    detalle: "Pasa a ocupar exactamente la geometría del molde.",
  },
  objeto: {
    titulo: "Nace un Objeto",
    detalle: "Material + forma: nacen propiedades físicas propias (peso, corte, protección).",
  },
};

const TONOS = ["#c9a06a", "#8a5a34"];

/** Un Material individual del diagrama: 3 cuadrados apilados, mismo
 *  diseño con el que terminó EtapaMateriales (varias Estructuras
 *  fusionadas en capas concéntricas) — para que se lea como "la misma
 *  cosa" que llega desde el tramo anterior. No necesita más detalle
 *  porque el foco acá es la forma que va a tomar, no su composición. */
function MaterialDiagrama({
  cx,
  cy,
  s,
  tono,
  etiqueta,
  opacidad = 1,
}: {
  cx: number;
  cy: number;
  s: number;
  tono: string;
  etiqueta: string;
  opacidad?: number;
}) {
  const capas = [
    { f: 1, t: tono },
    { f: 0.68, t: "#8a5a34" },
    { f: 0.36, t: "#4e3320" },
  ];
  return (
    <g style={{ transition: "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)", opacity: opacidad }}>
      {capas.map((c, i) => {
        const cs = s * c.f;
        return (
          <rect
            key={i}
            x={cx - cs / 2}
            y={cy - cs / 2}
            width={cs}
            height={cs}
            rx={cs * 0.18}
            style={{
              fill: `color-mix(in srgb, ${c.t} 40%, var(--bg-main))`,
              stroke: `color-mix(in srgb, ${c.t} 85%, black)`,
              transition:
                "x 0.6s cubic-bezier(0.22, 1, 0.36, 1), y 0.6s cubic-bezier(0.22, 1, 0.36, 1), width 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            strokeWidth={1.4}
          />
        );
      })}
      <title>{etiqueta}</title>
    </g>
  );
}

function DiagramaMoldeObjeto({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoObjeto>("sueltos");
  const terminado = paso === "objeto";

  useEffect(() => {
    setPaso("sueltos");
  }, [replayKey]);

  useEffect(() => {
    if (paso === "objeto") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso as Exclude<PasoObjeto, "objeto">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const hayMolde = paso !== "sueltos";
  const llenandoOMas = paso === "llenando" || paso === "objeto";
  const completo = paso === "objeto";

  const cx = 210;
  const cy = 118;

  // Posiciones "sueltos": 2 Materiales flotando fuera del molde, a los
  // costados — todavía no entraron a la forma.
  const POS_SUELTOS = [
    { x: cx - 96, y: cy - 6, s: 40 },
    { x: cx + 96, y: cy + 14, s: 34 },
  ];

  // Posiciones "en el molde": los mismos Materiales se acercan al centro,
  // pegados al borde del molde, a punto de entrar.
  const POS_ACERCANDOSE = [
    { x: cx - 34, y: cy - 4, s: 34 },
    { x: cx + 30, y: cy + 8, s: 28 },
  ];

  const posicionesMateriales = hayMolde && !llenandoOMas ? POS_ACERCANDOSE : POS_SUELTOS;

  // Rect del molde: el contorno de la plantilla geométrica (ej. una hoja
  // de espada, simplificada como un rectángulo alargado con puntas).
  const moldeAncho = 96;
  const moldeAlto = 34;

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
          ry={70}
          style={{ fill: "color-mix(in srgb, var(--primary) 6%, transparent)", stroke: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
          strokeWidth={1.2}
          strokeDasharray="3 5"
        >
          <animate attributeName="opacity" from="0" to="1" dur="0.6s" fill="freeze" />
        </ellipse>
      )}

      {/* El molde: contorno de la forma geométrica (la plantilla). Vacío
          al aparecer, se va "llenando" con un relleno que crece de
          izquierda a derecha durante el paso "llenando", y queda sólido
          en "objeto". */}
      {hayMolde && (
        <g>
          <rect
            x={cx - moldeAncho / 2}
            y={cy - moldeAlto / 2}
            width={moldeAncho}
            height={moldeAlto}
            rx={moldeAlto * 0.3}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.6}
            strokeDasharray={completo ? undefined : "4 4"}
            style={{ opacity: 0.75, transition: "opacity 0.4s ease-out" }}
          >
            <animate attributeName="opacity" from="0" to="0.75" dur="0.5s" fill="freeze" />
          </rect>

          {/* Relleno: un rect recortado por un clipPath que crece en
              ancho durante "llenando" hasta cubrir todo el molde. */}
          <clipPath id="objetos-clip-molde">
            <rect
              x={cx - moldeAncho / 2}
              y={cy - moldeAlto / 2}
              width={moldeAncho}
              height={moldeAlto}
              rx={moldeAlto * 0.3}
            />
          </clipPath>
          <rect
            x={cx - moldeAncho / 2}
            y={cy - moldeAlto / 2}
            width={llenandoOMas ? moldeAncho : 0}
            height={moldeAlto}
            clipPath="url(#objetos-clip-molde)"
            style={{
              fill: "color-mix(in srgb, #8a5a34 55%, var(--bg-main))",
              transition: "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </g>
      )}

      {posicionesMateriales.map((p, i) => (
        <MaterialDiagrama
          key={i}
          cx={p.x}
          cy={p.y}
          s={p.s}
          tono={TONOS[i]}
          etiqueta={`Material ${i + 1}`}
          opacidad={llenandoOMas ? 0 : 1}
        />
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

      <style>{`
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaObjetos({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="objetos" className="scroll-mt-20 px-1">
      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">Objetos</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaMoldeObjeto replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Los Objetos reales" (Supabase, tabla items) queda para
          después, a propósito — este tramo por ahora solo tiene el
          Bloque 1 (diagrama de la lógica), igual que las etapas
          anteriores tuvieron su propia galería agregada en un paso
          posterior. */}
    </section>
  );
}
