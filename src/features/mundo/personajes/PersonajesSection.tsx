"use client";

/**
 * PersonajesSection
 * ───────────────────────────────────────────────────────────────────────────
 * Patrón de referencia para el resto de las secciones (criaturas, items,
 * reinos, ciudades, grupos...). Cosas a notar:
 *
 *   1. Un solo hook de datos: useSupabaseData("personajes"). Ya trae Dexie
 *      (offline-first), realtime, reconexión con backoff y CRUD con cola
 *      offline. Cero funciones dexieReadAll/dexieWriteAll locales.
 *
 *   2. Esta sección NO sabe que existen criaturas, items, reinos, etc. Si
 *      personajes tiene un bug o un re-render pesado, no afecta a nada más
 *      — antes todo compartía el mismo componente de 2395 líneas.
 *
 *   3. Navegación hacia/desde esta sección pasa por useMundoNavigation(),
 *      nunca por props drilling de callbacks tipo onSelect/onCreated que
 *      subían y bajaban por 3 niveles de componentes.
 *
 *   4. selectedId/navKey vienen del padre (EditorMundoRoot) porque son
 *      responsabilidad del store de navegación global, no de esta sección.
 *      La sección los usa solo para saber qué mostrar.
 */

import { Users } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { useMundoNavigation } from "../store/useMundoNavigationStore";
import { SectionListHeader } from "../shared/SectionListHeader";
import { PersonajeEditor } from "./PersonajeEditor";

interface Personaje {
  id: string;
  nombre: string;
  img_url?: string;
  reino?: string;
  especie?: string;
}

interface Props {
  selectedId: string | null;
  navKey: number;
}

export function PersonajesSection({ selectedId }: Props) {
  const { data: personajes, loading, addRow } = useSupabaseData<Personaje>("personajes");
  const openEntity = useMundoNavigation((s) => s.openEntity);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return personajes;
    return personajes.filter((p) => p.nombre?.toLowerCase().includes(q));
  }, [personajes, query]);

  const selected = useMemo(
    () => personajes.find((p) => p.id === selectedId) ?? null,
    [personajes, selectedId],
  );

  const handleCreate = async () => {
    const { data } = await addRow({ nombre: "Nuevo personaje" });
    if (data?.id) openEntity("personajes", data.id);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Lista — se oculta al abrir un personaje, el editor pasa a ocupar todo el ancho */}
      <div
        className={[
          "w-64 shrink-0 border-r border-primary/10 flex flex-col min-h-0",
          selected ? "hidden" : "flex",
        ].join(" ")}
      >
        <SectionListHeader
          query={query}
          onQueryChange={setQuery}
          onCreate={handleCreate}
          placeholder="Buscar personaje…"
          createLabel="Crear personaje"
          hasSelection={!!selected}
        />

        <div className="flex-1 overflow-y-auto">
          {loading && personajes.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-primary/30 text-center">Sin resultados</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openEntity("personajes", p.id)}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  p.id === selectedId
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-primary/70 hover:bg-primary/5",
                ].join(" ")}
              >
                <Users size={12} className="shrink-0 opacity-50" />
                <span className="truncate">{p.nombre}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {selected ? (
          <PersonajeEditor personaje={selected} />
        ) : (
          <div className="h-full flex items-center justify-center text-primary/20 text-xs">
            Elegí un personaje de la lista, o creá uno nuevo
          </div>
        )}
      </div>
    </div>
  );
}
