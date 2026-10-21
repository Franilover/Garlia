"use client";

/**
 * EditorCiudad.tsx
 * ──────────────────
 * View del editor de ciudades. Solo orquesta: maneja form/status y
 * delega el fetching de catálogos y la relación con entidades al
 * componente FormularioCiudad + hooks de useCiudadCatalogos.
 *
 * Migrado desde _legacy/views/EditorCiudad.tsx a domains/garlia/ciudades,
 * siguiendo el patrón de reinos. El supabase.from("ciudades") suelto que
 * vivía acá (update/delete) pasó a ciudadesQueries.
 */

import React, { useEffect, useState } from "react";

import type { WikiEntity } from "@/ui/Markdown/commandItems";
import { type SaveStatus } from "@/domains/garlia/_shared/types";
import { dexiePut, dexieDelete } from "@/infra/sync/useOfflineSync";
import { MapPin } from "lucide-react";

import { EditorHeaderBar } from "@/domains/garlia/_shared/EditorHeaderBar";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";

import { FormularioCiudad } from "./FormularioCiudad";
import { type Ciudad } from "../types";
import { ciudadesQueries } from "../queries";

// ─── EditorCiudad ──────────────────────────────────────────────────────────────
export function EditorCiudad({
  item,
  onSaved,
  onDeleted,
  entities = [],
  onSelectPersonaje,
  onSelectCriatura,
  onSelectItem,
  onNavigateReino,
  onHeaderControlsChange,
}: {
  item: Ciudad;
  onSaved: (l: Ciudad) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectPersonaje?: (id: string) => void;
  onSelectCriatura?: (id: string) => void;
  onSelectItem?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const [form, setForm] = useState<Ciudad>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setForm(item);
    setStatus("idle");
  }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      await ciudadesQueries.update(form.id, form);
      setStatus("saved");
      onSaved(form);
      void dexiePut("ciudades", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  // Confirmación inline en el header compartido (ver EditorHeaderBar) — el
  // modal de useConfirm quedaba atrapado por el backdrop-filter del panel
  // flotante ancestro, igual que en Reino/Item.
  const del = async () => {
    await ciudadesQueries.delete(form.id);
    void dexieDelete("ciudades", form.id);
    onDeleted(form.id);
  };

  const headerControls = {
    imagenUrl: form.imagen_url,
    IconoFallback: MapPin,
    nombre: form.nombre ?? "",
    placeholderNombre: "Nombre de la ciudad",
    onChangeNombre: (nombre: string) => setForm((f) => ({ ...f, nombre })),
    status,
    onGuardar: save,
    onEliminar: del,
  };
  usePublishHeaderControls(headerControls, onHeaderControlsChange);

  return (
    <>
      {!onHeaderControlsChange && <EditorHeaderBar controls={headerControls} />}
      <FormularioCiudad
        entities={entities}
        form={form}
        hideOwnHeader={!!onHeaderControlsChange}
        setForm={setForm}
        status={status}
        onDelete={del}
        onNavigateReino={onNavigateReino}
        onSave={save}
        onSelectCriatura={onSelectCriatura}
        onSelectItem={onSelectItem}
        onSelectPersonaje={onSelectPersonaje}
      />
    </>
  );
}
