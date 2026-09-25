"use client";

/**
 * ListaIndiceCatalogoItem.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Lista densa en columnas ("tipo índice/directorio") para catálogos de
 * Biología con muchos ítems (Células, Tejidos, Órganos: ~70 cada uno) donde
 * PillCatalogoItem (chips flex-wrap) se veía desordenado — nombres largos
 * generaban pills de ancho muy dispar y el bloque ocupaba mucho alto.
 *
 * Cada fila es de una sola línea, en un grid de columnas flexibles
 * (auto-fill/minmax) que se reparten TODO el ancho disponible — con más
 * espacio hay menos columnas pero más anchas, en vez de columnas de ancho
 * fijo (CSS multi-column) que dejaban aire libre a la derecha sin
 * aprovecharlo. Mucho más compacto en vertical que un grid de tarjetas
 * para volúmenes grandes, y el nombre se lee casi siempre completo
 * (elipsis + title solo si no entra).
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
      className={`block w-full text-left px-2 py-1 mb-1 rounded-md text-sm font-semibold truncate transition-colors border ${
        seleccionado
          ? "text-primary font-black border-primary/30 bg-primary/10"
          : "text-primary/70 border-transparent hover:bg-primary/5"
      }`}
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
  minColWidth = 170,
}: {
  items: T[];
  loading?: boolean;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  labelVacio: string;
  /** Ancho mínimo de cada columna del índice, en px — las columnas se
   *  reparten el espacio disponible (auto-fill), no quedan en un ancho
   *  fijo: con más espacio se ven menos columnas pero más anchas, en vez
   *  de muchas columnas angostas de texto cortado. */
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
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`,
        gap: "6px 14px",
      }}
    >
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
