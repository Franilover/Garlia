"use client";

/**
 * SectionListHeader
 * ───────────────────────────────────────────────────────────────────────────
 * Header de la columna angosta (w-64) que reemplaza al menú de 12 secciones
 * una vez que el usuario elige una.
 *
 * El botón de "volver" es contextual:
 *   - Sin selección (viendo la lista): la X vuelve al menú de 12 secciones
 *     vía goToMenu().
 *   - Con algo seleccionado (la lista está oculta, ver *Section.tsx): el
 *     mismo lugar en pantalla muestra una flecha que vuelve a ESTA lista
 *     vía clearSelection(), sin salir de la sección.
 */

import { ArrowLeft, Plus, Search, X } from "lucide-react";
import React from "react";

import { useMundoNavigation } from "../store/useMundoNavigationStore";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onCreate?: () => void;
  placeholder: string;
  createLabel: string;
  /** true cuando hay una entidad abierta (la lista está oculta) */
  hasSelection?: boolean;
}

export function SectionListHeader({
  query,
  onQueryChange,
  onCreate,
  placeholder,
  createLabel,
  hasSelection = false,
}: Props) {
  const goToMenu = useMundoNavigation((s) => s.goToMenu);
  const clearSelection = useMundoNavigation((s) => s.clearSelection);

  return (
    <div className="p-2 flex items-center gap-2 border-b border-primary/10">
      <button
        type="button"
        onClick={hasSelection ? clearSelection : goToMenu}
        className="p-1.5 rounded-lg text-primary/40 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
        aria-label={hasSelection ? "Volver a la lista" : "Volver a secciones"}
      >
        {hasSelection ? <ArrowLeft size={14} /> : <X size={14} />}
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
