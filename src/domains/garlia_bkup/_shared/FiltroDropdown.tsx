"use client";

/**
 * FiltroDropdown
 * ───────────────────────────────────────────────────────────────────────────
 * Dropdown de filtro compacto para barras de catálogo (ej. Estructuras:
 * Tipo / Función / Geometría / Tags). Controlado: el padre guarda `value`
 * (null = "Todos"). Cada opción puede traer un `count` opcional.
 *
 * Migrado a MenuDropdown — lógica de apertura/cierre/Escape unificada.
 */

import { ChevronDown } from "lucide-react";
import React from "react";

import { MenuDropdown } from "@/domains/garlia/_shared/PanelColapsable";

export interface FiltroOpcion {
  value: string;
  label: string;
  count?: number;
}

export function FiltroDropdown({
  etiqueta,
  opciones,
  value,
  onChange,
}: {
  etiqueta: string;
  opciones: FiltroOpcion[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const seleccionada = opciones.find((o) => o.value === value) ?? null;

  const trigger = (
    <button
      type="button"
      title={etiqueta}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-bold uppercase tracking-wide transition-colors max-w-[160px] cursor-pointer ${
        seleccionada
          ? "text-accent border border-accent/60"
          : "text-primary/70 hover:text-primary border border-primary/25 hover:border-primary/50"
      }`}
    >
      <span className="truncate">{seleccionada ? seleccionada.label : etiqueta}</span>
      <ChevronDown size={10} className="shrink-0" />
    </button>
  );

  return (
    <MenuDropdown trigger={trigger} minWidth={180}>
      <MenuDropdown.Item active={!seleccionada} onClick={() => onChange(null)}>
        Todos
      </MenuDropdown.Item>
      {opciones.map((o) => (
        <MenuDropdown.Item
          key={o.value}
          active={o.value === value}
          count={o.count}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </MenuDropdown.Item>
      ))}
    </MenuDropdown>
  );
}
