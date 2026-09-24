"use client";

/**
 * ParticulaVisual.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Gráficos circulares para el sistema de Física (Tesis/Antítesis/Síntesis),
 * paralelos a AtomoVisual (elementos/ElementoEditor.tsx) pero para la
 * jerarquía Partícula → Ium → Oris:
 *
 *   - ParticulaVisual: una Partícula (fórmula de 3 letras A/T/S, ej. "SAT")
 *     como círculo partido en 3 tercios iguales (120° cada uno), cada
 *     tercio con su letra — el diseño "casilla de tabla periódica" pedido.
 *   - LetrasVisual: un Ium o un Oris, cuya composición no son 3 letras
 *     fijas sino una bolsa de letras A/T/S de tamaño variable (ej. Fluxor =
 *     2×Cinética(TTT) + 1×Masa(AAA) = 6T + 3A). Se dibuja como el mismo
 *     círculo pero con arcos proporcionales al conteo de cada letra en vez
 *     de tercios iguales.
 *
 * Ambos comparten color/tipografía con el resto de Física para que el ojo
 * los lea como la misma familia visual.
 */

import React, { useState } from "react";
import { PARTICULA_INITIAL } from "./types";

export type LetraATS = "A" | "T" | "S" | "I";

export const LETRA_COLOR: Record<LetraATS, { bg: string; border: string; fg: string }> = {
  // Paleta sepia/café con distintos valores (claro/medio/oscuro) en vez de
  // verde/rojo/azul — mismo tono de familia, cada letra se distingue por
  // luminosidad y no por matiz. fg claro para leerse sobre el tema sepia
  // oscuro de los admins.
  A: { bg: "color-mix(in srgb, #c9a06a 20%, transparent)", border: "#c9a06a", fg: "#f3e6d3" },
  T: { bg: "color-mix(in srgb, #8a5a34 22%, transparent)", border: "#8a5a34", fg: "#f0dfc9" },
  S: { bg: "color-mix(in srgb, #4e3320 24%, transparent)", border: "#4e3320", fg: "#e8d5bd" },
  // I = Transformación inversa (choque A-T en vez de T-A) — mismo tratamiento
  // sepia que las otras 3, con un valor distinto para diferenciarse de un
  // vistazo tanto de A (más clara) como de S (más oscura).
  I: { bg: "color-mix(in srgb, #6b4423 23%, transparent)", border: "#6b4423", fg: "#ecdcc4" },
};

export const LETRA_NOMBRE: Record<LetraATS, string> = {
  T: "Tesis",
  A: "Antítesis",
  S: "Síntesis",
  I: "Inversa",
};

function esLetraATS(c: string): c is LetraATS {
  return c === "A" || c === "T" || c === "S" || c === "I";
}

/** Convierte una fórmula tipo "SATI" en su conteo de letras {A, T, S, I}. */
export function contarLetras(formula: string): Record<LetraATS, number> {
  const out: Record<LetraATS, number> = { A: 0, T: 0, S: 0, I: 0 };
  for (const c of formula.toUpperCase()) {
    if (esLetraATS(c)) out[c] += 1;
  }
  return out;
}

