"use client";

/**
 * OrisTopologiaVisual.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Dibuja un Oris como lo que es en Supabase: un GRAFO de Iums. Cada nodo es
 * un Ium real (con sus Partículas A/T/S sobre el armazón de su geometría —
 * mismo IumGlifo que usa IumVisual), colocado según la TOPOLOGÍA del Oris, y
 * conectado por las uniones reales de v_oris_grafo_canonico (dirigidas con
 * flecha, recíprocas con doble flecha, de acoplamiento punteadas).
 *
 * El layout depende de la topología (T01…T07), no solo de la posición
 * (nucleo/a/b/c/d), porque "a" significa cosas distintas en cada una: entrada
 * en una convergencia, primer eslabón en una cadena, nodo del anillo en un
 * ciclo. Cada topología tiene su propia disposición para que su forma se lea
 * a simple vista.
 *
 * Sin grafo (Oris sin topología asignada) el llamador debe caer al gráfico
 * anterior — este componente solo se monta con un grafo real.
 */

import React, { useId, useMemo } from "react";

import type { GeometriaIum } from "./ParticulaVisual";
import { IumGlifo } from "./ParticulaVisual";
import type { OrisGrafo, OrisGrafoNodo, OrisGrafoUnion, PosicionOris } from "./useOrisGrafo";

type Punto = { x: number; y: number };

/** Lienzo lógico. Todo se calcula en estas unidades y el SVG escala. */
const W = 360;
const H_NODOS = 310;
const H = H_NODOS + 22;
const CX = W / 2;
const CY = H_NODOS / 2;

/** Radio del glifo de cada Ium en el grafo, y del núcleo (algo mayor). */
const R_NODO = 33;
const R_NUCLEO = 40;

/** Posición de cada nodo según la topología. Devuelve solo las posiciones
 *  que la topología usa; el resto de nodos (si los hubiera) se ignora. */
function layoutTopologia(topologiaId: string, posiciones: PosicionOris[]): Record<string, Punto> {
  switch (topologiaId) {
    case "T01": {
      // Convergencia nuclear: núcleo a la derecha, los periféricos entran
      // desde la izquierda (arriba / abajo).
      return {
        nucleo: { x: CX + 50, y: CY },
        a: { x: CX - 84, y: CY - 70 },
        b: { x: CX - 84, y: CY + 70 },
      };
    }
    case "T02": {
      // Cadena dinámica: a → núcleo → b → d → c, en "S" (fila superior de
      // izquierda a derecha, baja, y la inferior de derecha a izquierda).
      return {
        a: { x: 52, y: 66 },
        nucleo: { x: 180, y: 66 },
        b: { x: 308, y: 66 },
        d: { x: 308, y: H_NODOS - 70 },
        c: { x: 180, y: H_NODOS - 70 },
      };
    }
    case "T03": {
      // Ramificación: entrada a → núcleo → rama corta (b, arriba) y rama
      // larga (c → d, abajo).
      return {
        a: { x: 52, y: CY },
        nucleo: { x: 156, y: CY },
        b: { x: 290, y: 66 },
        c: { x: 246, y: CY + 50 },
        d: { x: 316, y: CY - 4 },
      };
    }
    case "T04": {
      // Ciclo con salida: anillo horario a → b → núcleo → c → a (cuadrado
      // a la izquierda) y una salida externa núcleo → d a la derecha.
      return {
        a: { x: 62, y: 66 },
        b: { x: 196, y: 66 },
        nucleo: { x: 196, y: H_NODOS - 70 },
        c: { x: 62, y: H_NODOS - 70 },
        d: { x: 310, y: H_NODOS - 70 },
      };
    }
    case "T05": {
      // Estructural: dos soportes arriba acoplados (a — b), núcleo en medio,
      // base abajo (c).
      return {
        a: { x: CX - 84, y: 50 },
        b: { x: CX + 84, y: 50 },
        nucleo: { x: CX, y: CY - 4 },
        c: { x: CX, y: H_NODOS - 56 },
      };
    }
    case "T06": {
      // Convergencia con resolución: a y b entran al núcleo, que resuelve
      // hacia c a la derecha.
      return {
        a: { x: 56, y: 66 },
        b: { x: 56, y: H_NODOS - 66 },
        nucleo: { x: CX - 4, y: CY },
        c: { x: W - 56, y: CY },
      };
    }
    case "T07": {
      // Retroalimentación: circuito a → b → núcleo → c → a con d regulando
      // recíprocamente al núcleo.
      return {
        a: { x: 62, y: 66 },
        b: { x: 196, y: 66 },
        nucleo: { x: 196, y: H_NODOS - 70 },
        c: { x: 62, y: H_NODOS - 70 },
        d: { x: 310, y: H_NODOS - 70 },
      };
    }
    default: {
      // Topología no conocida: anillo genérico con el núcleo al centro.
      const out: Record<string, Punto> = { nucleo: { x: CX, y: CY } };
      const perifericos = posiciones.filter((p) => p !== "nucleo");
      perifericos.forEach((p, i) => {
        const a = -Math.PI / 2 + (i / Math.max(perifericos.length, 1)) * Math.PI * 2;
        out[p] = { x: CX + Math.cos(a) * 100, y: CY + Math.sin(a) * 92 };
      });
      return out;
    }
  }
}

