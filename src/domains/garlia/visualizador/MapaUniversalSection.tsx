"use client";

/**
 * MapaUniversalSection.tsx — VIS-15 "Mapa Universal".
 * ───────────────────────────────────────────────────────────────────────────
 * Vista de Atlas que NO reemplaza a Física/Alquimia/Química: las conecta en
 * un solo árbol navegable, mostrando las 3 ramas del flujo canónico tal
 * como ya existen en los hooks de ruta reales — cero cálculo nuevo acá.
 *
 *   Rama 1 (Física):   TASI → IUM → Oris → Éterium
 *   Rama 2 (Alquimia): TASI → Núcleo / Media / Externa → Elemento → Compuesto
 *   Rama 3 (libres):   Partículas T/A/S/I sin agrupar en Ium/capa → Garin/Éterium
 *
 * Interactividad real (pedido explícito):
 *   - Click en un IUM del Oris activo (rama Física) fija su foco en el
 *     Trace Y abre un popover flotante con su gráfico A/T/S real
 *     (IumVisual) — mismo componente y mismo patrón que usa BasesItemCard
 *     en FisicaPage. No abre editor: IUM no tiene panel de edición propio
 *     en el código real, solo el gráfico de solo-lectura.
 *   - Click en el Oris activo abre el mismo popover con su propio gráfico
 *     A/T/S (agregando las Partículas de todos sus IUMs).
 *   - Click en el NOMBRE del Elemento activo (rama Alquimia) abre
 *     ElementoPanelFlotante real — el mismo modal de edición que usa
 *     /elementos, con guardado real a Supabase (tabla "elementos").
 *   - Click en un Compuesto-hermano (rama Alquimia) abre CompuestoPanelFlotante
 *     real — mismo modal de edición que usa /elementos, con guardado real
 *     a Supabase (tabla "compuestos" + "compuesto_elementos").
 *   - Ambos paneles de Alquimia se reusan tal cual existen hoy
 *     (ElementosPage.tsx / CompuestosPage.tsx) — no se reimplementa edición
 *     nueva acá, solo se les da los datos y los mutadores reales (mismo
 *     patrón de ElementosSection.tsx: onActualizar solo toca estado local
 *     en memoria, ElementoEditor/CompuestoEditor persisten a Supabase por
 *     su cuenta con debounce propio).
 */

import React, { useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";

import { useElementos } from "@/domains/garlia/elementos/useElementos";
import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useCompuestoEstabilidad, type CompuestoEstabilidadRow } from "@/domains/garlia/elementos/useCompuestoEstabilidad";
import type { Compuesto, Elemento } from "@/domains/garlia/elementos/types";
import { ElementoPanelFlotante } from "@/domains/garlia/elementos/ElementosPage";
import { CompuestoPanelFlotante } from "@/domains/garlia/elementos/CompuestosPage";
import { PopoverFlotante } from "@/domains/garlia/_shared/PopoverFlotante";
import { IumVisual, ParticulaVisual } from "@/domains/garlia/fisica/ParticulaVisual";
import { particulasDeIum, particulaBaseAFilaCatalogo, type FilaParticulaBase } from "@/domains/garlia/fisica/types";
import { useParticulasBase } from "@/domains/garlia/fisica/useFisica";

import { useFisicaRoute } from "./routes/useFisicaRoute";
import { useAlquimiaRoute } from "./routes/useAlquimiaRoute";
import { useParticulasCompletas } from "./useVisualizadorData";
import { TraceView, type TraceStep } from "./TraceView";

// ─── Primitivas locales (mismo lenguaje visual que VisualizadorPage) ───────
// No se importan desde VisualizadorPage.tsx para no crear un ciclo de
// módulos ni acoplar esta sección a ese archivo.

const FlowNode = React.forwardRef<HTMLElement, {
  title: string;
  subtitle?: string;
  tone?: "default" | "accent";
  onClick?: () => void;
  /** Nodo actualmente centrado en la cadena — borde marcado para distinguir
   *  "esto es lo que estoy viendo" de "esto es clickeable pero no es el foco". */
  selected?: boolean;
}>(function FlowNode({ title, subtitle, tone = "default", onClick, selected = false }, ref) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      ref={ref}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`min-w-[128px] rounded-xl border px-4 py-4 text-left transition-colors ${
        selected
          ? "border-primary/50"
          : tone === "accent"
            ? "border-primary/30"
            : "border-primary/10"
      } ${onClick ? "hover:border-primary/30 cursor-pointer" : ""}`}
    >
      <p className={`text-sm font-black text-primary/80 ${onClick ? "hover:underline" : ""}`}>{title}</p>
      {subtitle ? <p className="mt-1.5 text-[11px] leading-4 text-primary/40">{subtitle}</p> : null}
    </Comp>
  );
});

function Arrow() {
  return <ChevronRight className="shrink-0 text-primary/25" size={20} />;
}

/**
 * Igual que un FlowNode clickeable, pero el click abre un popover flotante
 * con el gráfico A/T/S real (IumVisual) arriba del nombre/subtítulo —
 * mismo componente y mismo patrón visual que usa BasesItemCard en
 * FisicaPage para IUMs y Oris (círculo de Partículas orbitando un centro).
 * No abre ningún editor: solo muestra el gráfico, como pidió el usuario.
 */
function VisualFlowNode({
  title,
  subtitle,
  tone = "default",
  selected = false,
  particulas,
  detalle,
  extra,
  onFocus,
}: {
  title: string;
  subtitle?: string;
  tone?: "default" | "accent";
  selected?: boolean;
  /** Partículas reales (expandidas) a graficar en el popover — IumVisual
   *  arma el círculo proporcional A/T/S/I a partir de esta lista. */
  particulas: { nombre: string; formula: string }[];
  /** Texto principal (composición/fórmula), igual que fila.detalle en
   *  BasesItemCard — ej. dominio del Oris o descripción del IUM. */
  detalle?: string | null;
  /** Texto secundario, igual que fila.extra en BasesItemCard — ej.
   *  familia del Oris. */
  extra?: string | null;
  /** Además de abrir el popover, fija el foco (ej. IUM activo del Trace). */
  onFocus?: () => void;
}) {
  const nodeRef = useRef<HTMLElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <FlowNode
        ref={nodeRef}
        title={title}
        subtitle={subtitle}
        tone={tone}
        selected={selected || !!anchor}
        onClick={() => {
          onFocus?.();
          setAnchor((actual) => (actual ? null : nodeRef.current));
        }}
      />
      <PopoverFlotante anchor={anchor} onClose={() => setAnchor(null)} width={420} maxHeight={340}>
        {/* Mismo layout de dos columnas que BasesItemCard (conVisual): gráfico
            a la izquierda, nombre + detalle + extra a la derecha. */}
        <div className="flex flex-row gap-3">
          <div className="shrink-0 flex items-center justify-center w-[140px]">
            <IumVisual particulas={particulas} size={140} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-wide text-primary">{title}</p>
            {detalle ? <p className="text-xs text-primary/70 leading-relaxed">{detalle}</p> : null}
            {extra ? <p className="text-xs text-primary/40 leading-relaxed">{extra}</p> : null}
          </div>
        </div>
      </PopoverFlotante>
    </>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/10 p-5 text-xs font-bold text-primary/35">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
      Cargando datos reales desde Supabase…
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/15 p-5 text-xs leading-5 text-primary/40">
      {children}
    </div>
  );
}

