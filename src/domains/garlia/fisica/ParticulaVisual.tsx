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
  // Borde bien oscurecido (negro puro, no mezcla) para que la línea que
  // separa un tercio/sector de otro se note con claridad de un vistazo —
  // el color-mix(...90%, black) anterior seguía leyéndose muy parecido al
  // bg casi opaco y no se distinguía la separación.
  A: {
    bg: "color-mix(in srgb, #c9a06a 95%, transparent)",
    border: "#1a1208",
    fg: "#3a2a15",
  },
  T: {
    bg: "color-mix(in srgb, #8a5a34 95%, transparent)",
    border: "#1a1208",
    fg: "#f0dfc9",
  },
  S: {
    bg: "color-mix(in srgb, #4e3320 95%, transparent)",
    border: "#1a1208",
    fg: "#e8d5bd",
  },
  // I = Transformación inversa (choque A-T en vez de T-A) — mismo tratamiento
  // sepia que las otras 3, con un valor distinto para diferenciarse de un
  // vistazo tanto de A (más clara) como de S (más oscura).
  I: {
    bg: "color-mix(in srgb, #6b4423 95%, transparent)",
    border: "#1a1208",
    fg: "#ecdcc4",
  },
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
  // Subido de 0.02 a 0.05 (piso 1.1) para que el borde negro se note bien
  // como línea divisoria incluso en los chips chicos (36px).
  const strokeW = Math.max(1.1, size * 0.05);

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
  // Mismo criterio que ParticulaVisual: grosor relativo al tamaño, no fijo,
  // subido para que el borde negro se lea como línea divisoria clara entre
  // sectores (IUMs/Oris con varias letras mezcladas).
  const strokeW = Math.max(1.1, size * 0.05);

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
/** Geometrías reales asignadas a un Ium en Supabase (vista
 *  v_iums_geometria_canonica_v1) — ver useGeometriaIums.ts. Cada una define
 *  el ARMAZÓN sobre el que se disponen las Partículas reales del Ium (no
 *  las reemplaza): antes TODO Ium se dibujaba igual (partículas orbitando
 *  un anillo), y en el rediseño intermedio se dibujaba solo una silueta y
 *  se perdían las Partículas. */
export type GeometriaIum = "puntual" | "lineal" | "red" | "radial" | "flexible" | "angular";

export const GEOMETRIA_IUM_NOMBRE: Record<GeometriaIum, string> = {
  puntual: "Puntual",
  lineal: "Lineal",
  red: "Red",
  radial: "Radial",
  flexible: "Flexible",
  angular: "Angular",
};

const GEOMETRIA_TRAZO = "color-mix(in srgb, var(--primary) 75%, transparent)";

/** Posiciones (x, y) de `n` Partículas dentro de un círculo de radio `r`
 *  centrado en (cx, cy), según la geometría. Devuelve también el radio que
 *  puede tener cada Partícula sin solaparse con sus vecinas. */
function disponerParticulas(
  cx: number,
  cy: number,
  r: number,
  geometria: GeometriaIum,
  n: number,
): { pts: [number, number][]; pr: number } {
  if (n <= 0) return { pts: [], pr: 0 };
  if (n === 1) return { pts: [[cx, cy]], pr: r * 0.42 };

  const t = (i: number) => (n === 1 ? 0.5 : i / (n - 1));

  if (geometria === "puntual") {
    // Núcleo compacto: las Partículas se tocan casi, apiñadas alrededor
    // del centro (una arriba y el resto debajo, o anillo chico si son >3).
    const R = r * 0.24 * Math.min(1.4, 0.7 + n * 0.25);
    const pr = r * (n <= 3 ? 0.28 : 0.22);
    const pts = Array.from({ length: n }, (_, i): [number, number] => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R + (n === 3 ? r * 0.05 : 0)];
    });
    return { pts, pr };
  }

  if (geometria === "lineal") {
    const span = r * 1.5;
    const pr = Math.min(r * 0.32, (span / (n - 1)) * 0.42);
    const pts = Array.from({ length: n }, (_, i): [number, number] => [cx - span / 2 - r * 0.1 + t(i) * span, cy]);
    return { pts, pr };
  }

  if (geometria === "flexible") {
    const span = r * 1.56;
    const pr = Math.min(r * 0.31, (span / (n - 1)) * 0.42);
    const pts = Array.from({ length: n }, (_, i): [number, number] => [
      cx - span / 2 + t(i) * span,
      cy + Math.sin(t(i) * Math.PI * 2) * r * -0.3,
    ]);
    return { pts, pr };
  }

  if (geometria === "angular") {
    // "Λ": sube hasta un vértice y baja — n=3 → extremo, vértice, extremo.
    const span = r * 1.56;
    const pr = Math.min(r * 0.33, (span / (n - 1)) * 0.5);
    const pts = Array.from({ length: n }, (_, i): [number, number] => {
      const k = t(i);
      const y = cy + r * 0.5 - (1 - Math.abs(2 * k - 1)) * r * 1.0;
      return [cx - span / 2 + k * span, y];
    });
    return { pts, pr };
  }

  // red y radial: Partículas en polígono regular.
  const R = r * (geometria === "red" ? 0.62 : 0.66);
  const pr = Math.min(r * 0.3, R * Math.sin(Math.PI / n) * 0.9);
  const pts = Array.from({ length: n }, (_, i): [number, number] => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
  });
  return { pts, pr: Math.max(pr, r * 0.16) };
}

