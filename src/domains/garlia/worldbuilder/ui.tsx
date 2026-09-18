"use client";

/**
 * ui.ts — dominio Worldbuilder
 * ───────────────────────────────────────────────────────────────────────────
 * Primitivos visuales mínimos, calcados de los ya usados en
 * visualizador/VisualizadorPage.tsx (SelectDropdown/EmptyRow/LoadingRow/
 * StatusPill) para que Worldbuilder tenga el mismo lenguaje minimalista sin
 * crear una dependencia entre dominios — Worldbuilder es una pestaña de
 * nivel superior propia (junto a Runas/Química/Visualizador), no vive
 * dentro de VisualizadorPage.
 */

import React from "react";

export function SelectDropdown<T>({
  items,
  active,
  getKey,
  getLabel,
  onSelect,
  placeholder = "Seleccioná un elemento…",
}: {
  items: T[];
  active: T | null;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={active ? getKey(active) : ""}
      onChange={(e) => {
        const found = items.find((item) => getKey(item) === e.target.value);
        if (found) onSelect(found);
      }}
      className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
    >
      {!active ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {items.map((item) => (
        <option key={getKey(item)} value={getKey(item)} className="bg-[var(--bg-main)] text-primary">
          {getLabel(item)}
        </option>
      ))}
    </select>
  );
}

/** Etiquetas legibles para las unidades de parametros_base
 *  (plantillas_geometricas), confirmadas contra los valores reales en
 *  Supabase (todas las plantillas usan "longitud_u" hoy) — fallback al
 *  valor crudo si aparece una unidad nueva. */
const ETIQUETAS_UNIDAD: Record<string, string> = {
  longitud_u: "u",
};

/** Etiquetas legibles para las claves de parametros_base — mismo criterio
 *  de fallback que ETIQUETAS_UNIDAD: una clave nueva se muestra tal cual. */
const ETIQUETAS_PARAMETRO: Record<string, string> = {
  longitud: "Longitud",
  ancho: "Ancho",
  grosor: "Grosor",
  radio: "Radio",
};

/** Preview de las medidas de referencia de una plantilla geométrica
 *  (TipoObjeto.parametros_base) — pensado para mostrarse en "Crear objeto"
 *  apenas se elige un tipo, así el worldbuilder ve el tamaño/forma base
 *  ANTES de crear, sin tener que abrir el editor de geometría del item. Es
 *  puramente informativo: no se envía a fn_worldbuilder_crear_item, que ya
 *  resuelve la geometría real a partir de plantilla_id por su cuenta. */
export function PreviewPlantilla({
  parametros,
}: {
  parametros: Record<string, { valor: number; unidad: string }> | null;
}) {
  if (!parametros || Object.keys(parametros).length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-primary/30">Forma base</span>
      {Object.entries(parametros).map(([clave, { valor, unidad }]) => (
        <span
          key={clave}
          className="inline-flex items-center gap-1 rounded-full border border-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary/55"
        >
          {ETIQUETAS_PARAMETRO[clave] ?? clave}
          <span className="font-black text-primary/75">
            {valor}
            {ETIQUETAS_UNIDAD[unidad] ?? unidad}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Etiquetas legibles para compuestos.categoria/materiales.categoria (eje
 *  físico), calcadas de ETIQUETAS_CATEGORIA en elementos/CompuestosPage.tsx
 *  y materiales/MaterialesPage.tsx para consistencia entre las 3 pantallas
 *  — un valor fuera de este mapa se muestra tal cual. */
const ETIQUETAS_CATEGORIA: Record<string, string> = {
  mineral: "Mineral",
  metal_aleacion: "Metal / Aleación",
  tejido_organico_animal: "Tejido orgánico animal",
  tejido_organico_vegetal: "Tejido orgánico vegetal",
  biomolecula: "Biomolécula",
  liquido_organico: "Líquido orgánico",
  liquido_base: "Líquido base",
  gas: "Gas",
  solido_volatil: "Sólido volátil",
  sustancia_organica_amorfa: "Sustancia orgánica amorfa",
};

/** Variante de SelectDropdown para listas de Material/Compuesto: agrupa
 *  las <option> por categoria real (columna compuestos.categoria/
 *  materiales.categoria, ver auditoría categoria faltante en Compuesto/
 *  Material) dentro de <optgroup>, para que elegir un componente en
 *  Worldbuilder no obligue a escanear una lista plana de 70+ nombres sin
 *  ningún criterio. Los que no tienen categoria van al final, sin
 *  optgroup — mismo criterio "Sin categoría" que el resto del dominio. */
export function SelectDropdownConCategoria<T extends { categoria?: string | null }>({
  items,
  active,
  getKey,
  getLabel,
  onSelect,
  placeholder = "Seleccioná un elemento…",
}: {
  items: T[];
  active: T | null;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  placeholder?: string;
}) {
  const grupos = React.useMemo(() => {
    const orden: string[] = [];
    const mapa = new Map<string, T[]>();
    const sinCategoria: T[] = [];
    for (const item of items) {
      const cat = item.categoria;
      if (!cat) {
        sinCategoria.push(item);
        continue;
      }
      if (!mapa.has(cat)) {
        mapa.set(cat, []);
        orden.push(cat);
      }
      mapa.get(cat)!.push(item);
    }
    return { conCategoria: orden.map((cat) => ({ cat, items: mapa.get(cat)! })), sinCategoria };
  }, [items]);

  return (
    <select
      value={active ? getKey(active) : ""}
      onChange={(e) => {
        const found = items.find((item) => getKey(item) === e.target.value);
        if (found) onSelect(found);
      }}
      className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
    >
      {!active ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {grupos.conCategoria.map(({ cat, items: itemsDeCat }) => (
        <optgroup key={cat} label={ETIQUETAS_CATEGORIA[cat] ?? cat} className="bg-[var(--bg-main)] text-primary">
          {itemsDeCat.map((item) => (
            <option key={getKey(item)} value={getKey(item)} className="bg-[var(--bg-main)] text-primary">
              {getLabel(item)}
            </option>
          ))}
        </optgroup>
      ))}
      {grupos.sinCategoria.length > 0 ? (
        <optgroup label="Sin categoría" className="bg-[var(--bg-main)] text-primary">
          {grupos.sinCategoria.map((item) => (
            <option key={getKey(item)} value={getKey(item)} className="bg-[var(--bg-main)] text-primary">
              {getLabel(item)}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

/** Selector de forma + medidas opcionales — mismo modelo que
 *  items/EditorGeometriaItem.tsx (elegir forma alcanza para tener un objeto
 *  físicamente calculable; las medidas son un ajuste opcional colapsado),
 *  pero CONTROLADO en vez de escribir directo a Supabase: en Worldbuilder
 *  todavía no existe el item en el momento de elegir forma (se crea recién
 *  al enviar "Crear objeto"), así que este componente solo devuelve
 *  {forma, medidas} al padre vía onChange — el padre decide cuándo
 *  persistir (update de items.geometria_fisica una vez que hay itemId).
 *  Las claves de `medidas` y el valor de unidad_longitud siguen el mismo
 *  shape que geometria_fisica espera, confirmado contra
 *  formas_geometricas_defaults en vivo. */
export function SelectorFormaGeometrica({
  formas,
  loading,
  valor,
  onChange,
}: {
  formas: { clave: string; nombre: string; parametrosDefault: Record<string, number | string>; parametrosNumericos: string[] }[];
  loading?: boolean;
  valor: { forma: string | null; medidas: Record<string, string> };
  onChange: (valor: { forma: string | null; medidas: Record<string, string> }) => void;
}) {
  const [mostrarMedidas, setMostrarMedidas] = React.useState(false);
  const formaActual = formas.find((f) => f.clave === valor.forma);

  const elegirForma = (clave: string) => {
    const forma = formas.find((f) => f.clave === clave);
    if (!forma) return;
    const medidas: Record<string, string> = {};
    for (const k of forma.parametrosNumericos) {
      medidas[k] = String(forma.parametrosDefault[k] as number);
    }
    onChange({ forma: clave, medidas });
    setMostrarMedidas(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={valor.forma ?? ""}
          onChange={(e) => {
            if (e.target.value) elegirForma(e.target.value);
          }}
          disabled={loading}
          className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40 disabled:opacity-40"
        >
          <option value="" disabled>
            {loading ? "Cargando formas…" : "Elegir forma (opcional)…"}
          </option>
          {formas.map((f) => (
            <option key={f.clave} value={f.clave} className="bg-[var(--bg-main)] text-primary">
              {f.nombre}
            </option>
          ))}
        </select>
      </div>

      {!valor.forma && !loading ? (
        <p className="text-[10px] italic text-primary/35">
          Si no elegís ninguna, se usa la forma de la plantilla del tipo de objeto elegido más arriba.
        </p>
      ) : null}

      {formaActual && formaActual.parametrosNumericos.length > 0 ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setMostrarMedidas((v) => !v)}
            className="w-fit text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary/70"
          >
            {mostrarMedidas ? "Ocultar medidas" : "Ajustar medidas (opcional)"}
          </button>
          {mostrarMedidas ? (
            <div className="flex flex-wrap items-end gap-3 py-1">
              {formaActual.parametrosNumericos.map((clave) => (
                <label key={clave} className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-primary/40">{ETIQUETAS_PARAMETRO[clave] ?? clave}</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={valor.medidas[clave] ?? ""}
                    onChange={(e) => onChange({ forma: valor.forma, medidas: { ...valor.medidas, [clave]: e.target.value } })}
                    className="w-20 border-0 border-b border-primary/15 bg-transparent px-0 py-1 text-sm font-black text-primary outline-none transition-colors focus:border-primary/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </label>
              ))}
              <span className="pb-1.5 text-[10px] text-primary/30">
                Medidas de referencia, no una unidad real — solo importan entre sí.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LoadingRow({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/10 p-5 text-xs font-bold text-primary/35">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
      {children ?? "Cargando datos reales desde Supabase…"}
    </div>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/15 p-5 text-xs leading-5 text-primary/40">
      {children}
    </div>
  );
}

/** Multi-select de chips clickeables sobre el catálogo REAL de intenciones
 *  (worldbuilder_intenciones_humanas, cargado una vez en useWorldbuilder) —
 *  reemplaza al textarea de lenguaje libre + detección debounced: el
 *  worldbuilder elige directo las intenciones que existen, no tipea texto
 *  para que el motor lo interprete. Estado 100% del componente (claves
 *  seleccionadas), sin pasar por fn_worldbuilder_detectar_intenciones. */
export function SelectorIntenciones({
  intenciones,
  seleccionadas,
  onToggle,
  loading,
}: {
  intenciones: { clave: string; nombre: string; descripcion?: string }[];
  seleccionadas: Set<string>;
  onToggle: (clave: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return <p className="text-[10px] font-bold text-primary/35">Cargando catálogo de intenciones…</p>;
  }
  if (intenciones.length === 0) {
    return <p className="text-[10px] font-bold text-primary/30">No hay intenciones activas en el catálogo.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {intenciones.map((it) => {
        const on = seleccionadas.has(it.clave);
        return (
          <button
            key={it.clave}
            type="button"
            onClick={() => onToggle(it.clave)}
            title={it.descripcion}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black capitalize transition-colors ${
              on
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary/65"
            }`}
          >
            {on ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
            {it.nombre}
          </button>
        );
      })}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/25 text-emerald-500"
      : tone === "warning"
        ? "border-amber-500/25 text-amber-500"
        : "border-primary/10 text-primary/50";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${toneClass}`}
    >
      {children}
    </span>
  );
}
