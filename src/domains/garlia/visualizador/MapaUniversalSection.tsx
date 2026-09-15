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
import type { Compuesto, Elemento } from "@/domains/garlia/elementos/types";
import { ElementoPanelFlotante } from "@/domains/garlia/elementos/ElementosPage";
import { CompuestoPanelFlotante } from "@/domains/garlia/elementos/CompuestosPage";
import { PopoverFlotante } from "@/domains/garlia/_shared/PopoverFlotante";
import { IumVisual, ParticulaVisual, LETRA_COLOR, type LetraATS } from "@/domains/garlia/fisica/ParticulaVisual";
import { particulasDeIum, particulaBaseAFilaCatalogo, type FilaParticulaBase } from "@/domains/garlia/fisica/types";
import { useParticulasBase } from "@/domains/garlia/fisica/useFisica";

import { useFisicaRoute } from "./routes/useFisicaRoute";
import { useAlquimiaRoute } from "./routes/useAlquimiaRoute";
import { useParticulasCompletas } from "./useVisualizadorData";

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
type RamaCanonica = "fisica" | "alquimia" | "libres" | "polaridades" | "matriz" | "arbol";

const RAMAS: { key: RamaCanonica; label: string }[] = [
  { key: "fisica", label: "Polaridades → TASI → IUM → Oris" },
  { key: "alquimia", label: "Polaridades → TASI → Capas → Elemento" },
  { key: "libres", label: "Polaridades → TASI libres → Garin/Éterium" },
  { key: "polaridades", label: "Polaridades → TASI → Partículas" },
  { key: "matriz", label: "Matriz de Polaridades (+/−)" },
  { key: "arbol", label: "Árbol de Partículas" },
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
            <div className="flex min-w-[840px] items-center gap-2">
              <FlowNode title="Polaridades" subtitle="+ / −" />
              <Arrow />
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
            <div className="flex min-w-[940px] items-center gap-2">
              <FlowNode title="Polaridades" subtitle="+ / −" />
              <Arrow />
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
        <FlowNode title="Polaridades" subtitle="+ / −" />
        <Arrow />
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
        </>
      ) : null}
    </>
  );
}

// ─── Rama 5: Matriz de Polaridades — cuadrante +/− → T/A/S/I ───────────────
// Dato real: tabla "particulas_base" (4 filas, letras T/A/S/I) — el propio
// detalle de la fila "I" en Supabase la describe como "equilibrio que surge
// del choque A-T en vez de T-A", y la de "S" como "lo que surge del choque
// entre T y A": el sistema real es de 2 polos cuyas 4 combinaciones
// ordenadas dan las 4 Partículas Base. Los 2 polos base son + (movimiento/
// impulso) y − (oposición, resistencia, o nada) — T/A en Supabase son la
// letra RESULTANTE de cada polo puro, no el polo en sí (T = Tesis =
// "impulso, voluntad, lo que empuja" = manifestación de +; A = Antítesis =
// "inercia, resistencia, lo que limita" = manifestación de −). La matriz
// se pinta con los polos +/− (lo que el usuario mueve/elige) y cada
// cuadrante resuelve a su letra T/A/S/I real:
//   + + → T (Tesis: + puro)          − − → A (Antítesis: − puro)
//   + → − (choque +/−) → S           − → + (choque −/+) → I
// Se muestra como cuadrícula 2×2 (fila = primer polo, columna = segundo
// polo) en vez de la cadena lineal de las otras ramas, porque acá lo que
// importa es la posición relativa, no una jerarquía descendente. Click en
// un cuadrante abre el mismo popover con el nombre/detalle real de esa
// Partícula Base — sin gráfico A/T/S porque una Partícula Base es una
// letra suelta, no una fórmula de 3 (no aplica ParticulaVisual con
// múltiples tercios; se muestra su propio círculo de un color, igual que
// BasesItemCard en FisicaPage).

type PoloBase = "+" | "-";

const MATRIZ_POLOS: PoloBase[] = ["+", "-"];

const POLO_LABEL: Record<PoloBase, string> = {
  "+": "+ (movimiento)",
  "-": "− (oposición / resistencia / nada)",
};

/** + se manifiesta como T (Tesis: impulso/voluntad), − como A (Antítesis:
 *  inercia/resistencia) — mismo mapeo que describe particulas_base.detalle
 *  en Supabase. */
function letraDePolo(polo: PoloBase): "T" | "A" {
  return polo === "+" ? "T" : "A";
}

