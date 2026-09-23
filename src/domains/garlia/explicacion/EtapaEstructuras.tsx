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
 *   DiagramaEstructura: arranca donde terminó EtapaCompuestos — literalmente
 *   el mismo par de Elementos enlazados, al mismo tamaño — y de ahí:
 *
 *     1. "compuesto": el Compuesto recién nacido, idéntico al cierre de
 *        EtapaCompuestos (mismo radio, misma posición), para que se lea
 *        como continuación directa, no como una etapa nueva desconectada.
 *     2. "deszoom": el mismo gráfico se encoge hacia una esquina/centro
 *        pequeño — un solo elemento visual, ya no el foco de la escena.
 *     3. "simplificado": ese Compuesto reducido se simplifica en un
 *        círculo simple — deja de importar su composición interna, ahora
 *        es solo "una Estructura posible", una unidad más.
 *     4. "acumulando": aparecen 3 formas juntas — un círculo, un cuadrado
 *        (4 lados) y un hexágono (6 lados) — representando que existen
 *        Estructuras con distintas geometrías, y ahí termina el tramo.
 *
 * No usa datos reales (Supabase) a propósito: es un diagrama conceptual
 * autocontenido, igual que los diagramas de las 3 etapas previas — mismo
 * trazo/paleta sepia para que se sienta la misma familia visual.
 */

import React, { useEffect, useState } from "react";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoEstructura = "compuesto" | "deszoom" | "simplificado" | "acumulando";

const ORDEN: PasoEstructura[] = ["compuesto", "deszoom", "simplificado", "acumulando"];

const DURACIONES: Record<Exclude<PasoEstructura, "acumulando">, number> = {
  compuesto: 1300,
  deszoom: 900,
  simplificado: 1100,
};

const TEXTOS: Record<PasoEstructura, { titulo: string; detalle: string }> = {
  compuesto: {
    titulo: "Viene de un Compuesto",
    detalle: "El mismo que acabamos de formar, sin cambios todavía.",
  },
  deszoom: {
    titulo: "Se aleja: ya es solo una pieza",
    detalle: "Deja de ser el centro de atención — ahora es una unidad más.",
  },
  simplificado: {
    titulo: "Se simplifica a un círculo",
    detalle: "Ya no importa su composición interna, solo que existe.",
  },
  acumulando: {
    titulo: "Nace una Estructura",
    detalle: "Existen con distintas geometrías: círculo, cuadrado, hexágono…",
  },
};

const TONO_A = "#8a5a34";
const TONO_B = "#4e3320";

/** Sitio de enlace: idéntico al de EtapaCompuestos, ya sin animación de
 *  pulso (el enlace ya está formado, es un estado quieto). */
function SitioEnlace({ cx, cy, tono }: { cx: number; cy: number; tono: string }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6.5}
      style={{
        fill: `color-mix(in srgb, ${tono} 88%, transparent)`,
        stroke: "var(--primary)",
        strokeWidth: 1.6,
      }}
    />
  );
}

/** Mini-átomo idéntico al MiniElemento de EtapaCompuestos (núcleo + 2
 *  capas orbitales + 3 Sitios de Enlace) — se reutiliza el mismo diseño,
 *  al mismo tamaño, para que el primer paso de esta etapa se lea como
 *  literalmente el mismo gráfico con el que cerró la etapa anterior. */
function MiniElemento({
  cx,
  cy,
  radio,
  tono,
  girar,
}: {
  cx: number;
  cy: number;
  radio: number;
  tono: string;
  girar: { media: string; externa: string };
}) {
  const radioOrbitaMedia = radio * 0.42;
  const radioOrbitaExterna = radio * 0.72;
  const radioSitios = radio * 1.02;
  const angulosSitios = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];

  return (
    <g>
      <circle cx={cx} cy={cy} r={radioOrbitaMedia} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radioOrbitaExterna} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />

      <circle cx={cx} cy={cy} r={radio * 0.16} style={{ fill: `color-mix(in srgb, ${tono} 45%, var(--bg-main))`, stroke: `color-mix(in srgb, ${tono} 85%, black)` }} strokeWidth={1.2} />

      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `explicacion-estructura-girar ${girar.media} linear infinite` }}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.4;
          return <circle key={`m${i}`} cx={cx + Math.cos(a) * radioOrbitaMedia} cy={cy + Math.sin(a) * radioOrbitaMedia} r={radio * 0.06} style={{ fill: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />;
        })}
      </g>
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `explicacion-estructura-girar ${girar.externa} linear infinite reverse` }}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 - 0.3;
          return <circle key={`e${i}`} cx={cx + Math.cos(a) * radioOrbitaExterna} cy={cy + Math.sin(a) * radioOrbitaExterna} r={radio * 0.05} style={{ fill: "color-mix(in srgb, var(--primary) 32%, transparent)" }} />;
        })}
      </g>

      {angulosSitios.map((a, i) => (
        <SitioEnlace key={i} cx={cx + Math.cos(a) * radioSitios} cy={cy + Math.sin(a) * radioSitios} tono={tono} />
      ))}
    </g>
  );
}

