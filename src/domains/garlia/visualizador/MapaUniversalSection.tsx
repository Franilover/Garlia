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
 * "TASI" es el vocabulario base compartido (Tesis/Antítesis/Síntesis +
 * Info/Integración, ver fisica/types.ts): las 27 Partículas canónicas. Las
 * 3 ramas son las 3 formas en que esas partículas se agrupan en el modelo —
 * cada una ya tiene su propio hook de ruta (useFisicaRoute/useAlquimiaRoute/
 * useCompuestoRoute), reusados tal cual, igual que hace RutasSection.
 *
 * "Garin" y "Éterium" (ver fisica/types.ts, doc de cabecera: "bloques de
 * conceptos Vacío/Garin/Eterium") son los dos destinos de la energía/materia
 * libre que no queda atrapada en un Ium — hoy viven como texto conceptual en
 * fisica_conceptos, no como columna estructurada, así que se muestran como
 * nodo terminal informativo (mismo criterio que "Información (sin dato)" en
 * VisualizadorPage: no se inventa una tabla que no existe).
 */

import React, { useMemo, useState } from "react";
import { ChevronRight, GitBranch, Sparkles } from "lucide-react";

import { useFisicaRoute } from "./routes/useFisicaRoute";
import { useAlquimiaRoute } from "./routes/useAlquimiaRoute";
import { useCompuestoRoute } from "./routes/useCompuestoRoute";
import { TraceView, type TraceStep } from "./TraceView";
import { Inspector, type InspectorEntity } from "./Inspector";

// ─── Primitivas locales (mismo lenguaje visual que VisualizadorPage) ───────
// No se importan desde VisualizadorPage.tsx para no crear un ciclo de
// módulos ni acoplar esta sección a ese archivo — son ~15 líneas cada una,
// idénticas a las de ahí a propósito (mismo look & feel del resto del
// visualizador).

function FlowNode({
  title,
  subtitle,
  tone = "default",
  onClick,
}: {
  title: string;
  subtitle?: string;
  tone?: "default" | "accent";
  onClick?: () => void;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`min-w-[128px] rounded-xl border px-4 py-4 text-left transition-colors ${
        tone === "accent" ? "border-primary/30" : "border-primary/10"
      } ${onClick ? "hover:border-primary/30 cursor-pointer" : ""}`}
    >
      <p className="text-sm font-black text-primary/80">{title}</p>
      {subtitle ? <p className="mt-1.5 text-[11px] leading-4 text-primary/40">{subtitle}</p> : null}
    </Comp>
  );
}

