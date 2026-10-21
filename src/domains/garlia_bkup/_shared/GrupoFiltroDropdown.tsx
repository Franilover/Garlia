"use client";

/**
 * GrupoFiltroDropdown / GrupoFiltroBarra
 * ───────────────────────────────────────────────────────────────────────────
 * Dropdown reutilizable para las barras superiores de las vistas jerárquicas
 * (GeografiaJerarquica, MagiaJerarquica, grid de Items…).
 *
 * Migrado a MenuDropdown — lógica de apertura/cierre/Escape unificada.
 */

import { ChevronDown, ExternalLink } from "lucide-react";
import React from "react";

import { MenuDropdown } from "@/domains/garlia/_shared/PanelColapsable";

export interface GrupoFiltroItem {
  id: string;
  nombre: string;
  miembro_ids: string[];
}

export interface GrupoFiltroSubtipo {
  subtipo: string | null;
  grupos: GrupoFiltroItem[];
}

export function GrupoFiltroDropdown({
  subtipo,
  grupos,
  selectedId,
  onSelect,
  onOpenGrupo,
}: {
  subtipo: string | null;
  grupos: GrupoFiltroItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenGrupo?: (grupoId: string) => void;
}) {
  const seleccionado = grupos.find((g) => g.id === selectedId) ?? null;

  const trigger = (
    <button
      type="button"
      title={subtipo ?? "Sin subtipo"}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-bold uppercase tracking-wide transition-colors max-w-[160px] ${
        seleccionado
          ? "bg-accent/15 text-accent border border-accent/25"
          : "bg-primary/10 hover:bg-primary/20 text-primary/70 border border-primary/15"
      }`}
    >
      <span className="truncate">
        {seleccionado ? seleccionado.nombre : (subtipo ?? "Sin subtipo")}
      </span>
      <ChevronDown size={10} className="shrink-0" />
    </button>
  );

  return (
    <MenuDropdown trigger={trigger} minWidth={180}>
      <MenuDropdown.Item active={!seleccionado} onClick={() => onSelect(null)}>
        Todos
      </MenuDropdown.Item>
      {grupos.map((g) => (
        // Fila con nombre + botón ExternalLink que NO cierra el menú
        <div
          key={g.id}
          className={`flex items-center gap-1 pr-1.5 transition-colors ${
            selectedId === g.id ? "text-accent bg-accent/10" : "text-primary/70 hover:bg-primary/5"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(g.id)}
            className="flex-1 min-w-0 text-left pl-3 py-1.5 text-micro font-semibold truncate"
          >
            {g.nombre}
          </button>
          {onOpenGrupo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenGrupo(g.id);
              }}
              title="Abrir grupo"
              className="shrink-0 p-1 rounded hover:bg-primary/15 text-primary/40 hover:text-primary/80 transition-colors"
            >
              <ExternalLink size={10} />
            </button>
          )}
        </div>
      ))}
    </MenuDropdown>
  );
}

/** Barra horizontal con un dropdown por subtipo. */
export function GrupoFiltroBarra({
  bloques,
  grupoSeleccionadoId,
  onSeleccionarGrupo,
  onOpenGrupo,
}: {
  bloques: GrupoFiltroSubtipo[] | undefined;
  grupoSeleccionadoId: string | null | undefined;
  onSeleccionarGrupo: ((grupoId: string | null) => void) | undefined;
  onOpenGrupo?: (grupoId: string) => void;
}) {
  if (!bloques || bloques.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {bloques.map((bloque) => (
        <GrupoFiltroDropdown
          key={bloque.subtipo ?? "__sin-subtipo"}
          subtipo={bloque.subtipo}
          grupos={bloque.grupos}
          selectedId={
            bloque.grupos.some((g) => g.id === grupoSeleccionadoId)
              ? (grupoSeleccionadoId ?? null)
              : null
          }
          onSelect={(id) => onSeleccionarGrupo?.(id)}
          onOpenGrupo={onOpenGrupo}
        />
      ))}
    </div>
  );
}