/** Puntos de un polígono regular de n lados centrado en (cx, cy), con
 *  radio r — usado tanto para el cuadrado (4 lados) como el hexágono
 *  (6 lados) del paso final. */
function poligonoPoints(cx: number, cy: number, r: number, lados: number, rotacion = -Math.PI / 2): string {
  const puntos = Array.from({ length: lados }, (_, i) => {
    const a = (i / lados) * Math.PI * 2 + rotacion;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  });
  return puntos.join(" ");
}

function DiagramaEstructura({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoEstructura>("compuesto");
  const terminado = paso === "acumulando";

  useEffect(() => {
    setPaso("compuesto");
  }, [replayKey]);

  useEffect(() => {
    if (paso === "acumulando") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso as Exclude<PasoEstructura, "acumulando">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const alejado = paso !== "compuesto";
  const simplificado = paso === "simplificado" || paso === "acumulando";
  const acumulando = paso === "acumulando";

  // Paso 1 "compuesto": exactamente la misma geometría con la que cerró
  // EtapaCompuestos (radio 78, separación 128, centrado en 210,118).
  const cxCentro = 210;
  const cy = 118;
  const radioCompuesto = 78;
  const separacion = 128;
  const cxA = cxCentro - separacion / 2;
  const cxB = cxCentro + separacion / 2;
  const yEnlace = cy - radioCompuesto * 1.02;

  // Escala de deszoom: el par de Elementos completo se encoge hacia el
  // centro-izquierda del lienzo, dejando espacio a la derecha para las
  // 3 formas que se van a acumular en el paso final.
  const escalaAlejado = 0.34;
  const cxAlejado = 110;
  const cyAlejado = 118;

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
      <svg viewBox="0 0 420 200" width={340} height={162} className="shrink-0">
        {/* Paso 1-2: el Compuesto (par de Elementos enlazados), que se
            encoge y se traslada con un solo <g transform>, animado por
            CSS transition — así "se hace deszoom" en vez de saltar. */}
        {!simplificado && (
          <g
            style={{
              transformOrigin: `${cxCentro}px ${cy}px`,
              transform: alejado ? `translate(${cxAlejado - cxCentro}px, ${cyAlejado - cy}px) scale(${escalaAlejado})` : "translate(0px, 0px) scale(1)",
              transition: "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
              opacity: alejado ? 0.7 : 1,
            }}
          >
            <path
              d={`M ${cxA} ${yEnlace} Q ${cxCentro} ${yEnlace - 22} ${cxB} ${yEnlace}`}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <MiniElemento cx={cxA} cy={cy} radio={radioCompuesto} tono={TONO_A} girar={{ media: "22s", externa: "34s" }} />
            <MiniElemento cx={cxB} cy={cy} radio={radioCompuesto} tono={TONO_B} girar={{ media: "26s", externa: "30s" }} />
          </g>
        )}

        {/* Paso 3: el Compuesto alejado se simplifica a un círculo simple
            — misma posición/escala aproximada que tenía el par alejado,
            leído ahora como "una Estructura posible" ya sin composición
            interna visible. */}
        {simplificado && !acumulando && (
          <circle
            cx={cxAlejado}
            cy={cyAlejado}
            r={40}
            style={{
              fill: "color-mix(in srgb, var(--primary) 30%, var(--bg-main))",
              stroke: "var(--primary)",
            }}
            strokeWidth={2}
          >
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" />
          </circle>
        )}

        {/* Paso 4: 3 formas acumuladas — círculo, cuadrado (4 lados) y
            hexágono (6 lados) — representando distintas geometrías
            posibles de Estructura, una junto a otra. */}
        {acumulando && (
          <g style={{ animation: "explicacion-fade-in 0.5s ease-out both" }}>
            <circle cx={110} cy={118} r={40} style={{ fill: "color-mix(in srgb, var(--primary) 30%, var(--bg-main))", stroke: "var(--primary)" }} strokeWidth={2} />
            <polygon points={poligonoPoints(210, 118, 40, 4)} style={{ fill: "color-mix(in srgb, var(--primary) 22%, var(--bg-main))", stroke: "var(--primary)" }} strokeWidth={2} strokeLinejoin="round" />
            <polygon points={poligonoPoints(310, 118, 42, 6)} style={{ fill: "color-mix(in srgb, var(--primary) 14%, var(--bg-main))", stroke: "var(--primary)" }} strokeWidth={2} strokeLinejoin="round" />
          </g>
        )}
      </svg>

      <div className="flex w-full max-w-sm flex-col gap-3 md:w-auto md:min-w-[280px]">
        {ORDEN.slice(0, idx + 1).map((p, i) => {
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
          <p className="text-center text-[10px] font-bold uppercase tracking-wide opacity-40 md:text-left" style={{ paddingLeft: `${idx * 14}px` }}>
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

export default function EtapaEstructuras({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="estructuras" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-estructura-girar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">Estructuras</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaEstructura replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Las Estructuras reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que las etapas anteriores
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
