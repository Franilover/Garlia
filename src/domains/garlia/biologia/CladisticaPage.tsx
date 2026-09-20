"use client";

/**
 * CladisticaPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Cladograma de Biología: árbol filogenético SIN rangos fijos (nada de
 * Reino/Filo/Clase/Orden…), fiel al criterio de la cladística moderna —
 * cada nodo es un grupo monofilético definido por su sinapomorfía
 * (carácter derivado compartido por todos sus descendientes), no por un
 * nivel jerárquico arbitrario.
 *
 * Visualización: diagrama de ramas real (estilo árbol filogenético
 * rectangular — troncos horizontales que se bifurcan verticalmente en cada
 * nodo interno, hojas alineadas a la derecha), no una lista anidada tipo
 * carpeta. Layout calculado en SVG a partir del árbol.
 *
 * Contrato (Supabase manda): el árbol se construye SOLO con `padre_id`
 * (padre visual/jerárquico) y se muestran TODOS los clados. `padre_id` no
 * implica descendencia: cada nodo declara qué representa (`tipo_nodo`) y
 * cada rama qué significa su unión con el padre (`relacion_padre`). Ambos
 * se consumen tal cual — nunca se infieren. Las conexiones que no son
 * hijos del árbol (`clado_relaciones`) se listan en el panel de detalle y
 * jamás se dibujan como ramas padre→hijo.
 *
 * Modelo biológico: CLADO → ORGANISMO → CRIATURA. El clado dice qué linaje
 * es; la biología efectiva vive en el organismo (organismos.clado_id) y la
 * criatura es la entidad narrativa que lo usa (criatura_organismos). Por eso
 * el panel de un clado lista sus ORGANISMOS (v_clados_organismos_v1), no
 * criaturas; y clados.criatura_ids (legacy) ya no se lee ni se escribe.
 *
 * Panel de detalle del clado seleccionado como panel flotante centrado
 * (mismo patrón que Elementos/Personajes/Criaturas — modal grande con
 * backdrop blur), no una barra lateral fija.
 */

import { ChevronRight, Dna, Plus } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { RichEditor } from "@/editor/lexical";
import { type SaveStatus } from "@/ui/saveStatus";

import { EditorHeaderBar } from "../_shared/EditorHeaderBar";
import { usePublishHeaderControls, type OnHeaderControlsChange } from "../_shared/useEditorHeaderControls";

import {
  useCladoRelaciones,
  useClados,
  useCladosOrganismos,
  useOrganismosCriaturas,
} from "./useBiologia";
import {
  RELACION_PADRE_CLADO_LABEL,
  TIPO_NODO_CLADO_LABEL,
  TIPO_RELACION_CLADO_LABEL,
  type Clado,
  type CladoOrganismo,
  type CladoRelacion,
  type OrganismoCriatura,
  type RelacionPadreClado,
  type TipoNodoClado,
} from "./types";

interface Props {
  onSelectCriatura?: (id: string) => void;
  /** Abre un organismo (mismo panel de organismo del resto del proyecto). El
   *  cladograma no lo monta por su cuenta: lo resuelve el contenedor. */
  onAbrirOrganismo?: (organismoId: string) => void;
}

// ─── Layout del cladograma ──────────────────────────────────────────────────
// Árbol rectangular clásico: cada hoja ocupa una fila (ROW_H), cada nivel de
// profundidad ocupa una columna (COL_W). La posición Y de un nodo interno es
// el promedio de sus hijos — así las bifurcaciones quedan centradas, como en
// cualquier cladograma real.

const ROW_H = 38;
const COL_W = 170;
const PAD_X = 20;
const PAD_Y = 24;
const LEAF_LABEL_W = 220;

interface NodoLayout {
  clado: Clado;
  x: number;
  y: number;
  hijos: NodoLayout[];
}

