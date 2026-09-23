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
 *   - formas_geometricas: catálogo REAL y acotado de siluetas (verificado
 *     en Supabase, proyecto Franiloverart): punto, línea, plano, esfera,
 *     cilindro, prisma_rectangular, espada_de_una_mano. No es un tipo
 *     hardcodeado por el componente — es la ley geométrica real que
 *     define el volumen de cada Objeto vía sus parámetros_requeridos
 *     (longitud/ancho/grosor o radio/longitud).
 *   - plantillas_geometricas: qué Objetos base usan cada forma. Se
 *     verificó la distribución real — prisma_rectangular es la forma
 *     mayoritaria (Arco, Botas, Filo, Mango, Mazo, Pechera, Pistola,
 *     Pluma, Totem, Cartas), espada_de_una_mano cubre Espada/Daga, y
 *     cilindro cubre Medallón/Sombrero/Paraguas/Droga — un cilindro con
 *     radio grande y longitud (altura) chica da la silueta de disco o
 *     medallón sin inventar una forma nueva fuera del catálogo.
 *
 * Rediseño (coherencia con EtapaMateriales + geometría real de items):
 *
 *   1. El Material que entra ya NO es un cuadrado genérico: es el mismo
 *      resultado final con el que cierra EtapaMateriales (MiniAtomoFusion
 *      + MiniCristalFusion superpuestos, con halo de categoría), en
 *      fuerte deszoom — para que se lea como "la misma cosa" que llega
 *      desde el tramo anterior, no una reinterpretación simplificada.
 *   2. El molde ya NO es un rectángulo genérico: es una de 3 siluetas
 *      reales del catálogo (prisma rectangular, espada de una mano,
 *      disco/medallón vía cilindro achatado) que rota en cada replay —
 *      mismo mecanismo que la rotación de categoría en Materiales.
 *
 *   El ciclo:
 *     1. "sueltos": uno o más Materiales (fusión mini-átomo+mini-cristal
 *        con halo), sueltos, sin una forma concreta que los contenga.
 *     2. "molde": aparece el contorno vacío de la forma geométrica real
 *        de este replay.
 *     3. "llenando": los Materiales convergen y se funden dentro del
 *        contorno — el molde se llena con su color.
 *     4. "objeto": el conjunto se marca como Objeto completo (halo +
 *        etiqueta): ya tiene forma, medidas y propiedades físicas
 *        propias que ni el Material ni la forma tenían por separado.
 *
 * No usa datos reales (Supabase) a propósito: es un diagrama conceptual
 * autocontenido, igual que los diagramas de las etapas previas — mismo
 * trazo/paleta sepia para que se sienta la misma familia visual.
 */

import React, { useEffect, useMemo, useState } from "react";

import { LayoutEtapa, CLASE_SVG_EN_CAJA, anchoEnCaja, type FilaTexto } from "./LayoutEtapa";

// ─── Bloque 0: mismo lenguaje visual que el cierre de EtapaMateriales ─────
// (MiniAtomoFusion, MiniCristalFusion, CATEGORIAS_MATERIAL están
// duplicados intencionalmente acá en vez de importados — cada Etapa de
// /explicacion es autocontenida, mismo patrón que ya usan las etapas
// previas entre sí. Si en el futuro se comparte un módulo común de
// "mini-piezas", este bloque es el primer candidato a extraer.)

const TONOS_ATOMO = ["#c9a06a", "#8a5a34", "#4e3320"];

/** Las 7 categorías reales de materiales.categoria — mismo set y mismos
 *  colores que EtapaMateriales, para que el Material que llega acá se
 *  vea exactamente como el que salió de esa etapa. */
const CATEGORIAS_MATERIAL: { id: string; color: string }[] = [
  { id: "mineral", color: "#8a8f98" },
  { id: "metal_aleacion", color: "#b08968" },
  { id: "tejido_organico_animal", color: "#b5533c" },
  { id: "tejido_organico_vegetal", color: "#7a9e7e" },
  { id: "liquido_organico", color: "#5c7fa3" },
  { id: "gas", color: "#c9b458" },
  { id: "sustancia_organica_amorfa", color: "#9a6fae" },
];

function MiniAtomoFusion({ cx, cy, radio, tono }: { cx: number; cy: number; radio: number; tono: string }) {
  const radioOrbitaMedia = radio * 0.58;
  const radioOrbitaExterna = radio * 1.0;
  return (
    <g>
      <circle cx={cx} cy={cy} r={radioOrbitaExterna} fill="none" strokeDasharray="2 4" strokeWidth={0.8} style={{ stroke: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radioOrbitaMedia} fill="none" strokeDasharray="2 4" strokeWidth={0.8} style={{ stroke: "color-mix(in srgb, var(--primary) 26%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radio * 0.2} style={{ fill: `color-mix(in srgb, ${tono} 45%, var(--bg-main))`, stroke: `color-mix(in srgb, ${tono} 85%, black)` }} strokeWidth={0.9} />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        return <circle key={`ext${i}`} cx={cx + Math.cos(a) * radioOrbitaExterna} cy={cy + Math.sin(a) * radioOrbitaExterna} r={radio * 0.09} style={{ fill: TONOS_ATOMO[i], stroke: "#4e3320" }} strokeWidth={0.5} />;
      })}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + 0.5;
        return <circle key={`med${i}`} cx={cx + Math.cos(a) * radioOrbitaMedia} cy={cy + Math.sin(a) * radioOrbitaMedia} r={radio * 0.09} style={{ fill: TONOS_ATOMO[(i + 1) % 3], stroke: "#4e3320" }} strokeWidth={0.5} />;
      })}
    </g>
  );
}

