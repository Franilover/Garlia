"use client";

/**
 * OrdenarPorPropiedadPopover.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Título de sección clickeable + botón de filtrar/ordenar (un único
 * selector por sección) para los listados agrupados de Compuestos y
 * Materiales. Al elegir una propiedad emergente, quien lo usa reordena los
 * ítems del grupo de mayor a menor valor en esa propiedad (los que no
 * tienen el dato quedan al final, en su orden original).
 *
 * Solo se ofrecen propiedades NUMÉRICAS puras (las 12 de abajo): quedan
 * fuera a propósito los campos de texto/clasificación (tipo, categoría,
 * topología, estado…) porque no tienen un orden mayor/menor comparable.
 *
 * Reusable: es agnóstico de la entidad. El caller le pasa una función
 * `obtenerValor(item, clave)` y usa `ordenarPorPropiedad` para ordenar.
 *
 * El orden "global" (todas las secciones a la vez, por ejemplo al elegir
 * "Por Propiedades" desde el menú "Seleccionar agrupación" del título de la
 * página — ver CabeceraSeccionConMenu) ya no vive acá: el segundo botón que
 * lo disparaba desde este popover fue retirado (rediseño Química
 * 2026-09-20). El caller sigue pudiendo aplicar un `propiedadGlobal` como
 * prioridad más baja que el orden propio de cada sección — ver
 * `propiedadGlobal` más abajo — solo que ahora se dispara desde otro lado.
 */

import { ArrowDownWideNarrow, X } from "lucide-react";
import React, { useState } from "react";

import { PopoverFlotante } from "./PopoverFlotante";

export interface PropiedadOrdenable {
  clave: string;
  label: string;
}

/** Las 12 propiedades emergentes numéricas comparables (mismo orden que en
 *  la ficha del compuesto/material). */
export const PROPIEDADES_ORDENABLES: PropiedadOrdenable[] = [
  { clave: "masa", label: "Masa" },
  { clave: "volumen", label: "Volumen" },
  { clave: "densidad", label: "Densidad" },
  { clave: "carga", label: "Carga" },
  { clave: "estabilidad", label: "Estabilidad" },
  { clave: "rigidez", label: "Rigidez" },
  { clave: "flexibilidad", label: "Flexibilidad" },
  { clave: "dureza", label: "Dureza" },
  { clave: "conductividad", label: "Conductividad" },
  { clave: "transparencia", label: "Transparencia" },
  { clave: "interaccion", label: "Interacción" },
  { clave: "compatibilidad", label: "Compatibilidad" },
];

/**
 * Ordena de mayor a menor según `clave`. Estable: los ítems sin valor
 * numérico válido van al final conservando su orden original. Si `clave`
 * es null devuelve la lista tal cual (sin copiar).
 */
export function ordenarPorPropiedad<T>(
  items: T[],
  clave: string | null,
  obtenerValor: (item: T, clave: string) => unknown,
): T[] {
  if (!clave) return items;
  const conIndice = items.map((item, i) => {
    const v = obtenerValor(item, clave);
    return { item, i, v: typeof v === "number" && Number.isFinite(v) ? v : null };
  });
  conIndice.sort((a, b) => {
    if (a.v === null && b.v === null) return a.i - b.i;
    if (a.v === null) return 1;
    if (b.v === null) return -1;
    if (b.v !== a.v) return b.v - a.v;
    return a.i - b.i;
  });
  return conIndice.map((x) => x.item);
}

/** Lista de propiedades dentro de un popover (compartida por los 2 botones). */
function ListaPropiedades({
  titulo,
  propiedadActiva,
  onSeleccionar,
  onCerrar,
  textoQuitar,
}: {
  titulo: string;
  propiedadActiva: string | null;
  onSeleccionar: (clave: string | null) => void;
  onCerrar: () => void;
  textoQuitar: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-1.5">
      <div className="px-1.5 pb-1 text-micro font-black uppercase tracking-[0.2em] text-primary/30">
        {titulo}
      </div>
      {PROPIEDADES_ORDENABLES.map((p) => {
        const seleccionada = p.clave === propiedadActiva;
        return (
          <button
            key={p.clave}
            type="button"
            onClick={() => {
              onSeleccionar(seleccionada ? null : p.clave);
              onCerrar();
            }}
            className={`rounded-md px-2 py-1 text-left text-micro font-bold transition-colors cursor-pointer ${
              seleccionada ? "bg-accent/15 text-accent" : "text-primary/70 hover:bg-primary/10"
            }`}
          >
            {p.label}
          </button>
        );
      })}
      {propiedadActiva && (
        <button
          type="button"
          onClick={() => {
            onSeleccionar(null);
            onCerrar();
          }}
          className="mt-1 flex items-center gap-1 rounded-md border-t border-primary/10 px-2 pt-1.5 pb-1 text-left text-micro font-bold text-primary/50 hover:text-primary cursor-pointer"
        >
          <X size={10} /> {textoQuitar}
        </button>
      )}
    </div>
  );
}

export function OrdenarPorPropiedadPopover({
  titulo,
  propiedadActiva,
  onSeleccionar,
  propiedadGlobal = null,
}: {
  /** Texto del título de la sección (ej. "Mineral"). */
  titulo: string;
  /** Clave de la propiedad por la que está ordenado ESTE grupo, o null. */
  propiedadActiva: string | null;
  onSeleccionar: (clave: string | null) => void;
  /** Propiedad por la que están ordenados TODOS los grupos (fijada desde
   *  "Seleccionar agrupación → Por Propiedades" en el título de la página,
   *  ver CabeceraSeccionConMenu), o null. Prioridad más baja que
   *  propiedadActiva: solo se usa para el chip/orden si esta sección no
   *  tiene su propio orden elegido. */
  propiedadGlobal?: string | null;
}) {
  const [anchorSeccion, setAnchorSeccion] = useState<HTMLElement | null>(null);
  const activa = PROPIEDADES_ORDENABLES.find((p) => p.clave === propiedadActiva) ?? null;
  const global = PROPIEDADES_ORDENABLES.find((p) => p.clave === propiedadGlobal) ?? null;
  // Lo que se ve en el chip: el orden propio de la sección gana al global.
  const efectiva = activa ?? global;

  return (
    <div className="mb-1 flex items-center gap-1 px-1">
      <button
        type="button"
        onClick={(e) => setAnchorSeccion(e.currentTarget.parentElement)}
        title="Ordenar solo esta sección por propiedad"
        className={`flex min-w-0 flex-1 items-center gap-1.5 text-left text-micro font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
          efectiva ? "text-accent" : "text-primary/40 hover:text-primary/70"
        }`}
      >
        <span className="truncate">{titulo}</span>
        {efectiva && (
          <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] normal-case tracking-normal">
            ↓ {efectiva.label}
          </span>
        )}
        <ArrowDownWideNarrow size={11} className="ml-auto shrink-0 opacity-60" />
      </button>

      <PopoverFlotante anchor={anchorSeccion} onClose={() => setAnchorSeccion(null)} width={200} maxHeight={380}>
        <ListaPropiedades
          titulo="Esta sección · mayor primero"
          propiedadActiva={propiedadActiva}
          onSeleccionar={onSeleccionar}
          onCerrar={() => setAnchorSeccion(null)}
          textoQuitar="Quitar orden de la sección"
        />
      </PopoverFlotante>
    </div>
  );
}