function construirLayout(clados: Clado[]): { nodos: NodoLayout[]; raices: NodoLayout[]; alturaTotal: number } {
  const porPadre = new Map<string | null, Clado[]>();
  for (const c of clados) {
    const arr = porPadre.get(c.padre_id) ?? [];
    arr.push(c);
    porPadre.set(c.padre_id, arr);
  }

  const nodos: NodoLayout[] = [];
  let cursorFila = 0;

  function build(clado: Clado, profundidad: number): NodoLayout {
    const hijosData = porPadre.get(clado.id) ?? [];
    const nodo: NodoLayout = { clado, x: PAD_X + profundidad * COL_W, y: 0, hijos: [] };
    nodos.push(nodo);

    if (hijosData.length === 0) {
      nodo.y = PAD_Y + cursorFila * ROW_H;
      cursorFila += 1;
    } else {
      nodo.hijos = hijosData.map((h) => build(h, profundidad + 1));
      const ys = nodo.hijos.map((h) => h.y);
      nodo.y = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
    return nodo;
  }

  const raicesData = porPadre.get(null) ?? [];
  const raices = raicesData.map((r) => build(r, 0));
  const alturaTotal = PAD_Y * 2 + Math.max(cursorFila, 1) * ROW_H;

  return { nodos, raices, alturaTotal };
}

function anchoMaximo(nodos: NodoLayout[]): number {
  return nodos.reduce((max, n) => Math.max(max, n.x), 0) + COL_W + LEAF_LABEL_W;
}

// ─── Estilo según el contrato (tipo_nodo / relacion_padre) ──────────────────
// Solo PRESENTACIÓN: se lee lo que declara Supabase, nunca se infiere.
// Distinción visual clave: la línea sólida se reserva para vínculos que
// SÍ afirman parentesco/origen (ascendencia, clasificación biológica,
// origen). Las uniones de agrupación (ecológica, morfológica, ontológica)
// van discontinuas y la incertidumbre punteada, para que nadie lea
// "descendencia" donde el dato solo dice "agrupación" o "no se sabe".
// Sin clasificar (null) se dibuja como el trazo neutro de siempre.

/** dasharray de la rama que une un nodo con su padre, según relacion_padre. */
const RAMA_DASH: Record<RelacionPadreClado, string | undefined> = {
  ascendencia: undefined,
  clasificacion_biologica: undefined,
  origen: undefined,
  agrupacion_ecologica: "6 3",
  agrupacion_morfologica: "6 3",
  clasificacion_ontologica: "6 3",
  incertidumbre: "1.5 3.5",
};

function dashDeRama(rel: RelacionPadreClado | null): string | undefined {
  return rel ? RAMA_DASH[rel] : undefined;
}

/** Glifo corto del tipo de nodo, para no depender solo del color. */
const TIPO_NODO_GLIFO: Record<TipoNodoClado, string> = {
  filogenetico: "",
  origen: "O",
  ecologico: "E",
  incertidumbre: "?",
  ontologico: "∞",
  morfologico: "M",
};

function glifoDeTipo(tipo: TipoNodoClado | null): string {
  return tipo ? TIPO_NODO_GLIFO[tipo] : "";
}

/** Etiqueta legible; si la base trae un valor fuera del CHECK, se muestra crudo. */
function etiquetaTipoNodo(tipo: string | null): string {
  if (!tipo) return "Sin clasificar";
  return TIPO_NODO_CLADO_LABEL[tipo as TipoNodoClado] ?? tipo;
}

function etiquetaRelacionPadre(rel: string | null): string {
  if (!rel) return "Sin clasificar";
  return RELACION_PADRE_CLADO_LABEL[rel as RelacionPadreClado] ?? rel;
}

// ─── Leyenda ────────────────────────────────────────────────────────────────
// Solo lista lo que EXISTE en los datos cargados (relaciones de rama y tipos
// de nodo presentes), no una tabla fija: así nunca promete un trazo o glifo
// que el árbol actual no usa.

function LeyendaCladograma({ clados }: { clados: Clado[] }) {
  const relaciones = useMemo(() => {
    const set = new Set<RelacionPadreClado>();
    for (const c of clados) if (c.padre_id && c.relacion_padre) set.add(c.relacion_padre);
    return (Object.keys(RAMA_DASH) as RelacionPadreClado[]).filter((r) => set.has(r));
  }, [clados]);

  const tipos = useMemo(() => {
    const set = new Set<TipoNodoClado>();
    for (const c of clados) if (c.tipo_nodo) set.add(c.tipo_nodo);
    return (Object.keys(TIPO_NODO_GLIFO) as TipoNodoClado[]).filter(
      (t) => set.has(t) && TIPO_NODO_GLIFO[t] !== "",
    );
  }, [clados]);

  if (relaciones.length === 0 && tipos.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 px-1">
      {relaciones.map((r) => (
        <span key={r} className="flex items-center gap-1.5 text-micro text-primary/45">
          <svg width={26} height={6} aria-hidden>
            <line
              x1={0}
              y1={3}
              x2={26}
              y2={3}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray={dashDeRama(r)}
              className="text-primary/40"
            />
          </svg>
          {RELACION_PADRE_CLADO_LABEL[r]}
        </span>
      ))}
      {tipos.map((t) => (
        <span key={t} className="flex items-center gap-1 text-micro text-primary/45">
          <span className="font-black text-accent/60 text-[10px]">{TIPO_NODO_GLIFO[t]}</span>
          {TIPO_NODO_CLADO_LABEL[t]}
        </span>
      ))}
    </div>
  );
}

// ─── Diagrama SVG ────────────────────────────────────────────────────────────

// Devuelve el set de ids descendientes (incluyendo el propio) de un clado,
// para impedir soltar un nodo dentro de su propia rama (eso crearía un
// ciclo padre_id → hijo → …→ el mismo padre).
function descendientesDe(id: string, clados: Clado[]): Set<string> {
  const set = new Set<string>([id]);
  let cambiado = true;
  while (cambiado) {
    cambiado = false;
    for (const c of clados) {
      if (c.padre_id && set.has(c.padre_id) && !set.has(c.id)) {
        set.add(c.id);
        cambiado = true;
      }
    }
  }
  return set;
}

function DiagramaCladograma({
  clados,
  conteoOrganismos,
  seleccionadoId,
  seleccionMultiple,
  onSelect,
  onToggleMultiple,
  onMover,
  onMoverGrupo,
}: {
  clados: Clado[];
  /** Organismos por clado (organismos.clado_id, vía v_clados_organismos_v1). */
  conteoOrganismos: Map<string, number>;
  seleccionadoId: string | null;
  seleccionMultiple: Set<string>;
  onSelect: (id: string) => void;
  onToggleMultiple: (id: string) => void;
  onMover: (cladoId: string, nuevoPadreId: string | null) => void;
  onMoverGrupo: (cladoIds: string[], nuevoPadreId: string | null) => void;
}) {
  const { nodos, alturaTotal } = useMemo(() => construirLayout(clados), [clados]);
  const ancho = useMemo(() => anchoMaximo(nodos), [nodos]);

  const svgRef = React.useRef<SVGSVGElement>(null);

  // Arrastre manual con mouse events (más confiable que drag&drop HTML5
  // dentro de SVG, que varios navegadores manejan mal sobre <g>).
  // arrastrandoIds: uno o varios clados (selección múltiple con Shift+click
  // izquierdo, luego arrastrados juntos con click derecho).
  const [arrastrandoIds, setArrastrandoIds] = useState<string[] | null>(null);
  const [huboMovimiento, setHuboMovimiento] = useState(false);
  const [posMouse, setPosMouse] = useState<{ x: number; y: number } | null>(null);
  const [hoverDestinoId, setHoverDestinoId] = useState<string | null>(null);
  const [hoverRaiz, setHoverRaiz] = useState(false);

  // Unión de descendientes de TODOS los nodos que se están arrastrando —
  // ninguno de ellos puede recibirse a sí mismo ni a un hermano de grupo
  // como nuevo padre (evita ciclos).
  const bloqueados = useMemo(() => {
    if (!arrastrandoIds) return null;
    const set = new Set<string>();
    for (const id of arrastrandoIds) {
      for (const d of descendientesDe(id, clados)) set.add(d);
    }
    return set;
  }, [arrastrandoIds, clados]);

  if (clados.length === 0) return null;

  const puntoSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const nodoEnPunto = (x: number, y: number) =>
    nodos.find((n) => Math.hypot(n.x - x, n.y - y) < 16);

  const confirmarMoverGrupo = (cladoIds: string[], destinoId: string | null) => {
    const desc = new Set<string>();
    for (const id of cladoIds) for (const d of descendientesDe(id, clados)) desc.add(d);
    if (destinoId !== null && desc.has(destinoId)) return; // ciclo
    const idsAMover = cladoIds.filter((id) => {
      const origenActual = clados.find((c) => c.id === id)?.padre_id ?? null;
      return origenActual !== destinoId && id !== destinoId;
    });
    if (idsAMover.length === 0) return;
    if (idsAMover.length === 1) onMover(idsAMover[0], destinoId);
    else onMoverGrupo(idsAMover, destinoId);
  };

  // Mientras se arrastra con click derecho, el navegador dispara igual un
  // evento "contextmenu" a nivel de documento apenas se suelta el botón (o,
  // en algunos navegadores, apenas se aprieta) — si no se lo bloquea ahí
  // también, el menú nativo se abre y corta el arrastre a mitad de camino.
  // Por eso se instala un listener global mientras arrastrandoIds !== null.
  useEffect(() => {
    if (!arrastrandoIds) return;
    const bloquear = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", bloquear, true);
    return () => document.removeEventListener("contextmenu", bloquear, true);
  }, [arrastrandoIds]);

  const handleMouseDown = (e: React.MouseEvent, cladoId: string) => {
    if (e.button !== 2) return; // solo click derecho arranca el arrastre
    e.preventDefault();
    e.stopPropagation();
    // Si el nodo sobre el que se apretó click derecho ya forma parte de la
    // selección múltiple, arrastramos todo el grupo; si no, solo ese nodo.
    const grupo = seleccionMultiple.has(cladoId) && seleccionMultiple.size > 0
      ? Array.from(seleccionMultiple)
      : [cladoId];
    setArrastrandoIds(grupo);
    setHuboMovimiento(false);
    setPosMouse(puntoSvg(e.clientX, e.clientY));

    // Capturamos el resto del arrastre a nivel de documento: si el mouse
    // sale del SVG (o incluso de la ventana) mientras se mantiene el click
    // derecho, seguimos recibiendo mousemove/mouseup igual. onMouseLeave del
    // SVG por sí solo cortaba el arrastre apenas el cursor rozaba el borde.
    const onMove = (ev: MouseEvent) => handleMouseMove(ev as unknown as React.MouseEvent);
    const onUp = () => {
      finalizarArrastre();
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!arrastrandoIds) return;
    setHuboMovimiento(true);
    const p = puntoSvg(e.clientX, e.clientY);
    setPosMouse(p);
    const destino = nodoEnPunto(p.x, p.y);
    const esBloqueado = destino && bloqueados?.has(destino.clado.id);
    setHoverDestinoId(destino && !esBloqueado ? destino.clado.id : null);
    setHoverRaiz(!destino && p.x < PAD_X + 40);
  };

  const finalizarArrastre = () => {
    if (arrastrandoIds && huboMovimiento) {
      if (hoverDestinoId) confirmarMoverGrupo(arrastrandoIds, hoverDestinoId);
      else if (hoverRaiz) confirmarMoverGrupo(arrastrandoIds, null);
    }
    setArrastrandoIds(null);
    setHuboMovimiento(false);
    setPosMouse(null);
    setHoverDestinoId(null);
    setHoverRaiz(false);
  };

  const nodosArrastrados = arrastrandoIds
    ? nodos.filter((n) => arrastrandoIds.includes(n.clado.id))
    : [];

  return (
    <div className="overflow-auto p-3 relative w-full">
      {arrastrandoIds && huboMovimiento && (
        <p className="text-micro font-black uppercase tracking-widest text-accent/70 mb-2 px-1">
          Soltá el click derecho sobre otro clado para reasignar
          {arrastrandoIds.length > 1 ? ` los ${arrastrandoIds.length} seleccionados` : "lo"} como su hijo — o
          a la izquierda para volverlo{arrastrandoIds.length > 1 ? "s" : ""} ancestro común
        </p>
      )}
      {!arrastrandoIds && seleccionMultiple.size > 0 && (
        <p className="text-micro font-black uppercase tracking-widest text-accent/60 mb-2 px-1">
          {seleccionMultiple.size} clados seleccionados — Shift+click para sumar o quitar, click derecho y
          arrastrá uno de ellos para moverlos juntos
        </p>
      )}
      <svg
        ref={svgRef}
        width={ancho}
        height={alturaTotal}
        className="block select-none"
        style={{ minWidth: "100%", cursor: arrastrandoIds ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={finalizarArrastre}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Ramas */}
        {nodos.map((n) => {
          if (n.hijos.length === 0) return null;
          const xHijos = n.x + COL_W;
          const ys = n.hijos.map((h) => h.y);
          const yMin = Math.min(...ys);
          const yMax = Math.max(...ys);
          return (
            <g key={`ramas-${n.clado.id}`}>
              <line x1={n.x} y1={n.y} x2={xHijos} y2={n.y} stroke="currentColor" strokeWidth={1.5} className="text-primary/25" />
              <line x1={xHijos} y1={yMin} x2={xHijos} y2={yMax} stroke="currentColor" strokeWidth={1.5} className="text-primary/25" />
              {n.hijos.map((h) => (
                // La rama final de cada hijo lleva SU relacion_padre (es lo
                // que describe su unión con este padre). Tronco y barra
                // vertical son compartidos y quedan neutros.
                <line
                  key={`h-${h.clado.id}`}
                  x1={xHijos}
                  y1={h.y}
                  x2={h.x}
                  y2={h.y}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeDasharray={dashDeRama(h.clado.relacion_padre)}
                  className="text-primary/25"
                >
                  <title>{`${h.clado.nombre || "Sin nombre"} — ${etiquetaRelacionPadre(h.clado.relacion_padre)} respecto de ${n.clado.nombre || "Sin nombre"}`}</title>
                </line>
              ))}
            </g>
          );
        })}

        {/* Franja de "soltar como raíz" a la izquierda, visible al arrastrar */}
        {arrastrandoIds && huboMovimiento && arrastrandoIds.some((id) => clados.find((c) => c.id === id)?.padre_id !== null) && (
          <rect x={0} y={0} width={PAD_X + 40} height={alturaTotal} className={hoverRaiz ? "fill-accent/15" : "fill-primary/5"} />
        )}

        {/* Nodos + etiquetas */}
        {nodos.map((n) => {
          const activo = n.clado.id === seleccionadoId;
          const enSeleccionMultiple = seleccionMultiple.has(n.clado.id);
          const esHoja = n.hijos.length === 0;
          const siendoArrastrado = arrastrandoIds?.includes(n.clado.id) ?? false;
          const esDestinoInvalido = arrastrandoIds !== null && bloqueados?.has(n.clado.id);
          const esHoverDestino = hoverDestinoId === n.clado.id && !esDestinoInvalido;

          return (
            <g
              key={n.clado.id}
              transform={`translate(${n.x}, ${n.y})`}
              onMouseDown={(e) => handleMouseDown(e, n.clado.id)}
              onClick={(e) => {
                if (e.shiftKey) onToggleMultiple(n.clado.id);
                else onSelect(n.clado.id);
              }}
              onContextMenu={(e) => {
                // El menú nativo del navegador se previene siempre acá;
                // el click derecho se usa para arrastrar (ver handleMouseDown),
                // no para abrir un menú.
                e.preventDefault();
              }}
              className={siendoArrastrado ? "cursor-grabbing" : "cursor-pointer"}
            >
              {esHoverDestino && (
                <circle r={10} className="fill-none stroke-accent" strokeWidth={1.5} strokeDasharray="3 2" />
              )}
              {enSeleccionMultiple && !siendoArrastrado && (
                <circle r={9} className="fill-none stroke-accent/50" strokeWidth={1.5} strokeDasharray="2 2" />
              )}
              <circle
                r={esHoja ? 3.5 : 4.5}
                className={
                  siendoArrastrado
                    ? "fill-accent/40"
                    : activo || enSeleccionMultiple
                      ? "fill-accent"
                      : esHoja
                        ? "fill-primary/40"
                        : "fill-primary/60"
                }
                opacity={esDestinoInvalido ? 0.25 : 1}
              />
              <title>{`${n.clado.nombre || "Sin nombre"}\nNodo: ${etiquetaTipoNodo(n.clado.tipo_nodo)}\nUnión con el padre: ${
                n.clado.padre_id ? etiquetaRelacionPadre(n.clado.relacion_padre) : "— (raíz)"
              }`}</title>
              <text
                x={esHoja ? 8 : 0}
                y={esHoja ? 4 : 16}
                textAnchor={esHoja ? "start" : "middle"}
                opacity={siendoArrastrado ? 0.4 : esDestinoInvalido ? 0.3 : 1}
                className={`text-[11px] font-bold select-none ${
                  activo || enSeleccionMultiple ? "fill-accent" : esHoverDestino ? "fill-accent" : "fill-primary/75"
                }`}
              >
                {n.clado.nombre || "Sin nombre"}
                {glifoDeTipo(n.clado.tipo_nodo) && (
                  <tspan className="fill-accent/55 text-[9px] font-black" dx={5}>
                    {glifoDeTipo(n.clado.tipo_nodo)}
                  </tspan>
                )}
              </text>
              {(conteoOrganismos.get(n.clado.id) ?? 0) > 0 && (
                <text
                  x={esHoja ? 8 + (n.clado.nombre?.length ?? 0) * 6.2 + (glifoDeTipo(n.clado.tipo_nodo) ? 20 : 6) : 0}
                  y={esHoja ? 4 : -6}
                  textAnchor={esHoja ? "start" : "middle"}
                  className="text-[9px] font-bold fill-accent/60 select-none"
                >
                  <title>{`${conteoOrganismos.get(n.clado.id)} organismo(s) en este clado`}</title>
                  {conteoOrganismos.get(n.clado.id)}
                </text>
              )}
            </g>
          );
        })}

        {/* "Fantasma" de los nodos mientras se arrastran, siguiendo al mouse */}
        {nodosArrastrados.length > 0 && huboMovimiento && posMouse && (
          <g transform={`translate(${posMouse.x}, ${posMouse.y})`} className="pointer-events-none" opacity={0.85}>
            <circle r={5} className="fill-accent" />
            <text x={8} y={4} className="text-[11px] font-black fill-accent select-none">
              {nodosArrastrados.length === 1
                ? nodosArrastrados[0].clado.nombre || "Sin nombre"
                : `${nodosArrastrados.length} clados`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Panel de detalle del clado seleccionado ────────────────────────────────

// Breadcrumb de RUTA (no de niveles heterogéneos como BreadcrumbJerarquia en
// Biología). Acá cada tramo es un ancestro real del mismo tipo ("Clado"),
// ej. "Origen › Biológico › Fauna › ... › Humanidad" — el camino de
// padre_id hacia arriba, tal como está en el árbol. Sin popover: cada
// nombre es directamente clickeable y navega a ese clado.
function RutaClado({
  ruta,
  onSelectClado,
}: {
  /** Ancestros en orden raíz → actual (incluye el clado actual al final). */
  ruta: Clado[];
  onSelectClado: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap px-0.5">
      {ruta.map((c, idx) => {
        const esActual = idx === ruta.length - 1;
        return (
          <React.Fragment key={c.id}>
            {idx > 0 && <ChevronRight size={11} className="text-primary/20 shrink-0" />}
            {esActual ? (
              <span className="px-1.5 py-0.5 text-micro font-black uppercase tracking-widest text-primary">
                {c.nombre || "Sin nombre"}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSelectClado(c.id)}
                className="px-1.5 py-0.5 rounded-md text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary hover:bg-primary/6 transition-colors cursor-pointer"
                title={`Ir a ${c.nombre || "este clado"}`}
              >
                {c.nombre || "Sin nombre"}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PanelClado({
  clado,
  padre,
  hijos,
  relaciones,
  organismos,
  criaturasDe,
  cladoPorId,
  onSave,
  onDelete,
  onCrearHijo,
  onSelectCriatura,
  onAbrirOrganismo,
  onSelectClado,
  onHeaderControlsChange,
}: {
  clado: Clado;
  /** Padre visual del clado (resuelto por padre_id), null si es raíz. */
  padre: Clado | null;
  /** Hijos directos en el árbol (clados con padre_id = este clado). */
  hijos: Clado[];
  /** Relaciones laterales (clado_relaciones) donde este clado participa. */
  relaciones: CladoRelacion[];
  /** Organismos del clado (organismos.clado_id, v_clados_organismos_v1). */
  organismos: CladoOrganismo[];
  /** Criaturas que usan un organismo (criatura_organismos, v_organismos_criaturas_v1). */
  criaturasDe: (organismoId: string) => OrganismoCriatura[];
  cladoPorId: Map<string, Clado>;
  onSave: (updates: Partial<Clado>) => void;
  onDelete: () => void;
  onCrearHijo: () => void;
  onSelectCriatura?: (id: string) => void;
  onAbrirOrganismo?: (organismoId: string) => void;
  onSelectClado: (id: string) => void;
  /** Publica los controles de header (nombre, guardar, eliminar) hacia el
   *  contenedor (CladoPanelFlotante), que los renderiza en su propia
   *  EditorHeaderBar — mismo patrón que ElementoEditor/CompuestoEditor,
   *  para evitar la barra duplicada de la vista rápida. */
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  // Nombre de la variante base: se resuelve entre los organismos que ya
  // trae la vista (una variante comparte clado con su base en los datos
  // actuales; si no está en este clado, se omite el "de X" en vez de inventarlo).
  const organismoPorId = useMemo(
    () => new Map(organismos.map((o) => [o.organismo_id, o])),
    [organismos],
  );
  // La sinapomorfía en sentido cladístico estricto (carácter derivado
  // compartido por TODOS los descendientes) solo tiene sentido si este nodo
  // es filogenético Y (siendo raíz, o su unión con el padre es ascendencia
  // real). Para ecologico/ontologico/morfologico, o para un filogenetico
  // unido por clasificacion_biologica/agrupacion_*, el campo sigue siendo
  // texto libre (`clado.sinapomorfia`) pero el lenguaje no debe afirmar
  // "descendencia" que el propio contrato de datos dice que no se infiere.
  const esLinajeFilogenetico =
    clado.tipo_nodo === "filogenetico" && (!padre || clado.relacion_padre === "ascendencia");
  // Ruta de ancestros (Origen → ... → este clado), recorriendo padre_id
  // hacia arriba sobre el mapa ya resuelto. Es lectura pura del árbol tal
  // como está en Supabase — ningún dato nuevo, ninguna inferencia biológica.
  const rutaAncestros = useMemo(() => {
    const ruta: Clado[] = [];
    const visitados = new Set<string>();
    let actual: Clado | null = clado;
    while (actual) {
      if (visitados.has(actual.id)) break; // guarda contra ciclos accidentales
      visitados.add(actual.id);
      ruta.unshift(actual);
      actual = actual.padre_id ? cladoPorId.get(actual.padre_id) ?? null : null;
    }
    return ruta;
  }, [clado, cladoPorId]);
  const [nombre, setNombre] = useState(clado.nombre);
  const [sinapomorfia, setSinapomorfia] = useState(clado.sinapomorfia ?? "");
  const [descripcion, setDescripcion] = useState(clado.descripcion ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  React.useEffect(() => {
    setNombre(clado.nombre);
    setSinapomorfia(clado.sinapomorfia ?? "");
    setDescripcion(clado.descripcion ?? "");
    setStatus("idle");
  }, [clado.id]);

  const guardar = () => {
    setStatus("saving");
    try {
      onSave({
        nombre: nombre.trim() || clado.nombre,
        sinapomorfia: sinapomorfia.trim(),
        descripcion,
      });
      setStatus("saved");
    } catch (e) {
      console.error("[PanelClado] error guardando:", e);
      setStatus("error");
    }
  };

  usePublishHeaderControls(
    {
      IconoFallback: Dna,
      nombre,
      placeholderNombre: "Nombre del clado…",
      onChangeNombre: setNombre,
      onBlurNombre: guardar,
      status,
      onGuardar: guardar,
      onEliminar: onDelete,
    },
    onHeaderControlsChange,
  );

  return (
    <div className="flex flex-col gap-3.5">
      {rutaAncestros.length > 1 && <RutaClado ruta={rutaAncestros} onSelectClado={onSelectClado} />}
      <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:gap-x-5 md:gap-y-3.5 md:items-start">
      {/* Columna izquierda: metadatos de solo lectura + campos editables
          (Sinapomorfía, Descripción). Mismo criterio de 2 columnas que
          CompuestoEditor (gráfico+propiedades / composición+enlaces): más
          uso del ancho horizontal disponible en el panel max-w-6xl, en vez
          de todo apilado en una sola columna angosta. */}
      <div className="flex flex-col gap-3.5 min-w-0">
        {/* Contrato de Supabase — solo lectura: se muestra lo que la base
            declara, sin inferir. */}
        <div className="rounded-lg border border-primary/10 bg-primary/[0.02] px-2.5 py-2 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
              Representa
            </span>
            <span className="text-xs font-bold text-primary/80 text-right">
              {etiquetaTipoNodo(clado.tipo_nodo)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
              Unión con el padre
            </span>
            <span className="text-xs font-bold text-primary/80 text-right">
              {padre ? etiquetaRelacionPadre(clado.relacion_padre) : "— (raíz)"}
            </span>
          </div>
          {padre && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
                Padre
              </span>
              <button
                type="button"
                onClick={() => onSelectClado(padre.id)}
                className="text-xs font-bold text-accent/80 hover:text-accent transition-colors text-right"
              >
                {padre.nombre || "Sin nombre"}
              </button>
            </div>
          )}
          {clado.rango && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
                Rango
              </span>
              <span className="text-xs font-bold text-primary/60 text-right">{clado.rango}</span>
            </div>
          )}
          {clado.estado && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
                Estado
              </span>
              <span className="text-xs font-bold text-primary/60 text-right">{clado.estado}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
              Hijos
            </span>
            {hijos.length === 0 ? (
              <span className="text-xs text-primary/35 text-right">—</span>
            ) : (
              <span className="flex flex-wrap justify-end gap-x-2 gap-y-0.5">
                {hijos.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectClado(h.id)}
                    className="text-xs font-bold text-accent/80 hover:text-accent transition-colors"
                  >
                    {h.nombre || "Sin nombre"}
                  </button>
                ))}
              </span>
            )}
          </div>
          {padre && (
            <p className="text-micro text-primary/35 leading-snug">
              El padre es la posición en el árbol; no implica descendencia salvo que la unión sea
              «Ascendencia».
            </p>
          )}
        </div>

        <div>
          <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1">
            {esLinajeFilogenetico ? "Sinapomorfía" : "Carácter definitorio"}
          </span>
          <p className="text-micro text-primary/35 mb-1.5 leading-snug">
            {esLinajeFilogenetico
              ? "Carácter derivado compartido por todos los descendientes."
              : "Qué define a este grupo — no implica ascendencia compartida."}
          </p>
          <input
            className="w-full bg-primary/[0.02] border border-primary/10 rounded-lg px-2 py-1.5 text-xs font-bold text-primary/80 outline-none placeholder:text-primary/30 placeholder:font-normal focus:border-primary/25"
            placeholder={
              esLinajeFilogenetico ? "Ej. vejiga de veneno dorsal…" : "Ej. hábitat compartido, rasgo común…"
            }
            value={sinapomorfia}
            onChange={(e) => setSinapomorfia(e.target.value)}
            onBlur={guardar}
          />
        </div>

        <div>
          <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1">
            Descripción
          </span>
          <RichEditor
            minHeight="4.5rem"
            placeholder="Notas evolutivas, contexto del linaje…"
            value={descripcion}
            onChange={setDescripcion}
          />
        </div>

        <button
          type="button"
          onClick={onCrearHijo}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed text-micro font-black uppercase tracking-widest transition-all"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        >
          <Plus size={10} /> Añadir clado hijo
        </button>
      </div>

      {/* Columna derecha: Otras relaciones + Organismos del clado — listas
          más largas que se benefician de tener su propia columna en vez de
          seguir apilándose debajo de todo lo de la izquierda. */}
      <div className="flex flex-col gap-3.5 min-w-0">
        {relaciones.length > 0 && (
          <div>
            <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1">
              Otras relaciones
            </span>
            <p className="text-micro text-primary/35 mb-1.5 leading-snug">
              Conexiones que no son hijos del árbol: el otro clado sigue en su propia rama.
            </p>
            <ul className="flex flex-col gap-1.5">
              {relaciones.map((r) => {
                const esOrigen = r.clado_origen_id === clado.id;
                const otro = cladoPorId.get(esOrigen ? r.clado_destino_id : r.clado_origen_id);
                return (
                  <li
                    key={r.id}
                    className="rounded-lg border border-primary/10 bg-primary/[0.02] px-2.5 py-1.5"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-micro font-black uppercase tracking-widest text-accent/60">
                        {TIPO_RELACION_CLADO_LABEL[r.tipo] ?? r.tipo}
                      </span>
                      <span className="text-micro text-primary/30">{esOrigen ? "→" : "←"}</span>
                      {otro ? (
                        <button
                          type="button"
                          onClick={() => onSelectClado(otro.id)}
                          className="text-xs font-bold text-primary/80 hover:text-accent transition-colors"
                        >
                          {otro.nombre || "Sin nombre"}
                        </button>
                      ) : (
                        <span className="text-xs italic text-primary/30">clado no disponible</span>
                      )}
                    </div>
                    {r.descripcion && (
                      <p className="text-micro text-primary/45 leading-snug mt-1">{r.descripcion}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40 block mb-1">
            Organismos del clado
          </span>
          <p className="text-micro text-primary/35 mb-1.5 leading-snug">
            La biología efectiva vive en el organismo; el clado aporta el linaje y la herencia.
          </p>
          {organismos.length === 0 ? (
            <p className="text-xs text-primary/30 italic">
              Este clado todavía no tiene organismos asignados.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {organismos.map((o) => {
                const criaturas = criaturasDe(o.organismo_id);
                const base = o.organismo_base_id ? organismoPorId.get(o.organismo_base_id) : null;
                return (
                  <li
                    key={o.organismo_id}
                    className="rounded-lg border border-primary/10 bg-primary/[0.02] px-2.5 py-1.5"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={!onAbrirOrganismo}
                        onClick={() => onAbrirOrganismo?.(o.organismo_id)}
                        className="text-xs font-bold text-primary/80 hover:text-accent transition-colors disabled:hover:text-primary/80 disabled:cursor-default"
                      >
                        {o.organismo || "Sin nombre"}
                      </button>
                      {o.tipo_organismo && (
                        <span className="text-micro font-black uppercase tracking-widest text-primary/35">
                          {o.tipo_organismo}
                        </span>
                      )}
                      {o.variante_tipo && (
                        <span className="text-micro text-primary/40">
                          variante: {o.variante_tipo}
                          {o.sexo_biologico ? ` · ${o.sexo_biologico}` : ""}
                          {base ? ` de ${base.organismo}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      {criaturas.length === 0 ? (
                        <span className="text-micro text-primary/30 italic">
                          Ninguna criatura usa este organismo todavía.
                        </span>
                      ) : (
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-micro font-black uppercase tracking-widest text-primary/35">
                            Criaturas
                          </span>
                          {criaturas.map((c) => (
                            <button
                              key={`${c.organismo_id}-${c.criatura_id}`}
                              type="button"
                              disabled={!onSelectCriatura}
                              onClick={() => onSelectCriatura?.(c.criatura_id)}
                              title={c.es_principal ? "Organismo principal de esta criatura" : undefined}
                              className="text-xs font-bold text-accent/80 hover:text-accent transition-colors disabled:hover:text-accent/80 disabled:cursor-default"
                            >
                              {c.criatura}
                              {c.es_principal ? " ★" : ""}
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Panel flotante centrado (mismo patrón que ElementoPanelFlotante en
// Química: EditorHeaderBar única + backdrop blur), en vez del sidebar fijo
// o de un header custom propio — así el "menú" de Clados queda visualmente
// idéntico a Elementos/Compuestos: mismos colores, mismo borde de 1px, la
// misma barra con SaveIndicator y confirmación inline de borrado. Mismo
// ancho máximo (max-w-6xl) y cuerpo en 2 columnas que CompuestoPanelFlotante/
// CompuestoEditor — más uso del espacio horizontal en desktop, en vez de
// una sola columna angosta con todo apilado verticalmente (ver PanelClado).
function CladoPanelFlotante({
  clado,
  padre,
  hijos,
  relaciones,
  organismos,
  criaturasDe,
  cladoPorId,
  onCerrar,
  onSave,
  onDelete,
  onCrearHijo,
  onSelectCriatura,
  onAbrirOrganismo,
  onSelectClado,
}: {
  clado: Clado;
  padre: Clado | null;
  hijos: Clado[];
  relaciones: CladoRelacion[];
  organismos: CladoOrganismo[];
  criaturasDe: (organismoId: string) => OrganismoCriatura[];
  cladoPorId: Map<string, Clado>;
  onCerrar: () => void;
  onSave: (updates: Partial<Clado>) => void;
  onDelete: () => void;
  onCrearHijo: () => void;
  onSelectCriatura?: (id: string) => void;
  onAbrirOrganismo?: (organismoId: string) => void;
  onSelectClado: (id: string) => void;
}) {
  const [headerControls, setHeaderControls] = useState<Parameters<OnHeaderControlsChange>[0]>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCerrar]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {headerControls && <EditorHeaderBar controls={headerControls} />}

        <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
          <PanelClado
            key={clado.id}
            clado={clado}
            padre={padre}
            hijos={hijos}
            relaciones={relaciones}
            organismos={organismos}
            criaturasDe={criaturasDe}
            cladoPorId={cladoPorId}
            onSave={onSave}
            onDelete={onDelete}
            onCrearHijo={onCrearHijo}
            onSelectCriatura={onSelectCriatura}
            onAbrirOrganismo={onAbrirOrganismo}
            onSelectClado={onSelectClado}
            onHeaderControlsChange={setHeaderControls}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export function CladisticaPage({ onSelectCriatura, onAbrirOrganismo }: Props) {
  const { clados, loading, creating, crear, actualizar, eliminar } = useClados();
  const { relacionesDe } = useCladoRelaciones();
  const { organismosDe, conteoPorClado } = useCladosOrganismos();
  const { criaturasDe } = useOrganismosCriaturas();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState<Set<string>>(new Set());

  const cladoPorId = useMemo(() => new Map(clados.map((c) => [c.id, c])), [clados]);
  const seleccionado = seleccionadoId ? (cladoPorId.get(seleccionadoId) ?? null) : null;
  const padreSeleccionado =
    seleccionado?.padre_id ? (cladoPorId.get(seleccionado.padre_id) ?? null) : null;
  // Hijos directos: se derivan de padre_id (la única fuente del árbol).
  const hijosSeleccionado = useMemo(
    () => (seleccionadoId ? clados.filter((c) => c.padre_id === seleccionadoId) : []),
    [clados, seleccionadoId],
  );

  const crearRaiz = async () => {
    const nuevo = await crear("Nuevo clado", null);
    if (nuevo) setSeleccionadoId(nuevo.id);
  };

  const crearHijo = async (padreId: string) => {
    const nuevo = await crear("Nuevo clado", padreId);
    if (nuevo) setSeleccionadoId(nuevo.id);
  };

  const toggleMultiple = (id: string) => {
    setSeleccionMultiple((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Al armar/editar la selección múltiple, el panel lateral sigue el
    // último nodo tocado con Shift — así se puede ver su detalle también.
    setSeleccionadoId(id);
  };

  const moverGrupo = async (ids: string[], nuevoPadreId: string | null) => {
    await Promise.all(ids.map((id) => actualizar(id, { padre_id: nuevoPadreId })));
    setSeleccionMultiple(new Set());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-micro font-black uppercase tracking-[0.15em] text-primary/40">
          Cladograma
        </span>
        <div className="flex items-center gap-3">
          {seleccionMultiple.size > 0 && (
            <button
              type="button"
              onClick={() => setSeleccionMultiple(new Set())}
              className="text-micro font-black uppercase tracking-widest text-accent/60 hover:text-accent transition-colors"
            >
              Limpiar selección ({seleccionMultiple.size})
            </button>
          )}
          <button
            type="button"
            disabled={creating}
            onClick={() => void crearRaiz()}
            className="flex items-center gap-1 text-micro font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors disabled:opacity-40"
          >
            <Plus size={10} /> Nuevo ancestro común
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full py-6 text-xs text-primary/30 text-center">Cargando…</div>
      ) : clados.length === 0 ? (
        <p className="text-xs text-primary/25 italic py-4 text-center">
          Sin clados todavía — creá el primer nodo (el ancestro común más
          lejano que quieras registrar).
        </p>
      ) : (
        <>
        <LeyendaCladograma clados={clados} />
        <DiagramaCladograma
          clados={clados}
          conteoOrganismos={conteoPorClado}
          seleccionadoId={seleccionadoId}
          seleccionMultiple={seleccionMultiple}
          onSelect={(id) => {
            setSeleccionadoId(id);
            setSeleccionMultiple(new Set());
          }}
          onToggleMultiple={toggleMultiple}
          onMover={(cladoId, nuevoPadreId) => void actualizar(cladoId, { padre_id: nuevoPadreId })}
          onMoverGrupo={(ids, nuevoPadreId) => void moverGrupo(ids, nuevoPadreId)}
        />
        </>
      )}

      {/* Panel flotante centrado: mismo patrón que Elementos/Personajes/
          Criaturas — modal grande centrado con backdrop blur, en vez de
          sidebar fijo. Se cierra con click en el backdrop, Escape, o X. */}
      {seleccionado && (
        <CladoPanelFlotante
          clado={seleccionado}
          padre={padreSeleccionado}
          hijos={hijosSeleccionado}
          relaciones={relacionesDe(seleccionado.id)}
          organismos={organismosDe(seleccionado.id)}
          criaturasDe={criaturasDe}
          onAbrirOrganismo={
            onAbrirOrganismo
              ? (organismoId) => {
                  // Al abrir el organismo, este panel de clado se cierra:
                  // el flotante de Organismo pasa a ser el único panel
                  // visible, en vez de apilarse encima del de Clado.
                  setSeleccionadoId(null);
                  onAbrirOrganismo(organismoId);
                }
              : undefined
          }
          cladoPorId={cladoPorId}
          onSelectClado={setSeleccionadoId}
          onCerrar={() => setSeleccionadoId(null)}
          onSave={(updates) => void actualizar(seleccionado.id, updates)}
          onDelete={() => {
            void eliminar(seleccionado.id);
            setSeleccionadoId(null);
          }}
          onCrearHijo={() => void crearHijo(seleccionado.id)}
          onSelectCriatura={onSelectCriatura}
        />
      )}
    </div>
  );
}
