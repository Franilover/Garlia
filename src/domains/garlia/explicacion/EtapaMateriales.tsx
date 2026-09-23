"use client";

/**
 * EtapaMateriales.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Quinto tramo: Compuesto + Estructura → Material. Rediseño (boceto
 * "Materiales — continuidad visual", fusión directa elegida): a diferencia
 * de las 3 etapas previas, Materiales rompe a propósito la cadena lineal
 * de "un objeto que se reescala en el siguiente" — la ley real de
 * Supabase dice que un Material NO es "muchos Compuestos repetidos en un
 * patrón" (ese es el patrón real de Estructuras, con patron_estructural_id
 * poblado) ni "una unidad que muta en otra". Un Material es la fusión 1:1
 * de un Compuesto + una Estructura anfitriona en un objeto nuevo (se
 * verificó material_componentes: 40 filas, todas componente_tipo=
 * 'compuesto'; y material_estructuras: los 40 Materiales tienen
 * exactamente 1 Estructura con rol estructura_microscopica).
 *
 * Por eso la animación es una fusión de DOS orígenes convergiendo al
 * centro (no una cuadrícula creciendo, no una transformación de una sola
 * cosa):
 *
 *   MiniAtomoFusion: el mismo lenguaje visual de mini-átomo que
 *   EtapaCompuestos/EtapaEstructuras (núcleo + 2 capas orbitales con
 *   puntos), representando el Compuesto que aporta Materiales.
 *
 *   MiniCristalFusion: un anillo de 6 mini-átomos alrededor de un centro,
 *   mismo lenguaje geométrico con el que cerró EtapaEstructuras
 *   (composición + patrón), en fuerte deszoom — representa la Estructura
 *   anfitriona.
 *
 *   El ciclo:
 *     1. "separados": el mini-átomo (Compuesto) y el mini-cristal
 *        (Estructura) aparecen en extremos opuestos del lienzo.
 *     2. "fusionando": ambos convergen al centro con una curva de
 *        entrada + rebote leve (fusión, no choque).
 *     3. "material": los dos orígenes quedan superpuestos en el centro,
 *        con un halo pulsante alrededor — el color del halo es el de la
 *        categoría real del Material (mineral, metal_aleacion,
 *        tejido_organico_animal/vegetal, liquido_organico, gas,
 *        sustancia_organica_amorfa), rotando entre las 7 en cada replay
 *        para mostrar que la forma de la fusión es siempre la misma y
 *        solo cambia el color de categoría.
 *
 * No usa datos reales (Supabase) a propósito: es un diagrama conceptual
 * autocontenido, igual que los diagramas de las etapas previas — mismo
 * trazo/paleta sepia para que se sienta la misma familia visual.
 */

import React, { useEffect, useState } from "react";

import { LayoutEtapa, CLASE_SVG_EN_CAJA, type FilaTexto } from "./LayoutEtapa";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoMaterial = "separados" | "fusionando" | "material";

const ORDEN: PasoMaterial[] = ["separados", "fusionando", "material"];

const DURACIONES: Record<Exclude<PasoMaterial, "material">, number> = {
  separados: 1300,
  fusionando: 1300,
};

const TEXTOS: Record<PasoMaterial, { titulo: string; detalle: string }> = {
  separados: {
    titulo: "Un Compuesto y una Estructura anfitriona",
    detalle: "Dos orígenes distintos, todavía separados.",
  },
  fusionando: {
    titulo: "Convergen al centro",
    detalle: "No se mezclan al azar: se fusionan 1 a 1, uno con el otro.",
  },
  material: {
    titulo: "Nace un Material",
    detalle: "La fusión de ambos, con un halo propio según su categoría.",
  },
};

/** Las 7 categorías reales de materiales.categoria — el color del halo
 *  final rota entre ellas en cada replay, para mostrar que la forma de
 *  la fusión es siempre la misma y solo cambia el color de categoría. */
const CATEGORIAS: { id: string; color: string }[] = [
  { id: "mineral", color: "#8a8f98" },
  { id: "metal_aleacion", color: "#b08968" },
  { id: "tejido_organico_animal", color: "#b5533c" },
  { id: "tejido_organico_vegetal", color: "#7a9e7e" },
  { id: "liquido_organico", color: "#5c7fa3" },
  { id: "gas", color: "#c9b458" },
  { id: "sustancia_organica_amorfa", color: "#9a6fae" },
];

const TONOS = ["#c9a06a", "#8a5a34", "#4e3320"];

/** Mini-átomo: núcleo + 2 capas orbitales con puntos fijos girando —
 *  mismo lenguaje visual que MiniElemento en EtapaCompuestos/Estructuras,
 *  reutilizado acá como el "origen Compuesto" de la fusión. */