/** Letra base resultante de combinar (filaPolo, colPolo). */
function letraDeCuadrante(filaPolo: PoloBase, colPolo: PoloBase): "T" | "A" | "S" | "I" {
  const a = letraDePolo(filaPolo);
  const b = letraDePolo(colPolo);
  if (a === "T" && b === "T") return "T";
  if (a === "A" && b === "A") return "A";
  if (a === "T" && b === "A") return "S";
  return "I"; // A → T
}

function MatrizCuadrante({
  filaPolo,
  colPolo,
  base,
  selected,
  onSelect,
}: {
  filaPolo: PoloBase;
  colPolo: PoloBase;
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
          {colPolo}
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
              Combinación de polos: {filaPolo} {colPolo} (letra {letra})
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
              Filas y columnas son el mismo par de polos: <span className="font-bold text-primary/60">+</span> (movimiento) y{" "}
              <span className="font-bold text-primary/60">−</span> (oposición, resistencia o nada). La diagonal (++, −−) da
              las Partículas Base puras (Tesis/Antítesis); las 2 combinaciones cruzadas dan Síntesis (choque +→−) e I
              (choque −→+, el equilibrio inverso).
            </p>
          </div>
        </>
      ) : null}
    </>
  );
}

// ─── Rama 8: Árbol de Partículas — árbol + red, no jerarquía estricta ──────
// Dato real: "particulas.formula" (27 filas, ya usadas en toda la app vía
// useParticulasCompletas/useParticulas) — cada Partícula tiene una fórmula
// real de 3 letras A/T/S/I. Se agrupa cada una bajo su PRIMERA letra (dato
// real de la fórmula, no una jerarquía inventada) como 4 "raíces" T/A/S/I,
// mismas 4 Partículas Base que arma RamaMatriz arriba. Pero una Partícula
// como "TST" (Transición) no es solo "hija de T": comparte letras con las
// otras 3 raíces también — así que además de la línea a su raíz principal
// (árbol), se dibujan líneas finas hacia las OTRAS raíces cuya letra
// también aparece en su fórmula (red), con opacidad según cuántas letras
// comparte. Esto es exactamente lo que pedía el documento ("TST no debería
// sentirse simplemente como hija de T"): la fórmula real ya trae ese dato,
// no hace falta inventar afinidades.

const ARBOL_LETRAS: LetraATS[] = ["T", "A", "S", "I"];

/** Cuenta cuántas veces aparece cada letra de ARBOL_LETRAS en una fórmula
 *  de 3 caracteres — usado tanto para la raíz principal (primera letra)
 *  como para las conexiones secundarias (letras que también aparecen). */
function letrasEnFormula(formula: string): Record<LetraATS, number> {
  const out: Record<LetraATS, number> = { A: 0, T: 0, S: 0, I: 0 };
  for (const c of formula.toUpperCase()) {
    if (c === "A" || c === "T" || c === "S" || c === "I") out[c as LetraATS] += 1;
  }
  return out;
}

