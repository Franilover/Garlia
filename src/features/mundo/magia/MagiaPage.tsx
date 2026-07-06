"use client";

/**
 * MagiaPage
 * ───────────────────────────────────────────────────────────────────────────
 * Combina Hechizos + Dones + Runas en una sola página con grid de tarjetas
 * (imagen si tiene, ícono de fallback si no). Usa useEntidadesMagicas por
 * separado para cada modo (mismo hook que ya usaba EditorHechizos) y delega
 * el editor de detalle a FormularioMagico, igual que antes.
 */

import React, { useMemo, useState } from "react";

import { FormularioMagico } from "@/features/editorGarlia/components/magia/FormularioMagico";
import { CONFIG, type EntidadMagica } from "@/features/editorGarlia/components/magia/types";
import { useGruposCriaturas } from "@/features/editorGarlia/hooks/grupos/useGruposCriaturas";
import { useEntidadesMagicas } from "@/features/editorGarlia/hooks/misc/useEntidadesMagicas";
import { supabase } from "@/lib/api/client/supabase";

import { EntityCardGrid } from "../shared/EntityCardGrid";
import { useMundoNavigation, type SectionKey } from "../store/useMundoNavigationStore";

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

export function MagiaPage({ section, selectedId }: Props) {
  const hechizos = useMagiaCategoria("hechizos");
  const dones = useMagiaCategoria("dones");
  const runas = useMagiaCategoria("runas");
  const { grupos, loading: loadingGrupos } = useGruposCriaturas();
  const openEntity = useMundoNavigation((s) => s.openEntity);

  const activeCategoria =
    section === "hechizos" ? hechizos : section === "dones" ? dones : section === "runas" ? runas : null;

  const selected = useMemo(
    () => (activeCategoria ? activeCategoria.items.find((i) => i.id === selectedId) ?? null : null),
    [activeCategoria, selectedId],
  );

  if (selected && activeCategoria) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <FormularioMagico
          key={selected.id}
          grupos={grupos}
          item={selected}
          loadingGrupos={loadingGrupos}
          modo={section as "hechizos" | "dones" | "runas"}
          onDeleted={(id) => {
            activeCategoria.setItems((prev) => prev.filter((i) => i.id !== id));
          }}
          onSaved={(updated) => {
            activeCategoria.setItems((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i)),
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
