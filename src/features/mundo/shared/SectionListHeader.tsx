"use client";

/**
 * SectionListHeader
 * ───────────────────────────────────────────────────────────────────────────
 * Header de la columna angosta (w-64) que reemplaza al menú de 12 secciones
 * una vez que el usuario elige una.
 *
 * El botón de "volver" ya NO vive acá — se movió a la navbar global (ver
 * components/layout/navbar.tsx), que lee useMundoNavigation directamente
 * y muestra ←/✕ contextual arriba de la página, consistente con el resto
 * del sitio. Este header ahora es solo buscador + botón de crear.
 */

import { Plus, Search } from "lucide-react";
import React from "react";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onCreate?: () => void;
  placeholder: string;
  createLabel: string;
  /** @deprecated el botón de volver ahora vive en la navbar; prop ignorada */
  hasSelection?: boolean;
}

export function SectionListHeader({
  query,
  onQueryChange,
  onCreate,
  placeholder,
  createLabel,
}: Props) {
  return (
    <div className="p-2 flex items-center gap-2 border-b border-primary/10">
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
