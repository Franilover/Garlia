"use client";

/**
 * MundoMenu
 * ───────────────────────────────────────────────────────────────────────────
 * Menú de entrada cuando section === null. Ya no lista las 12 secciones
 * antiguas una por una — ahora que Entidades, Geografía, Magia y
 * Organización son páginas combinadas (grid de tarjetas con todos sus
 * tipos a la vez), el menú muestra una sola entrada grande por página.
 * Historia (Capítulos/Letras/Línea de Tiempo) sigue con sus 3 entradas
 * porque no se combinó.
 *
 * Clickear "Entidades" navega a section: "personajes" (la primera del
 * grupo) — el switch en EditorMundoRoot ya sabe que cualquiera de
 * personajes/criaturas/items renderiza <EntidadesPage />, así que no
 * importa cuál se use como entry point.
 */

import {
  Bug,
  Clock,
  Layers,
  Map,
  Mountain,
  Music,
  ScrollText,
  Sparkles,
} from "lucide-react";
import React from "react";

import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

interface MenuEntry {
  key: SectionKey;
  label: string;
  Icon: React.ElementType;
}

const MENU_ENTRIES: MenuEntry[] = [
  { key: "personajes", label: "Entidades", Icon: Bug },
  { key: "reinos", label: "Geografía", Icon: Map },
  { key: "mapa", label: "Mapa", Icon: Mountain },
  { key: "hechizos", label: "Magia", Icon: Sparkles },
  { key: "grupos", label: "Organización", Icon: Layers },
];

const HISTORIA_ENTRIES: MenuEntry[] = [
  { key: "capitulos", label: "Capítulos", Icon: ScrollText },
  { key: "letras", label: "Letras", Icon: Music },
  { key: "linea-tiempo", label: "Línea de Tiempo", Icon: Clock },
];

export function MundoMenu() {
  const selectSection = useMundoNavigation((s) => s.selectSection);

  return (
    <nav
      className="w-56 shrink-0 border-r border-primary/10 overflow-y-auto py-3"
      aria-label="Secciones del editor de mundo"
    >
      <div className="mb-3">
        <div className="flex flex-col gap-0.5 px-1.5">
          {MENU_ENTRIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => selectSection(item.key)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors text-left text-primary/70 hover:bg-primary/5 hover:text-primary"
            >
              <item.Icon size={12} strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 last:mb-0">
        <div className="px-4 pb-1 text-micro font-black uppercase tracking-widest text-primary/30">
          Historia
        </div>
        <div className="flex flex-col gap-0.5 px-1.5">
          {HISTORIA_ENTRIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => selectSection(item.key)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors text-left text-primary/60 hover:bg-primary/5 hover:text-primary"
            >
              <item.Icon size={12} strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

