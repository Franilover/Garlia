"use client";

/**
 * ListaIndiceCatalogoItem.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Lista densa en columnas ("tipo índice/directorio") para catálogos de
 * Biología con muchos ítems (Células, Tejidos, Órganos: ~70 cada uno) donde
 * PillCatalogoItem (chips flex-wrap) se veía desordenado — nombres largos
 * generaban pills de ancho muy dispar y el bloque ocupaba mucho alto.
 *
 * Cada fila es de una sola línea (~24px), en columnas de ancho fijo que se
 * acomodan solas según el espacio disponible (CSS multi-column) — mucho más
 * compacto en vertical que un grid de tarjetas para volúmenes grandes, y el
 * nombre se lee casi siempre completo (elipsis + title solo si no entra).
 *
 * Pensado específicamente para listas grandes (>15-20 ítems); para
 * catálogos chicos, PillCatalogoItem sigue siendo el lenguaje visual
 * estándar del resto del proyecto (Elementos/Compuestos/Reacciones/Grupos).
 */

import React from "react";

export function ListaIndiceCatalogoItem({
  nombre,
  seleccionado,
  onClick,
}: {
  nombre: string;
  seleccionado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={nombre}
      className={`block w-full text-left px-1.5 py-[3px] mb-[1px] rounded text-micro font-semibold truncate transition-colors border ${
        seleccionado
          ? "text-primary font-black border-primary/30 bg-primary/10"
          : "text-primary/70 border-transparent hover:bg-primary/5"
      }`}
      style={{ breakInside: "avoid" }}
    >
      {nombre || "(sin nombre)"}
    </button>
  );
}

/**
 * Contenedor de grupo: título micro (mismo formato "Nombre · N" que ya
 * usaban estos catálogos) + la lista en columnas. Mismo espíritu que
 * GridPills en PillCatalogoItem.tsx, pero para el layout en columnas.
 */
export function ListaIndiceCatalogo<T extends { id: string; nombre: string }>({
  items,
  loading,
  seleccionadoId,
  onSeleccionar,
  labelVacio,
  minColWidth = 150,
}: {
  items: T[];
  loading?: boolean;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  labelVacio: string;
  /** Ancho mínimo de cada columna del índice, en px. */
  minColWidth?: number;
}) {
  if (loading && items.length === 0) {
    return <p className="text-micro text-primary/25 italic py-2">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-4 text-micro text-primary/25 text-center border border-dashed border-primary/10 rounded-md">
        Sin {labelVacio} todavía
      </div>
    );
  }

  return (
    <div style={{ columns: `${minColWidth}px`, columnGap: "14px" }}>
      {items.map((item) => (
        <ListaIndiceCatalogoItem
          key={item.id}
          nombre={item.nombre}
          seleccionado={seleccionadoId === item.id}
          onClick={() => onSeleccionar(item.id)}
        />
      ))}
    </div>
  );
}
