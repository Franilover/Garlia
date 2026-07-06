"use client";

/**
 * GeografiaPage
 * ───────────────────────────────────────────────────────────────────────────
 * Combina Reinos + Ciudades en una sola página con grid de tarjetas.
 * Ninguna de las dos tablas tiene campo de imagen, así que las tarjetas
 * siempre muestran el ícono de fallback — mismo componente EntityCardGrid
 * que Entidades/Magia, solo sin imageUrl.
 */

import { Map, MapPinned } from "lucide-react";
import React, { useMemo } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

import { CiudadEditor } from "../ciudades/CiudadEditor";
import { ReinoEditor } from "../reinos/ReinoEditor";
import { EntityCardGrid } from "../shared/EntityCardGrid";
import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

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

export function GeografiaPage({ section, selectedId }: Props) {
  const { data: reinos, loading: loadingR, addRow: addReino } =
    useSupabaseData<Reino>("reinos");
  const { data: ciudades, loading: loadingCd, addRow: addCiudad } =
    useSupabaseData<Ciudad>("ciudades");
  const openEntity = useMundoNavigation((s) => s.openEntity);

  const selectedReino = useMemo(
    () => (section === "reinos" ? reinos.find((r) => r.id === selectedId) : null),
    [section, reinos, selectedId],
  );
  const selectedCiudad = useMemo(
    () => (section === "ciudades" ? ciudades.find((c) => c.id === selectedId) : null),
    [section, ciudades, selectedId],
  );

  const selected = selectedReino ?? selectedCiudad ?? null;

  if (selected) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {selectedReino && <ReinoEditor reino={selectedReino} />}
        {selectedCiudad && <CiudadEditor ciudad={selectedCiudad} />}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
    </div>
  );
}
