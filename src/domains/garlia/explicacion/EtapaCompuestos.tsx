"use client";

/**
 * EtapaCompuestos.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Tercer tramo: Elementos → Compuesto. Mismo criterio que EtapaPolaridades
 * y EtapaElementos: por ahora solo el Bloque 1 (diagrama animado de la
 * lógica) — la galería con Compuestos reales de Supabase queda para
 * después, a propósito, no está implementada acá todavía.
 *
 * Mismo layout que DiagramaCapas (EtapaElementos): gráfico fijo a la
 * izquierda en desktop, texto apilándose en escalera a la derecha a
 * medida que avanza el ciclo, sin borrar los pasos anteriores.
 *
 *   DiagramaEnlaceCompuesto: dos Elementos (mini-átomo con núcleo + 2
 *   capas orbitales, mismo lenguaje visual que AtomoVisual) cada uno con
 *   sus Sitios de Enlace propios (los puntos de la capa externa por donde
 *   un Elemento puede conectarse a otro — ver elemento_sitios_enlace /
 *   enlace_sitios / compuesto_enlaces en Supabase). El ciclo:
 *
 *     1. Los dos Elementos aparecen separados, sus sitios de enlace
 *        pulsando (disponibles, buscando pareja).
 *     2. Un sitio compatible de cada uno se ilumina y un enlace curvo
 *        crece entre ambos — el "encaje".
 *     3. Los átomos se acercan por ese enlace (arco de tensión, se nota
 *        que el enlace los atrae) y el conjunto se marca como un
 *        Compuesto (halo unificador + etiqueta), se sostiene un momento
 *        más largo que los pasos anteriores, y el ciclo reinicia.
 *
 * No usa AtomoVisual ni datos reales (Supabase) a propósito: es un
 * diagrama conceptual autocontenido, igual que DiagramaPolaridadesTASI y
 * DiagramaCapas — mismo trazo/paleta sepia para que se sienta la misma
 * familia visual, sin acoplarse a la forma real de un Elemento.
 */

import React, { useEffect, useState } from "react";

import { anchoEnCaja } from "./LayoutEtapa";
import { LayoutEtapa3Col, CLASE_SVG_EN_CAJA } from "./LayoutEtapa3Col";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

type PasoEnlace = "buscando" | "encajando" | "enlazado" | "compuesto";

const ORDEN: PasoEnlace[] = ["buscando", "encajando", "enlazado", "compuesto"];

const DURACIONES: Record<Exclude<PasoEnlace, "compuesto">, number> = {
  buscando: 1800,
  encajando: 850,
  enlazado: 1500,
};

/** frase: palabra/frase corta mostrada durante ese paso de la animación.
 *  info: texto de más info, revelado solo al terminar (paso "compuesto"). */
const TEXTOS: Record<PasoEnlace, { frase: string; info?: string }> = {
  buscando: { frase: "Buscando sitio" },
  encajando: { frase: "Encajando" },
  enlazado: { frase: "Enlazando" },
  compuesto: {
    frase: "Compuesto",
    info: "Dos Elementos con Sitios de Enlace compatibles se encuentran, encajan y quedan unidos: nace un Compuesto, con propiedades propias que ninguno de los dos tenía por separado.",
  },
};

/** Un sitio de enlace individual: punto en el borde de un Elemento.
 *  "disponible" pulsa suave (buscando pareja); el que efectivamente
 *  encaja con el otro elemento se enciende con un golpe de escala y deja
 *  de pulsar porque ya encontró su par. */
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
      r={activo ? 6.5 : 4.5}
      style={{
        fill: activo
          ? "color-mix(in srgb, var(--primary) 88%, transparent)"
          : "color-mix(in srgb, var(--primary) 20%, transparent)",
        stroke: "var(--primary)",
        strokeWidth: activo ? 1.6 : 1,
        opacity: activo ? 1 : 0.55,
        transformOrigin: `${cx}px ${cy}px`,
        transition: "r 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), fill 0.35s ease-out, opacity 0.35s ease-out",
        animation: !activo
          ? "explicacion-sitio-pulso 1.8s ease-in-out infinite"
          : encajando
            ? "explicacion-sitio-encaje 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both"
            : undefined,
      }}
    />
  );
}

/** Mini-átomo propio del diagrama: núcleo + 2 capas orbitales con puntos
 *  fijos como "partículas", y 3 Sitios de Enlace en el borde exterior
 *  (mismo concepto que elemento_sitios_enlace, simplificado a 3 puntos
 *  visibles). El sitio de arriba (índice 0) es el que efectivamente
 *  encaja con el otro elemento en este ciclo. */
