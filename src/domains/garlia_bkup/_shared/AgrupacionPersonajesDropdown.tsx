"use client";

/**
 * AgrupacionPersonajesDropdown
 * ───────────────────────────────────────────────────────────────────────────
 * Ícono tipo dropdown para elegir la agrupación de la vista de Entidades:
 * por Reino, por Criatura (Biomas) o por Items.
 *
 * Migrado a MenuDropdown — lógica de apertura/cierre/Escape unificada.
 */

import { Bug, ChevronDown, Map, Package } from "lucide-react";
import React from "react";

import { MenuDropdown } from "@/domains/garlia/_shared/PanelColapsable";

export type AgrupacionPersonajes = "reino" | "criatura" | "items";

const OPCIONES: { value: AgrupacionPersonajes; label: string; Icon: React.ElementType }[] = [
  { value: "reino",    label: "Reinos",  Icon: Map     },
  { value: "criatura", label: "Biomas",  Icon: Bug     },
  { value: "items",    label: "Items",   Icon: Package },
];

export function AgrupacionPersonajesDropdown({
  value,
  onChange,
}: {
  value: AgrupacionPersonajes;
  onChange: (value: AgrupacionPersonajes) => void;
}) {
  const actual = OPCIONES.find((o) => o.value === value) ?? OPCIONES[0];

  const trigger = (
    <button
      type="button"
      title={`Agrupar: ${actual.label}`}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/[0.04] border border-primary/10 hover:bg-primary/10 transition-colors text-primary/60"
    >
      <actual.Icon size={12} />
      <ChevronDown size={10} className="shrink-0" />
    </button>
  );

  return (
    <MenuDropdown trigger={trigger} minWidth={160}>
      {OPCIONES.map((o) => (
        <MenuDropdown.Item
          key={o.value}
          active={value === o.value}
          icon={<o.Icon size={11} />}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </MenuDropdown.Item>
      ))}
    </MenuDropdown>
  );
}
