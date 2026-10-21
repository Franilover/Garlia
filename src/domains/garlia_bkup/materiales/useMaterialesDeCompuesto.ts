"use client";

/**
 * useMaterialesDeCompuesto.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Camino inverso de useMaterialComponentes: dado un Compuesto, resuelve qué
 * Material(es) lo usan como componente (material_componentes.componente_tipo
 * = "compuesto", componente_id = compuesto.id) — para el breadcrumb
 * Elemento > Compuesto > Material del panel flotante de Compuesto (mismo
 * patrón que useCompuestoRoute.ts resuelve compuesto → su Estructura vía la
 * tabla puente estructura_compuestos: no hay columna directa, se busca en
 * la tabla puente ya cacheada por useSupabaseData).
 *
 * No existe (todavía) un vínculo directo compuesto → material en la tabla
 * "compuestos" — la relación vive solo en material_componentes, que hoy
 * únicamente registra componente_tipo="compuesto" (ver auditoría 2026-09-12:
 * 38/38 filas son "compuesto", sin otro tipo en producción todavía), así que
 * el filtro no necesita contemplar otros tipos por ahora.
 */

import { useMemo } from "react";

import {
  CONFIG_MATERIAL_COMPONENTES,
  type MaterialComponente,
} from "@/domains/garlia/materiales/types";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

import { useMateriales } from "./useMateriales";

export function useMaterialesDeCompuesto(compuestoId: string | null) {
  const { data: vinculos, loading: loadingVinculos } = useSupabaseData<MaterialComponente>(
    CONFIG_MATERIAL_COMPONENTES.tabla,
    { select: CONFIG_MATERIAL_COMPONENTES.select },
  );
  const { items: materiales, loading: loadingMateriales } = useMateriales();

  const items = useMemo(() => {
    if (!compuestoId) return [];
    const idsVinculados = new Set(
      vinculos
        .filter((v) => v.componente_tipo === "compuesto" && v.componente_id === compuestoId)
        .map((v) => v.material_id),
    );
    return materiales.filter((m) => idsVinculados.has(m.id));
  }, [vinculos, materiales, compuestoId]);

  return { items, loading: loadingVinculos || loadingMateriales };
}
