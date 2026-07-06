"use client";

/**
 * MundoHomeDashboard
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza a <MundoMenu /> como vista por defecto cuando section === null.
 * Home dashboard a pantalla completa: tarjetas grandes de navegación +
 * widget de resumen con conteos reales (personajes/criaturas/items/reinos/
 * ciudades, las únicas tablas confirmadas vía useSupabaseData en
 * EntidadesPage — Organización/Capítulos/Letras usan hooks propios con forma
 * distinta, así que no se fuerzan acá para no mostrar datos incorrectos).
 *
 * IMPORTANTE: personajes/criaturas/items/reinos/ciudades/hechizos/dones/runas
 * son 8 SectionKey distintas pero renderizan TODAS la misma página combinada
 * <EntidadesPage /> (ver switch en EditorMundoRoot). Lo mismo para
 * grupos/notas → <OrganizacionPage />. Por eso la navegación principal usa
 * una lista propia de "páginas reales" (ENTRIES), no MUNDO_MENU_GROUPS.
 */

import { Clock, Layers, Mountain, Music, ScrollText, Users } from "lucide-react";
import React from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

interface DashboardEntry {
  key: SectionKey;
  label: string;
  description: string;
  Icon: React.ElementType;
}

const ENTRIES: DashboardEntry[] = [
  {
    key: "personajes",
    label: "Entidades",
    description: "Personajes, criaturas, items, reinos, ciudades, hechizos, dones y runas",
    Icon: Users,
  },
  { key: "mapa", label: "Mapa", description: "Vista geográfica del mundo", Icon: Mountain },
  {
    key: "grupos",
    label: "Organización",
    description: "Grupos y notas",
    Icon: Layers,
  },
  { key: "capitulos", label: "Capítulos", description: "Libros y capítulos", Icon: ScrollText },
  { key: "letras", label: "Letras", description: "Canciones y letras", Icon: Music },
  {
    key: "linea-tiempo",
    label: "Línea de Tiempo",
    description: "Eventos ordenados cronológicamente",
    Icon: Clock,
  },
];

function useCount(tabla: string) {
  const { data, loading } = useSupabaseData<{ id: string }>(tabla);
  return { count: data?.length ?? 0, loading };
}

function StatChip({ label, count, loading }: { label: string; count: number; loading: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/10 bg-primary/[0.02]">
      <span className="text-base font-black text-primary/80 tabular-nums min-w-[1.5ch]">
        {loading ? "–" : count}
      </span>
      <span className="text-micro font-semibold uppercase tracking-wide text-primary/40">
        {label}
      </span>
    </div>
  );
}

function ResumenWidget() {
  const personajes = useCount("personajes");
  const criaturas = useCount("criaturas");
  const items = useCount("items");
  const reinos = useCount("reinos");
  const ciudades = useCount("ciudades");

  return (
    <div className="mb-8">
      <h2 className="text-micro font-black uppercase tracking-widest text-primary/30 mb-3">
        Resumen
      </h2>
      <div className="flex flex-wrap gap-2">
        <StatChip label="Personajes" count={personajes.count} loading={personajes.loading} />
        <StatChip label="Criaturas" count={criaturas.count} loading={criaturas.loading} />
        <StatChip label="Items" count={items.count} loading={items.loading} />
        <StatChip label="Reinos" count={reinos.count} loading={reinos.loading} />
        <StatChip label="Ciudades" count={ciudades.count} loading={ciudades.loading} />
      </div>
    </div>
  );
}

export function MundoHomeDashboard() {
  const selectSection = useMundoNavigation((s) => s.selectSection);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-primary">Editor de Mundo</h1>
          <p className="text-sm text-primary/40 mt-1">
            Elegí una sección para empezar a editar.
          </p>
        </header>

        <ResumenWidget />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENTRIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => selectSection(item.key)}
              className="group flex flex-col items-start gap-4 p-6 rounded-3xl border border-primary/10 bg-primary/[0.02] text-left transition-colors hover:bg-primary/5 hover:border-primary/25 min-h-[168px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center group-hover:border-primary/25 transition-colors">
                <item.Icon size={26} className="text-primary/60" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-lg font-black text-primary/85 mb-1">{item.label}</div>
                <div className="text-xs text-primary/40 leading-snug">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
