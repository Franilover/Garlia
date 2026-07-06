"use client";

/**
 * EntityCardGrid
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque "título + grid de tarjetas" para una sub-categoría dentro de una
 * página combinada (ej. "Personajes" dentro de la página Entidades).
 * Varias de estas apiladas verticalmente forman la página completa.
 */

import { Loader2, Plus } from "lucide-react";
import React from "react";

import { EntityCard } from "./EntityCard";

interface Item {
  id: string;
  nombre: string;
  imageUrl?: string | null;
  subtitle?: string | null;
}

interface Props {
  title: string;
  Icon: React.ElementType;
  items: Item[];
  loading?: boolean;
  onItemClick: (id: string) => void;
  onCreate?: () => void;
  creating?: boolean;
  emptyLabel?: string;
  /**
   * Cuántas de estas grillas van lado a lado en la fila:
   * "full" (sola, 16 columnas) | "half" (2 en la fila, 8 columnas c/u) |
   * "third" (3 en la fila, ~5 columnas c/u). Default: "full".
   * Solo aplica a variant="grid" — variant="chips" siempre fluye libre.
   */
  layout?: "full" | "half" | "third";
  /**
   * "grid" (default): tarjetas cuadradas con imagen/ícono, columnas fijas.
   * "chips": solo texto, sin imagen, ancho automático según el contenido
   * (flex-wrap) para aprovechar mejor el espacio en vez de columnas rígidas.
   */
  variant?: "grid" | "chips";
}

const GRID_COLS_BY_LAYOUT: Record<NonNullable<Props["layout"]>, string> = {
  full: "grid-cols-4 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-[repeat(16,minmax(0,1fr))]",
  half: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-[repeat(8,minmax(0,1fr))]",
  third: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))]",
};

export function EntityCardGrid({
  title,
  Icon,
  items,
  loading,
  onItemClick,
  onCreate,
  creating,
  emptyLabel,
  layout = "full",
  variant = "grid",
}: Props) {
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon size={13} className="text-primary/40" />
        <h2 className="text-micro font-black uppercase tracking-[0.25em] text-primary/50">
          {title}
        </h2>
        <span className="text-micro text-primary/25 tabular-nums">{items.length}</span>
        <div className="flex-1" />
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-micro font-bold uppercase tracking-wide text-primary disabled:opacity-50"
          >
            {creating ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Plus size={11} />
            )}
            Añadir
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="py-6 text-xs text-primary/30 text-center">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-xs text-primary/25 text-center">
          {emptyLabel ?? `Sin ${title.toLowerCase()} todavía`}
        </div>
      ) : variant === "chips" ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item.id)}
              title={item.nombre}
              className="px-2.5 py-1.5 rounded-lg border border-primary/10 bg-primary/[0.03] hover:bg-primary/10 hover:border-primary/20 transition-colors text-xs font-semibold text-primary/80 text-left truncate max-w-[220px]"
            >
              {item.nombre}
            </button>
          ))}
        </div>
      ) : (
        <div className={`grid ${GRID_COLS_BY_LAYOUT[layout]} gap-1.5`}>
          {items.map((item) => (
            <EntityCard
              key={item.id}
              nombre={item.nombre}
              imageUrl={item.imageUrl}
              subtitle={item.subtitle}
              Icon={Icon}
              onClick={() => onItemClick(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
