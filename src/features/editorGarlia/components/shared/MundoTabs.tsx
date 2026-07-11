"use client";

/**
 * MundoTabs
 * ───────────────────────────────────────────────────────────────────────────
 * Navbar secundaria fija arriba del editor de mundo, siempre visible.
 * Reemplaza a <MundoMenu /> (sidebar, código muerto) y a <MundoHomeDashboard />
 * (pantalla de bienvenida cuando section === null): ahora no hay pantalla
 * intermedia, las 4 tabs llevan directo a cada página.
 *
 * Tabs:
 *   - Inicio      → resumen, favoritos y recientes (antes vivía en el
 *                   dashboard de bienvenida; ver MundoHomeContent)
 *   - Entidades   → <EntidadesPage /> (personajes/criaturas/items/reinos/
 *                   ciudades/hechizos/dones/runas/grupos/notas/letras)
 *   - Mapa        → <MapaSection />
 *   - Historia    → agrupa Capítulos + Línea de Tiempo (2 sub-botones,
 *                   ninguno tiene contenido propio que amerite tab aparte)
 *
 * "activeTab" se deriva de section: cualquier SectionKey de Entidades marca
 * la tab "entidades" activa, etc. Clickear una tab llama a selectSection con
 * la entrada por defecto de ese grupo.
 */

import { Clock, Home, Mountain, ScrollText, Users } from "lucide-react";
import React from "react";

import { useMundoNavigation, type SectionKey } from "../../hooks/mundo/useMundoNavigationStore";

const ENTIDADES_SECTIONS: SectionKey[] = [
  "personajes",
  "criaturas",
  "items",
  "reinos",
  "ciudades",
  "hechizos",
  "dones",
  "runas",
  "grupos",
  "notas",
  "letras",
];
const HISTORIA_SECTIONS: SectionKey[] = ["capitulos", "linea-tiempo"];

type TabKey = "inicio" | "entidades" | "mapa" | "historia";

interface Tab {
  key: TabKey;
  label: string;
  Icon: React.ElementType;
}

const TABS: Tab[] = [
  { key: "inicio", label: "Inicio", Icon: Home },
  { key: "entidades", label: "Entidades", Icon: Users },
  { key: "mapa", label: "Mapa", Icon: Mountain },
  { key: "historia", label: "Historia", Icon: ScrollText },
];

function tabKeyOf(section: SectionKey | null): TabKey {
  if (section === null) return "inicio";
  if (section === "mapa") return "mapa";
  if (HISTORIA_SECTIONS.includes(section)) return "historia";
  if (ENTIDADES_SECTIONS.includes(section)) return "entidades";
  return "inicio";
}

export function MundoTabs() {
  const section = useMundoNavigation((s) => s.section);
  const selectSection = useMundoNavigation((s) => s.selectSection);
  const goToMenu = useMundoNavigation((s) => s.goToMenu);
  const activeTab = tabKeyOf(section);

  const handleClick = (tab: TabKey) => {
    if (tab === "inicio") return goToMenu();
    if (tab === "entidades") return selectSection("personajes");
    if (tab === "mapa") return selectSection("mapa");
    if (tab === "historia") return selectSection("capitulos");
  };

  return (
    <div className="shrink-0 relative border-b border-primary/10" style={{ background: "var(--bg-main)" }}>
      <nav className="flex items-center gap-1 px-4 py-2" aria-label="Secciones del editor de mundo">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleClick(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-primary/50 hover:bg-primary/5 hover:text-primary/80"
              }`}
            >
              <tab.Icon size={13} strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "historia" && (
        <div className="flex items-center gap-1 px-4 pb-2 -mt-1">
          <button
            type="button"
            onClick={() => selectSection("capitulos")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-micro font-semibold transition-colors ${
              section === "capitulos"
                ? "bg-primary/10 text-primary"
                : "text-primary/40 hover:bg-primary/5 hover:text-primary/70"
            }`}
          >
            <ScrollText size={11} /> Capítulos
          </button>
          <button
            type="button"
            onClick={() => selectSection("linea-tiempo")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-micro font-semibold transition-colors ${
              section === "linea-tiempo"
                ? "bg-primary/10 text-primary"
                : "text-primary/40 hover:bg-primary/5 hover:text-primary/70"
            }`}
          >
            <Clock size={11} /> Línea de Tiempo
          </button>
        </div>
      )}
    </div>
  );
}
