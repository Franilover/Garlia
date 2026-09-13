"use client";

/**
 * TriangleATS.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-02 — Espacio Tesis / Antítesis / Síntesis / Inversa (T/A/S/I), doc
 * maestro "Garlia_Visualizador_TODOS_LOS_DISENOS", Parte 3.
 *
 * "El [marco] no es el protagonista. El protagonista es el espacio que
 * existe dentro de él." — cada vértice es una letra pura (T, A, S, I); la
 * posición de una entidad dentro de la figura representa visualmente su
 * composición T/A/S/I real.
 *
 * Con la 4ta letra I (ver particulas_base en Supabase — "transformación
 * inversa: equilibrio que surge del choque A-T"), la figura pasó de
 * triángulo (3 vértices) a cuadrado (4 vértices) — mismo criterio de
 * coordenadas baricéntricas generalizado a 4 puntos: la posición es el
 * promedio de los 4 vértices ponderado por el peso relativo de cada letra.
 * El nombre del archivo/componente se mantiene por compatibilidad con el
 * resto del código que ya lo importa.
 *
 * Disposición de vértices (pedido explícito): cada eje del cuadrado
 * enfrenta un par de opuestos real, no un orden arbitrario —
 *   - Eje vertical: T (movimiento) arriba ↔ A (quietud/lo físico) abajo.
 *   - Eje horizontal: S (emitir) izquierda ↔ I (recibir) derecha.
 * Antes I se agregó como un 4to vértice suelto (abajo, con T/A/S en su
 * disposición original de triángulo) sin relación de oposición con los
 * otros 3 — ahora los 4 forman 2 ejes de opuestos.
 *
 * Regla crítica del docx (punto 5): "Frontend NO calcula la posición
 * conceptual. El frontend recibe T, A, S[, I] y solo representa la
 * transformación → posición visual." Este componente NO decide qué
 * significa "mucho T" o "equilibrado" — solo recibe conteos {A,T,S,I} ya
 * reales (via contarLetrasDeIum/contarLetrasDeOris/fórmula de partícula,
 * todas funciones de dominio existentes, cero cálculo nuevo) y aplica una
 * transformación puramente geométrica: coordenadas baricéntricas. Esa
 * transformación (T,A,S,I)→(x,y) sí es "matemática y puramente gráfica"
 * (docx, mismo punto), así que vive acá, no en el motor.
 *
 * No es lo mismo que ParticulaVisual (fisica/, reusado en VIS-01/Rutas
 * desde este mismo proyecto: tercios de color con la letra dentro). Este
 * es otro visualizador: un mapa donde CUALQUIER entidad (partícula, IUM u
 * Oris) se posiciona según su propio T/A/S/I.
 */

import React, { useMemo, useState } from "react";

export interface LetrasATS {
  A: number;
  T: number;
  S: number;
  I: number;
}

export interface EntidadATS {
  id: string;
  label: string;
  sublabel?: string;
  letras: LetrasATS;
  /** Punto 4 del docx: "las partículas también pueden aparecer" —
   *  componentes opcionales superpuestos alrededor del núcleo de una
   *  entidad compuesta (ej. las partículas reales de un IUM/Oris). */
  componentes?: { label: string; letras: LetrasATS }[];
}

const SIZE = 380;
const PAD = 56;
// Vértices del cuadrado — pares opuestos enfrentados en cada eje, como
// pidió el usuario: T (movimiento) arriba / A (quietud, lo físico) abajo
// en el eje vertical; S (emitir) izquierda / I (recibir) derecha en el eje
// horizontal. Antes I estaba abajo (cuadrado con T/A/S en el borde
// original y I como 4to vértice agregado después) — ahora los 4 forman 2
// ejes de opuestos reales en vez de 3 vértices + 1 añadido.
const V_T = { x: SIZE / 2, y: PAD };
const V_A = { x: SIZE / 2, y: SIZE - PAD };
const V_S = { x: PAD, y: SIZE / 2 };
const V_I = { x: SIZE - PAD, y: SIZE / 2 };

