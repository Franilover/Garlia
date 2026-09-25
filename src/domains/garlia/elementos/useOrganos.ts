"use client";

/**
 * useOrganos.ts
 * ────────────────────────
 * Catálogo de Órganos (tabla real "organos"): nombre/función/notas, sin
 * fórmula propia — la composición vive debajo, en Tejidos/Células (ver
 * useOrganoTejidos.ts). Se vincula N:N a plantas (planta_organos),
 * criaturas (criatura_organos) e items (item_estructura), todas vía la
 * columna puente `grupo_compuesto_id` (nombre histórico, hoy apunta a
 * organos.id).
 *
 * Reemplaza a useEstructurasEnsambladas.ts, que apuntaba a la tabla ya
 * eliminada "estructuras_ensambladas". Mismo patrón useSupabaseData que
 * useCompuestos.ts.
 */

import { useCallback, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { CONFIG_ORGANOS, type Organo } from "@/domains/garlia/elementos/types";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

export function useOrganos() {
  const { data, setData, loading } = useSupabaseData<Organo>(CONFIG_ORGANOS.tabla, {
    select: CONFIG_ORGANOS.select,
    order: { campo: "created_at" },
  });

  const items = useMemo(() => data, [data]);

  const [creando, setCreando] = useState(false);

  // ── Crear/eliminar (2026-09-25) — agregado para que la tab "Órganos" de
  // BiologiaCatalogos pueda ofrecer Añadir/Editar en su título, mismo
  // patrón que useCelulas.ts/useTejidos.ts. Antes este hook solo exponía
  // items/loading — "actualizar" seguía viviendo inline en BiologiaPage.tsx
  // (actualizarOrgano) y no se duplica acá. ─────────────────────────────
  const crear = useCallback(async () => {
    setCreando(true);
    try {
      const { data: nuevo, error } = await supabase
        .from(CONFIG_ORGANOS.tabla)
        .insert([{ nombre: "Nuevo órgano" }])
        .select()
        .single();
      if (error || !nuevo) return null;
      setData((prev) => [...prev, nuevo as Organo]);
      return nuevo as Organo;
    } finally {
      setCreando(false);
    }
  }, [setData]);

  const eliminar = useCallback(
    async (id: string) => {
      const { error } = await supabase.from(CONFIG_ORGANOS.tabla).delete().eq("id", id);
      if (error) {
        console.error("[useOrganos] error eliminando órgano:", error);
        return { ok: false, error };
      }
      setData((prev) => prev.filter((o) => o.id !== id));
      return { ok: true, error: null };
    },
    [setData],
  );

  return { items, setItems: setData, loading, creando, crear, eliminar };
}
