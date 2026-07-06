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
}

export function EntityCardGrid({
  title,
  Icon,
  items,
  loading,
  onItemClick,
  onCreate,
  creating,
  emptyLabel,
}: Props) {
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon size={13} className="text-primary/40" />
        <h2 className="text-micro font-black uppercase tracking-[0.25em] text-primary/50">
          {title}
        </h2>
        <span className="text-micro text-primary/25 tabular-nums">
          {items.length}
        </span>
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
        <div className="py-6 text-xs text-primary/30 text-center">
          Cargando…
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-xs text-primary/25 text-center">
          {emptyLabel ?? `Sin ${title.toLowerCase()} todavía`}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-16 gap-2">
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