/** Recorta el segmento (desde → hasta) para que empiece y termine en el borde
 *  de los círculos, no en sus centros. */
function recortar(desde: Punto, hasta: Punto, rDesde: number, rHasta: number): [Punto, Punto] {
  const dx = hasta.x - desde.x;
  const dy = hasta.y - desde.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  return [
    { x: desde.x + ux * (rDesde + 3), y: desde.y + uy * (rDesde + 3) },
    { x: hasta.x - ux * (rHasta + 6), y: hasta.y - uy * (rHasta + 6) },
  ];
}

const TRAZO_UNION = "color-mix(in srgb, var(--primary) 70%, transparent)";
const TRAZO_RECIPROCA = "var(--primary)";

export function OrisTopologiaVisual({
  grafo,
  particulasDe,
  geometriaDe,
  onClickNodo,
  className,
}: {
  grafo: OrisGrafo;
  /** Partículas reales (expandidas) de un Ium por su id. */
  particulasDe: (iumId: string) => { nombre: string; formula: string }[];
  /** Geometría real de un Ium por su id (useGeometriaIums). */
  geometriaDe: (iumId: string) => { geometria: GeometriaIum };
  /** Si se pasa, cada nodo se vuelve clicable (cursor pointer + hover) y
   *  dispara esto con el ium_id del nodo — usado para abrir el panel
   *  flotante de ese Ium sin salir del panel del Oris. Sin esto, el grafo
   *  queda igual que antes: puramente decorativo. */
  onClickNodo?: (iumId: string) => void;
  className?: string;
}) {
  const marcaId = useId().replace(/:/g, "");
  const idFlecha = `flecha-${marcaId}`;
  const idFlechaRec = `flecha-rec-${marcaId}`;

  const nodoPorPos = useMemo(() => {
    const m = new Map<PosicionOris, OrisGrafoNodo>();
    for (const n of grafo.nodos) m.set(n.posicion, n);
    return m;
  }, [grafo.nodos]);

  const puntos = useMemo(
    () => layoutTopologia(grafo.topologia_id, grafo.nodos.map((n) => n.posicion)),
    [grafo.topologia_id, grafo.nodos],
  );

  const radioDe = (pos: PosicionOris) => (pos === "nucleo" ? R_NUCLEO : R_NODO);

  const renderUnion = (u: OrisGrafoUnion) => {
    const pDesde = puntos[u.origen];
    const pHasta = puntos[u.destino];
    if (!pDesde || !pHasta) return null;
    const [a, b] = recortar(pDesde, pHasta, radioDe(u.origen), radioDe(u.destino));

    const esRec = u.tipo_union === "reciproca";
    const esAcop = u.tipo_union === "acoplamiento";

    return (
      <g key={`u-${u.orden}`}>
        <title>{u.descripcion || `${u.origen} → ${u.destino}`}</title>
        <path
          d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
          fill="none"
          strokeWidth={esRec ? 2 : 1.6}
          strokeLinecap="round"
          strokeDasharray={esAcop ? "4 4" : undefined}
          style={{ stroke: esRec ? TRAZO_RECIPROCA : TRAZO_UNION }}
          markerEnd={esAcop ? undefined : `url(#${esRec ? idFlechaRec : idFlecha})`}
          markerStart={esRec ? `url(#${idFlechaRec})` : undefined}
        />
      </g>
    );
  };

  const posicionesConNodo = Array.from(nodoPorPos.keys());

  const leyenda = useMemo(() => {
    const textos: Record<string, string> = {
      dirigida: "dirigida",
      reciproca: "recíproca",
      acoplamiento: "acoplamiento",
    };
    const usados = Array.from(new Set(grafo.uniones.map((u) => u.tipo_union)));
    return usados.map((tipo) => ({ tipo, texto: textos[tipo] ?? tipo }));
  }, [grafo.uniones]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className={className}
      role="img"
      aria-label={`Oris — topología ${grafo.topologia}`}
      style={{ maxWidth: W * 1.4 }}
    >
      <defs>
        <marker id={idFlecha} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: TRAZO_UNION }} />
        </marker>
        <marker id={idFlechaRec} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: TRAZO_RECIPROCA }} />
        </marker>
      </defs>
      {onClickNodo && (
        <style>{`
          .oris-nodo-clicable circle { transition: opacity 120ms ease; }
          .oris-nodo-clicable:hover circle { opacity: 0.7; }
        `}</style>
      )}

      <text x={6} y={11} fontSize={8} fontWeight={900} letterSpacing={1} style={{ fill: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
        {`${grafo.topologia_id} · ${grafo.topologia}`.toUpperCase()}
      </text>

      {/* Uniones primero: quedan por debajo de los nodos. */}
      {grafo.uniones.map(renderUnion)}

      {leyenda.map((l, i) => (
        <g key={l.tipo} transform={`translate(${6 + i * 84}, ${H - 9})`}>
          <line
            x1={0}
            y1={0}
            x2={16}
            y2={0}
            strokeWidth={l.tipo === "reciproca" ? 2 : 1.5}
            strokeLinecap="round"
            strokeDasharray={l.tipo === "acoplamiento" ? "3 3" : undefined}
            style={{ stroke: l.tipo === "reciproca" ? TRAZO_RECIPROCA : TRAZO_UNION }}
          />
          <text x={21} y={2.5} fontSize={7.5} style={{ fill: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
            {l.texto}
          </text>
        </g>
      ))}

      {posicionesConNodo.map((pos) => {
        const nodo = nodoPorPos.get(pos);
        const p = puntos[pos];
        if (!nodo || !p) return null;
        const esNucleo = pos === "nucleo";
        const r = radioDe(pos);
        const clicable = !!onClickNodo;
        return (
          <g
            key={pos}
            onClick={clicable ? () => onClickNodo!(nodo.ium_id) : undefined}
            style={clicable ? { cursor: "pointer" } : undefined}
            className={clicable ? "oris-nodo-clicable" : undefined}
          >
            <title>{`${nodo.ium}${nodo.rol ? ` — ${nodo.rol.replace(/_/g, " ")}` : ""}`}</title>
            {/* Disco de fondo: separa el nodo de las líneas que llegan a él.
                Con onClickNodo, este disco también sirve de indicador hover
                (opacidad sube vía CSS abajo) para que se lea como
                interactivo, no solo decorativo. */}
            <circle
              cx={p.x}
              cy={p.y}
              r={r + 2}
              strokeWidth={esNucleo ? 1.6 : 0.8}
              style={{
                fill: "var(--bg-main)",
                stroke: esNucleo ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            />
            <IumGlifo
              cx={p.x}
              cy={p.y}
              r={r * 0.78}
              particulas={particulasDe(nodo.ium_id)}
              geometria={geometriaDe(nodo.ium_id).geometria}
            />
            <text
              x={p.x}
              y={p.y + r + 12}
              textAnchor="middle"
              fontSize={9.5}
              fontWeight={esNucleo ? 900 : 700}
              paintOrder="stroke"
              strokeWidth={3}
              strokeLinejoin="round"
              style={{ fill: "var(--primary)", stroke: "var(--bg-main)" }}
            >
              {nodo.ium}
            </text>
            {nodo.rol && (
              <text
                x={p.x}
                y={p.y + r + 22}
                textAnchor="middle"
                fontSize={7.5}
                paintOrder="stroke"
                strokeWidth={3}
                strokeLinejoin="round"
                style={{ fill: "color-mix(in srgb, var(--primary) 60%, transparent)", stroke: "var(--bg-main)" }}
              >
                {nodo.rol.replace(/_/g, " ")}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
