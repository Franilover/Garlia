"use client";

/**
 * EntidadesPage
 * ───────────────────────────────────────────────────────────────────────────
 * Combina Personajes + Criaturas + Items en una sola página: cada tipo es un
 * bloque con título y grid de tarjetas (imagen + nombre), todo scrolleable,
 * sin buscador ni columna de lista lateral.
 *
 * Al clickear una tarjeta se abre el editor de esa entidad a pantalla
 * completa (mismo store global: openEntity(section, id)); "Volver" en la
 * navbar limpia solo selectedId (clearSelection), volviendo al grid — la
 * sección activa sigue siendo "personajes"/"criaturas"/"items" según cuál se
 * abrió, así el editor correcto se muestra sin lógica extra acá.
 */

import { Bug, Package, Users } from "lucide-react";
import React, { useMemo } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { CriaturaEditor } from "../criaturas/CriaturaEditor";
import { ItemEditor } from "../items/ItemEditor";
import { PersonajeEditor } from "../personajes/PersonajeEditor";
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

interface Props {
  section: SectionKey;
  selectedId: string | null;
}

export function EntidadesPage({ section, selectedId }: Props) {
  const { data: personajes, loading: loadingP, addRow: addPersonaje } =
    useSupabaseData<Personaje>("personajes");
  const { data: criaturas, loading: loadingC, addRow: addCriatura } =
    useSupabaseData<Criatura>("criaturas");
  const { data: items, loading: loadingI, addRow: addItem } =
    useSupabaseData<Item>("items");
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

  const selected = selectedPersonaje ?? selectedCriatura ?? selectedItem ?? null;

  if (selected) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {selectedPersonaje && <PersonajeEditor personaje={selectedPersonaje} />}
        {selectedCriatura && <CriaturaEditor criatura={selectedCriatura} />}
        {selectedItem && <ItemEditor item={selectedItem} />}
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
    </div>
  );
}
