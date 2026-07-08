"use client";

/**
 * EntidadesPage
 * ───────────────────────────────────────────────────────────────────────────
 * Combina TODAS las páginas de "grid de tarjetas" en una sola:
 * Personajes + Criaturas + Items (Entidades), Reinos + Ciudades (Geografía)
 * y Hechizos + Dones + Runas (Magia). Cada tipo sigue siendo un bloque con
 * título propio y su grid de tarjetas — solo que ahora viven todos juntos,
 * scrolleables, sin buscador ni columna de lista lateral.
 *
 * Al clickear una tarjeta se abre el editor de esa entidad a pantalla
 * completa (mismo store global: openEntity(section, id)); "Volver" en la
 * navbar limpia solo selectedId (clearSelection), volviendo al grid — la
 * sección activa sigue siendo la que se abrió, así el editor correcto se
 * muestra sin lógica extra acá.
 */

import { Bug } from "lucide-react";
import React, { useMemo, useState } from "react";

import { FormularioMagico } from "@/features/editorGarlia/components/magia/FormularioMagico";
import { CONFIG, type EntidadMagica } from "@/features/editorGarlia/components/magia/types";
import { useGruposCriaturas } from "@/features/editorGarlia/hooks/grupos/useGruposCriaturas";
import { useEntidadesMagicas } from "@/features/editorGarlia/hooks/misc/useEntidadesMagicas";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { supabase } from "@/lib/api/client/supabase";

import { CiudadEditor } from "../ciudades/CiudadEditor";
import { CriaturaEditor } from "../criaturas/CriaturaEditor";
import { ItemEditor } from "../items/ItemEditor";
import { PersonajeEditor } from "../personajes/PersonajeEditor";
import { ReinoEditor } from "../reinos/ReinoEditor";
import { EntityCardGrid } from "../shared/EntityCardGrid";
import { GeografiaJerarquica } from "../shared/GeografiaJerarquica";
import { MagiaJerarquica } from "../shared/MagiaJerarquica";
import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

interface Personaje {
  id: string;
  nombre: string;
  img_url?: string;
  reino?: string;
  especie?: string;
  ciudad_id?: string | null;
}
interface Criatura {
  id: string;
  nombre: string;
  imagen_url?: string;
  habitat?: string;
}
interface Item {
  id: string;
  nombre: string;
  imagen_url?: string;
  categoria?: string;
  criatura_id?: string | null;
}
interface Reino {
  id: string;
  nombre: string;
  oculto?: boolean;
}
interface Ciudad {
  id: string;
  nombre: string;
  tipo?: string | null;
  reino_id?: string | null;
}

interface Props {
  section: SectionKey;
  selectedId: string | null;
}

function useMagiaCategoria(modo: "hechizos" | "dones" | "runas") {
  const { items, setItems, loading } = useEntidadesMagicas(modo);
  const [creating, setCreating] = useState(false);
  const cfg = CONFIG[modo];

  const create = async (): Promise<string | null> => {
    setCreating(true);
    try {
      const insertPayload =
        modo === "runas"
          ? { nombre: `Nueva ${cfg.labelSing}` }
          : { nombre: `Nuevo ${cfg.labelSing}`, grupo_ids: [] };
      const selectFields =
        modo === "runas"
          ? "id, nombre, explicacion, imagen_url, criatura_id"
          : "id, nombre, explicacion, grupo_ids, criatura_id";

      const { data, error } = await supabase
        .from(cfg.tabla)
        .insert([insertPayload])
        .select(selectFields)
        .single();
      if (error) throw error;
      const created = data as unknown as EntidadMagica;
      setItems((prev) => [created, ...prev]);
      return created.id;
    } finally {
      setCreating(false);
    }
  };

  return { items, setItems, loading, creating, create, cfg };
}

