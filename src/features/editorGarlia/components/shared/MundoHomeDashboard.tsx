"use client";

/**
 * MundoHomeDashboard
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza a <MundoMenu /> como vista por defecto cuando section === null.
 * Home dashboard a pantalla completa:
 *   Título
 *   Resumen (conteos)
 *   [Botones de navegación]  [Favoritos arriba, Recientes abajo]
 * Las dos columnas usan todo el ancho disponible; en pantallas angostas
 * caen a una sola columna.
 *
 * IMPORTANTE: personajes/criaturas/items/reinos/ciudades/hechizos/dones/runas/
 * grupos/notas son 10 SectionKey distintas pero renderizan TODAS la misma
 * página combinada <EntidadesPage /> (ver switch en EditorMundoRoot), con el
 * bloque de Organización (Grupos + Notas) al fondo del grid. Por eso la
 * navegación principal usa una lista propia de "páginas reales" (ENTRIES),
 * no MUNDO_MENU_GROUPS.
 *
 * "Editado recientemente" usa el campo updated_at de personajes/criaturas/
 * items/reinos/ciudades (agregado vía migración SQL — ver
 * agregar-updated-at.sql). Organización/Capítulos/Letras no se incluyen
 * porque usan hooks propios con forma distinta (useNotas, useGrupos, etc.)
 * sin ese campo confirmado.
 *
 * "Favoritos" lee de useFavoritos (Zustand + persist, local al navegador).
 * Se marcan desde la estrella en cada EntityCard dentro de Entidades. El
 * color de la estrella usa la variable de tema --accent (clase text-accent/
 * fill-accent), igual que el resto de acentos de la app, no un color fijo.
 */

import { Clock, Mountain, Music, ScrollText, Star, Users } from "lucide-react";
import React, { useMemo } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { useFavoritos } from "../../hooks/mundo/useFavoritosStore";
import { useMundoNavigation, type SectionKey } from "../../hooks/mundo/useMundoNavigationStore";

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
    description:
      "Personajes, criaturas, items, reinos, ciudades, hechizos, dones, runas, grupos y notas",
    Icon: Users,
  },
  { key: "mapa", label: "Mapa", description: "Vista geográfica del mundo", Icon: Mountain },
  { key: "capitulos", label: "Capítulos", description: "Libros y capítulos", Icon: ScrollText },
  { key: "letras", label: "Letras", description: "Canciones y letras", Icon: Music },
  {
    key: "linea-tiempo",
    label: "Línea de Tiempo",
    description: "Eventos ordenados cronológicamente",
    Icon: Clock,
  },
];

/** Tablas/section de Entidades que tienen updated_at (ver migración SQL). */
const ENTIDADES_ICONS: Record<string, React.ElementType> = {
  personajes: Users,
  criaturas: Users,
  items: Users,
  reinos: Mountain,
  ciudades: Mountain,
};

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

interface RecienteRow {
  id: string;
  nombre: string;
  updated_at?: string | null;
}

function useRecientesPorTabla(tabla: string, section: SectionKey) {
  const { data, loading } = useSupabaseData<RecienteRow>(tabla);
  return useMemo(() => {
    if (loading) return { items: [], loading };
    const items = (data ?? [])
      .filter((r) => !!r.updated_at)
      .map((r) => ({ section, id: r.id, nombre: r.nombre, updated_at: r.updated_at as string }));
    return { items, loading };
  }, [data, loading, section]);
}

/** Widget genérico de chips clickeables, usado tanto por Favoritos como Recientes. */
function ChipListWidget({
  title,
  emptyLabel,
  loading,
  chips,
}: {
  title: string;
  emptyLabel?: string;
  loading?: boolean;
  chips: { key: string; label: string; onClick: () => void; Icon?: React.ElementType; starred?: boolean }[];
}) {
  return (
    <div>
      <h2 className="text-micro font-black uppercase tracking-widest text-primary/30 mb-3">
        {title}
      </h2>
      {loading && chips.length === 0 ? (
        <div className="text-xs text-primary/30">Cargando…</div>
      ) : chips.length === 0 ? (
        <div className="text-xs text-primary/25">{emptyLabel}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/10 bg-primary/[0.02] hover:bg-primary/5 hover:border-primary/25 transition-colors text-xs font-semibold text-primary/80"
            >
              {chip.starred ? (
                <Star size={12} className="text-accent fill-accent shrink-0" />
              ) : chip.Icon ? (
                <chip.Icon size={12} className="text-primary/40 shrink-0" />
              ) : null}
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FavoritosYRecientes() {
  const favoritos = useFavoritos((s) => s.favoritos);
  const openEntity = useMundoNavigation((s) => s.openEntity);

  const ordenados = useMemo(
    () => [...favoritos].sort((a, b) => b.addedAt - a.addedAt),
    [favoritos],
  );

  const personajes = useRecientesPorTabla("personajes", "personajes");
  const criaturas = useRecientesPorTabla("criaturas", "criaturas");
  const items = useRecientesPorTabla("items", "items");
  const reinos = useRecientesPorTabla("reinos", "reinos");
  const ciudades = useRecientesPorTabla("ciudades", "ciudades");

  const loadingRecientes =
    personajes.loading || criaturas.loading || items.loading || reinos.loading || ciudades.loading;

  const recientes = useMemo(() => {
    const todos = [
      ...personajes.items,
      ...criaturas.items,
      ...items.items,
      ...reinos.items,
      ...ciudades.items,
    ];
    return todos
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);
  }, [personajes.items, criaturas.items, items.items, reinos.items, ciudades.items]);

  const hasFavoritos = ordenados.length > 0;
  const hasRecientes = loadingRecientes || recientes.length > 0;

  if (!hasFavoritos && !hasRecientes) return null;

  return (
    <div className="flex flex-col gap-6">
      {hasFavoritos && (
        <ChipListWidget
          title="Favoritos"
          chips={ordenados.map((fav) => ({
            key: `${fav.section}:${fav.id}`,
            label: fav.nombre,
            starred: true,
            onClick: () => openEntity(fav.section, fav.id),
          }))}
        />
      )}
      {hasRecientes && (
        <ChipListWidget
          title="Editado recientemente"
          loading={loadingRecientes}
          chips={recientes.map((r) => ({
            key: `${r.section}:${r.id}`,
            label: r.nombre,
            Icon: ENTIDADES_ICONS[r.section] ?? Users,
            onClick: () => openEntity(r.section, r.id),
          }))}
        />
      )}
    </div>
  );
}

export function MundoHomeDashboard() {
  const selectSection = useMundoNavigation((s) => s.selectSection);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-primary">Editor de Mundo</h1>
          <p className="text-sm text-primary/40 mt-1">
            Elegí una sección para empezar a editar.
          </p>
        </header>

        <ResumenWidget />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

          <FavoritosYRecientes />
        </div>
      </div>
    </div>
  );
}
