"use client";

/**
 * useEstructuras.ts
 * ────────────────────────
 * Catálogo de Estructuras (tabla real "estructuras"): capa nueva entre
 * Compuesto y Célula — agrupa Compuestos espacialmente (vía
 * estructura_compuestos) con propiedades calculadas propias (masa/rigidez/
 * estabilidad/etc. en propiedades_calculadas, jsonb).
 *
 * Las propiedades calculadas (propiedades_calculadas, estado_calculo, etc.)
 * siguen siendo de solo lectura desde el frontend — se generan por
 * migración/cálculo, no por edición manual. Lo que SÍ se agregó acá
 * (2026-08-28, pedido de UI "click en título → Editar → renombrar/borrar"):
 * renombrarEstructura/eliminarEstructura, análogos a los de useCompuestos —
 * solo tocan el campo "nombre" o borran la fila entera, nunca los campos
 * calculados.
 *
 * Mismo patrón useSupabaseData que useCompuestos.ts / useOrganismos.ts.
 */

import { useMemo } from "react";

import { CONFIG_ESTRUCTURAS, type Estructura } from "@/domains/garlia/elementos/types";
import { supabase } from "@/infra/supabase/supabase";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

export function useEstructuras() {
  const { data, setData, loading } = useSupabaseData<Estructura>(CONFIG_ESTRUCTURAS.tabla, {
    select: CONFIG_ESTRUCTURAS.select,
    order: { campo: "created_at" },
  });

  const items = useMemo(() => data, [data]);

  async function renombrarEstructura(id: string, nuevoNombre: string) {
    const { error } = await supabase
      .from(CONFIG_ESTRUCTURAS.tabla)
      .update({ nombre: nuevoNombre })
      .eq("id", id);
    if (error) {
      console.error("[useEstructuras] error renombrando estructura:", error);
      return;
    }
    setData((prev) => prev.map((e) => (e.id === id ? { ...e, nombre: nuevoNombre } : e)));
  }

  async function eliminarEstructura(id: string) {
    const { error } = await supabase.from(CONFIG_ESTRUCTURAS.tabla).delete().eq("id", id);
    if (error) {
      console.error("[useEstructuras] error eliminando estructura:", error);
      return;
    }
    setData((prev) => prev.filter((e) => e.id !== id));
  }

  return { items, loading, renombrarEstructura, eliminarEstructura };
}