/** Dibuja el armazón de la geometría (líneas/anillo/curva) POR DEBAJO de las
 *  Partículas. Recibe los puntos ya calculados por disponerParticulas. */
function armazonGeometria(
  cx: number,
  cy: number,
  r: number,
  geometria: GeometriaIum,
  pts: [number, number][],
  pr: number,
): React.ReactNode {
  const sw = Math.max(0.8, r * 0.035);
  const trazo = { stroke: GEOMETRIA_TRAZO } as const;

  if (geometria === "puntual") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.9}
        fill="none"
        strokeWidth={Math.max(0.6, sw * 0.6)}
        strokeDasharray={`${sw} ${sw * 2}`}
        style={trazo}
      />
    );
  }

  if (geometria === "lineal") {
    if (pts.length < 2) return null;
    const [x0] = pts[0];
    const [xn] = pts[pts.length - 1];
    const a = pr * 0.4;
    return (
      <g style={trazo} fill="none" strokeWidth={sw * 1.4} strokeLinecap="round" strokeLinejoin="round">
        <line x1={x0} y1={cy} x2={xn + pr + a * 1.2} y2={cy} />
        <path d={`M ${xn + pr + a * 0.3} ${cy - a} L ${xn + pr + a * 1.2} ${cy} L ${xn + pr + a * 0.3} ${cy + a}`} />
      </g>
    );
  }

  if (geometria === "red") {
    // Todas contra todas — malla completa.
    const aristas: React.ReactNode[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        aristas.push(
          <line key={`e-${i}-${j}`} x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]} />,
        );
      }
    }
    return (
      <g style={trazo} strokeWidth={sw * 1.3}>
        {aristas}
        <circle cx={cx} cy={cy} r={sw * 1.4} style={{ fill: GEOMETRIA_TRAZO, stroke: "none" }} />
      </g>
    );
  }

  if (geometria === "radial") {
    return (
      <g style={trazo} fill="none" strokeWidth={sw}>
        <circle cx={cx} cy={cy} r={r * 0.66} />
        {pts.map(([x, y], i) => (
          <line key={`r-${i}`} x1={cx} y1={cy} x2={x} y2={y} strokeWidth={sw * 0.8} />
        ))}
        <circle cx={cx} cy={cy} r={sw * 1.8} style={{ fill: GEOMETRIA_TRAZO, stroke: "none" }} />
      </g>
    );
  }

  if (geometria === "flexible") {
    if (pts.length < 2) return null;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [qx, qy] = pts[i];
      d += ` Q ${(px + qx) / 2} ${(py + qy) / 2 + (i % 2 ? -1 : 1) * r * 0.22} ${qx} ${qy}`;
    }
    return <path d={d} fill="none" strokeWidth={sw * 1.4} strokeLinecap="round" style={trazo} />;
  }

  // angular: quiebre en ángulo + arco marcando el vértice.
  if (pts.length < 2) return null;
  const vertice = pts.reduce((m, p) => (p[1] < m[1] ? p : m), pts[0]);
  return (
    <g style={trazo} fill="none" strokeWidth={sw * 1.4} strokeLinejoin="miter" strokeLinecap="round">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} />
      <path
        strokeWidth={sw * 0.8}
        d={`M ${vertice[0] - pr * 0.8} ${vertice[1] + pr * 2.1} A ${pr * 1.6} ${pr * 1.6} 0 0 0 ${vertice[0] + pr * 0.8} ${vertice[1] + pr * 2.1}`}
      />
    </g>
  );
}

