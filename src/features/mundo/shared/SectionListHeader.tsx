"use client";

/**
 * SectionListHeader
 * ───────────────────────────────────────────────────────────────────────────
 * Header de la columna angosta (w-64) que reemplaza al menú de 12 secciones
 * una vez que el usuario elige una. La X vuelve al menú vía goToMenu() —
 * mismo panel, no una columna nueva.
 */

import { Plus, Search, X } from "lucide-react";
import React from "react";

import { useMundoNavigation } from "../store/useMundoNavigationStore";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onCreate?: () => void;
  placeholder: string;
  createLabel: string;
}

export function SectionListHeader({
  query,
  onQueryChange,
  onCreate,
  placeholder,
  createLabel,
}: Props) {
  const goToMenu = useMundoNavigation((s) => s.goToMenu);

  return (
    <div className="p-2 flex items-center gap-2 border-b border-primary/10">
      <button
        type="button"
        onClick={goToMenu}
        className="p-1.5 rounded-lg text-primary/40 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
        aria-label="Volver a secciones"
      >
        <X size={14} />
      </button>
      <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-input-bg">
        <Search size={12} className="text-primary/30" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-primary/25"
        />
      </div>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
          aria-label={createLabel}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