function MiniCristalFusion({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const angulos = [0, 60, 120, 180, 240, 300];
  const puntos = angulos.map((a) => {
    const rad = (a * Math.PI) / 180;
    return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
  });
  return (
    <g>
      {puntos.map((p, i) => (
        <line key={`l${i}`} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--primary)" strokeWidth={0.8} opacity={0.4} />
      ))}
      <MiniAtomoFusion cx={cx} cy={cy} radio={r * 0.32} tono="#8a5a34" />
      {puntos.map((p, i) => (
        <MiniAtomoFusion key={`n${i}`} cx={p[0]} cy={p[1]} radio={r * 0.2} tono={TONOS_ATOMO[i % TONOS_ATOMO.length]} />
      ))}
    </g>
  );
}

/** Un Material del diagrama: la fusión mini-átomo + mini-cristal con
 *  halo de categoría — el resultado final real de EtapaMateriales, en
 *  fuerte deszoom, en vez del cuadrado genérico anterior. */
function MaterialFusionDiagrama({
  cx,
  cy,
  escala,
  color,
  etiqueta,
  opacidad = 1,
}: {
  cx: number;
  cy: number;
  escala: number;
  color: string;
  etiqueta: string;
  opacidad?: number;
}) {
  const r = 30 * escala;
  return (
    <g
      style={{
        transition: "opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        opacity: opacidad,
      }}
    >
      <circle cx={cx} cy={cy} r={r * 1.35} fill="none" stroke={color} strokeWidth={1.4} opacity={0.4} />
      <MiniCristalFusion cx={cx} cy={cy} r={r} />
      <MiniAtomoFusion cx={cx} cy={cy} radio={r * 0.62} tono="#8a5a34" />
      <title>{etiqueta}</title>
    </g>
  );
}

// ─── Bloque 1: catálogo real de siluetas (formas_geometricas) ─────────────

type FormaId = "prisma_rectangular" | "espada_de_una_mano" | "cilindro_disco";

/** 3 siluetas reales verificadas en formas_geometricas / plantillas_geometricas
 *  — rotan en cada replay, mismo mecanismo que la rotación de categoría en
 *  Materiales. path() dibuja el contorno del molde centrado en (0,0),
 *  reescalable por el ancho/alto que ocupa. */
const FORMAS: {
  id: FormaId;
  clave: string;
  nombre: string;
  ejemplos: string;
  path: string;
  ancho: number;
  alto: number;
}[] = [
  {
    id: "prisma_rectangular",
    clave: "prisma_rectangular",
    nombre: "Prisma rectangular",
    ejemplos: "Mango, Filo, Pechera, Botas...",
    // Barra rectangular con esquinas levemente redondeadas.
    path: "M -52,-13 L 52,-13 Q 58,-13 58,-7 L 58,7 Q 58,13 52,13 L -52,13 Q -58,13 -58,7 L -58,-7 Q -58,-13 -52,-13 Z",
    ancho: 116,
    alto: 26,
  },
  {
    id: "espada_de_una_mano",
    clave: "espada_de_una_mano",
    nombre: "Espada de una mano",
    ejemplos: "Espada, Daga",
    // Hoja prismática rectangular con punta y una guarda simple.
    path: "M -64,-9 L 40,-9 L 62,0 L 40,9 L -64,9 L -64,4 L -70,4 L -70,-4 L -64,-4 Z",
    ancho: 140,
    alto: 20,
  },
  {
    id: "cilindro_disco",
    clave: "cilindro",
    nombre: "Cilindro (disco)",
    ejemplos: "Medallón, Sombrero, Paraguas",
    // Cilindro visto desde arriba con radio grande y longitud/altura
    // chica: un disco — misma forma canónica "cilindro" que Medallón/
    // Sombrero, sin inventar una silueta fuera del catálogo.
    path: "",
    ancho: 96,
    alto: 96,
  },
];

type PasoObjeto = "sueltos" | "molde" | "llenando" | "objeto";

const ORDEN: PasoObjeto[] = ["sueltos", "molde", "llenando", "objeto"];

const DURACIONES: Record<Exclude<PasoObjeto, "objeto">, number> = {
  sueltos: 1600,
  molde: 1200,
  llenando: 1400,
};

const TEXTOS: Record<PasoObjeto, { titulo: string }> = {
  sueltos: { titulo: "Uno o más Materiales, sin una forma que los contenga." },
  molde: { titulo: "Aparece el molde: una forma geométrica real." },
  llenando: { titulo: "El Material se vacía dentro del molde." },
  objeto: { titulo: "Nace un Objeto, con propiedades físicas propias." },
};

