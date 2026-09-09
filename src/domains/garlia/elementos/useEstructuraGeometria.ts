"use client";

/**
 * useEstructuraGeometria.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Geometría real de UNA Estructura (tabla puente "estructura_geometrias",
 * fila única por estructura_id). Mismo patrón fetch-por-id + agregar/
 * actualizar/eliminar que useEstructuraComposicion.ts, pero acá "agregar"
 * es más bien "asignar" (una Estructura tiene 0 o 1 geometría, nunca
 * varias) y el volumen NO se calcula en el frontend — se manda el cálculo
 * a Supabase (columna generable por trigger/función a futuro; por ahora
 * este hook solo persiste forma+parámetros y deja volumen/estado_calculo
 * como venga de la fila, sin inventar el cálculo acá).
 *
 * 2026-09-09: nuevo — pedido "Física → Geometrías" + bloque "Geometría"
 * dentro de una Estructura (Forma / Parámetros / Ley aplicada / Volumen /
 * Estado). Ver types.ts para EstructuraGeometria/FormaGeometrica/
 * LeyGeometrica.
 */

import { useCallback, useMemo } from "react";

import {
  CONFIG_ESTRUCTURA_GEOMETRIAS,
  type EstructuraGeometria,
} from "@/domains/garlia/elementos/types";
import { supabase } from "@/infra/supabase/supabase";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

export function useEstructuraGeometria(estructuraId: string | null) {
  const { data, setData, loading } = useSupabaseData<EstructuraGeometria>(
    CONFIG_ESTRUCTURA_GEOMETRIAS.tabla,
    { select: CONFIG_ESTRUCTURA_GEOMETRIAS.select },
  );

  const geometria = useMemo(
    () => (estructuraId ? (data.find((g) => g.estructura_id === estructuraId) ?? null) : null),
    [data, estructuraId],
  );

  // ── Asignar (o reemplazar) la Forma de esta Estructura. Si ya existía
  // una geometría para esta estructura_id, la reemplaza entera (nueva
  // forma → parámetros viejos ya no aplican, así que se resetean). ────────
  const asignarForma = useCallback(
    async (geometriaId: string, fuenteFormulaId: string | null) => {
      if (!estructuraId) return null;
      const { data: nuevo, error } = await supabase
        .from(CONFIG_ESTRUCTURA_GEOMETRIAS.tabla)
        .upsert(
          [
            {
              estructura_id: estructuraId,
              geometria_id: geometriaId,
              fuente_formula_id: fuenteFormulaId,
              parametros: {},
              volumen: null,
              estado_calculo: "pendiente",
            },
          ],
          { onConflict: "estructura_id" },
        )
        .select()
        .single();
      if (error || !nuevo) {
        console.error("[useEstructuraGeometria] error asignando forma:", error);
        return null;
      }
      const fila = nuevo as unknown as EstructuraGeometria;
      setData((prev) => [...prev.filter((g) => g.estructura_id !== estructuraId), fila]);
      return fila;
    },
    [estructuraId, setData],
  );

  // ── Actualizar parámetros (y opcionalmente volumen ya calculado) de la
  // geometría existente. ──────────────────────────────────────────────────
  const actualizarParametros = useCallback(
    async (
      id: string,
      cambios: Partial<Pick<EstructuraGeometria, "parametros" | "volumen" | "estado_calculo">>,
    ) => {
      const anterior = data.find((row) => row.id === id);
      setData((prev) => prev.map((row) => (row.id === id ? { ...row, ...cambios } : row)));
      const { error } = await supabase
        .from(CONFIG_ESTRUCTURA_GEOMETRIAS.tabla)
        .update(cambios)
        .eq("id", id);
      if (error) {
        console.error("[useEstructuraGeometria] error actualizando parámetros:", error);
        if (anterior) {
          setData((prev) => prev.map((row) => (row.id === id ? anterior : row)));
        }
        return { ok: false, error };
      }
      return { ok: true, error: null };
    },
    [data, setData],
  );

  // ── Quitar la geometría de esta Estructura (vuelve a "Sin geometría"). ──
  const quitarGeometria = useCallback(
    async (id: string) => {
      const { error } = await supabase.from(CONFIG_ESTRUCTURA_GEOMETRIAS.tabla).delete().eq("id", id);
      if (error) {
        console.error("[useEstructuraGeometria] error quitando geometría:", error);
        return { ok: false, error };
      }
      setData((prev) => prev.filter((row) => row.id !== id));
      return { ok: true, error: null };
    },
    [setData],
  );

  return {
    geometria,
    loading: estructuraId ? loading : false,
    asignarForma,
    actualizarParametros,
    quitarGeometria,
  };
}