function RamaArbol() {
  const { items: particulas, loading } = useParticulasCompletas();
  const [particulaFocoId, setParticulaFocoId] = useState<string | null>(null);

  const cx = 300;
  const cy = 230;
  const rRaiz = 60;
  const rHoja = 190;

  const posRaiz: Record<LetraATS, { x: number; y: number }> = useMemo(() => {
    const out = {} as Record<LetraATS, { x: number; y: number }>;
    ARBOL_LETRAS.forEach((l, i) => {
      const a = (2 * Math.PI * i) / 4 - Math.PI / 2;
      out[l] = { x: cx + Math.cos(a) * rRaiz, y: cy + Math.sin(a) * rRaiz };
    });
    return out;
  }, []);

  // Hojas agrupadas por raíz principal (primera letra de su fórmula),
  // distribuidas en un arco propio alrededor de esa raíz — no en un único
  // círculo global, para que se lea "racimo por raíz" en vez de "anillo
  // parejo". Dato real: primera letra de particulas.formula.
  const hojasPorRaiz = useMemo(() => {
    const out: Record<LetraATS, typeof particulas> = { T: [], A: [], S: [], I: [] };
    for (const p of particulas) {
      const primera = p.formula?.[0]?.toUpperCase();
      if (primera === "A" || primera === "T" || primera === "S" || primera === "I") {
        out[primera].push(p);
      }
    }
    return out;
  }, [particulas]);

  const posHoja = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    ARBOL_LETRAS.forEach((raiz, ri) => {
      const grupo = hojasPorRaiz[raiz];
      const anguloBase = (2 * Math.PI * ri) / 4 - Math.PI / 2;
      const arco = (Math.PI * 2) / 4 - 0.35; // deja aire entre racimos
      grupo.forEach((p, i) => {
        const t = grupo.length > 1 ? i / (grupo.length - 1) - 0.5 : 0;
        const a = anguloBase + t * arco;
        out[p.id] = { x: cx + Math.cos(a) * rHoja, y: cy + Math.sin(a) * rHoja };
      });
    });
    return out;
  }, [hojasPorRaiz]);

  const particulaFoco = particulas.find((p) => p.id === particulaFocoId) ?? null;

  return (
    <>
      {loading ? <LoadingRow /> : particulas.length === 0 ? <EmptyRow>No hay Partículas cargadas en Supabase todavía.</EmptyRow> : null}
      {!loading && particulas.length > 0 ? (
        <>
          <p className="mb-3 text-xs leading-relaxed text-primary/40">
            Cada Partícula cuelga (línea gruesa) de la raíz de su primera letra. Las líneas finas
            hacia las otras raíces muestran las demás letras que también aparecen en su fórmula —
            una Partícula como Transición (TST) no es solo "hija de T": también carga S.
          </p>
          <div className="overflow-x-auto rounded-2xl p-4">
            <svg width="100%" viewBox="0 0 600 460" className="min-w-[560px]">
              {/* Red: líneas finas de cada hoja hacia raíces secundarias
                  (letras de su fórmula distintas de la raíz principal). */}
              {particulas.map((p) => {
                const pos = posHoja[p.id];
                if (!pos) return null;
                const primera = p.formula?.[0]?.toUpperCase() as LetraATS;
                const conteo = letrasEnFormula(p.formula ?? "");
                return ARBOL_LETRAS.filter((l) => l !== primera && conteo[l] > 0).map((l) => (
                  <line
                    key={`${p.id}-${l}`}
                    x1={pos.x}
                    y1={pos.y}
                    x2={posRaiz[l].x}
                    y2={posRaiz[l].y}
                    className="stroke-primary/10"
                    strokeWidth={0.75}
                  />
                ));
              })}

              {/* Árbol: línea gruesa de cada hoja a su raíz principal. */}
              {particulas.map((p) => {
                const pos = posHoja[p.id];
                if (!pos) return null;
                const primera = p.formula?.[0]?.toUpperCase() as LetraATS;
                return (
                  <line
                    key={`tronco-${p.id}`}
                    x1={pos.x}
                    y1={pos.y}
                    x2={posRaiz[primera].x}
                    y2={posRaiz[primera].y}
                    className="stroke-primary/25"
                    strokeWidth={1.25}
                  />
                );
              })}

              {/* Hojas: 27 Partículas reales, clickeables. */}
              {particulas.map((p) => {
                const pos = posHoja[p.id];
                if (!pos) return null;
                return (
                  <g
                    key={p.id}
                    transform={`translate(${pos.x - 15}, ${pos.y - 15})`}
                    onClick={() => setParticulaFocoId(p.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <foreignObject x={0} y={0} width={30} height={30}>
                      <ParticulaVisual formula={p.formula} size={30} />
                    </foreignObject>
                    <title>{`${p.nombre} (${p.formula})`}</title>
                  </g>
                );
              })}

              {/* Raíces: las 4 letras base, en el centro. */}
              {ARBOL_LETRAS.map((l) => {
                const pos = posRaiz[l];
                const color = LETRA_COLOR[l];
                return (
                  <g key={l} transform={`translate(${pos.x - 22}, ${pos.y - 22})`}>
                    <circle
                      cx={22}
                      cy={22}
                      r={22}
                      strokeWidth={1.5}
                      style={{ fill: color.bg, stroke: color.border }}
                    />
                    <text
                      x={22}
                      y={22}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={18}
                      fontWeight={900}
                      style={{ fill: color.fg }}
                    >
                      {l}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {particulaFoco ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/10 p-4">
              <ParticulaVisual formula={particulaFoco.formula} size={64} />
              <div>
                <p className="text-sm font-black text-primary/85">{particulaFoco.nombre}</p>
                <p className="text-xs text-primary/45">Fórmula {particulaFoco.formula}</p>
              </div>
            </div>
          ) : null}
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
        {rama === "arbol" ? <RamaArbol /> : null}
      </div>
    </>
  );
}