function MiniAtomoFusion({ cx, cy, radio, tono, girar }: { cx: number; cy: number; radio: number; tono: string; girar?: { media: string; externa: string } }) {
  const radioOrbitaMedia = radio * 0.58;
  const radioOrbitaExterna = radio * 1.0;
  return (
    <g>
      <circle cx={cx} cy={cy} r={radioOrbitaExterna} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radioOrbitaMedia} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 26%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radio * 0.2} style={{ fill: `color-mix(in srgb, ${tono} 45%, var(--bg-main))`, stroke: `color-mix(in srgb, ${tono} 85%, black)` }} strokeWidth={1.1} />
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: girar ? `explicacion-material-girar ${girar.externa} linear infinite` : undefined }}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          return <circle key={`ext${i}`} cx={cx + Math.cos(a) * radioOrbitaExterna} cy={cy + Math.sin(a) * radioOrbitaExterna} r={radio * 0.09} style={{ fill: TONOS[i], stroke: "#4e3320" }} strokeWidth={0.6} />;
        })}
      </g>
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: girar ? `explicacion-material-girar ${girar.media} linear infinite reverse` : undefined }}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + 0.5;
          return <circle key={`med${i}`} cx={cx + Math.cos(a) * radioOrbitaMedia} cy={cy + Math.sin(a) * radioOrbitaMedia} r={radio * 0.09} style={{ fill: TONOS[(i + 1) % 3], stroke: "#4e3320" }} strokeWidth={0.6} />;
        })}
      </g>
    </g>
  );
}

/** Mini-cristal: 6 mini-átomos en anillo alrededor de un centro, mismo
 *  lenguaje geométrico con el que cerró EtapaEstructuras — nunca inventa
 *  una forma nueva, reutiliza la geometría real de una Estructura en
 *  fuerte deszoom. Es el "origen Estructura" de la fusión. */
function MiniCristalFusion({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const angulos = [0, 60, 120, 180, 240, 300];
  const puntos = angulos.map((a) => {
    const rad = (a * Math.PI) / 180;
    return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
  });
  return (
    <g>
      {puntos.map((p, i) => (
        <line key={`l${i}`} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--primary)" strokeWidth={1} opacity={0.4} />
      ))}
      <MiniAtomoFusion cx={cx} cy={cy} radio={r * 0.32} tono="#8a5a34" />
      {puntos.map((p, i) => (
        <MiniAtomoFusion key={`n${i}`} cx={p[0]} cy={p[1]} radio={r * 0.2} tono={TONOS[i % TONOS.length]} />
      ))}
    </g>
  );
}

/** Halo del Material: color por categoría real, con transform-origin en
 *  porcentaje (no px absolutos) — así el pivote de escala del pulso
 *  siempre queda en el centro real del propio halo, sin desplazarse por
 *  cómo el SVG escala su viewBox al tamaño CSS renderizado. */
function HaloMaterial({ cx, cy, r, color, pulso }: { cx: number; cy: number; r: number; color: string; pulso: boolean }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      opacity={0.45}
      style={{
        transformOrigin: "50% 50%",
        transformBox: "fill-box",
        animation: pulso ? "explicacion-material-halo 2.4s ease-in-out infinite" : undefined,
        transition: "stroke 0.4s ease-out",
      }}
    />
  );
}

function DiagramaMaterial({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoMaterial>("separados");
  const terminado = paso === "material";

  // Categoría del halo: rota en cada replay, para mostrar que la forma
  // de la fusión es siempre la misma y solo cambia el color por categoría.
  const [categoriaIdx, setCategoriaIdx] = useState(0);

  useEffect(() => {
    setPaso("separados");
    setCategoriaIdx((i) => (i + 1) % CATEGORIAS.length);
  }, [replayKey]);

  useEffect(() => {
    if (paso === "material") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso as Exclude<PasoMaterial, "material">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const fusionado = paso === "fusionando" || paso === "material";
  const esMaterial = paso === "material";
  const categoria = CATEGORIAS[categoriaIdx];

  const cx = 210;
  const cy = 118;

  // "separados": el mini-átomo entra desde la izquierda, el mini-cristal
  // desde la derecha — al fusionar, ambos convergen al mismo centro.
  const xAtomoSeparado = cx - 110;
  const xCristalSeparado = cx + 110;

  const grafico = (
    <svg viewBox="0 0 420 200" className={CLASE_SVG_EN_CAJA}>
      {esMaterial && <HaloMaterial cx={cx} cy={cy} r={68} color={categoria.color} pulso />}

      <g
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          transform: fusionado ? "translate(0px, 0px)" : `translate(${xAtomoSeparado - cx}px, 0px)`,
          transition: "transform 0.9s cubic-bezier(0.34, 1.1, 0.4, 1)",
        }}
      >
        <MiniAtomoFusion cx={cx} cy={cy} radio={34} tono="#8a5a34" girar={{ media: "22s", externa: "16s" }} />
      </g>

      <g
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          transform: fusionado ? "translate(0px, 0px)" : `translate(${xCristalSeparado - cx}px, 0px)`,
          transition: "transform 0.9s cubic-bezier(0.34, 1.1, 0.4, 1)",
          opacity: fusionado ? 0.92 : 1,
        }}
      >
        <MiniCristalFusion cx={cx} cy={cy} r={30} />
      </g>
    </svg>
  );

  const filas: FilaTexto[] = ORDEN.slice(0, idx + 1).map((p) => ({
    id: p,
    ...TEXTOS[p],
    extra:
      p === "material" && esMaterial ? (
        <p className="mx-auto mt-1 max-w-xs text-[10px] font-bold uppercase tracking-wide md:mx-0" style={{ color: categoria.color }}>
          Categoría: {categoria.id.replace(/_/g, " ")}
        </p>
      ) : undefined,
  }));

  return <LayoutEtapa grafico={grafico} filas={filas} terminado={terminado} pasoActual={idx} totalPasos={ORDEN.length} onReplay={onReplay} />;
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaMateriales({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="materiales" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-material-girar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes explicacion-material-halo {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.06); }
        }
      `}</style>

      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">Materiales</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaMaterial replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Los Materiales reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que las etapas anteriores
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
