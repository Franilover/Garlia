"use client";

/**
 * DescargarDatosDropdown
 * ───────────────────────────────────────────────────────────────────────────
 * Ícono compacto que despliega un menú para elegir qué dataset descargar.
 *
 * Migrado a MenuDropdown — lógica de apertura/cierre/Escape unificada.
 */

import { Box, ChevronDown, Download, PawPrint, Users } from "lucide-react";
import React from "react";

import { MenuDropdown } from "@/domains/garlia/_shared/PanelColapsable";

export interface DescargarDatosDropdownProps {
  onDescargarItems?: () => void;
  onDescargarCriaturas?: () => void;
  onDescargarPersonajes?: () => void;
}

export function DescargarDatosDropdown({
  onDescargarItems,
  onDescargarCriaturas,
  onDescargarPersonajes,
}: DescargarDatosDropdownProps) {
  const opciones = [
    { key: "items",      label: "Items",      Icon: Box,      onClick: onDescargarItems },
    { key: "criaturas",  label: "Criaturas",  Icon: PawPrint, onClick: onDescargarCriaturas },
    { key: "personajes", label: "Personajes", Icon: Users,    onClick: onDescargarPersonajes },
  ].filter((o) => o.onClick);

  if (opciones.length === 0) return null;

  const trigger = (
    <button
      type="button"
      title="Descargar datos…"
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/[0.04] border border-primary/10 hover:bg-primary/10 transition-colors text-primary/50 hover:text-primary/80"
    >
      <Download size={13} />
      <ChevronDown size={10} className="shrink-0" />
    </button>
  );

  return (
    <MenuDropdown trigger={trigger} minWidth={180}>
      {opciones.map((o) => (
        <MenuDropdown.Item key={o.key} icon={<o.Icon size={11} />} onClick={o.onClick}>
          {o.label}
        </MenuDropdown.Item>
      ))}
    </MenuDropdown>
  );
}