function MiniElemento({
  cx,
  cy,
  radio,
  encajando,
  tono,
  girar,
}: {
  cx: number;
  cy: number;
  radio: number;
  encajando: boolean;
  tono: string;
  /** Duración del giro sutil de las capas — misma idea que AnilloCapa en
   *  DiagramaCapas (la rotación ES parte de la explicación, no adorno):
   *  un Elemento sigue "vivo" incluso cuando no está en foco. */
  girar: { media: string; externa: string };
}) {
  const radioOrbitaMedia = radio * 0.42;
  const radioOrbitaExterna = radio * 0.72;
  const radioSitios = radio * 1.02;
  const angulosSitios = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];

  return (
    <g>
      {/* Órbitas: mismo trazo punteado que AtomoVisual/DiagramaCapas */}
      <circle cx={cx} cy={cy} r={radioOrbitaMedia} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
      <circle cx={cx} cy={cy} r={radioOrbitaExterna} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 22%, transparent)" }} />

      {/* Núcleo */}
      <circle cx={cx} cy={cy} r={radio * 0.16} style={{ fill: `color-mix(in srgb, ${tono} 45%, var(--bg-main))`, stroke: `color-mix(in srgb, ${tono} 85%, black)` }} strokeWidth={1.2} />

      {/* Partículas fijas en las 2 capas, girando lento — da lectura de
          átomo vivo sin competir visualmente con los Sitios de Enlace. */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `explicacion-girar ${girar.media} linear infinite` }}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.4;
          return <circle key={`m${i}`} cx={cx + Math.cos(a) * radioOrbitaMedia} cy={cy + Math.sin(a) * radioOrbitaMedia} r={radio * 0.06} style={{ fill: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />;
        })}
      </g>
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `explicacion-girar ${girar.externa} linear infinite reverse` }}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 - 0.3;
          return <circle key={`e${i}`} cx={cx + Math.cos(a) * radioOrbitaExterna} cy={cy + Math.sin(a) * radioOrbitaExterna} r={radio * 0.05} style={{ fill: "color-mix(in srgb, var(--primary) 32%, transparent)" }} />;
        })}
      </g>

      {/* Sitios de Enlace: puntos fijos en el borde exterior (no giran,
          para que el enlace que se dibuja entre ambos sitios activos
          siempre calce con su posición real). */}
      {angulosSitios.map((a, i) => (
        <SitioEnlace
          key={i}
          cx={cx + Math.cos(a) * radioSitios}
          cy={cy + Math.sin(a) * radioSitios}
          activo={i === 0}
          encajando={i === 0 && encajando}
        />
      ))}
    </g>
  );
}

function DiagramaEnlaceCompuesto({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  const [paso, setPaso] = useState<PasoEnlace>("buscando");
  const terminado = paso === "compuesto";

  useEffect(() => {
    setPaso("buscando");
  }, [replayKey]);

  useEffect(() => {
    if (paso === "compuesto") return; // último paso: se queda quieto
    const t = setTimeout(() => {
      setPaso((p) => ORDEN[ORDEN.indexOf(p) + 1]);
    }, DURACIONES[paso as Exclude<PasoEnlace, "compuesto">]);
    return () => clearTimeout(t);
  }, [paso]);

  const idx = ORDEN.indexOf(paso);
  const acercado = paso === "enlazado" || paso === "compuesto";
  const mostrarEnlace = paso === "encajando" || paso === "enlazado" || paso === "compuesto";

  // Separación entre los dos átomos: se acercan al encajar el enlace,
  // como si el enlace mismo los atrajera — refuerza visualmente que un
  // Compuesto no es "dos elementos pegados", es dos elementos que
  // encontraron un sitio de enlace compatible entre sí.
  const radio = 78;
  const separacion = acercado ? 128 : 172;
  const cxA = 210 - separacion / 2;
  const cxB = 210 + separacion / 2;
  const cy = 118;
  const yEnlace = cy - radio * 1.02;
  // Enlace curvo (arco hacia arriba) en vez de línea recta — se lee más
  // como "tensión elástica" que como un simple trazo estático.
  const curvaY = yEnlace - 22;

  const grafico = (
    <svg viewBox="0 0 420 200" className={CLASE_SVG_EN_CAJA}>
      {/* Enlace: curva que crece con un dibujo de trazo (pathLength +
          strokeDashoffset) en vez de aparecer de golpe, para que se lea
          como "se está formando", no como un elemento que aparece y ya. */}
      {mostrarEnlace && (
        <path
          d={`M ${cxA} ${yEnlace} Q 210 ${curvaY} ${cxB} ${yEnlace}`}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={100}
          style={{
            strokeDasharray: 100,
            strokeDashoffset: paso === "encajando" ? 100 : 0,
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1), d 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      )}

      <g style={{ transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <MiniElemento cx={cxA} cy={cy} radio={radio} encajando={paso === "encajando"} tono="#8a5a34" girar={{ media: "22s", externa: "34s" }} />
      </g>
      <g style={{ transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <MiniElemento cx={cxB} cy={cy} radio={radio} encajando={paso === "encajando"} tono="#4e3320" girar={{ media: "26s", externa: "30s" }} />
      </g>
    </svg>
  );

  return <LayoutEtapa3Col
      grafico={grafico}
      frase={TEXTOS[paso].frase}
      info={TEXTOS.compuesto.info}
      terminado={terminado}
      pasoActual={idx}
      totalPasos={ORDEN.length}
      onReplay={onReplay}
      // Al acercarse los dos átomos el dibujo pasa de ~304px a ~263px de ancho:
      // la caja se contrae a ese ancho final para que el texto no quede lejos.
      anchoFinal={anchoEnCaja(280, 420, 200)}
      contraido={acercado}
    />;
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaCompuestos({ replayKey, onReplay }: { replayKey: number; onReplay: () => void }) {
  return (
    <section id="compuestos" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-sitio-pulso {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.35); opacity: 0.9; }
        }
        @keyframes explicacion-sitio-encaje {
          0% { transform: scale(1); }
          45% { transform: scale(1.7); }
          100% { transform: scale(1); }
        }
        @keyframes explicacion-girar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-5 text-center">
        <h2 className="text-base font-black uppercase tracking-wide">Compuestos</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaEnlaceCompuesto replayKey={replayKey} onReplay={onReplay} />
      </div>

      {/* Galería "Los Compuestos reales" (Supabase) queda para después, a
          propósito — este tramo por ahora solo tiene el Bloque 1
          (diagrama de la lógica), igual que Polaridades y Elementos
          tuvieron su propia galería agregada en un paso posterior. */}
    </section>
  );
}
