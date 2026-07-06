"use client";

/**
 * MundoSidebar
 * ───────────────────────────────────────────────────────────────────────────
 * Antes, cambiar de "sección" implicaba una cascada: setTab + setMundoSection
 * + a veces setOpenItem(null) + setTimeout(() => setOpenItem(...)). Ahora es
 * una sola llamada a selectSection(key). El sidebar no sabe nada de datos,
 * Dexie ni Supabase — solo navega.
 */

import {
  Bug,
  Layers,
  Map,
  Mountain,
  MapPinned,
  Music,
  Package,
  ScrollText,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react";
import React from "react";

import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

const SECTIONS: { key: SectionKey; label: string; Icon: React.ElementType }[] = [
  { key: "personajes", label: "Personajes", Icon: Users },
  { key: "criaturas", label: "Criaturas", Icon: Bug },
  { key: "items", label: "Items", Icon: Package },
  { key: "reinos", label: "Reinos", Icon: Map },
  { key: "ciudades", label: "Ciudades", Icon: MapPinned },
  { key: "grupos", label: "Grupos", Icon: Layers },
  { key: "magia", label: "Magia", Icon: Sparkles },
  { key: "linea-tiempo", label: "Historia", Icon: ScrollText },
  { key: "capitulos", label: "Capítulos", Icon: ScrollText },
  { key: "letras", label: "Letras", Icon: Music },
  { key: "notas", label: "Notas", Icon: StickyNote },
  { key: "mapa", label: "Mapa", Icon: Mountain },
];

export function MundoSidebar() {
  const currentSection = useMundoNavigation((s) => s.section);
  const selectSection = useMundoNavigation((s) => s.selectSection);

  return (
    <nav
      className="flex flex-col gap-0.5 w-44 shrink-0 border-r border-primary/10 overflow-y-auto py-2"
      aria-label="Secciones del editor de mundo"
    >
      {SECTIONS.map(({ key, label, Icon }) => {
        const active = currentSection === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => selectSection(key)}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg mx-1.5 transition-colors text-left",
              active
                ? "bg-primary/10 text-primary"
                : "text-primary/50 hover:bg-primary/5 hover:text-primary/80",
            ].join(" ")}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
