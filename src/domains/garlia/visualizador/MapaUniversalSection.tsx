"use client";

/**
 * MapaUniversalSection.tsx — VIS-15 "Mapa Universal".
 * ───────────────────────────────────────────────────────────────────────────
 * Vista de Atlas que NO reemplaza a Física/Alquimia/Química/Biología: las
 * conecta en un solo árbol navegable, mostrando las 4 ramas del flujo
 * canónico tal como ya existen en los hooks de ruta reales — cero cálculo
 * nuevo acá.
 *
 *   Rama 1 (Física):    TASI → IUM → Oris
 *   Rama 2 (Alquimia):  TASI → Elemento → Compuesto → Material → Estructura
 *   Rama 3 (Energías):  Polos (+/−) → S/I → Garin/Éterium
 *   Rama 4 (Biología):  Célula → Tejido → Órgano → Sistema → Organismo →
 *                       Criatura (techo de la cadena biológica real en
 *                       Supabase; criatura_organismos está vacía al
 *                       2026-09-14, así que el último tramo hoy no
 *                       muestra datos — no es un bug de este archivo).
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
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";

import { useElementos } from "@/domains/garlia/elementos/useElementos";
import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useEstructuras } from "@/domains/garlia/elementos/useEstructuras";
import type { Compuesto, Elemento } from "@/domains/garlia/elementos/types";
import { ElementoPanelFlotante } from "@/domains/garlia/elementos/ElementosPage";
import { CompuestoPanelFlotante } from "@/domains/garlia/elementos/CompuestosPage";
import { PopoverFlotante } from "@/domains/garlia/_shared/PopoverFlotante";
import { IumVisual, LETRA_COLOR, type LetraATS } from "@/domains/garlia/fisica/ParticulaVisual";
import { particulasDeIum } from "@/domains/garlia/fisica/types";

import { useMaterialesDeCompuesto } from "@/domains/garlia/materiales/useMaterialesDeCompuesto";
import { useMaterialEstructuras } from "@/domains/garlia/materiales/useMaterialEstructuras";

import { useCelulas } from "@/domains/garlia/elementos/useCelulas";
import { useTejidosDeUnaCelula } from "@/domains/garlia/elementos/useTejidosDeUnaCelula";
import { useOrganosDeUnTejido } from "@/domains/garlia/elementos/useOrganosDeUnTejido";
import { useSistemasDeUnOrgano } from "@/domains/garlia/elementos/useSistemasDeUnOrgano";
import { useOrganismosDeUnSistema } from "@/domains/garlia/elementos/useOrganismosDeUnSistema";
import { useCriaturasDeUnOrganismo } from "@/domains/garlia/elementos/useCriaturasDeUnOrganismo";

import { useFisicaRoute } from "./routes/useFisicaRoute";
import { useAlquimiaRoute } from "./routes/useAlquimiaRoute";

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

/** Círculo pequeño para un polo (+/−) — mismo lenguaje visual (borde +
 *  relleno tenue) que ParticulaVisual, pero sin letra A/T/S adentro:
 *  el signo es el contenido. */
function PoloCirculo({ signo }: { signo: "+" | "-" }) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-xl font-black"
      style={{
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)",
        color: "var(--primary)",
      }}
    >
      {signo}
    </div>
  );
}

/** Círculo pequeño para una letra T/A/S/I — reusa LETRA_COLOR (misma
 *  paleta sepia que ParticulaVisual/IumVisual) para que se lea como la
 *  misma familia visual que el resto de Física. */
function LetraCirculo({ letra }: { letra: LetraATS }) {
  const color = LETRA_COLOR[letra];
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black"
      style={{ background: color.bg, borderColor: color.border, color: color.fg }}
    >
      {letra}
    </div>
  );
}

/**
 * Arranque común de las 3 ramas: en vez de dos FlowNode rectangulares
 * ("Polaridades" y "Partículas" como texto), esto dibuja el par de polos
 * (+)/(−) a la izquierda y, a partir de ahí, las 4 letras T/A/S/I en sus
 * propios círculos — mismo lenguaje visual que ParticulaVisual/IumVisual
 * (círculos con LETRA_COLOR) en vez de cajas de texto. De ahí en más
 * sigue el flujo normal de FlowNode/Arrow de cada rama.
 */