export function EntidadesPage({ section, selectedId }: Props) {
  // ── Entidades ──────────────────────────────────────────────────────────
  const { data: personajes, loading: loadingP, addRow: addPersonaje } =
    useSupabaseData<Personaje>("personajes");
  const { data: criaturas, loading: loadingC, addRow: addCriatura } =
    useSupabaseData<Criatura>("criaturas");
  const { data: items, loading: loadingI, addRow: addItem } =
    useSupabaseData<Item>("items");

  // ── Geografía ──────────────────────────────────────────────────────────
  const { data: reinos, loading: loadingR, addRow: addReino } =
    useSupabaseData<Reino>("reinos");
  const { data: ciudades, loading: loadingCd, addRow: addCiudad } =
    useSupabaseData<Ciudad>("ciudades");

  // ── Magia ──────────────────────────────────────────────────────────────
  const hechizos = useMagiaCategoria("hechizos");
  const dones = useMagiaCategoria("dones");
  const runas = useMagiaCategoria("runas");
  const { grupos, loading: loadingGrupos } = useGruposCriaturas();

  const openEntity = useMundoNavigation((s) => s.openEntity);

  const [filtroEspecie, setFiltroEspecie] = useState<string | null>(null);
  const criaturaFiltro = useMemo(
    () => criaturas.find((c) => c.nombre === filtroEspecie) ?? null,
    [criaturas, filtroEspecie],
  );
  const personajesFiltrados = useMemo(
    () =>
      filtroEspecie ? personajes.filter((p) => p.especie === filtroEspecie) : personajes,
    [personajes, filtroEspecie],
  );
  const ciudadesFiltradas = useMemo(
    () =>
      filtroEspecie
        ? ciudades.filter((c) =>
            personajesFiltrados.some((p) => p.ciudad_id === c.id),
          )
        : ciudades,
    [ciudades, personajesFiltrados, filtroEspecie],
  );
  const reinosFiltrados = useMemo(
    () =>
      filtroEspecie
        ? reinos.filter(
            (r) =>
              ciudadesFiltradas.some((c) => c.reino_id === r.id) ||
              personajesFiltrados.some(
                (p) => !p.ciudad_id && p.reino === r.nombre,
              ),
          )
        : reinos,
    [reinos, ciudadesFiltradas, personajesFiltrados, filtroEspecie],
  );

  const selectedPersonaje = useMemo(
    () => (section === "personajes" ? personajes.find((p) => p.id === selectedId) : null),
    [section, personajes, selectedId],
  );
  const selectedCriatura = useMemo(
    () => (section === "criaturas" ? criaturas.find((c) => c.id === selectedId) : null),
    [section, criaturas, selectedId],
  );
  const selectedItem = useMemo(
    () => (section === "items" ? items.find((i) => i.id === selectedId) : null),
    [section, items, selectedId],
  );
  const selectedReino = useMemo(
    () => (section === "reinos" ? reinos.find((r) => r.id === selectedId) : null),
    [section, reinos, selectedId],
  );
  const selectedCiudad = useMemo(
    () => (section === "ciudades" ? ciudades.find((c) => c.id === selectedId) : null),
    [section, ciudades, selectedId],
  );

  const activeMagiaCategoria =
    section === "hechizos" ? hechizos : section === "dones" ? dones : section === "runas" ? runas : null;
  const selectedMagia = useMemo(
    () =>
      activeMagiaCategoria
        ? activeMagiaCategoria.items.find((i) => i.id === selectedId) ?? null
        : null,
    [activeMagiaCategoria, selectedId],
  );

  if (selectedMagia && activeMagiaCategoria) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <FormularioMagico
          key={selectedMagia.id}
          grupos={grupos}
          item={selectedMagia}
          loadingGrupos={loadingGrupos}
          modo={section as "hechizos" | "dones" | "runas"}
          onDeleted={(id) => {
            activeMagiaCategoria.setItems((prev) => prev.filter((i) => i.id !== id));
          }}
          onSaved={(updated) => {
            activeMagiaCategoria.setItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i)),
            );
          }}
          onNavigateCriatura={(id) => openEntity("criaturas", id)}
        />
      </div>
    );
  }

  const selected =
    selectedPersonaje ?? selectedCriatura ?? selectedItem ?? selectedReino ?? selectedCiudad ?? null;

  if (selected) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {selectedPersonaje && <PersonajeEditor personaje={selectedPersonaje} />}
        {selectedCriatura && <CriaturaEditor criatura={selectedCriatura} />}
        {selectedItem && <ItemEditor item={selectedItem} />}
        {selectedReino && <ReinoEditor reino={selectedReino} />}
        {selectedCiudad && <CiudadEditor ciudad={selectedCiudad} />}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="flex flex-col lg:flex-row-reverse gap-6">
        <aside className="lg:w-64 shrink-0 flex">
          <div className="w-full flex flex-col rounded-xl border border-primary/10 bg-primary/[0.03] p-3">
            <h3 className="text-micro font-black uppercase tracking-[0.2em] text-primary/50 mb-3 px-1 shrink-0">
              Filtrar por criatura
            </h3>

            <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto">
              <button
                type="button"
                onClick={() => setFiltroEspecie(null)}
                className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filtroEspecie === null
                    ? "bg-primary/15 text-primary"
                    : "text-primary/50 hover:bg-primary/10 hover:text-primary"
                }`}
              >
                Todos los personajes
              </button>
              {criaturas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setFiltroEspecie((prev) => (prev === c.nombre ? null : c.nombre))
                  }
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-bold leading-snug break-words transition-colors ${
                    filtroEspecie === c.nombre
                      ? "bg-primary/15 text-primary"
                      : "text-primary/50 hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>

            {criaturaFiltro && (
              <button
                type="button"
                onClick={() => openEntity("criaturas", criaturaFiltro.id)}
                className="mt-3 w-full shrink-0 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors text-micro font-bold uppercase tracking-wide text-accent"
              >
                <Bug size={11} />
                Editar criatura
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <GeografiaJerarquica
            reinos={reinosFiltrados}
            ciudades={ciudadesFiltradas}
            personajes={personajesFiltrados}
            loading={loadingR || loadingCd || loadingP}
            onOpen={(section, id) => openEntity(section, id)}
            onCreateReino={async () => {
              const { data } = await addReino({ nombre: "Nuevo reino" });
              if (data?.id) openEntity("reinos", data.id);
            }}
            onCreateCiudad={async (reinoId) => {
              const { data } = await addCiudad({ nombre: "Nueva ciudad", reino_id: reinoId });
              if (data?.id) openEntity("ciudades", data.id);
            }}
            onCreatePersonaje={async (ciudadId) => {
              const { data } = await addPersonaje({
                nombre: "Nuevo personaje",
                ciudad_id: ciudadId,
                ...(filtroEspecie ? { especie: filtroEspecie } : {}),
              });
              if (data?.id) openEntity("personajes", data.id);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <EntityCardGrid
            title="Criaturas"
            layout="half"
            Icon={Bug}
            loading={loadingC}
            items={criaturas.map((c) => ({ id: c.id, nombre: c.nombre, imageUrl: c.imagen_url }))}
            section="criaturas"
            onItemClick={(id) => openEntity("criaturas", id)}
            onCreate={async () => {
              const { data } = await addCriatura({ nombre: "Nueva criatura" });
              if (data?.id) openEntity("criaturas", data.id);
            }}
          />
        </div>
      </div>

      <MagiaJerarquica
        criaturas={criaturas}
        dones={dones.items}
        hechizos={hechizos.items}
        items={items}
        loading={loadingC || loadingI || hechizos.loading || dones.loading || runas.loading}
        runas={runas.items}
        onCreateHija={async (tipo, criaturaId) => {
          if (tipo === "items") {
            const { data } = await addItem({
              nombre: "Nuevo objeto",
              ...(criaturaId ? { criatura_id: criaturaId } : {}),
            });
            if (data?.id) openEntity("items", data.id);
            return;
          }
          const categoria = tipo === "hechizos" ? hechizos : tipo === "dones" ? dones : runas;
          const id = await categoria.create();
          if (id) {
            if (criaturaId) {
              await supabase.from(tipo).update({ criatura_id: criaturaId }).eq("id", id);
              categoria.setItems((prev) =>
                prev.map((i) => (i.id === id ? { ...i, criatura_id: criaturaId } as any : i)),
              );
            }
            openEntity(tipo, id);
          }
        }}
        onOpen={(section, id) => openEntity(section, id)}
      />
    </div>
  );
}
