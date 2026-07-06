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

import { Bug, Map, MapPinned, Package, Users } from "lucide-react";
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
import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

interface Personaje {
  id: string;
  nombre: string;
  img_url?: string;
  reino?: string;
  especie?: string;
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
          ? "id, nombre, explicacion, imagen_url"
          : "id, nombre, explicacion, grupo_ids";

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
      <EntityCardGrid
        title="Personajes"
        Icon={Users}
        loading={loadingP}
        items={personajes.map((p) => ({ id: p.id, nombre: p.nombre, imageUrl: p.img_url }))}
        onItemClick={(id) => openEntity("personajes", id)}
        onCreate={async () => {
          const { data } = await addPersonaje({ nombre: "Nuevo personaje" });
          if (data?.id) openEntity("personajes", data.id);
        }}
      />
      <EntityCardGrid
        title="Criaturas"
        Icon={Bug}
        loading={loadingC}
        items={criaturas.map((c) => ({ id: c.id, nombre: c.nombre, imageUrl: c.imagen_url }))}
        onItemClick={(id) => openEntity("criaturas", id)}
        onCreate={async () => {
          const { data } = await addCriatura({ nombre: "Nueva criatura" });
          if (data?.id) openEntity("criaturas", data.id);
        }}
      />
      <EntityCardGrid
        title="Items"
        Icon={Package}
        loading={loadingI}
        items={items.map((i) => ({ id: i.id, nombre: i.nombre, imageUrl: i.imagen_url }))}
        onItemClick={(id) => openEntity("items", id)}
        onCreate={async () => {
          const { data } = await addItem({ nombre: "Nuevo objeto" });
          if (data?.id) openEntity("items", data.id);
        }}
      />
      <EntityCardGrid
        title="Reinos"
        Icon={Map}
        loading={loadingR}
        items={reinos.map((r) => ({ id: r.id, nombre: r.nombre }))}
        onItemClick={(id) => openEntity("reinos", id)}
        onCreate={async () => {
          const { data } = await addReino({ nombre: "Nuevo reino" });
          if (data?.id) openEntity("reinos", data.id);
        }}
      />
      <EntityCardGrid
        title="Ciudades"
        Icon={MapPinned}
        loading={loadingCd}
        items={ciudades.map((c) => ({ id: c.id, nombre: c.nombre }))}
        onItemClick={(id) => openEntity("ciudades", id)}
        onCreate={async () => {
          const { data } = await addCiudad({ nombre: "Nueva ciudad" });
          if (data?.id) openEntity("ciudades", data.id);
        }}
      />
      <EntityCardGrid
        title="Hechizos"
        Icon={hechizos.cfg.Icon}
        loading={hechizos.loading}
        creating={hechizos.creating}
        items={hechizos.items.map((i) => ({ id: i.id, nombre: i.nombre, imageUrl: i.imagen_url }))}
        onItemClick={(id) => openEntity("hechizos", id)}
        onCreate={async () => {
          const id = await hechizos.create();
          if (id) openEntity("hechizos", id);
        }}
      />
      <EntityCardGrid
        title="Dones"
        Icon={dones.cfg.Icon}
        loading={dones.loading}
        creating={dones.creating}
        items={dones.items.map((i) => ({ id: i.id, nombre: i.nombre, imageUrl: i.imagen_url }))}
        onItemClick={(id) => openEntity("dones", id)}
        onCreate={async () => {
          const id = await dones.create();
          if (id) openEntity("dones", id);
        }}
      />
      <EntityCardGrid
        title="Runas"
        Icon={runas.cfg.Icon}
        loading={runas.loading}
        creating={runas.creating}
        items={runas.items.map((i) => ({ id: i.id, nombre: i.nombre, imageUrl: i.imagen_url }))}
        onItemClick={(id) => openEntity("runas", id)}
        onCreate={async () => {
          const id = await runas.create();
          if (id) openEntity("runas", id);
        }}
      />
    </div>
  );
}
