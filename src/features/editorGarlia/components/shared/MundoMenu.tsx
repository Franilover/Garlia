"use client";

/**
 * MundoMenu
 * ───────────────────────────────────────────────────────────────────────────
 * Menú de entrada cuando section === null. Entidades, Geografía, Magia y
 * Organización ya no son entradas separadas: personajes/criaturas/items/
 * reinos/ciudades/hechizos/dones/runas/grupos/notas viven TODOS en
 * <EntidadesPage />, así que acá se muestra una sola entrada "Entidades"
 * para todas ellas (Organización aparece como bloque al fondo del grid).
 * Mapa sigue siendo página propia. Historia (Capítulos/Letras/Línea de
 * Tiempo) sigue con sus 3 entradas porque no se combinó.
 *
 * Clickear "Entidades" navega a section: "personajes" (la primera del
 * grupo) — el switch en EditorMundoRoot ya sabe que cualquiera de
 * personajes/criaturas/items/reinos/ciudades/hechizos/dones/runas/grupos/
 * notas renderiza <EntidadesPage />, así que no importa cuál se use como
 * entry point.
 */

import { Clock, Mountain, Music, ScrollText, Users } from "lucide-react";
import React from "react";

import { useMundoNavigation, type SectionKey } from "../../hooks/mundo/useMundoNavigationStore";

interface MenuEntry {
  key: SectionKey;
  label: string;
  Icon: React.ElementType;
}

const MENU_ENTRIES: MenuEntry[] = [
  { key: "personajes", label: "Entidades", Icon: Users },
  { key: "mapa", label: "Mapa", Icon: Mountain },
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