function Arrow() {
  return <ChevronRight className="shrink-0 text-primary/25" size={20} />;
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
 *  selector arriba del árbol activo. No son pestañas nuevas: son la misma
 *  ChipSelector que el resto del visualizador ya usa, aplicada a nombres
 *  de rama en vez de nombres de entidad. */
type RamaCanonica = "fisica" | "alquimia" | "libres";

const RAMAS: { key: RamaCanonica; label: string; resumen: string }[] = [
  { key: "fisica", label: "TASI → IUM → Oris", resumen: "Partículas agrupadas en IUMs, IUMs agrupados en Oris." },
  {
    key: "alquimia",
    label: "TASI → Capas → Elemento",
    resumen: "Partículas distribuidas en Núcleo/Media/Externa de un Elemento.",
  },
  {
    key: "libres",
    label: "TASI libres → Garin/Éterium",
    resumen: "Partículas sin agrupar: se disipan como Garin (recepción) o Éterium (emisión).",
  },
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
// aplanado a un solo FlowNode por nivel en vez del canvas orbital completo
// — acá el protagonista es la CADENA entre las 3 rutas, no el detalle
// visual de cada nivel (eso ya lo cubre la sección "Oris" / VIS-01).

function RamaFisica({ route }: { route: ReturnType<typeof useFisicaRoute> }) {
  const { oris, orisSel, setOrisSelId, iumPorId } = route;

  const primerIumId = orisSel ? Object.keys(orisSel.iums_composicion)[0] : null;
  const iumTrace = primerIumId ? iumPorId[primerIumId] : null;

  const traceSteps: TraceStep[] = [
    { id: "t-tasi", levelLabel: "TASI (base)", title: "Partículas A/T/S/I", subtitle: "27 combinaciones canónicas" },
    {
      id: "t-ium",
      levelLabel: "IUM",
      title: iumTrace?.nombre ?? null,
      subtitle: orisSel ? `${Object.keys(orisSel.iums_composicion).length} IUM(s) distintos` : undefined,
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
            onChange={(e) => setOrisSelId(e.target.value || null)}
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
              <FlowNode title="IUMs" subtitle={`${Object.keys(orisSel?.iums_composicion ?? {}).length} usados`} />
              <Arrow />
              <FlowNode title={orisSel?.nombre ?? "Oris"} subtitle={orisSel?.dominio} tone="accent" />
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
// Encadena useAlquimiaRoute (Elemento con sus 3 capas) con useCompuestoRoute
// (Compuestos que usan ese Elemento como componente) — mismo criterio de
// "no calcular nada nuevo": solo se filtra compuestoRoute.compuestos por
// los que ya traen el elemento activo entre sus componentes.

function RamaAlquimia({
  alquimia,
  compuesto,
}: {
  alquimia: ReturnType<typeof useAlquimiaRoute>;
  compuesto: ReturnType<typeof useCompuestoRoute>;
}) {
  const { elementos, elementoSel, setElementoSelId, capas } = alquimia;

  // Compuestos reales que usan el Elemento activo como componente — dato
  // ya cargado por useCompuestoRoute (compuesto.componentes viene de
  // compuesto_elementos), solo se filtra acá, sin recalcular composición.
  const compuestosDelElemento = useMemo(() => {
    if (!elementoSel) return [];
    return compuesto.compuestos.filter((c) =>
      c.componentes?.some((comp) => comp.elemento_id === elementoSel.id),
    );
  }, [compuesto.compuestos, elementoSel]);

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
      title: compuestosDelElemento.length > 0 ? `${compuestosDelElemento.length} compuesto(s)` : null,
      subtitle: compuestosDelElemento.slice(0, 3).map((c) => c.nombre).join(", ") || undefined,
    },
  ];

  return (
    <>
      {alquimia.loading ? (
        <LoadingRow />
      ) : alquimia.empty ? (
        <EmptyRow>No hay Elementos cargados en Supabase todavía.</EmptyRow>
      ) : null}
      {!alquimia.loading && elementos.length > 0 ? (
        <>
          <select
            value={elementoSel?.id ?? ""}
            onChange={(e) => setElementoSelId(e.target.value || null)}
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
                  <FlowNode key={c.capa} title={c.label} subtitle={c.resumen || `${c.total} partícula(s)`} />
                ))}
              </div>
              <Arrow />
              <FlowNode
                title={elementoSel ? `${elementoSel.simbolo} · ${elementoSel.nombre}` : "Elemento"}
                subtitle={elementoSel?.familia}
                tone="accent"
              />
              <Arrow />
              <div className="flex flex-col gap-2">
                {compuestosDelElemento.length === 0 ? (
                  <FlowNode title="Sin compuesto" subtitle="aún no forma parte de ninguno" />
                ) : (
                  compuestosDelElemento.slice(0, 4).map((c) => (
                    <FlowNode key={c.id} title={c.nombre} subtitle={c.tipo_compuesto ?? undefined} />
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

// ─── Rama 3: Partículas libres → Garin / Éterium ───────────────────────────
// No hay tabla propia para "partículas sin agrupar" — es un estado
// conceptual (ver fisica_conceptos, bloque "Vacío/Garin/Eterium"), no una
// entidad con filas propias. Se muestra como diagrama conceptual fijo, mismo
// criterio que la sección "Información (sin dato)" en VisualizadorPage: no
// se inventa una tabla ni un valor que no existe en Supabase todavía.

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
      <div className="mt-6 rounded-2xl border border-dashed border-primary/15 p-6 text-xs leading-5 text-primary/45">
        Diagrama conceptual — Garin y Éterium hoy viven como texto en{" "}
        <code className="text-primary/60">fisica_conceptos</code> (bloque Vacío/Garin/Eterium), no como una
        tabla con filas propias de partículas libres. No se inventan valores numéricos ni un catálogo que
        todavía no existe en Supabase.
      </div>
    </>
  );
}

export function MapaUniversalSection() {
  const [rama, setRama] = useState<RamaCanonica>("fisica");

  const fisicaRoute = useFisicaRoute();
  const alquimiaRoute = useAlquimiaRoute();
  const compuestoRoute = useCompuestoRoute();

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/35">
        <GitBranch size={13} />
        <span>Atlas · flujo canónico</span>
      </div>
      <p className="mb-5 max-w-2xl text-xs leading-5 text-primary/45">
        Las 27 Partículas TASI (base compartida) se agrupan en el mundo por tres caminos distintos. Este mapa
        no reemplaza Física/Alquimia/Química — conecta esas 3 rutas ya existentes en un solo árbol navegable.
      </p>

      <RamaSelector active={rama} onSelect={setRama} />

      <div className="mt-6">
        {rama === "fisica" ? <RamaFisica route={fisicaRoute} /> : null}
        {rama === "alquimia" ? <RamaAlquimia alquimia={alquimiaRoute} compuesto={compuestoRoute} /> : null}
        {rama === "libres" ? <RamaLibres /> : null}
      </div>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-primary/10 p-5 text-[11px] leading-5 text-primary/40">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-primary/30" />
        <span>
          {RAMAS.find((r) => r.key === rama)?.resumen}
        </span>
      </div>
    </>
  );
}