function sectorPath(cx: number, cy: number, r: number, anguloIni: number, anguloFin: number): string {
  // Sector de pizza desde el centro, entre dos ángulos (radianes).
  const x1 = cx + r * Math.cos(anguloIni);
  const y1 = cy + r * Math.sin(anguloIni);
  const x2 = cx + r * Math.cos(anguloFin);
  const y2 = cy + r * Math.sin(anguloFin);
  const largo = anguloFin - anguloIni > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largo} 1 ${x2} ${y2} Z`;
}

/**
 * Círculo de una Partícula: siempre 3 tercios iguales (120° cada uno),
 * uno por letra de la fórmula, en el orden en que aparecen. Fórmulas con
 * menos de 3 letras (ej. Partícula Base: solo "A", "T" o "S") se dibujan
 * como círculo completo de un solo color.
 */
export function ParticulaVisual({
  formula,
  size = 96,
  className,
}: {
  /** Fórmula de hasta 3 letras A/T/S, ej. "SAT", "AAA", o solo "A". */
  formula: string;
  size?: number;
  className?: string;
}) {
  const letras = formula
    .toUpperCase()
    .split("")
    .filter(esLetraATS) as LetraATS[];

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const fontSize = size * 0.16;
  // Grosor de borde relativo al tamaño (antes era un valor fijo en unidades
  // SVG, así que a tamaños chicos —como en AtomoVisual, donde los círculos
  // rondan 20-40px— se veía desproporcionadamente grueso comparado con los
  // ~50-70px de IumVisual). Con piso bajo para que siga siendo visible.
  const strokeW = Math.max(0.6, size * 0.02);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Partícula ${formula}`}
    >
      {letras.length <= 1 ? (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            strokeWidth={strokeW}
            style={{
              fill: letras[0] ? LETRA_COLOR[letras[0]].bg : "color-mix(in srgb, var(--primary) 10%, transparent)",
              stroke: letras[0] ? LETRA_COLOR[letras[0]].border : "var(--primary)",
            }}
          />
          {letras[0] && (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight={900}
              style={{ fill: LETRA_COLOR[letras[0]].fg }}
            >
              {letras[0]}
            </text>
          )}
        </>
      ) : (
        letras.map((letra, i) => {
          const anguloTercio = (Math.PI * 2) / 3;
          const anguloIni = -Math.PI / 2 + i * anguloTercio;
          const anguloFin = anguloIni + anguloTercio;
          const anguloMedio = (anguloIni + anguloFin) / 2;
          const color = LETRA_COLOR[letra];
          const labelR = r * 0.6;
          return (
            <g key={i}>
              <path
                d={sectorPath(cx, cy, r, anguloIni, anguloFin)}
                strokeWidth={strokeW}
                style={{ fill: color.bg, stroke: color.border }}
              />
              <text
                x={cx + labelR * Math.cos(anguloMedio)}
                y={cy + labelR * Math.sin(anguloMedio)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={900}
                style={{ fill: color.fg }}
              >
                {letra}
              </text>
            </g>
          );
        })
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={strokeW} style={{ stroke: "var(--bg-main)" }} opacity={0.001} />
    </svg>
  );
}

/**
 * Círculo de un Ium (o de un Oris, que es una mezcla de Iums): recibe un
 * conteo total de letras {A, T, S} — típicamente la suma de las fórmulas
 * de todas las Partículas que lo componen — y dibuja arcos proporcionales
 * al peso de cada letra, en vez de tercios fijos. Con 0 letras se ve como
 * un círculo vacío (placeholder).
 */
export function LetrasVisual({
  conteo,
  size = 120,
  className,
}: {
  conteo: Record<LetraATS, number>;
  size?: number;
  className?: string;
}) {
  const total = conteo.A + conteo.T + conteo.S + conteo.I;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const fontSize = size * 0.1;
  // Mismo criterio que ParticulaVisual: grosor relativo al tamaño, no fijo.
  const strokeW = Math.max(0.6, size * 0.02);

  if (total === 0) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} role="img" aria-label="Sin composición">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          strokeWidth={strokeW}
          style={{ fill: "color-mix(in srgb, var(--primary) 4%, transparent)", stroke: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
        />
      </svg>
    );
  }

  const orden: LetraATS[] = ["A", "T", "S", "I"];
  let anguloActual = -Math.PI / 2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} role="img" aria-label="Composición A/T/S">
      {orden.map((letra) => {
        const n = conteo[letra];
        if (n === 0) return null;
        const anguloSector = (n / total) * Math.PI * 2;
        const anguloIni = anguloActual;
        const anguloFin = anguloActual + anguloSector;
        anguloActual = anguloFin;
        const anguloMedio = (anguloIni + anguloFin) / 2;
        const color = LETRA_COLOR[letra];
        const labelR = r * 0.62;
        // Sectores muy angostos (una sola letra entre muchas) esconden el
        // número para no saturar; el resto muestra "nA" (cantidad+letra).
        const mostrarLabel = anguloSector > 0.35;
        return (
          <g key={letra}>
            <path
              d={sectorPath(cx, cy, r, anguloIni, anguloFin)}
              strokeWidth={strokeW}
              style={{ fill: color.bg, stroke: color.border }}
            />
            {mostrarLabel && (
              <text
                x={cx + labelR * Math.cos(anguloMedio)}
                y={cy + labelR * Math.sin(anguloMedio)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={900}
                style={{ fill: color.fg }}
              >
                {n}{letra}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Suma varios conteos de letras en uno solo (ej. varias Partículas de un Ium). */
export function sumarConteos(...conteos: Record<LetraATS, number>[]): Record<LetraATS, number> {
  const out: Record<LetraATS, number> = { A: 0, T: 0, S: 0, I: 0 };
  for (const c of conteos) {
    out.A += c.A;
    out.T += c.T;
    out.S += c.S;
    out.I += c.I;
  }
  return out;
}

/**
 * Círculo de un Ium (o de un Oris), en el mismo estilo que AtomoVisual de
 * Elementos: un centro y sus Partículas componentes distribuidas en un
 * anillo alrededor, una por una (no agregadas como arcos ni agrupadas por
 * cantidad) — cada Partícula repetida se dibuja como su propio círculo
 * individual, sin badge de cantidad. Reemplaza a LetrasVisual para este
 * caso: acá se ven siempre las Partículas reales que componen el Ium, no
 * un conteo agregado.
 *
 * Tiene un botón flotante en la esquina (mismo patrón que un toggle de
 * capa) para alternar cada círculo entre dos modos:
 *   - "ats" (default): 3 tercios A/T/S en miniatura, igual que ParticulaVisual.
 *   - "inicial": círculo sólido con la inicial de la Partícula (ej. "C" de
 *     Cinética) — mismo criterio que PARTICLE_INITIAL en Elementos.
 */
/** Las 5 geometrías reales asignadas a un Ium en Supabase (vista
 *  v_iums_geometria_canonica_v1) — ver useGeometriaIums.ts. Cada una se
 *  dibuja con una silueta propia, no una variación de círculo: antes
 *  TODO Ium (sin importar su geometría) se dibujaba igual, como partículas
 *  orbitando un anillo. */
export type GeometriaIum = "puntual" | "lineal" | "red" | "radial" | "flexible";

const GEOMETRIA_COLOR: Record<GeometriaIum, string> = {
  puntual: "#6b4423",
  lineal: "#8a5a34",
  red: "#4e3320",
  radial: "#c9a06a",
  flexible: "#a3703f",
};

export const GEOMETRIA_IUM_NOMBRE: Record<GeometriaIum, string> = {
  puntual: "Puntual",
  lineal: "Lineal",
  red: "Red",
  radial: "Radial",
  flexible: "Flexible",
};

/**
 * Dibuja, dentro de un círculo de radio `r` centrado en (cx, cy), la forma
 * correspondiente a una geometría real de Ium. Reutilizado tanto por
 * IumVisual (un Ium a tamaño completo) como por futuros usos a escala
 * miniatura (ej. cada nodo de un Oris) — por eso vive como función aparte
 * en vez de estar inline en IumVisual.
 */
export function geometriaIumPath(cx: number, cy: number, r: number, geometria: GeometriaIum): React.ReactNode {
  const color = GEOMETRIA_COLOR[geometria];

  if (geometria === "puntual") {
    // Un único núcleo sólido, sin orbitales — mancha compacta, no anillo.
    return <circle cx={cx} cy={cy} r={r * 0.55} style={{ fill: color }} />;
  }

  if (geometria === "lineal") {
    // Segmento recto grueso con remates redondos — nunca un círculo.
    const w = r * 1.9;
    return (
      <g>
        <rect x={cx - w / 2} y={cy - r * 0.32} width={w} height={r * 0.64} rx={r * 0.32} style={{ fill: color }} />
        <circle cx={cx - w / 2} cy={cy} r={r * 0.32} style={{ fill: color }} />
        <circle cx={cx + w / 2} cy={cy} r={r * 0.32} style={{ fill: color }} />
      </g>
    );
  }

  if (geometria === "red") {
    // Triángulo de nodos totalmente interconectados — malla visible.
    const pts = [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      return [cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85];
    });
    return (
      <g>
        {pts.map(([x1, y1], i) =>
          pts.slice(i + 1).map(([x2, y2], j) => (
            <line
              key={`edge-${i}-${j}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={r * 0.09}
              style={{ stroke: color }}
            />
          )),
        )}
        {pts.map(([x, y], i) => (
          <circle key={`node-${i}`} cx={x} cy={y} r={r * 0.24} style={{ fill: color, stroke: "var(--bg-main)" }} strokeWidth={1} />
        ))}
      </g>
    );
  }

  if (geometria === "radial") {
    // Anillo orbital real (se dibuja, no se simula) + núcleo + 4 satélites.
    return (
      <g>
        <circle cx={cx} cy={cy} r={r * 0.82} fill="none" strokeWidth={r * 0.06} style={{ stroke: color }} />
        <circle cx={cx} cy={cy} r={r * 0.2} style={{ fill: color }} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={cx + Math.cos(a) * r * 0.82}
              cy={cy + Math.sin(a) * r * 0.82}
              r={r * 0.16}
              style={{ fill: color }}
            />
          );
        })}
      </g>
    );
  }

  // flexible: cadena ondulada — curva serpenteante, sin puntos discretos ni malla.
  const w = r * 1.7;
  const path = `M ${cx - w / 2} ${cy} Q ${cx - w / 4} ${cy - r * 0.6} ${cx} ${cy} Q ${cx + w / 4} ${cy + r * 0.6} ${cx + w / 2} ${cy}`;
  return <path d={path} fill="none" strokeWidth={r * 0.22} strokeLinecap="round" style={{ stroke: color }} />;
}

export function IumVisual({
  particulas,
  geometria,
  size = 160,
  className,
  showToggle = true,
}: {
  /** Partículas componentes ya expandidas (una entrada por unidad), con su
   *  fórmula A/T/S, ej. Fluxor → [{ nombre: "Cinética", formula: "TTT" }, { nombre: "Cinética", formula: "TTT" }, { nombre: "Masa", formula: "AAA" }]. */
  particulas: { nombre: string; formula: string }[];
  /** Geometría real del Ium (v_iums_geometria_canonica_v1 — ver
   *  useGeometriaIums.ts). Si no se pasa, cae al criterio anterior
   *  (partículas orbitando un anillo genérico) para no romper usos que
   *  todavía no resuelven la geometría. */
  geometria?: GeometriaIum;
  size?: number;
  className?: string;
  /** Si es false, no renderiza el botón flotante de alternar modo (ats/inicial).
   *  Default true — no cambia el comportamiento de los usos existentes. */
  showToggle?: boolean;
}) {
  const [modo, setModo] = useState<"ats" | "inicial">("ats");
  const cx = size / 2;
  const cy = size / 2;
  const orbitR = size * 0.34;
  const particleR = size * 0.155;
  const guideStrokeW = Math.max(0.6, size * 0.01);
  // Grosor de los círculos individuales (modo "inicial"), relativo a su
  // propio tamaño real (particleR*2), mismo criterio que ParticulaVisual.
  const strokeW = Math.max(0.6, particleR * 2 * 0.02);

  return (
    <div className={`relative inline-block ${className ?? ""}`} style={{ width: size, height: size }}>
      {showToggle && particulas.length > 0 && (
        <button
          type="button"
          onClick={() => setModo((m) => (m === "ats" ? "inicial" : "ats"))}
          title={modo === "ats" ? "Mostrar iniciales de las Partículas" : "Mostrar letras A/T/S"}
          className="absolute bottom-0.5 right-0.5 z-10 flex items-center justify-center rounded-full border shadow-sm cursor-pointer transition-transform hover:scale-110"
          style={{
            width: Math.max(20, size * 0.15),
            height: Math.max(20, size * 0.15),
            fontSize: Math.max(9, size * 0.075),
            fontWeight: 900,
            background: "var(--primary)",
            color: "var(--btn-text)",
            borderColor: "color-mix(in srgb, var(--primary) 90%, black)",
          }}
        >
          {modo === "ats" ? "Aa" : "∆"}
        </button>
      )}

      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={
          geometria
            ? `Geometría ${GEOMETRIA_IUM_NOMBRE[geometria]} del Ium`
            : modo === "ats"
              ? "Composición A/T/S del Ium"
              : "Iniciales de Partículas del Ium"
        }
      >
        {particulas.length === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={orbitR}
            strokeWidth={guideStrokeW}
            style={{ fill: "none", stroke: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
          />
        ) : geometria ? (
          // Geometría real conocida: se dibuja SU forma (puntual, lineal,
          // red, radial o flexible), no el orbital genérico anterior.
          <>{geometriaIumPath(cx, cy, size * 0.42, geometria)}</>
        ) : (
          <>
            {/* Sin geometría resuelta (compat hacia atrás): criterio
                anterior — partículas orbitando un anillo genérico. */}
            <circle
              cx={cx}
              cy={cy}
              r={orbitR}
              fill="none"
              strokeWidth={guideStrokeW}
              style={{ stroke: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
            />

            {particulas.map((p, i) => {
              const angulo = (i / particulas.length) * Math.PI * 2 - Math.PI / 2;
              const px = cx + Math.cos(angulo) * orbitR;
              const py = cy + Math.sin(angulo) * orbitR;

              if (modo === "inicial") {
                // Modo iniciales: mismo criterio sepia que el resto — valores
                // (claro/medio/oscuro) en vez de matices distintos por tipo.
                const idx = Object.keys(PARTICULA_INITIAL).indexOf(p.nombre);
                const tonos = ["#c9a06a", "#8a5a34", "#4e3320"];
                const tono = tonos[idx % tonos.length];
                const initFont = particleR * 0.6;
                return (
                  <g key={`${p.nombre}-${i}`}>
                    <title>{p.nombre}</title>
                    <circle
                      cx={px}
                      cy={py}
                      r={particleR}
                      strokeWidth={strokeW}
                      style={{
                        fill: `color-mix(in srgb, ${tono} 55%, var(--bg-main))`,
                        stroke: `color-mix(in srgb, ${tono} 90%, black)`,
                      }}
                    />
                    <text
                      x={px}
                      y={py}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={initFont}
                      fontWeight={900}
                      style={{ fill: "#f3e6d3" }}
                    >
                      {PARTICULA_INITIAL[p.nombre] ?? p.nombre[0]}
                    </text>
                  </g>
                );
              }

              // Sectores de 120° dibujados a mano acá mismo — mismo trazo,
              // mismo criterio de sectores/letra única que ParticulaVisual.
              return (
                <g key={`${p.nombre}-${i}`}>
                  <title>{`${p.nombre} (${p.formula})`}</title>
                  <foreignObject x={px - particleR} y={py - particleR} width={particleR * 2} height={particleR * 2}>
                    <ParticulaVisual formula={p.formula} size={particleR * 2} />
                  </foreignObject>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