function PolaridadTasiArranque() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-2">
        <PoloCirculo signo="+" />
        <PoloCirculo signo="-" />
      </div>
      <Arrow />
      <div className="grid grid-cols-2 gap-2">
        <LetraCirculo letra="T" />
        <LetraCirculo letra="A" />
        <LetraCirculo letra="S" />
        <LetraCirculo letra="I" />
      </div>
    </div>
  );
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

/** Slot de la columna derecha — las ramas declaran su dropdown propio
 *  (Oris, Elemento, …) donde les queda natural en el JSX, y este portal lo
 *  teletransporta a la barra lateral. Así cada rama sigue siendo dueña de
 *  su estado y no hace falta subirlo a MapaUniversalSection. Si no hay
 *  slot montado (render aislado en tests), cae al render in-place. */
const SelectorSlotContext = React.createContext<HTMLElement | null>(null);

function SelectorSlot({ label, children }: { label: string; children: React.ReactNode }) {
  const slot = React.useContext(SelectorSlotContext);
  const contenido = (
    <div>
      <span className="flex w-full items-center justify-between gap-2 py-2 text-left text-[10px] font-black uppercase tracking-widest text-primary/30">
        {label}
      </span>
      <div className="mb-2 pl-1">{children}</div>
    </div>
  );
  if (!slot) return contenido;
  return createPortal(contenido, slot);
}

/** Las 4 ramas del flujo canónico — nombre + resumen corto, mostrado como
 *  selector arriba del árbol activo. */
type RamaCanonica = "fisica" | "alquimia" | "libres" | "biologia";

const RAMAS: { key: RamaCanonica; label: string }[] = [
  { key: "fisica", label: "Oris" },
  { key: "alquimia", label: "Materiales" },
  { key: "libres", label: "Energías" },
  { key: "biologia", label: "Biología" },
];