/** Las 3 ramas del flujo canónico — nombre + resumen corto, mostrado como
 *  selector arriba del árbol activo. */
type RamaCanonica = "fisica" | "alquimia" | "libres" | "polaridades" | "matriz" | "radar" | "causal";

const RAMAS: { key: RamaCanonica; label: string }[] = [
  { key: "fisica", label: "TASI → IUM → Oris" },
  { key: "alquimia", label: "TASI → Capas → Elemento" },
  { key: "libres", label: "TASI libres → Garin/Éterium" },
  { key: "polaridades", label: "Polaridades → TASI → Partículas" },
  { key: "matriz", label: "Matriz de Polaridades (T/A/S/I)" },
  { key: "radar", label: "Radar de Elemento" },
  { key: "causal", label: "¿Por qué es estable? (Compuesto)" },
];

function RamaSelector({ active, onSelect }: { active: RamaCanonica; onSelect: (r: RamaCanonica) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RAMAS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onSelect(r.key)}
          className={`rounded-full border px-3.5 py-2 text-xs font-black transition-colors ${
            active === r.key
              ? "border-primary/40 text-primary/90"
              : "border-primary/10 text-primary/50 hover:border-primary/25 hover:text-primary/75"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ─── Rama 1: Física — TASI → IUM → Oris → Éterium ──────────────────────────
// Mismo dato que RutasSection perspectiva="fisica" (useFisicaRoute), pero
// aplanado a un solo FlowNode por nivel — acá el protagonista es la CADENA
// entre las 3 rutas, no el detalle visual de cada nivel.
//
// IUM y Oris no tienen panel flotante de EDICIÓN propio en el código real
// (solo un editor embebido en FisicaPage) — pero sí tienen su gráfico A/T/S
// (IumVisual), igual que en BasesItemCard de FisicaPage. Acá el click en un
// nodo IUM/Oris abre ese mismo gráfico en un popover flotante (solo
// lectura, sin editor) además de fijar el foco del Trace de abajo.

function RamaFisica({ route }: { route: ReturnType<typeof useFisicaRoute> }) {
  const { oris, orisSel, setOrisSelId, iumPorId, setIumSelId, iumSel, particulasDelIumSel, particulasDelOrisSel } =
    route;

  const iumIdsDelOris = orisSel ? Object.keys(orisSel.iums_composicion) : [];
  const iumFocoId = iumSel?.id ?? iumIdsDelOris[0] ?? null;
  const iumFoco = iumFocoId ? iumPorId[iumFocoId] : null;

  const traceSteps: TraceStep[] = [
    { id: "t-tasi", levelLabel: "TASI (base)", title: "Partículas A/T/S/I", subtitle: "27 combinaciones canónicas" },
    {
      id: "t-ium",
      levelLabel: "IUM",
      title: iumFoco?.nombre ?? null,
      subtitle: orisSel ? `${iumIdsDelOris.length} IUM(s) distintos` : undefined,
    },
    { id: "t-oris", levelLabel: "Oris", title: orisSel?.nombre ?? null, subtitle: orisSel?.dominio ?? undefined },
    { id: "t-eterium", levelLabel: "Éterium", title: orisSel ? orisSel.familia : null, subtitle: "Manifestación final" },
  ];

  return (
    <>
      {route.loading ? <LoadingRow /> : route.empty ? <EmptyRow>No hay Oris cargados en Supabase todavía.</EmptyRow> : null}
      {!route.loading && oris.length > 0 ? (
        <>
          <select
            value={orisSel?.id ?? ""}
            onChange={(e) => {
              setOrisSelId(e.target.value || null);
              setIumSelId(null);
            }}
            className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
          >
            {oris.map((o) => (
              <option key={o.id} value={o.id} className="bg-[var(--bg-main)] text-primary">
                {o.nombre}
              </option>
            ))}
          </select>

          <div className="mt-5 overflow-x-auto rounded-2xl p-6">
            <div className="flex min-w-[720px] items-center gap-2">
              <FlowNode title="Partículas" subtitle="T/A/S/I" />
              <Arrow />
              {/* Cada IUM del Oris activo es su propio nodo clickeable —
                  clickearlo fija el foco del Trace de abajo Y abre su
                  gráfico A/T/S (IumVisual) en un popover, igual que en
                  FisicaPage. */}
              <div className="flex flex-col gap-2">
                {iumIdsDelOris.length === 0 ? (
                  <FlowNode title="IUMs" subtitle="sin IUMs registrados" />
                ) : (
                  iumIdsDelOris.map((iumId) => {
                    const ium = iumPorId[iumId];
                    if (!ium) return null;
                    const esFoco = iumFocoId === iumId;
                    return (
                      <VisualFlowNode
                        key={iumId}
                        title={ium.nombre}
                        selected={esFoco}
                        onFocus={() => setIumSelId(iumId)}
                        particulas={esFoco ? particulasDelIumSel : particulasDeIum(ium)}
                        detalle={ium.detalle}
                        extra={ium.extra}
                      />
                    );
                  })
                )}
              </div>
              <Arrow />
              <VisualFlowNode
                title={orisSel?.nombre ?? "Oris"}
                subtitle={orisSel?.dominio}
                tone="accent"
                selected
                particulas={particulasDelOrisSel}
                detalle={orisSel?.dominio || orisSel?.formula}
                extra={orisSel?.familia}
              />
              <Arrow />
              <FlowNode title="Éterium" subtitle={orisSel?.familia} />
            </div>
          </div>

          <div className="mt-6">
            <TraceView steps={traceSteps} />
          </div>
        </>
      ) : null}
    </>
  );
}

// ─── Rama 2: Alquimia — TASI → Núcleo/Media/Externa → Elemento → Compuesto ─
// Trae su propio useElementos()/useCompuestosConElementos() (en vez de
// useAlquimiaRoute/useCompuestoRoute) porque necesita setItems real para
// pasarle onActualizar/onEliminar a los paneles flotantes — mismo patrón
// que ElementosSection.tsx: los paneles solo tocan estado local en
// memoria, el guardado real a Supabase lo hace ElementoEditor/
// CompuestoEditor internamente con su propio debounce.

function RamaAlquimia() {
  const { items: elementos, setItems: setElementos, loading: loadingElementos } = useElementos();
  const {
    items: compuestos,
    setItems: setCompuestos,
    loading: loadingCompuestos,
  } = useCompuestosConElementos();

  const [elementoSelId, setElementoSelId] = useState<string | null>(null);
  const [compuestoFocoId, setCompuestoFocoId] = useState<string | null>(null);

  // Paneles flotantes abiertos — null = cerrado. Solo uno a la vez, mismo
  // criterio que ElementosPage/CompuestosPage (un solo modal centrado).
  const [elementoAbiertoId, setElementoAbiertoId] = useState<string | null>(null);
  const [compuestoAbiertoId, setCompuestoAbiertoId] = useState<string | null>(null);

  const elementoSel = useMemo(
    () => (elementoSelId ? elementos.find((e) => e.id === elementoSelId) ?? null : elementos[0] ?? null),
    [elementos, elementoSelId],
  );

  const capas = useMemo(() => {
    if (!elementoSel) return [];
    return (["nucleo", "media", "externa"] as const).map((capa) => {
      const mapa = elementoSel[capa] ?? {};
      const total = Object.values(mapa).reduce((acc: number, v) => acc + (typeof v === "number" ? v : 0), 0);
      const label = capa === "nucleo" ? "Núcleo" : capa === "media" ? "Media" : "Externa";
      return { capa, label, total };
    });
  }, [elementoSel]);

  // Compuestos reales que usan el Elemento activo como componente.
  const compuestosDelElemento = useMemo(() => {
    if (!elementoSel) return [];
    return compuestos.filter((c) => c.componentes?.some((comp) => comp.elemento_id === elementoSel.id));
  }, [compuestos, elementoSel]);

  const compuestoFoco = useMemo(
    () => compuestosDelElemento.find((c) => c.id === compuestoFocoId) ?? compuestosDelElemento[0] ?? null,
    [compuestosDelElemento, compuestoFocoId],
  );

  const elementoAbierto = elementoAbiertoId ? elementos.find((e) => e.id === elementoAbiertoId) ?? null : null;
  const compuestoAbierto = compuestoAbiertoId ? compuestos.find((c) => c.id === compuestoAbiertoId) ?? null : null;

  // ─── Mutadores reales — mismo patrón que ElementosSection.tsx: onActualizar
  // solo actualiza estado local (el editor persiste a Supabase por su
  // cuenta); onEliminar sí escribe directo porque no hay editor de por medio.
  async function handleActualizarElemento(id: string, cambios: Partial<Elemento>) {
    setElementos((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
  }

  async function handleEliminarElemento(id: string) {
    try {
      const { error } = await supabase.from("elementos").delete().eq("id", id);
      if (error) throw error;
      setElementos((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      console.error("[MapaUniversalSection] error eliminando elemento:", e);
    }
  }

  async function handleActualizarCompuesto(id: string, cambios: Partial<Compuesto>) {
    setCompuestos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  }

  async function handleEliminarCompuesto(id: string) {
    try {
      const { error } = await supabase.from("compuestos").delete().eq("id", id);
      if (error) throw error;
      setCompuestos((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("[MapaUniversalSection] error eliminando compuesto:", e);
    }
  }

  const traceSteps: TraceStep[] = [
    { id: "t-tasi", levelLabel: "TASI (base)", title: "Partículas de Química", subtitle: "distribuidas en 3 capas" },
    {
      id: "t-capas",
      levelLabel: "Núcleo / Media / Externa",
      title: capas.length > 0 ? capas.map((c) => `${c.label}: ${c.total}`).join(" · ") : null,
    },
    {
      id: "t-elemento",
      levelLabel: "Elemento",
      title: elementoSel ? `${elementoSel.simbolo} · ${elementoSel.nombre}` : null,
    },
    {
      id: "t-compuesto",
      levelLabel: "Compuesto",
      title: compuestoFoco?.nombre ?? null,
      subtitle: compuestosDelElemento.length > 1 ? `1 de ${compuestosDelElemento.length}` : undefined,
    },
  ];

  const loading = loadingElementos || loadingCompuestos;

  return (
    <>
      {loading ? <LoadingRow /> : elementos.length === 0 ? <EmptyRow>No hay Elementos cargados en Supabase todavía.</EmptyRow> : null}
      {!loading && elementos.length > 0 ? (
        <>
          <select
            value={elementoSel?.id ?? ""}
            onChange={(e) => {
              setElementoSelId(e.target.value || null);
              setCompuestoFocoId(null);
            }}
            className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
          >
            {elementos.map((e) => (
              <option key={e.id} value={e.id} className="bg-[var(--bg-main)] text-primary">
                {e.simbolo} · {e.nombre}
              </option>
            ))}
          </select>

          <div className="mt-5 overflow-x-auto rounded-2xl p-6">
            <div className="flex min-w-[820px] items-center gap-2">
              <FlowNode title="Partículas" subtitle="T/A/S/I" />
              <Arrow />
              <div className="flex flex-col gap-2">
                {capas.map((c) => (
                  <FlowNode key={c.capa} title={c.label} subtitle={`${c.total} partícula(s)`} />
                ))}
              </div>
              <Arrow />
              {/* Click en el NOMBRE del Elemento abre su editor real
                  (ElementoPanelFlotante) — igual que en /elementos. */}
              <FlowNode
                title={elementoSel ? `${elementoSel.simbolo} · ${elementoSel.nombre}` : "Elemento"}
                subtitle={elementoSel?.familia}
                tone="accent"
                selected
                onClick={elementoSel ? () => setElementoAbiertoId(elementoSel.id) : undefined}
              />
              <Arrow />
              {/* Compuestos-hermanos: click en el nombre abre su editor
                  real (CompuestoPanelFlotante); el nodo también queda
                  marcado como foco del Trace de abajo. */}
              <div className="flex flex-col gap-2">
                {compuestosDelElemento.length === 0 ? (
                  <FlowNode title="Sin compuesto" subtitle="aún no forma parte de ninguno" />
                ) : (
                  compuestosDelElemento.slice(0, 6).map((c) => (
                    <FlowNode
                      key={c.id}
                      title={c.nombre}
                      subtitle={c.tipo_compuesto ?? undefined}
                      selected={compuestoFoco?.id === c.id}
                      onClick={() => {
                        setCompuestoFocoId(c.id);
                        setCompuestoAbiertoId(c.id);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <TraceView steps={traceSteps} />
          </div>
        </>
      ) : null}

      {/* Paneles flotantes reales — mismos componentes que /elementos,
          montados aquí con los mismos datos y mutadores. */}
      {elementoAbierto ? (
        <ElementoPanelFlotante
          elemento={elementoAbierto}
          todosLosElementos={elementos}
          onCerrar={() => setElementoAbiertoId(null)}
          onActualizar={handleActualizarElemento}
          onEliminar={handleEliminarElemento}
          compuestos={compuestos}
          onNavigateCompuesto={(compuestoId) => {
            setElementoAbiertoId(null);
            setCompuestoAbiertoId(compuestoId);
          }}
        />
      ) : null}

      {compuestoAbierto ? (
        <CompuestoPanelFlotante
          compuesto={compuestoAbierto}
          elementos={elementos}
          todosLosCompuestos={compuestos}
          onCerrar={() => setCompuestoAbiertoId(null)}
          onActualizar={handleActualizarCompuesto}
          onEliminar={handleEliminarCompuesto}
          onNavigateCompuesto={(compuestoId) => setCompuestoAbiertoId(compuestoId)}
        />
      ) : null}
    </>
  );
}

// ─── Rama 3: Partículas libres → Garin / Éterium ───────────────────────────
// No hay tabla propia para "partículas sin agrupar" — es un estado
// conceptual (ver fisica_conceptos, bloque "Vacío/Garin/Eterium"), no una
// entidad con filas propias. Se muestra como diagrama conceptual fijo, sin
// interacción real posible porque no hay ningún id al que navegar.

function RamaLibres() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto rounded-2xl p-7">
        <FlowNode title="Partículas T/A/S/I" subtitle="sin agrupar en IUM ni capa" />
        <Arrow />
        <div className="flex flex-col gap-2">
          <FlowNode title="Garin" subtitle="polo de recepción (I)" />
          <FlowNode title="Éterium" subtitle="polo de emisión (S)" />
        </div>
      </div>
    </>
  );
}

// ─── Rama 4: Polaridades — Polaridad → TASI → Partículas ───────────────────
// Dato real: "particulas.vector_neto" (suma A=+1/T=-1/S=0 sobre la fórmula
// de 3 letras, ver fisica/types.ts) trae la polaridad neta de cada una de
// las 27 Partículas canónicas — ya vive en Supabase, no se calcula nada
// nuevo acá. Se agrupan las 27 en 3 polaridades (Positiva/Neutra/Negativa)
// según el signo de vector_neto y se listan sus Partículas reales debajo de
// cada una. Click en una Partícula abre su gráfico A/T/S real
// (ParticulaVisual) en un popover flotante — mismo patrón visual que
// VisualFlowNode/IumVisual usa en la rama Física, pero acá el círculo es el
// de una Partícula individual (3 tercios fijos), no el de un Ium/Oris
// (arcos proporcionales u orbital).

type PolaridadClave = "positiva" | "neutra" | "negativa";

const POLARIDAD_LABEL: Record<PolaridadClave, string> = {
  positiva: "Positiva (+)",
  neutra: "Neutra (0)",
  negativa: "Negativa (−)",
};

const POLARIDAD_DETALLE: Record<PolaridadClave, string> = {
  positiva: "vector_neto > 0 — dominancia de A (Antítesis/masa-constitución)",
  neutra: "vector_neto = 0 — A/T equilibrados en la fórmula",
  negativa: "vector_neto < 0 — dominancia de T (Tesis/dinámica)",
};

function polaridadDeVector(vectorNeto: number | null | undefined): PolaridadClave {
  const v = vectorNeto ?? 0;
  if (v > 0) return "positiva";
  if (v < 0) return "negativa";
  return "neutra";
}

/** Igual que VisualFlowNode, pero el popover grafica UNA Partícula (3
 *  tercios fijos vía ParticulaVisual) en vez del círculo orbital de un
 *  Ium/Oris — no reusa VisualFlowNode porque ese componente está atado a
 *  IumVisual (recibe una lista de partículas, no una fórmula única). */
function ParticulaFlowNode({
  nombre,
  formula,
  vectorNeto,
  selected,
  onFocus,
}: {
  nombre: string;
  formula: string;
  vectorNeto: number | null | undefined;
  selected?: boolean;
  onFocus?: () => void;
}) {
  const nodeRef = useRef<HTMLElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <FlowNode
        ref={nodeRef}
        title={nombre}
        subtitle={formula}
        selected={selected || !!anchor}
        onClick={() => {
          onFocus?.();
          setAnchor((actual) => (actual ? null : nodeRef.current));
        }}
      />
      <PopoverFlotante anchor={anchor} onClose={() => setAnchor(null)} width={340} maxHeight={260}>
        <div className="flex flex-row gap-3">
          <div className="shrink-0 flex items-center justify-center w-[110px]">
            <ParticulaVisual formula={formula} size={110} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-wide text-primary">{nombre}</p>
            <p className="text-xs text-primary/70 leading-relaxed">Fórmula {formula}</p>
            <p className="text-xs text-primary/40 leading-relaxed">
              Vector neto: {vectorNeto ?? 0} · {POLARIDAD_LABEL[polaridadDeVector(vectorNeto)]}
            </p>
          </div>
        </div>
      </PopoverFlotante>
    </>
  );
}

function RamaPolaridades() {
  const { items: particulas, loading } = useParticulasCompletas();
  const [polaridadSel, setPolaridadSel] = useState<PolaridadClave | null>(null);
  const [particulaFocoId, setParticulaFocoId] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const out: Record<PolaridadClave, typeof particulas> = { positiva: [], neutra: [], negativa: [] };
    for (const p of particulas) {
      out[polaridadDeVector(p.vector_neto)].push(p);
    }
    return out;
  }, [particulas]);

  const ordenPolaridades: PolaridadClave[] = ["positiva", "neutra", "negativa"];
  const polaridadActiva = polaridadSel ?? (grupos.positiva.length > 0 ? "positiva" : ordenPolaridades.find((k) => grupos[k].length > 0) ?? null);
  const particulasActivas = polaridadActiva ? grupos[polaridadActiva] : [];
  const particulaFoco = particulasActivas.find((p) => p.id === particulaFocoId) ?? particulasActivas[0] ?? null;

  const traceSteps: TraceStep[] = [
    {
      id: "t-polaridad",
      levelLabel: "Polaridad",
      title: polaridadActiva ? POLARIDAD_LABEL[polaridadActiva] : null,
      subtitle: polaridadActiva ? `${particulasActivas.length} partícula(s)` : undefined,
    },
    { id: "t-tasi", levelLabel: "TASI (base)", title: "Fórmula A/T/S", subtitle: "3 letras por partícula" },
    {
      id: "t-particula",
      levelLabel: "Partícula",
      title: particulaFoco?.nombre ?? null,
      subtitle: particulaFoco ? `${particulaFoco.formula} · vector ${particulaFoco.vector_neto ?? 0}` : undefined,
    },
  ];

  return (
    <>
      {loading ? <LoadingRow /> : particulas.length === 0 ? <EmptyRow>No hay Partículas cargadas en Supabase todavía.</EmptyRow> : null}
      {!loading && particulas.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-2xl p-6">
            <div className="flex min-w-[820px] items-center gap-2">
              {/* Nivel 1: Polaridades — 3 nodos clickeables, seleccionan el
                  grupo activo (mismo patrón que el <select> de Elemento en
                  RamaAlquimia, pero como nodos del árbol). */}
              <div className="flex flex-col gap-2">
                {ordenPolaridades.map((k) => (
                  <FlowNode
                    key={k}
                    title={POLARIDAD_LABEL[k]}
                    subtitle={`${grupos[k].length} partícula(s)`}
                    tone="accent"
                    selected={polaridadActiva === k}
                    onClick={() => {
                      setPolaridadSel(k);
                      setParticulaFocoId(null);
                    }}
                  />
                ))}
              </div>
              <Arrow />
              <FlowNode title="TASI" subtitle={polaridadActiva ? POLARIDAD_DETALLE[polaridadActiva] : "A/T/S"} />
              <Arrow />
              {/* Nivel 3: Partículas reales del grupo activo — click abre su
                  gráfico A/T/S real y fija el foco del Trace. */}
              <div className="flex flex-wrap gap-2 max-w-[420px]">
                {particulasActivas.length === 0 ? (
                  <FlowNode title="Sin partículas" subtitle="ninguna en esta polaridad" />
                ) : (
                  particulasActivas.map((p) => (
                    <ParticulaFlowNode
                      key={p.id}
                      nombre={p.nombre}
                      formula={p.formula}
                      vectorNeto={p.vector_neto}
                      selected={particulaFoco?.id === p.id}
                      onFocus={() => setParticulaFocoId(p.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <TraceView steps={traceSteps} />
          </div>
        </>
      ) : null}
    </>
  );
}

// ─── Rama 5: Matriz de Polaridades — cuadrante T/A/S/I ─────────────────────
// Dato real: tabla "particulas_base" (4 filas, letras T/A/S/I) — el propio
// detalle de la fila "I" en Supabase la describe como "equilibrio que surge
// del choque A-T en vez de T-A", y la de "S" como "lo que surge del choque
// entre T y A": el sistema real es de 2 polos (T=impulso, A=inercia) cuyas
// 4 combinaciones ordenadas dan las 4 Partículas Base:
//   T+T → T (Tesis pura)      A+A → A (Antítesis pura)
//   T→A (choque T-A) → S      A→T (choque A-T) → I
// Se muestra como cuadrícula 2×2 (fila = primer polo, columna = segundo
// polo) en vez de la cadena lineal de las otras ramas, porque acá lo que
// importa es la posición relativa, no una jerarquía descendente. Click en
// un cuadrante abre el mismo popover con el nombre/detalle real de esa
// Partícula Base — sin gráfico A/T/S porque una Partícula Base es una
// letra suelta, no una fórmula de 3 (no aplica ParticulaVisual con
// múltiples tercios; se muestra su propio círculo de un color, igual que
// BasesItemCard en FisicaPage).

const MATRIZ_POLOS = ["T", "A"] as const;

/** Letra base resultante de combinar (filaPolo, colPolo) — mismo mapeo que
 *  describe fisica_conceptos / particulas_base.detalle en Supabase. */
function letraDeCuadrante(filaPolo: "T" | "A", colPolo: "T" | "A"): "T" | "A" | "S" | "I" {
  if (filaPolo === "T" && colPolo === "T") return "T";
  if (filaPolo === "A" && colPolo === "A") return "A";
  if (filaPolo === "T" && colPolo === "A") return "S";
  return "I"; // A → T
}

function MatrizCuadrante({
  filaPolo,
  colPolo,
  base,
  selected,
  onSelect,
}: {
  filaPolo: "T" | "A";
  colPolo: "T" | "A";
  base: FilaParticulaBase | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const letra = letraDeCuadrante(filaPolo, colPolo);
  const nodeRef = useRef<HTMLElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <button
        ref={nodeRef as any}
        type="button"
        onClick={() => {
          onSelect();
          setAnchor((actual) => (actual ? null : nodeRef.current));
        }}
        className={`flex flex-col items-center justify-center gap-1.5 aspect-square rounded-xl border px-3 py-3 transition-colors ${
          selected || anchor ? "border-primary/50" : "border-primary/10 hover:border-primary/30"
        }`}
      >
        <ParticulaVisual formula={letra} size={56} />
        <p className="text-xs font-black text-primary/80">{base?.nombre ?? letra}</p>
        <p className="text-[10px] text-primary/35">
          {filaPolo}
          {colPolo === "T" ? "→T" : "→A"}
        </p>
      </button>
      <PopoverFlotante anchor={anchor} onClose={() => setAnchor(null)} width={320} maxHeight={240}>
        <div className="flex flex-row gap-3">
          <div className="shrink-0 flex items-center justify-center w-[90px]">
            <ParticulaVisual formula={letra} size={90} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-wide text-primary">
              {base?.nombre ?? letra}
            </p>
            {base?.detalle ? (
              <p className="text-xs text-primary/70 leading-relaxed">{base.detalle}</p>
            ) : null}
            <p className="text-xs text-primary/40 leading-relaxed">
              Combinación: {filaPolo} + {colPolo}
            </p>
          </div>
        </div>
      </PopoverFlotante>
    </>
  );
}

function RamaMatriz() {
  const { items: basesRaw, loading } = useParticulasBase();
  const [letraFocoId, setLetraFocoId] = useState<string | null>(null);

  const basePorLetra = useMemo(() => {
    const out: Partial<Record<"T" | "A" | "S" | "I", FilaParticulaBase & { id: string }>> = {};
    for (const b of basesRaw) {
      out[b.letra] = { ...particulaBaseAFilaCatalogo(b), letra: b.letra, id: b.id } as any;
    }
    return out;
  }, [basesRaw]);

  const letraFoco = useMemo(() => {
    const b = basesRaw.find((x) => x.id === letraFocoId);
    return b ? particulaBaseAFilaCatalogo(b) : null;
  }, [basesRaw, letraFocoId]);

  const traceSteps: TraceStep[] = [
    { id: "t-polo1", levelLabel: "Primer polo", title: "T (impulso) / A (inercia)" },
    { id: "t-polo2", levelLabel: "Segundo polo", title: "T (impulso) / A (inercia)" },
    {
      id: "t-base",
      levelLabel: "Partícula Base",
      title: letraFoco?.nombre ?? null,
      subtitle: letraFoco?.detalle ?? undefined,
    },
  ];

  return (
    <>
      {loading ? <LoadingRow /> : basesRaw.length === 0 ? <EmptyRow>No hay Partículas Base cargadas en Supabase todavía.</EmptyRow> : null}
      {!loading && basesRaw.length > 0 ? (
        <>
          <div className="flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-3">
              {/* Rótulo de columnas */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-6" />
                {MATRIZ_POLOS.map((c) => (
                  <div key={c} className="flex h-[92px] w-6 items-center justify-center text-[10px] font-black text-primary/40">
                    {c}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 pl-0">
                  {MATRIZ_POLOS.map((c) => (
                    <div key={c} className="flex w-[92px] items-center justify-center text-[10px] font-black text-primary/40">
                      segundo polo: {c}
                    </div>
                  ))}
                </div>
                {MATRIZ_POLOS.map((filaPolo) => (
                  <div key={filaPolo} className="flex gap-2">
                    {MATRIZ_POLOS.map((colPolo) => {
                      const letra = letraDeCuadrante(filaPolo, colPolo);
                      const base = basePorLetra[letra] ?? null;
                      return (
                        <div key={colPolo} className="w-[92px]">
                          <MatrizCuadrante
                            filaPolo={filaPolo}
                            colPolo={colPolo}
                            base={base as any}
                            selected={letraFoco?.letra === letra}
                            onSelect={() => {
                              const row = basesRaw.find((b) => b.letra === letra);
                              setLetraFocoId(row?.id ?? null);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <p className="max-w-xs text-xs leading-relaxed text-primary/40">
              Filas y columnas son el mismo par de polos (T = impulso, A = inercia). La diagonal
              (T+T, A+A) da las Partículas Base puras; las 2 combinaciones cruzadas dan S
              (choque T→A) e I (choque A→T) — el equilibrio inverso.
            </p>
          </div>

          <div className="mt-6">
            <TraceView steps={traceSteps} />
          </div>
        </>
      ) : null}
    </>
  );
}

// ─── Rama 6: Radar de Elemento — comparación de hasta 2 elementos ──────────
// Dato real: 5 columnas ya calculadas por el trigger de Supabase en
// "elementos" (masa_base, dinamismo_particular, estabilidad,
// capacidad_enlace, polaridad_estructural) — mismo origen que
// useElementos() usa en el resto del código (RamaAlquimia arriba). No hay
// tabla ni columna nueva: se normaliza cada una a 0–1 sobre el rango real
// observado en el catálogo completo (67 elementos al momento de escribir
// esto) para poder dibujarlas en el mismo radar — estabilidad,
// capacidad_enlace y polaridad_estructural ya viven en 0–1 en Supabase;
// masa_base y dinamismo_particular no tienen techo conceptual fijo, así
// que se normalizan min–max sobre el catálogo cargado (mismo criterio que
// "no inventar una proporción falsa" documentado en FilaStatCards de
// VisualizadorPage.tsx, pero acá SÍ hace falta 0–1 porque el radar es
// comparativo entre elementos, no un número aislado).
//
// El polígono en sí reusa el cálculo geométrico de RadarPerfilReactivo
// (@deprecated en VisualizadorPage.tsx) — ejes, anillos y proyección
// punto-en-eje idénticos — extendido para dibujar 1 o 2 series superpuestas
// en vez de una sola, ya que el pedido es comparar 2 Elementos.

const RADAR_EJES = [
  { clave: "masa_base", label: "Masa" },
  { clave: "dinamismo_particular", label: "Dinamismo" },
  { clave: "estabilidad", label: "Estabilidad" },
  { clave: "capacidad_enlace", label: "Enlace" },
  { clave: "polaridad_estructural", label: "Polaridad" },
] as const;

type RadarEjeClave = (typeof RADAR_EJES)[number]["clave"];

/** Colores de serie — mismo criterio sepia del resto de Física (tonos, no
 *  matices), pero acá se necesitan 2 series distinguibles a la vez: se usa
 *  el tono claro para la primera y el oscuro para la segunda, coherente con
 *  LETRA_COLOR (A claro / S oscuro) sin introducir una paleta nueva. */
const RADAR_SERIE_COLOR = [
  { stroke: "#c9a06a", fill: "color-mix(in srgb, #c9a06a 18%, transparent)", punto: "#c9a06a" },
  { stroke: "#4e3320", fill: "color-mix(in srgb, #4e3320 18%, transparent)", punto: "#4e3320" },
];

/** Min/max real de cada eje sobre el catálogo cargado — usado para
 *  normalizar masa_base y dinamismo_particular (sin techo fijo). Las 3
 *  columnas ya 0–1 (estabilidad/capacidad_enlace/polaridad_estructural) se
 *  clampan igual por seguridad ante datos fuera de rango. */
function rangosRadar(elementos: Elemento[]): Record<RadarEjeClave, { min: number; max: number }> {
  const out = {} as Record<RadarEjeClave, { min: number; max: number }>;
  for (const eje of RADAR_EJES) {
    const valores = elementos
      .map((e) => e[eje.clave])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const min = valores.length > 0 ? Math.min(...valores) : 0;
    const max = valores.length > 0 ? Math.max(...valores) : 1;
    out[eje.clave] = { min, max: max > min ? max : min + 1 };
  }
  return out;
}

function normalizarValorRadar(valor: number | null | undefined, rango: { min: number; max: number }): number {
  if (valor == null || !Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(1, (valor - rango.min) / (rango.max - rango.min)));
}

/** Radar multi-serie: mismo cálculo geométrico que RadarPerfilReactivo
 *  (VisualizadorPage.tsx) — ejes/anillos/proyección punto-en-eje — pero
 *  acepta 1 o 2 series superpuestas con relleno translúcido para comparar
 *  dos Elementos de un vistazo. */
function RadarElementos({
  series,
}: {
  series: { nombre: string; color: (typeof RADAR_SERIE_COLOR)[number]; valores: number[] }[];
}) {
  const cx = 300;
  const cy = 240;
  const R = 150;
  const n = RADAR_EJES.length;

  const puntoEnEje = (i: number, frac: number) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(a) * R * frac, y: cy + Math.sin(a) * R * frac };
  };

  const anillos = [0.25, 0.5, 0.75, 1].map((frac) =>
    Array.from({ length: n }, (_, i) => puntoEnEje(i, frac))
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" "),
  );

  const ejes = Array.from({ length: n }, (_, i) => puntoEnEje(i, 1));

  const etiquetas = RADAR_EJES.map((eje, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    const ca = Math.cos(a);
    const lx = cx + ca * (R + 42);
    const ly = cy + Math.sin(a) * (R + 42);
    const anchor: "start" | "middle" | "end" = Math.abs(ca) < 0.3 ? "middle" : ca > 0 ? "start" : "end";
    return { ...eje, lx, ly, anchor };
  });

  const maxLy = Math.max(...etiquetas.map((e) => e.ly)) + 16;
  const minLy = Math.min(...etiquetas.map((e) => e.ly)) - 16;
  const viewH = Math.max(maxLy, cy + R + 16) - Math.min(0, minLy);

  return (
    <svg width="100%" viewBox={`0 0 600 ${Math.ceil(viewH)}`} role="img" className="text-primary">
      <title>Radar comparativo de Elementos</title>
      <desc>
        {series
          .map((s) => `${s.nombre}: ${RADAR_EJES.map((e, i) => `${e.label} ${s.valores[i].toFixed(2)}`).join(", ")}`)
          .join(" · ")}
      </desc>
      {anillos.map((pts, idx) => (
        <polygon key={idx} points={pts} fill="none" className="stroke-primary/15" strokeWidth="0.5" />
      ))}
      {ejes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="stroke-primary/15" strokeWidth="0.5" />
      ))}
      {series.map((s, si) => {
        const puntos = s.valores.map((v, i) => puntoEnEje(i, Math.max(0, Math.min(1, v))));
        const poligono = puntos.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        return (
          <g key={si}>
            <polygon points={poligono} style={{ fill: s.color.fill, stroke: s.color.stroke }} strokeWidth="1.5" />
            {puntos.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" style={{ fill: s.color.punto }} />
            ))}
          </g>
        );
      })}
      {etiquetas.map((e, i) => (
        <text
          key={i}
          x={e.lx}
          y={e.ly}
          textAnchor={e.anchor}
          dominantBaseline="central"
          fontSize="13"
          fontWeight={700}
          className="fill-primary/70"
        >
          {e.label}
        </text>
      ))}
    </svg>
  );
}

function RamaRadar() {
  const { items: elementos, loading } = useElementos();
  const [elementoAId, setElementoAId] = useState<string | null>(null);
  const [elementoBId, setElementoBId] = useState<string | null>(null);

  const rangos = useMemo(() => rangosRadar(elementos), [elementos]);

  const elementoA = useMemo(
    () => (elementoAId ? elementos.find((e) => e.id === elementoAId) ?? null : elementos[0] ?? null),
    [elementos, elementoAId],
  );
  const elementoB = useMemo(
    () => (elementoBId ? elementos.find((e) => e.id === elementoBId) ?? null : null),
    [elementos, elementoBId],
  );

  function valoresDe(el: Elemento): number[] {
    return RADAR_EJES.map((eje) => normalizarValorRadar(el[eje.clave], rangos[eje.clave]));
  }

  const series = useMemo(() => {
    const out: { nombre: string; color: (typeof RADAR_SERIE_COLOR)[number]; valores: number[] }[] = [];
    if (elementoA) out.push({ nombre: `${elementoA.simbolo} · ${elementoA.nombre}`, color: RADAR_SERIE_COLOR[0], valores: valoresDe(elementoA) });
    if (elementoB) out.push({ nombre: `${elementoB.simbolo} · ${elementoB.nombre}`, color: RADAR_SERIE_COLOR[1], valores: valoresDe(elementoB) });
    return out;
  }, [elementoA, elementoB, rangos]);

  return (
    <>
      {loading ? <LoadingRow /> : elementos.length === 0 ? <EmptyRow>No hay Elementos cargados en Supabase todavía.</EmptyRow> : null}
      {!loading && elementos.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={elementoA?.id ?? ""}
              onChange={(e) => setElementoAId(e.target.value || null)}
              className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
            >
              {elementos.map((el) => (
                <option key={el.id} value={el.id} className="bg-[var(--bg-main)] text-primary">
                  {el.simbolo} · {el.nombre}
                </option>
              ))}
            </select>

            <span className="text-[10px] font-black uppercase tracking-wide text-primary/30">vs</span>

            <select
              value={elementoB?.id ?? ""}
              onChange={(e) => setElementoBId(e.target.value || null)}
              className="rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
            >
              <option value="" className="bg-[var(--bg-main)] text-primary">
                (sin comparar)
              </option>
              {elementos
                .filter((el) => el.id !== elementoA?.id)
                .map((el) => (
                  <option key={el.id} value={el.id} className="bg-[var(--bg-main)] text-primary">
                    {el.simbolo} · {el.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div className="mt-5 flex flex-wrap items-start gap-6 rounded-2xl p-6">
            <div className="min-w-[300px] flex-1">
              <RadarElementos series={series} />
            </div>

            <div className="flex flex-col gap-3">
              {series.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color.punto }}
                  />
                  <p className="text-xs font-black text-primary/80">{s.nombre}</p>
                </div>
              ))}
              <div className="mt-1 flex flex-col gap-1">
                {RADAR_EJES.map((eje, i) => (
                  <p key={eje.clave} className="text-[11px] text-primary/40">
                    {eje.label}:{" "}
                    {series.map((s) => s.valores[i].toFixed(2)).join(" · ")}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

// ─── Rama 7: "¿Por qué es estable?" — desglose causal de un Compuesto ──────
// Dato real: tabla auxiliar "compuesto_estabilidad" (useCompuestoEstabilidad,
// ya usada por CompuestosPage.tsx para su tarjeta "Análisis estructural") —
// no todos los Compuestos tienen esta fila (77/90 al momento del comentario
// original del hook). El propio jsonb "validacion" de "compuestos" trae la
// fórmula literal aplicada por el trigger de Supabase:
//   estabilidad_v6_formula = "S=0.50K+0.40Q-0.10T-0.05C"
// K = calidad_enlaces, Q = compatibilidad, T = tension, C =
// complejidad_estructural — mismas 4 columnas de compuesto_estabilidad,
// mismo orden y mismos coeficientes que ya interpreta
// propiedadesDeEstabilidadDetalle() en CompuestosPage.tsx (grupo "Análisis
// estructural"). Acá se muestra como medidor causal: barra total de
// Estabilidad arriba, y abajo una barra por factor con su aporte real
// (coeficiente × valor, con signo) en vez de solo su valor crudo — así se ve
// qué EMPUJA y qué RESTA, no solo la lista de números.

const ESTABILIDAD_FACTORES: {
  clave: keyof Pick<CompuestoEstabilidadRow, "calidad_enlaces" | "compatibilidad" | "tension" | "complejidad_estructural">;
  letra: string;
  label: string;
  coeficiente: number;
  descripcion: string;
}[] = [
  { clave: "calidad_enlaces", letra: "K", label: "Calidad de enlaces", coeficiente: 0.5, descripcion: "Qué tan buenos (compatibles y estables) son los enlaces formados." },
  { clave: "compatibilidad", letra: "Q", label: "Compatibilidad", coeficiente: 0.4, descripcion: "Qué tan bien encajan entre sí los componentes que lo forman." },
  { clave: "tension", letra: "T", label: "Tensión", coeficiente: -0.1, descripcion: "Cuánto desbalance/estrés hay entre los enlaces del compuesto." },
  { clave: "complejidad_estructural", letra: "C", label: "Complejidad estructural", coeficiente: -0.05, descripcion: "Qué tan compleja es la estructura de enlaces del compuesto." },
];

function BarraCausal({
  label,
  letra,
  valor,
  aporte,
  positivo,
}: {
  label: string;
  letra: string;
  valor: number | null;
  aporte: number | null;
  positivo: boolean;
}) {
  const pct = valor == null ? 0 : Math.max(0, Math.min(1, valor)) * 100;
  const color = positivo ? "#c9a06a" : "#4e3320";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-black text-primary/75">
          <span className="mr-1.5 text-primary/35">{letra}</span>
          {label}
        </p>
        <p className="text-[11px] font-bold text-primary/40">
          {valor == null ? "—" : valor.toFixed(3)}
          {aporte != null ? (
            <span className="ml-1.5" style={{ color }}>
              {aporte >= 0 ? "+" : ""}
              {aporte.toFixed(3)}
            </span>
          ) : null}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function RamaCausal() {
  const { items: compuestos, loading: loadingCompuestos } = useCompuestosConElementos();
  const [compuestoId, setCompuestoId] = useState<string | null>(null);

  const compuesto = useMemo(
    () => (compuestoId ? compuestos.find((c) => c.id === compuestoId) ?? null : compuestos[0] ?? null),
    [compuestos, compuestoId],
  );

  const { item: detalle, loading: loadingDetalle } = useCompuestoEstabilidad(compuesto?.id ?? null);

  const aportes = useMemo(() => {
    if (!detalle) return null;
    return ESTABILIDAD_FACTORES.map((f) => {
      const valor = detalle[f.clave];
      const aporte = valor == null ? null : f.coeficiente * valor;
      return { ...f, valor, aporte };
    });
  }, [detalle]);

  const estabilidadTotal = compuesto?.estabilidad ?? null;

  return (
    <>
      {loadingCompuestos ? <LoadingRow /> : compuestos.length === 0 ? <EmptyRow>No hay Compuestos cargados en Supabase todavía.</EmptyRow> : null}
      {!loadingCompuestos && compuestos.length > 0 ? (
        <>
          <select
            value={compuesto?.id ?? ""}
            onChange={(e) => setCompuestoId(e.target.value || null)}
            className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
          >
            {compuestos.map((c) => (
              <option key={c.id} value={c.id} className="bg-[var(--bg-main)] text-primary">
                {c.nombre}
              </option>
            ))}
          </select>

          <div className="mt-5 rounded-2xl p-6">
            <div className="mb-1 flex items-baseline justify-between">
              <p className="text-sm font-black text-primary/85">Estabilidad</p>
              <p className="text-lg font-black text-primary/90">
                {estabilidadTotal == null ? "—" : estabilidadTotal.toFixed(3)}
              </p>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-primary/[0.06]">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${estabilidadTotal == null ? 0 : Math.max(0, Math.min(1, estabilidadTotal)) * 100}%` }}
              />
            </div>

            {loadingDetalle ? (
              <div className="mt-5">
                <LoadingRow />
              </div>
            ) : !detalle ? (
              <div className="mt-5">
                <EmptyRow>
                  Este Compuesto todavía no tiene fila de análisis estructural
                  (tabla "compuesto_estabilidad") — no todos los Compuestos la
                  tienen calculada.
                </EmptyRow>
              </div>
            ) : (
              <>
                <p className="mb-3 mt-6 text-[10px] font-black uppercase tracking-wide text-primary/35">
                  S = 0.50·K + 0.40·Q − 0.10·T − 0.05·C
                </p>
                <div className="flex flex-col gap-4">
                  {aportes?.map((f) => (
                    <BarraCausal
                      key={f.clave}
                      label={f.label}
                      letra={f.letra}
                      valor={f.valor}
                      aporte={f.aporte}
                      positivo={f.coeficiente > 0}
                    />
                  ))}
                </div>
                {detalle.clasificacion ? (
                  <p className="mt-5 text-xs leading-relaxed text-primary/40">
                    Clasificación: <span className="font-bold text-primary/60">{detalle.clasificacion}</span>
                    {detalle.confianza != null ? ` · confianza ${detalle.confianza.toFixed(2)}` : ""}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

export function MapaUniversalSection() {
  const [rama, setRama] = useState<RamaCanonica>("fisica");
  const fisicaRoute = useFisicaRoute();

  return (
    <>
      <RamaSelector active={rama} onSelect={setRama} />

      <div className="mt-6">
        {rama === "fisica" ? <RamaFisica route={fisicaRoute} /> : null}
        {rama === "alquimia" ? <RamaAlquimia /> : null}
        {rama === "libres" ? <RamaLibres /> : null}
        {rama === "polaridades" ? <RamaPolaridades /> : null}
        {rama === "matriz" ? <RamaMatriz /> : null}
        {rama === "radar" ? <RamaRadar /> : null}
        {rama === "causal" ? <RamaCausal /> : null}
      </div>
    </>
  );
}
