"use client";

/**
 * MundoMenu
 * ───────────────────────────────────────────────────────────────────────────
 * Ya NO es un sidebar fijo al costado. Es la vista que ocupa el panel
 * angosto (mismo w-64 que las listas de cada sección) cuando no hay ninguna
 * sección elegida (section === null). Al tocar una categoría, ese mismo
 * panel se "convierte" en la lista de esa sección — no se agrega una
 * columna nueva al lado. Volver atrás se hace con la X que cada Section
 * muestra en su propio header (ver SectionListHeader).
 *
 * Agrupado según lo pedido:
 *   Personajes / Criaturas / Items
 *   Mapa / Reinos / Ciudades
 *   Capítulos / Letras / Línea de Tiempo
 *   Grupos / Notas
 *   Hechizos / Runas / Dones
 */

import {
  Bug,
  Clock,
  Layers,
  Map,
  Mountain,
  MapPinned,
  Music,
  Package,
  ScrollText,
  Sparkles,
  Star,
  StickyNote,
  Users,
} from "lucide-react";
import React from "react";

import {
  useMundoNavigation,
  type MagiaTipo,
  type SectionKey,
} from "../store/useMundoNavigationStore";

interface MenuItem {
  key: SectionKey;
  label: string;
  Icon: React.ElementType;
  /** Si se define, abre "magia" con este sub-tipo en vez de section=key */
  magiaTipo?: MagiaTipo;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const GROUPS: MenuGroup[] = [
  {
    title: "Entidades",
    items: [
      { key: "personajes", label: "Personajes", Icon: Users },
      { key: "criaturas", label: "Criaturas", Icon: Bug },
      { key: "items", label: "Items", Icon: Package },
    ],
  },
  {
    title: "Geografía",
    items: [
      { key: "mapa", label: "Mapa", Icon: Mountain },
      { key: "reinos", label: "Reinos", Icon: Map },
      { key: "ciudades", label: "Ciudades", Icon: MapPinned },
    ],
  },
  {
    title: "Historia",
    items: [
      { key: "capitulos", label: "Capítulos", Icon: ScrollText },
      { key: "letras", label: "Letras", Icon: Music },
      { key: "linea-tiempo", label: "Línea de Tiempo", Icon: Clock },
    ],
  },
  {
    title: "Organización",
    items: [
      { key: "grupos", label: "Grupos", Icon: Layers },
      { key: "notas", label: "Notas", Icon: StickyNote },
    ],
  },
  {
    title: "Magia",
    items: [
      { key: "magia", label: "Hechizos", Icon: Sparkles, magiaTipo: "hechizos" },
      { key: "magia", label: "Runas", Icon: ScrollText, magiaTipo: "runas" },
      { key: "magia", label: "Dones", Icon: Star, magiaTipo: "dones" },
    ],
  },
];

export function MundoMenu() {
  const selectSection = useMundoNavigation((s) => s.selectSection);
  const selectMagiaTipo = useMundoNavigation((s) => s.selectMagiaTipo);

  const handleClick = (item: MenuItem) => {
    if (item.magiaTipo) {
      // Entra directo al sub-tipo de magia elegido, sin selectedId todavía.
      selectMagiaTipo(item.magiaTipo);
      selectSection("magia");
      return;
    }
    selectSection(item.key);
  };

  return (
    <nav
      className="w-64 shrink-0 border-r border-primary/10 overflow-y-auto py-3"
      aria-label="Secciones del editor de mundo"
    >
      {GROUPS.map((group) => (
        <div key={group.title} className="mb-3 last:mb-0">
          <div className="px-4 pb-1 text-micro font-black uppercase tracking-widest text-primary/30">
            {group.title}
          </div>
          <div className="flex flex-col gap-0.5 px-1.5">
            {group.items.map((item, i) => (
              <button
                key={`${item.key}-${item.magiaTipo ?? i}`}
                type="button"
                onClick={() => handleClick(item)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors text-left text-primary/60 hover:bg-primary/5 hover:text-primary"
              >
                <item.Icon size={14} strokeWidth={2} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