// Mismo lenguaje visual que la sidebar real de VisualizadorPage (navGroups):
// label de grupo en mayúsculas/10px/tracking-widest, ítems como botones
// planos sin borde ni fondo — nada de card. Acá no hace falta acordeón
// (un solo grupo, 3 ítems), pero sí el mismo peso tipográfico para que se
// sienta la misma sidebar y no un widget aparte.
function RamaSelector({ active, onSelect }: { active: RamaCanonica; onSelect: (r: RamaCanonica) => void }) {
  return (
    <div className="space-y-1.5">
      {RAMAS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onSelect(r.key)}
          className={`flex w-full items-center gap-2 py-1.5 text-left text-xs transition-colors ${
            active === r.key ? "font-black text-primary/90" : "font-medium text-primary/45 hover:text-primary/70"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ─── Rama 1: Física — TASI → IUM → Oris ───────────────────────────────────
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
          <SelectorSlot label="Oris">
          <select
            value={orisSel?.id ?? ""}
            onChange={(e) => {
              setOrisSelId(e.target.value || null);
              setIumSelId(null);
            }}
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-[11px] font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
          >
            {oris.map((o) => (
              <option key={o.id} value={o.id} className="bg-[var(--bg-main)] text-primary">
                {o.nombre}
              </option>
            ))}
          </select>
          </SelectorSlot>

          <div className="mt-5 overflow-x-auto rounded-2xl p-6">
            <div className="flex min-w-[840px] items-center gap-2">
              <PolaridadTasiArranque />
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
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

// ─── Rama 2: Alquimia — TASI → Elemento → Compuesto → Material → Estructura
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
  const [materialFocoId, setMaterialFocoId] = useState<string | null>(null);

  // Paneles flotantes abiertos — null = cerrado. Solo uno a la vez, mismo
  // criterio que ElementosPage/CompuestosPage (un solo modal centrado).
  const [elementoAbiertoId, setElementoAbiertoId] = useState<string | null>(null);
  const [compuestoAbiertoId, setCompuestoAbiertoId] = useState<string | null>(null);

  const elementoSel = useMemo(
    () => (elementoSelId ? elementos.find((e) => e.id === elementoSelId) ?? null : elementos[0] ?? null),
    [elementos, elementoSelId],
  );

  // Bloque de Núcleo/Media/Externa retirado del flujo a pedido explícito
  // (2026-09-14) — TASI pasa directo a Elemento. Los datos de capas
  // siguen viviendo en Elemento (nucleo/media/externa) por si se
  // necesitan en otra vista; acá ya no se calculan ni se muestran.

  // Compuestos reales que usan el Elemento activo como componente.
  const compuestosDelElemento = useMemo(() => {
    if (!elementoSel) return [];
    return compuestos.filter((c) => c.componentes?.some((comp) => comp.elemento_id === elementoSel.id));
  }, [compuestos, elementoSel]);

  const compuestoFoco = useMemo(
    () => compuestosDelElemento.find((c) => c.id === compuestoFocoId) ?? compuestosDelElemento[0] ?? null,
    [compuestosDelElemento, compuestoFocoId],
  );

  // Materiales reales que usan el Compuesto en foco como componente
  // (material_componentes.componente_tipo = "compuesto") — mismo hook que
  // alimenta el breadcrumb Elemento > Compuesto > Material del panel de
  // Compuesto. Solo lectura: Material no tiene panel flotante propio.
  const { items: materialesDelCompuesto, loading: loadingMateriales } =
    useMaterialesDeCompuesto(compuestoFoco?.id ?? null);

  const materialFoco = useMemo(
    () => materialesDelCompuesto.find((m) => m.id === materialFocoId) ?? materialesDelCompuesto[0] ?? null,
    [materialesDelCompuesto, materialFocoId],
  );

  // Estructuras reales que resultan del Material en foco (material_estructuras
  // — el vínculo nace del lado Material, no de Compuesto ni Estructura, así
  // que se resuelve igual que useMaterialesDeCompuesto: filas puente +
  // catálogo). Cierra la cadena Compuesto → Material → Estructura.
  const { items: vinculosEstructura, loading: loadingVinculosEstructura } = useMaterialEstructuras(
    materialFoco?.id ?? null,
  );
  const { items: estructurasCatalogo, loading: loadingEstructurasCatalogo } = useEstructuras();
  const estructurasDelMaterial = useMemo(() => {
    const idsVinculados = new Set(vinculosEstructura.map((v) => v.estructura_id));
    return estructurasCatalogo.filter((e) => idsVinculados.has(e.id));
  }, [vinculosEstructura, estructurasCatalogo]);
  const loadingEstructuras = loadingVinculosEstructura || loadingEstructurasCatalogo;

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
          <SelectorSlot label="Elemento">
          <select
            value={elementoSel?.id ?? ""}
            onChange={(e) => {
              setElementoSelId(e.target.value || null);
              setCompuestoFocoId(null);
              setMaterialFocoId(null);
            }}
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-[11px] font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
          >
            {elementos.map((e) => (
              <option key={e.id} value={e.id} className="bg-[var(--bg-main)] text-primary">
                {e.simbolo} · {e.nombre}
              </option>
            ))}
          </select>
          </SelectorSlot>

          <div className="mt-5 overflow-x-auto rounded-2xl p-6">
            <div className="flex min-w-[1220px] items-center gap-2">
              <PolaridadTasiArranque />
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
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {compuestosDelElemento.length === 0 ? (
                  <FlowNode title="Sin compuesto" subtitle="aún no forma parte de ninguno" />
                ) : (
                  compuestosDelElemento.map((c) => (
                    <FlowNode
                      key={c.id}
                      title={c.nombre}
                      subtitle={c.tipo_compuesto ?? undefined}
                      selected={compuestoFoco?.id === c.id}
                      onClick={() => {
                        setCompuestoFocoId(c.id);
                        setCompuestoAbiertoId(c.id);
                        setMaterialFocoId(null);
                      }}
                    />
                  ))
                )}
              </div>
              <Arrow />
              {/* Materiales que usan el Compuesto en foco como componente.
                  Click fija el foco (misma idea que Elemento→Compuesto de
                  arriba) para resolver sus Estructuras a la derecha —
                  Material no tiene panel flotante propio, así que no abre
                  ningún editor. */}
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {loadingMateriales ? (
                  <FlowNode title="Materiales" subtitle="cargando…" />
                ) : materialesDelCompuesto.length === 0 ? (
                  <FlowNode title="Sin material" subtitle="no forma parte de ninguno" />
                ) : (
                  materialesDelCompuesto.map((m) => (
                    <FlowNode
                      key={m.id}
                      title={m.nombre}
                      subtitle={m.tipo_material ?? undefined}
                      selected={materialFoco?.id === m.id}
                      onClick={() => setMaterialFocoId(m.id)}
                    />
                  ))
                )}
              </div>
              <Arrow />
              {/* Estructuras reales que resultan del Material en foco
                  (material_estructuras) — cierra Compuesto → Material →
                  Estructura. Solo lectura, mismo criterio que Material. */}
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {loadingEstructuras ? (
                  <FlowNode title="Estructuras" subtitle="cargando…" />
                ) : estructurasDelMaterial.length === 0 ? (
                  <FlowNode title="Sin estructura" subtitle="aún no genera ninguna" />
                ) : (
                  estructurasDelMaterial.map((e) => (
                    <FlowNode key={e.id} title={e.nombre} subtitle={e.tipo ?? undefined} />
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

// ─── Rama 3: Energías — Polos (+/−) → S/I → Garin / Éterium ────────────────
// No hay tabla propia para este flujo — es un estado conceptual (ver
// fisica_conceptos, bloque "Vacío/Garin/Eterium"), no una entidad con
// filas propias. Se muestra como diagrama conceptual fijo, sin
// interacción real posible porque no hay ningún id al que navegar.
// Recorte a pedido explícito (2026-09-14): de las 4 letras T/A/S/I solo
// S/I participan de este tramo — T/A quedan fuera del diagrama porque acá
// solo importa el par que resuelve en Garin (I, recepción) / Éterium (S,
// emisión).

function RamaLibres() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto rounded-2xl p-7">
        <div className="flex flex-col gap-2">
          <PoloCirculo signo="+" />
          <PoloCirculo signo="-" />
        </div>
        <Arrow />
        <div className="flex flex-col gap-2">
          <LetraCirculo letra="S" />
          <LetraCirculo letra="I" />
        </div>
        <Arrow />
        <div className="flex flex-col gap-2">
          <FlowNode title="Garin" subtitle="polo de recepción (I)" />
          <FlowNode title="Éterium" subtitle="polo de emisión (S)" />
        </div>
      </div>
    </>
  );
}

// ─── Rama 4: Biología — Célula → Tejido → Órgano → Sistema → Organismo →
// Criatura ────────────────────────────────────────────────────────────────
// Techo de la cadena biológica real en Supabase (documentado en el propio
// código: useOrganismosDeUnSistema.ts, useCriaturaOrganismos.ts). Cada
// salto usa el hook "¿quién me usa?" correspondiente (dirección inversa
// del catálogo→puente que ya expone cada nivel), mismo criterio que
// useMaterialesDeCompuesto en la rama Alquimia: se navega hacia arriba
// fijando un foco por nivel, sin recalcular nada que Supabase no calcule
// ya. Selecciona la primera Célula del catálogo por defecto (no hay
// concepto de "polaridad/TASI" en Biología, así que esta rama no usa
// PolaridadTasiArranque — arranca directo del catálogo de Células).
function RamaBiologia() {
  const { items: celulas, loading: loadingCelulas } = useCelulas();

  const [celulaSelId, setCelulaSelId] = useState<string | null>(null);
  const [tejidoFocoId, setTejidoFocoId] = useState<string | null>(null);
  const [organoFocoId, setOrganoFocoId] = useState<string | null>(null);
  const [sistemaFocoId, setSistemaFocoId] = useState<string | null>(null);
  const [organismoFocoId, setOrganismoFocoId] = useState<string | null>(null);

  const celulaSel = useMemo(
    () => (celulaSelId ? celulas.find((c) => c.id === celulaSelId) ?? null : celulas[0] ?? null),
    [celulas, celulaSelId],
  );

  const { items: tejidosDeCelula, loading: loadingTejidos } = useTejidosDeUnaCelula(
    celulaSel?.id ?? null,
  );
  const tejidoFoco = useMemo(
    () => tejidosDeCelula.find((t) => t.tejido_id === tejidoFocoId) ?? tejidosDeCelula[0] ?? null,
    [tejidosDeCelula, tejidoFocoId],
  );

  const { items: organosDeTejido, loading: loadingOrganos } = useOrganosDeUnTejido(
    tejidoFoco?.tejido_id ?? null,
  );
  const organoFoco = useMemo(
    () => organosDeTejido.find((o) => o.organo_id === organoFocoId) ?? organosDeTejido[0] ?? null,
    [organosDeTejido, organoFocoId],
  );

  const { items: sistemasDeOrgano, loading: loadingSistemas } = useSistemasDeUnOrgano(
    organoFoco?.organo_id ?? null,
  );
  const sistemaFoco = useMemo(
    () => sistemasDeOrgano.find((s) => s.sistema_id === sistemaFocoId) ?? sistemasDeOrgano[0] ?? null,
    [sistemasDeOrgano, sistemaFocoId],
  );

  const { items: organismosDeSistema, loading: loadingOrganismos } = useOrganismosDeUnSistema(
    sistemaFoco?.sistema_id ?? null,
  );
  const organismoFoco = useMemo(
    () =>
      organismosDeSistema.find((o) => o.organismo_id === organismoFocoId) ??
      organismosDeSistema[0] ??
      null,
    [organismosDeSistema, organismoFocoId],
  );

  // Techo de la cadena — ver nota de cabecera: criatura_organismos está
  // vacía hoy, así que esta columna típicamente mostrará "Sin criatura"
  // hasta que se cargue esa tabla en Supabase.
  const { items: criaturasDeOrganismo, loading: loadingCriaturas } = useCriaturasDeUnOrganismo(
    organismoFoco?.organismo_id ?? null,
  );

  return (
    <>
      {loadingCelulas ? <LoadingRow /> : celulas.length === 0 ? <EmptyRow>No hay Células cargadas en Supabase todavía.</EmptyRow> : null}
      {!loadingCelulas && celulas.length > 0 ? (
        <>
          <SelectorSlot label="Célula">
          <select
            value={celulaSel?.id ?? ""}
            onChange={(e) => {
              setCelulaSelId(e.target.value || null);
              setTejidoFocoId(null);
              setOrganoFocoId(null);
              setSistemaFocoId(null);
              setOrganismoFocoId(null);
            }}
            className="w-full rounded-lg border border-primary/15 bg-transparent px-3 py-2 text-[11px] font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
          >
            {celulas.map((c) => (
              <option key={c.id} value={c.id} className="bg-[var(--bg-main)] text-primary">
                {c.nombre}
              </option>
            ))}
          </select>
          </SelectorSlot>

          <div className="mt-5 overflow-x-auto rounded-2xl p-6">
            <div className="flex min-w-[1320px] items-center gap-2">
              <FlowNode title={celulaSel?.nombre ?? "Célula"} subtitle={celulaSel?.funcion ?? undefined} tone="accent" selected />
              <Arrow />
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {loadingTejidos ? (
                  <FlowNode title="Tejidos" subtitle="cargando…" />
                ) : tejidosDeCelula.length === 0 ? (
                  <FlowNode title="Sin tejido" subtitle="no forma parte de ninguno" />
                ) : (
                  tejidosDeCelula.map((t) => (
                    <FlowNode
                      key={t.vinculo_id}
                      title={t.tejido.nombre}
                      subtitle={t.rol ?? undefined}
                      selected={tejidoFoco?.tejido_id === t.tejido_id}
                      onClick={() => {
                        setTejidoFocoId(t.tejido_id);
                        setOrganoFocoId(null);
                        setSistemaFocoId(null);
                        setOrganismoFocoId(null);
                      }}
                    />
                  ))
                )}
              </div>
              <Arrow />
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {loadingOrganos ? (
                  <FlowNode title="Órganos" subtitle="cargando…" />
                ) : organosDeTejido.length === 0 ? (
                  <FlowNode title="Sin órgano" subtitle="no forma parte de ninguno" />
                ) : (
                  organosDeTejido.map((o) => (
                    <FlowNode
                      key={o.vinculo_id}
                      title={o.organo.nombre}
                      subtitle={o.organo.funcion ?? undefined}
                      selected={organoFoco?.organo_id === o.organo_id}
                      onClick={() => {
                        setOrganoFocoId(o.organo_id);
                        setSistemaFocoId(null);
                        setOrganismoFocoId(null);
                      }}
                    />
                  ))
                )}
              </div>
              <Arrow />
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {loadingSistemas ? (
                  <FlowNode title="Sistemas" subtitle="cargando…" />
                ) : sistemasDeOrgano.length === 0 ? (
                  <FlowNode title="Sin sistema" subtitle="no forma parte de ninguno" />
                ) : (
                  sistemasDeOrgano.map((s) => (
                    <FlowNode
                      key={s.vinculo_id}
                      title={s.sistema.nombre}
                      subtitle={s.sistema.descripcion ?? undefined}
                      selected={sistemaFoco?.sistema_id === s.sistema_id}
                      onClick={() => {
                        setSistemaFocoId(s.sistema_id);
                        setOrganismoFocoId(null);
                      }}
                    />
                  ))
                )}
              </div>
              <Arrow />
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {loadingOrganismos ? (
                  <FlowNode title="Organismos" subtitle="cargando…" />
                ) : organismosDeSistema.length === 0 ? (
                  <FlowNode title="Sin organismo" subtitle="no forma parte de ninguno" />
                ) : (
                  organismosDeSistema.map((o) => (
                    <FlowNode
                      key={o.vinculo_id}
                      title={o.organismo.nombre}
                      subtitle={o.organismo.tipo_organismo ?? undefined}
                      selected={organismoFoco?.organismo_id === o.organismo_id}
                      onClick={() => setOrganismoFocoId(o.organismo_id)}
                    />
                  ))
                )}
              </div>
              <Arrow />
              {/* Techo de la cadena — ver nota de cabecera sobre
                  criatura_organismos vacía. */}
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {loadingCriaturas ? (
                  <FlowNode title="Criaturas" subtitle="cargando…" />
                ) : criaturasDeOrganismo.length === 0 ? (
                  <FlowNode title="Sin criatura" subtitle="aún no vinculada" />
                ) : (
                  criaturasDeOrganismo.map((c) => (
                    <FlowNode key={c.vinculo_id} title={c.criatura.nombre} />
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

export function MapaUniversalSection() {
  const [rama, setRama] = useState<RamaCanonica>("fisica");
  const fisicaRoute = useFisicaRoute();

  // El slot vive en la columna derecha; se guarda en state (no en ref) para
  // forzar un re-render cuando el nodo ya existe y el portal pueda montarse.
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  return (
    <SelectorSlotContext.Provider value={slot}>
    {/* Mismo grid que la sidebar real de VisualizadorPage
        (lg:grid-cols-[150px_minmax(0,1fr)]) — acá invertido en orden de
        columnas (gráfico primero) pero mismo ancho, mismo sticky, y la
        sidebar sin card ni borde propio, solo tipografía. */}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_150px]">
      {/* Columna izquierda: el gráfico, que se lleva todo el ancho sobrante. */}
      <div className="min-w-0 order-2 lg:order-1">
        {rama === "fisica" ? <RamaFisica route={fisicaRoute} /> : null}
        {rama === "alquimia" ? <RamaAlquimia /> : null}
        {rama === "libres" ? <RamaLibres /> : null}
        {rama === "biologia" ? <RamaBiologia /> : null}
      </div>

      {/* Columna derecha: controles. Arriba el tipo de flujo, abajo el
          dropdown que pida la rama activa (via SelectorSlot). */}
      <aside className="order-1 p-0 lg:order-2 lg:sticky lg:top-6 lg:self-start">
        <nav className="space-y-1">
          <div>
            <span className="flex w-full items-center justify-between gap-2 py-2 text-left text-[10px] font-black uppercase tracking-widest text-primary/30">
              Flujo
            </span>
            <div className="mb-2 space-y-1.5 pl-1">
              <RamaSelector active={rama} onSelect={setRama} />
            </div>
          </div>
          <div ref={setSlot} className="space-y-1.5 pl-1 empty:hidden" />
        </nav>
      </aside>
    </div>
    </SelectorSlotContext.Provider>
  );
}
