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
  type SectionKey,
} from "../store/useMundoNavigationStore";

interface MenuItem {
  key: SectionKey;
  label: string;
  Icon: React.ElementType;
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
      { key: "hechizos", label: "Hechizos", Icon: Sparkles },
      { key: "runas", label: "Runas", Icon: ScrollText },
      { key: "dones", label: "Dones", Icon: Star },
    ],
  },
];

export function MundoMenu() {
  const selectSection = useMundoNavigation((s) => s.selectSection);

  const handleClick = (item: MenuItem) => {
    selectSection(item.key);
  };

  return (
    <nav
      className="w-56 shrink-0 border-r border-primary/10 overflow-y-auto py-3"
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
                key={`${item.key}-${i}`}
                type="button"
                onClick={() => handleClick(item)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors text-left text-primary/60 hover:bg-primary/5 hover:text-primary"
              >
                <item.Icon size={12} strokeWidth={2} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