/**
 * Un Ium dibujado como <g> (sin <svg> ni botón): sus Partículas reales
 * dispuestas sobre el armazón de su geometría, centrado en (cx, cy) dentro
 * de un círculo de radio `r`. Es la pieza que IumVisual usa para un Ium
 * suelto y que OrisTopologiaVisual repite en cada nodo de un Oris — una
 * sola fuente de verdad para "cómo se ve un Ium".
 *
 * `modo` "ats" dibuja los sectores A/T/S de cada Partícula; "inicial" un
 * círculo con su letra. `sinEtiquetas` omite letras dentro de los sectores
 * (a escala miniatura no se leen y solo ensucian).
 */
export function IumGlifo({
  cx,
  cy,
  r,
  particulas,
  geometria,
  modo = "ats",
}: {
  cx: number;
  cy: number;
  r: number;
  particulas: { nombre: string; formula: string }[];
  geometria: GeometriaIum;
  modo?: "ats" | "inicial";
}) {
  const { pts, pr } = disponerParticulas(cx, cy, r, geometria, particulas.length);
  return (
    <g>
      {armazonGeometria(cx, cy, r, geometria, pts, pr)}
      {pts.map(([px, py], i) => {
        const p = particulas[i];
        if (modo === "inicial") {
          const idx = Object.keys(PARTICULA_INITIAL).indexOf(p.nombre);
          const tonos = ["#c9a06a", "#8a5a34", "#4e3320"];
          const tono = tonos[idx % tonos.length];
          return (
            <g key={`${p.nombre}-${i}`}>
              <title>{p.nombre}</title>
              <circle
                cx={px}
                cy={py}
                r={pr}
                strokeWidth={Math.max(0.6, pr * 2 * 0.02)}
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
                fontSize={pr * 0.6}
                fontWeight={900}
                style={{ fill: "#f3e6d3" }}
              >
                {PARTICULA_INITIAL[p.nombre] ?? p.nombre[0]}
              </text>
            </g>
          );
        }
        return (
          <g key={`${p.nombre}-${i}`}>
            <title>{`${p.nombre} (${p.formula})`}</title>
            <foreignObject x={px - pr} y={py - pr} width={pr * 2} height={pr * 2}>
              <ParticulaVisual formula={p.formula} size={pr * 2} />
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
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
  // Radio útil del área de dibujo cuando hay geometría, y posiciones de las
  // Partículas dentro de ella.
  const geoR = size * 0.44;

  /** Una Partícula del Ium centrada en (px, py) con radio `pr`. Compartida
   *  por la rama con geometría y por el orbital anterior, para que ambas
   *  respeten el toggle Aa (sectores A/T/S) / ∆ (inicial). */
  const renderParticula = (
    p: { nombre: string; formula: string },
    i: number,
    px: number,
    py: number,
    pr: number,
  ) => {
    if (modo === "inicial") {
      // Modo iniciales: mismo criterio sepia que el resto — valores
      // (claro/medio/oscuro) en vez de matices distintos por tipo.
      const idx = Object.keys(PARTICULA_INITIAL).indexOf(p.nombre);
      const tonos = ["#c9a06a", "#8a5a34", "#4e3320"];
      const tono = tonos[idx % tonos.length];
      return (
        <g key={`${p.nombre}-${i}`}>
          <title>{p.nombre}</title>
          <circle
            cx={px}
            cy={py}
            r={pr}
            strokeWidth={Math.max(0.6, pr * 2 * 0.02)}
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
            fontSize={pr * 0.6}
            fontWeight={900}
            style={{ fill: "#f3e6d3" }}
          >
            {PARTICULA_INITIAL[p.nombre] ?? p.nombre[0]}
          </text>
        </g>
      );
    }

    // Sectores de 120° — mismo trazo/criterio que ParticulaVisual.
    return (
      <g key={`${p.nombre}-${i}`}>
        <title>{`${p.nombre} (${p.formula})`}</title>
        <foreignObject x={px - pr} y={py - pr} width={pr * 2} height={pr * 2}>
          <ParticulaVisual formula={p.formula} size={pr * 2} />
        </foreignObject>
      </g>
    );
  };

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
          // Geometría real conocida: armazón propio (línea, malla, anillo,
          // curva, ángulo o núcleo) + las Partículas REALES del Ium
          // dispuestas sobre él, cada una con sus sectores A/T/S.
          <IumGlifo cx={cx} cy={cy} r={geoR} particulas={particulas} geometria={geometria} modo={modo} />
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
              return renderParticula(
                p,
                i,
                cx + Math.cos(angulo) * orbitR,
                cy + Math.sin(angulo) * orbitR,
                particleR,
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
