"use client";

/**
 * useEntidadesMagicas.ts
 * ────────────────────────
 * Catálogo de hechizos/dones/runas: Dexie primero, Supabase después,
 * sincronización local al final.
 *
 * Ruta destino:
 *   src/features/editorGarlia/hooks/useEntidadesMagicas.ts
 */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/api/client/supabase";
import { dexieReadAll, dexieWriteAll } from "@/lib/utils/dexieHelpers";

import { CONFIG, type EntidadMagica, type Modo } from "../../components/Magia/types";

export function useEntidadesMagicas(modo: Modo) {
  const [items, setItems] = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const tabla = CONFIG[modo].tabla;
    const selectFields =
      modo === "runas"
        ? "id, nombre, explicacion, imagen_url"
        : "id, nombre, explicacion, grupo_ids, imagen_url";

    const local = await dexieReadAll<EntidadMagica>(tabla);
    if (local.length) {
      setItems(local);
      setLoading(false);
    }

    if (!navigator.onLine) {
      if (!local.length) setLoading(false);
      return;
    }

    setLoading(!local.length);
    const { data } = await supabase.from(tabla).select(selectFields).order("nombre");
    const result = (data ?? []) as unknown as EntidadMagica[];
    setItems(result);
    setLoading(false);
    await dexieWriteAll(tabla, result);
  }, [modo]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, loading };
}
