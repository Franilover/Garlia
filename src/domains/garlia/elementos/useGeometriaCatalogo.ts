"use client";

/**
 * useGeometriaCatalogo.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Catálogo global de Formas y Leyes geométricas (tablas "formas_geometricas"
 * / "leyes_geometricas") — solo lectura desde acá, igual que useEstructuras
 * trata propiedades_calculadas: estas tablas se pueblan por migración/
 * documentación del sistema físico, no por edición manual desde el panel
 * admin (a diferencia de la INSTANCIA por estructura, que sí es editable —
 * ver useEstructuraGeometria.ts).
 *
 * Usado por: el selector de Forma en el bloque "Geometría" de una
 * Estructura, y por la futura sección "Física → Geometrías" del menú
 * (listado de Formas/Variables/Leyes).
 */

import { useMemo } from "react";

import {
  CONFIG_FORMAS_GEOMETRICAS,
  CONFIG_GEOMETRIA_VARIABLES,
  CONFIG_LEYES_GEOMETRICAS,
  type FormaGeometrica,
  type GeometriaVariable,
  type LeyGeometrica,
} from "@/domains/garlia/elementos/types";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

export function useFormasGeometricas() {
  const { data, loading } = useSupabaseData<FormaGeometrica>(CONFIG_FORMAS_GEOMETRICAS.tabla, {
    select: CONFIG_FORMAS_GEOMETRICAS.select,
    order: { campo: "nombre" },
  });
  const items = useMemo(() => data, [data]);
  return { items, loading };
}

export function useLeyesGeometricas() {
  const { data, loading } = useSupabaseData<LeyGeometrica>(CONFIG_LEYES_GEOMETRICAS.tabla, {
    select: CONFIG_LEYES_GEOMETRICAS.select,
  });
  const items = useMemo(() => data, [data]);
  return { items, loading };
}

export function useGeometriaVariables() {
  const { data, loading } = useSupabaseData<GeometriaVariable>(CONFIG_GEOMETRIA_VARIABLES.tabla, {
    select: CONFIG_GEOMETRIA_VARIABLES.select,
    order: { campo: "clave" },
  });
  const items = useMemo(() => data, [data]);
  return { items, loading };
}
