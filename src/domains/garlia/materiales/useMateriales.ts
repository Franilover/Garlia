"use client";

/**
 * useMateriales.ts
 * ────────────────────────
 * Catálogo de Materiales (tabla real "materiales"). Las propiedades físicas
 * (propiedades_calculadas, capacidades_reactivas, estado_calculo) siguen
 * siendo de solo lectura desde el frontend — se derivan de composición/
 * microestructura por Supabase, no se editan a mano.
 *
 * Lo que SÍ se agregó acá (2026-08-28, mismo pedido de UI que
 * useEstructuras.ts: "click en título → Editar → renombrar/borrar"):
 * renombrarMaterial/eliminarMaterial — solo tocan "nombre" o borran la fila,
 * nunca los campos calculados.
 */

import { useMemo } from "react";

import {
  CONFIG_MATERIALES,
  type Material,
} from "@/domains/garlia/materiales/types";
import { supabase } from "@/infra/supabase/supabase";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

export function useMateriales() {
  const { data, setData, loading } = useSupabaseData<Material>(
    CONFIG_MATERIALES.tabla,
    {
      select: CONFIG_MATERIALES.select,
      order: { campo: "orden" },
    },
  );

  const items = useMemo(() => data, [data]);

  async function renombrarMaterial(id: string, nuevoNombre: string) {
    const { error } = await supabase
      .from(CONFIG_MATERIALES.tabla)
      .update({ nombre: nuevoNombre })
      .eq("id", id);
    if (error) {
      console.error("[useMateriales] error renombrando material:", error);
      return;
    }
    setData((prev) => prev.map((m) => (m.id === id ? { ...m, nombre: nuevoNombre } : m)));
  }

  async function eliminarMaterial(id: string) {
    const { error } = await supabase.from(CONFIG_MATERIALES.tabla).delete().eq("id", id);
    if (error) {
      console.error("[useMateriales] error eliminando material:", error);
      return;
    }
    setData((prev) => prev.filter((m) => m.id !== id));
  }

  return {
    items,
    loading,
    renombrarMaterial,
    eliminarMaterial,
  };
}