/** Punto 5 del docx: transformación puramente gráfica (T,A,S,I) → posición
 *  visual, vía coordenadas baricéntricas generalizadas a 4 puntos. Si las
 *  4 letras son 0 (entidad sin composición conocida), cae en el centroide
 *  — no se inventa un sesgo hacia ningún vértice que el dato real no
 *  respalde. */
function posicionEnTriangulo(letras: LetrasATS): { x: number; y: number } {
  const total = letras.A + letras.T + letras.S + letras.I;
  if (total <= 0) {
    return {
      x: (V_T.x + V_A.x + V_S.x + V_I.x) / 4,
      y: (V_T.y + V_A.y + V_S.y + V_I.y) / 4,
    };
  }
  const wT = letras.T / total;
  const wA = letras.A / total;
  const wS = letras.S / total;
  const wI = letras.I / total;
  return {
    x: wT * V_T.x + wA * V_A.x + wS * V_S.x + wI * V_I.x,
    y: wT * V_T.y + wA * V_A.y + wS * V_S.y + wI * V_I.y,
  };
}

/** Agrupa posiciones que caen (redondeadas) en el mismo punto y las separa
 *  en un pequeño círculo alrededor del punto real, para que dos entidades
 *  con la MISMA proporción A/T/S (ej. "TTT" y "TTTTTT", o dos partículas
 *  distintas con igual mezcla relativa) no se dibujen exactamente
 *  superpuestas. Es un ajuste puramente visual sobre el resultado de
 *  posicionEnTriangulo — no cambia la posición conceptual real de ninguna,
 *  solo evita que una tape a la otra en pantalla. El primer elemento de
 *  cada grupo se queda en el punto exacto (sin offset); desde el segundo
 *  en adelante se reparten en anillo. */
function separarSolapados<T extends { x: number; y: number }>(
  puntos: T[],
  radioBase: number,
): T[] {
  const grupos = new Map<string, number>();
  return puntos.map((p) => {
    const key = `${Math.round(p.x)}-${Math.round(p.y)}`;
    const n = grupos.get(key) ?? 0;
    grupos.set(key, n + 1);
    if (n === 0) return p;
    const angle = ((n - 1) * Math.PI * 2) / 6 - Math.PI / 2;
    const radio = radioBase + Math.floor((n - 1) / 6) * radioBase * 0.9;
    return { ...p, x: p.x + Math.cos(angle) * radio, y: p.y + Math.sin(angle) * radio };
  });
}

/** Punto 6 del docx: "gradiente espacial — un campo sutil que sugiere
 *  regiones de influencia, sin implicar un campo físico real". Un gradiente
 *  radial suave por vértice (ahora 4: T/A/S/I), mezclándose hacia el
 *  centro. */