function DiagramaMoldeObjeto({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoObjeto>("sueltos");
  const terminado = paso === "objeto";

  // Forma del molde y color de categoría: rotan en cada replay — mismo
  // mecanismo con el que EtapaMateriales rota su color de halo.
  const [formaIdx, setFormaIdx] = useState(0);
  const [categoriaIdx, setCategoriaIdx] = useState(0);

  useEffect(() => {
    setPaso("sueltos");
    setFormaIdx((i) => (i + 1) % FORMAS.length);
    setCategoriaIdx((i) => (i + 1) % CATEGORIAS_MATERIAL.length);
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

  const forma = FORMAS[formaIdx];
  const categoria = CATEGORIAS_MATERIAL[categoriaIdx];

  const cx = 210;
  const cy = 118;

  // Posiciones "sueltos": 2 Materiales flotando fuera del molde, a los
  // costados — todavía no entraron a la forma.
  const POS_SUELTOS = useMemo(
    () => [
      { x: cx - 100, y: cy - 8, escala: 0.62 },
      { x: cx + 100, y: cy + 16, escala: 0.5 },
    ],
    [],
  );

  const grafico = (
    <svg viewBox="0 0 420 200" className={CLASE_SVG_EN_CAJA}>
      {/* El molde: contorno REAL de la forma geométrica (prisma
          rectangular / espada de una mano / cilindro-disco), tomado del
          catálogo formas_geometricas. Vacío al aparecer, se llena con
          el color de categoría del Material durante "llenando", y
          queda sólido en "objeto". */}
      {hayMolde && (
        <g transform={`translate(${cx}, ${cy})`}>
          <defs>
            <clipPath id="objetos-clip-molde">
              {forma.id === "cilindro_disco" ? (
                <ellipse cx={0} cy={0} rx={forma.ancho / 2} ry={forma.alto / 2} />
              ) : (
                <path d={forma.path} />
              )}
            </clipPath>
          </defs>

          {forma.id === "cilindro_disco" ? (
            <ellipse
              cx={0}
              cy={0}
              rx={forma.ancho / 2}
              ry={forma.alto / 2}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={1.6}
              strokeDasharray={completo ? undefined : "4 4"}
              style={{ opacity: 0.75 }}
            >
              <animate attributeName="opacity" from="0" to="0.75" dur="0.5s" fill="freeze" />
            </ellipse>
          ) : (
            <path
              d={forma.path}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={1.6}
              strokeDasharray={completo ? undefined : "4 4"}
              style={{ opacity: 0.75 }}
            >
              <animate attributeName="opacity" from="0" to="0.75" dur="0.5s" fill="freeze" />
            </path>
          )}

          {/* Relleno: un rect que crece en ancho durante "llenando",
              recortado por el contorno real de la forma. */}
          <rect
            x={-forma.ancho / 2}
            y={-forma.alto / 2}
            width={llenandoOMas ? forma.ancho : 0}
            height={forma.alto}
            clipPath="url(#objetos-clip-molde)"
            style={{
              fill: `color-mix(in srgb, ${categoria.color} 55%, var(--bg-main))`,
              transition: "width 1.1s cubic-bezier(0.22, 1, 0.36, 1), fill 0.4s ease-out",
            }}
          />
        </g>
      )}

      {POS_SUELTOS.map((p, i) => (
        <MaterialFusionDiagrama
          key={i}
          cx={p.x}
          cy={p.y}
          escala={p.escala}
          color={categoria.color}
          etiqueta={`Material ${i + 1}`}
          opacidad={llenandoOMas ? 0 : 1}
        />
      ))}
    </svg>
  );

  const filas: FilaTexto[] = ORDEN.slice(0, idx + 1).map((p) => ({
    id: p,
    ...TEXTOS[p],
    extra:
      p === "molde" ? (
        <p className="mx-auto mt-1 max-w-xs text-[10px] font-bold uppercase tracking-wide md:mx-0" style={{ color: "var(--primary)", opacity: 0.6 }}>
          {forma.nombre} · {forma.ejemplos}
        </p>
      ) : p === "objeto" && completo ? (
        <p className="mx-auto mt-1 max-w-xs text-[10px] font-bold uppercase tracking-wide md:mx-0" style={{ color: categoria.color }}>
          Material: {categoria.id.replace(/_/g, " ")}
        </p>
      ) : undefined,
  }));

  return (
    <>
      <LayoutEtapa
        grafico={grafico}
        filas={filas}
        terminado={terminado}
        pasoActual={idx}
        totalPasos={ORDEN.length}
        onReplay={onReplay}
        // Los Materiales sueltos parten a los costados (~234px) y desaparecen
        // al llenarse el molde: la caja se contrae al ancho de la forma real
        // de esta vuelta (prisma 116, espada 140, disco 96 unidades + trazo).
        anchoFinal={anchoEnCaja(forma.ancho + 2, 420, 200)}
        contraido={llenandoOMas}
      />
      <style>{`
        @keyframes explicacion-objetos-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
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