function CampoGradiente() {
  return (
    <>
      <defs>
        <radialGradient id="ats-grad-t" cx={V_T.x / SIZE} cy={V_T.y / SIZE} r="0.62">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ats-grad-a" cx={V_A.x / SIZE} cy={V_A.y / SIZE} r="0.62">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ats-grad-s" cx={V_S.x / SIZE} cy={V_S.y / SIZE} r="0.62">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ats-grad-i" cx={V_I.x / SIZE} cy={V_I.y / SIZE} r="0.62">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <polygon points={`${V_T.x},${V_T.y} ${V_I.x},${V_I.y} ${V_A.x},${V_A.y} ${V_S.x},${V_S.y}`} fill="url(#ats-grad-t)" />
      <polygon points={`${V_T.x},${V_T.y} ${V_I.x},${V_I.y} ${V_A.x},${V_A.y} ${V_S.x},${V_S.y}`} fill="url(#ats-grad-a)" />
      <polygon points={`${V_T.x},${V_T.y} ${V_I.x},${V_I.y} ${V_A.x},${V_A.y} ${V_S.x},${V_S.y}`} fill="url(#ats-grad-s)" />
      <polygon points={`${V_T.x},${V_T.y} ${V_I.x},${V_I.y} ${V_A.x},${V_A.y} ${V_S.x},${V_S.y}`} fill="url(#ats-grad-i)" />
    </>
  );
}

export interface TriangleATSProps {
  /** Entidades ya resueltas con su A/T/S real — nunca calculado acá. */
  entidades: EntidadATS[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Ciencia: punto 14 del docx — misma representación, más profundidad
   *  de información (conteos exactos junto a la etiqueta). */
  modoCiencia?: boolean;
  className?: string;
}

export function TriangleATS({
  entidades,
  selectedId = null,
  onSelect,
  modoCiencia = false,
  className,
}: TriangleATSProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const posiciones = useMemo(() => {
    const base = entidades.map((e) => ({ id: e.id, ...posicionEnTriangulo(e.letras) }));
    // Radio de separación mayor que el de los componentes (más abajo): acá
    // hay texto (label) además del núcleo, así que necesitan más aire para
    // no quedar el texto de una entidad pisando el círculo de la otra.
    const separadas = separarSolapados(base, 16);
    return new Map(separadas.map((p) => [p.id, { x: p.x, y: p.y }]));
  }, [entidades]);

  const activo = entidades.find((e) => e.id === (hoverId ?? selectedId)) ?? null;
  const posComponentes = useMemo(() => {
    if (!activo?.componentes?.length) return [];
    // Punto 4 del docx: cada partícula/componente puede tener su propia
    // posición — se reusa la misma transformación baricéntrica, y el mismo
    // criterio de separación que las entidades principales (radio menor,
    // acá solo hay un puntito sin texto propio).
    const base = activo.componentes.map((c, i) => ({ idx: i, ...posicionEnTriangulo(c.letras) }));
    const separadas = separarSolapados(base, 7);
    return activo.componentes.map((c, i) => ({ ...c, x: separadas[i].x, y: separadas[i].y }));
  }, [activo]);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      height="auto"
      role="img"
      aria-label="Mapa de composición Tesis / Antítesis / Síntesis"
      className={className}
    >
      <CampoGradiente />

      {/* El cuadrado-mapa en sí: un contorno fino, nunca "el protagonista"
          (docx punto 1) — solo un marco de referencia. */}
      <polygon
        points={`${V_T.x},${V_T.y} ${V_I.x},${V_I.y} ${V_A.x},${V_A.y} ${V_S.x},${V_S.y}`}
        fill="none"
        strokeWidth={1.5}
        style={{ stroke: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
      />

      {/* Etiquetas de vértice: T / A / S / I. */}
      <text x={V_T.x} y={V_T.y - 16} textAnchor="middle" fontSize={13} fontWeight={900} style={{ fill: "#b91c1c" }}>
        T
      </text>
      <text x={V_A.x} y={V_A.y + 22} textAnchor="middle" fontSize={13} fontWeight={900} style={{ fill: "#15803d" }}>
        A
      </text>
      <text x={V_S.x - 16} y={V_S.y + 4} textAnchor="middle" fontSize={13} fontWeight={900} style={{ fill: "#1d4ed8" }}>
        S
      </text>
      <text x={V_I.x + 16} y={V_I.y + 4} textAnchor="middle" fontSize={13} fontWeight={900} style={{ fill: "#7e22ce" }}>
        I
      </text>

      {/* Componentes superpuestos de la entidad activa (docx punto 4) — se
          dibujan primero, por debajo del núcleo, como "aquello que la
          compone y la empuja" hacia su posición. */}
      {posComponentes.map((c, i) => (
        <g key={`${c.label}-${i}`} style={{ transition: "transform 260ms ease, opacity 260ms ease" }}>
          <circle cx={c.x} cy={c.y} r={4} strokeWidth={1} style={{ fill: "color-mix(in srgb, var(--primary) 20%, transparent)", stroke: "color-mix(in srgb, var(--primary) 55%, transparent)" }} />
          <title>{`${c.label} (${c.letras.A}A ${c.letras.T}T ${c.letras.S}S ${c.letras.I}I)`}</title>
        </g>
      ))}

      {/* Núcleo (◎) de cada entidad — punto 3 del docx: "no un punto plano,
          presencia visual". Aura sutil alrededor cuando la entidad tiene
          distribución (componentes) conocida. Orden de dibujo: la entidad
          activa (hover o seleccionada) siempre se pinta AL FINAL — así
          queda por encima de sus vecinas cercanas en vez de que la que
          casualmente está más adelante en la lista tape a la que el
          usuario está mirando. */}
      {[...entidades]
        .sort((a, b) => {
          const aActiva = a.id === hoverId || a.id === selectedId ? 1 : 0;
          const bActiva = b.id === hoverId || b.id === selectedId ? 1 : 0;
          return aActiva - bActiva;
        })
        .map((e) => {
        const pos = posiciones.get(e.id)!;
        const isSelected = selectedId === e.id;
        const isHovered = hoverId === e.id;
        const emphasized = isSelected || isHovered;
        const total = e.letras.A + e.letras.T + e.letras.S + e.letras.I;
        return (
          <g
            key={e.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            onMouseEnter={() => setHoverId(e.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={() => onSelect?.(e.id)}
            style={{ cursor: onSelect ? "pointer" : "default", transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            {e.componentes?.length ? (
              <circle
                r={emphasized ? 15 : 12}
                style={{
                  fill: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  transition: "r 200ms ease",
                }}
              />
            ) : null}
            <circle
              r={emphasized ? 7 : 5.5}
              strokeWidth={emphasized ? 2 : 1.5}
              style={{
                fill: total > 0 ? "color-mix(in srgb, var(--accent) 55%, var(--primary))" : "color-mix(in srgb, var(--primary) 25%, transparent)",
                stroke: emphasized ? "var(--accent)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
                transition: "r 200ms ease, stroke 150ms ease",
              }}
            />
            <text
              y={emphasized ? -18 : -14}
              textAnchor="middle"
              fontSize={emphasized ? 11 : 9.5}
              fontWeight={emphasized ? 900 : 700}
              style={{ fill: "var(--primary)", opacity: emphasized ? 0.95 : 0.55, transition: "opacity 150ms ease, font-size 150ms ease" }}
            >
              {e.label}
            </text>
            {modoCiencia && emphasized ? (
              <text y={emphasized ? -6 : -2} textAnchor="middle" fontSize={8.5} style={{ fill: "var(--primary)", opacity: 0.5 }}>
                {e.letras.A}A · {e.letras.T}T · {e.letras.S}S · {e.letras.I}I
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

// ─── HexagonoATS — mismo lenguaje visual que TriangleATS, pero para los 6
// "ejes fundamentales" reales (particulas.ejes_fundamentales) en vez de
// T/A/S/I. Mismo criterio que arriba: el frontend NO calcula nada
// conceptual, solo proyecta 6 valores ya reales sobre 6 vértices de un
// hexágono regular vía coordenadas baricéntricas generalizadas — misma
// función matemática que posicionEnTriangulo, generalizada a N vértices —
// y reusa exactamente el mismo patrón de interacción (hover/selección,
// separación de solapados, modoCiencia) para que se sienta como "la misma
// pantalla, otro conjunto de ejes", tal como pidió el usuario ("igual que
// se muestran todas en TriangleATS, mostrar todas en un rombo de 6 lados").

export type EjesSeisD = {
  dinamica: number;
  coherencia: number;
  estabilidad: number;
  informacion: number;
  interaccion: number;
  transformacion: number;
};

export interface EntidadEjes {
  id: string;
  label: string;
  sublabel?: string;
  ejes: EjesSeisD;
}

const EJES_HEX_ORDEN: (keyof EjesSeisD)[] = [
  "dinamica",
  "coherencia",
  "estabilidad",
  "informacion",
  "interaccion",
  "transformacion",
];

const EJES_HEX_LABELS: Record<keyof EjesSeisD, string> = {
  dinamica: "Dinámica",
  coherencia: "Coherencia",
  estabilidad: "Estabilidad",
  informacion: "Información",
  interaccion: "Interacción",
  transformacion: "Transformación",
};

// Mismo color por eje que el resto del visualizador usa para T/A/S/I —
// acá son 6 tonos distintos solo para diferenciar visualmente cada vértice
// en el gradiente y las etiquetas, sin implicar ningún significado nuevo.
const EJES_HEX_COLOR: Record<keyof EjesSeisD, string> = {
  dinamica: "#ef4444",
  coherencia: "#f59e0b",
  estabilidad: "#22c55e",
  informacion: "#06b6d4",
  interaccion: "#3b82f6",
  transformacion: "#a855f7",
};

const HEX_SIZE = 380;
const HEX_PAD = 64;
const HEX_CX = HEX_SIZE / 2;
const HEX_CY = HEX_SIZE / 2;
const HEX_RADIO = HEX_SIZE / 2 - HEX_PAD;

/** Vértice `i` (0..5) del hexágono regular, empezando arriba y en sentido
 *  horario — misma idea que V_T/V_A/V_S/V_I pero generada, no a mano,
 *  porque son 6 puntos en vez de 4. */
function verticeHexagono(i: number, r: number = HEX_RADIO) {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / EJES_HEX_ORDEN.length;
  return { x: HEX_CX + Math.cos(angle) * r, y: HEX_CY + Math.sin(angle) * r };
}

const VERTICES_HEX = EJES_HEX_ORDEN.map((_, i) => verticeHexagono(i));

/** Generalización de posicionEnTriangulo a N vértices: coordenadas
 *  baricéntricas con pesos = valores reales normalizados. Divergente, como
 *  BarraDivergente — un eje en 0 no tira hacia su vértice, uno negativo se
 *  resta del promedio en vez de recortarse. Si todos son 0, cae en el
 *  centro geométrico exacto (ningún sesgo inventado). */
function posicionEnHexagono(ejes: EjesSeisD, max: number): { x: number; y: number } {
  const valores = EJES_HEX_ORDEN.map((k) => ejes[k] ?? 0);
  const totalAbs = valores.reduce((acc, v) => acc + Math.abs(v), 0);
  if (totalAbs <= 0 || max <= 0) {
    return { x: HEX_CX, y: HEX_CY };
  }
  let x = HEX_CX;
  let y = HEX_CY;
  valores.forEach((v, i) => {
    const pct = Math.max(-1, Math.min(1, v / max));
    const vert = VERTICES_HEX[i];
    // Cada eje empuja desde el centro hacia su vértice proporcional a su
    // valor (positivo) o en sentido contrario (negativo) — analogía directa
    // de cómo BarraDivergente separa hacia un lado u otro del cero.
    x += pct * (vert.x - HEX_CX);
    y += pct * (vert.y - HEX_CY);
  });
  // Promedio: com N ejes empujando, se normaliza por N para no salirse
  // sistemáticamente del hexágono cuando varios ejes están al máximo a la
  // vez — mismo espíritu que dividir por `total` en posicionEnTriangulo.
  const n = EJES_HEX_ORDEN.length;
  return {
    x: HEX_CX + (x - HEX_CX) / n,
    y: HEX_CY + (y - HEX_CY) / n,
  };
}

function CampoGradienteHexagono() {
  return (
    <>
      <defs>
        {EJES_HEX_ORDEN.map((k, i) => {
          const v = VERTICES_HEX[i];
          return (
            <radialGradient key={k} id={`hex-grad-${k}`} cx={v.x / HEX_SIZE} cy={v.y / HEX_SIZE} r="0.55">
              <stop offset="0%" stopColor={EJES_HEX_COLOR[k]} stopOpacity="0.14" />
              <stop offset="100%" stopColor={EJES_HEX_COLOR[k]} stopOpacity="0" />
            </radialGradient>
          );
        })}
      </defs>
      {EJES_HEX_ORDEN.map((k) => (
        <polygon key={k} points={VERTICES_HEX.map((v) => `${v.x},${v.y}`).join(" ")} fill={`url(#hex-grad-${k})`} />
      ))}
    </>
  );
}

export interface HexagonoATSProps {
  /** Todas las entidades a mostrar a la vez, ya resueltas con sus 6 ejes
   *  reales — nunca calculado acá, mismo criterio que TriangleATS. */
  entidades: EntidadEjes[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  modoCiencia?: boolean;
  className?: string;
}

export function HexagonoATS({
  entidades,
  selectedId = null,
  onSelect,
  modoCiencia = false,
  className,
}: HexagonoATSProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Máximo absoluto real entre todas las entidades — mismo criterio que ya
  // usaba BarraDivergente: la escala refleja el rango de datos existente,
  // nunca un número inventado.
  const max = useMemo(
    () =>
      Math.max(
        1,
        ...entidades.flatMap((e) => EJES_HEX_ORDEN.map((k) => Math.abs(e.ejes[k] ?? 0))),
      ),
    [entidades],
  );

  const posiciones = useMemo(() => {
    const base = entidades.map((e) => ({ id: e.id, ...posicionEnHexagono(e.ejes, max) }));
    const separadas = separarSolapados(base, 16);
    return new Map(separadas.map((p) => [p.id, { x: p.x, y: p.y }]));
  }, [entidades, max]);

  const anillos = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${HEX_SIZE} ${HEX_SIZE}`}
      width="100%"
      height="auto"
      role="img"
      aria-label="Mapa de ejes fundamentales"
      className={className}
    >
      <CampoGradienteHexagono />

      {/* Anillos de referencia (25/50/75/100%) + ejes radiales — ayudan a
          leer la escala, mismo espíritu que la línea central de
          BarraDivergente. */}
      {anillos.map((f) => (
        <polygon
          key={f}
          points={VERTICES_HEX.map((v) => `${HEX_CX + (v.x - HEX_CX) * f},${HEX_CY + (v.y - HEX_CY) * f}`).join(" ")}
          fill="none"
          strokeWidth={f === 1 ? 1.5 : 1}
          style={{ stroke: f === 1 ? "color-mix(in srgb, var(--primary) 30%, transparent)" : "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        />
      ))}
      {VERTICES_HEX.map((v, i) => (
        <line
          key={i}
          x1={HEX_CX}
          y1={HEX_CY}
          x2={v.x}
          y2={v.y}
          strokeWidth={1}
          style={{ stroke: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        />
      ))}

      {/* Etiquetas de vértice: los 6 ejes. */}
      {EJES_HEX_ORDEN.map((k, i) => {
        const v = verticeHexagono(i, HEX_RADIO + 22);
        return (
          <text
            key={k}
            x={v.x}
            y={v.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={900}
            style={{ fill: EJES_HEX_COLOR[k] }}
          >
            {EJES_HEX_LABELS[k]}
          </text>
        );
      })}

      {/* Núcleo de cada entidad — mismo patrón que TriangleATS: la activa
          (hover o seleccionada) se pinta al final para quedar arriba. */}
      {[...entidades]
        .sort((a, b) => {
          const aActiva = a.id === hoverId || a.id === selectedId ? 1 : 0;
          const bActiva = b.id === hoverId || b.id === selectedId ? 1 : 0;
          return aActiva - bActiva;
        })
        .map((e) => {
          const pos = posiciones.get(e.id)!;
          const isSelected = selectedId === e.id;
          const isHovered = hoverId === e.id;
          const emphasized = isSelected || isHovered;
          const totalAbs = EJES_HEX_ORDEN.reduce((acc, k) => acc + Math.abs(e.ejes[k] ?? 0), 0);
          return (
            <g
              key={e.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseEnter={() => setHoverId(e.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelect?.(e.id)}
              style={{ cursor: onSelect ? "pointer" : "default", transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              <circle
                r={emphasized ? 7 : 5.5}
                strokeWidth={emphasized ? 2 : 1.5}
                style={{
                  fill: totalAbs > 0 ? "color-mix(in srgb, var(--accent) 55%, var(--primary))" : "color-mix(in srgb, var(--primary) 25%, transparent)",
                  stroke: emphasized ? "var(--accent)" : "color-mix(in srgb, var(--primary) 60%, transparent)",
                  transition: "r 200ms ease, stroke 150ms ease",
                }}
              />
              <text
                y={emphasized ? -18 : -14}
                textAnchor="middle"
                fontSize={emphasized ? 11 : 9.5}
                fontWeight={emphasized ? 900 : 700}
                style={{ fill: "var(--primary)", opacity: emphasized ? 0.95 : 0.55, transition: "opacity 150ms ease, font-size 150ms ease" }}
              >
                {e.label}
              </text>
              {modoCiencia && emphasized ? (
                <text y={emphasized ? -6 : -2} textAnchor="middle" fontSize={8} style={{ fill: "var(--primary)", opacity: 0.5 }}>
                  {EJES_HEX_ORDEN.map((k) => `${e.ejes[k] ?? 0}`).join(" · ")}
                </text>
              ) : null}
            </g>
          );
        })}
    </svg>
  );
}
