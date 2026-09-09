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
 * Estructura, y por la sección "Química → Geometrías" (cuarto grid,
 * ver ElementosPage.tsx / FilaAsimetrica.tsx).
 *
 * 2026-09-09: se agregó renombrarForma/eliminarForma/crearForma a
 * useFormasGeometricas (mismo patrón que useEstructuras.ts) para el menú
 * del título del grid — antes esta tabla se trataba como 100% solo-lectura
 * (poblada por migración), pero para editar/crear/borrar una Forma desde
 * el panel admin hace falta setData expuesto, igual que en las otras
 * entidades.
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
import { supabase } from "@/infra/supabase/supabase";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

export function useFormasGeometricas() {
  const { data, setData, loading } = useSupabaseData<FormaGeometrica>(
    CONFIG_FORMAS_GEOMETRICAS.tabla,
    {
      select: CONFIG_FORMAS_GEOMETRICAS.select,
      order: { campo: "nombre" },
    },
  );
  const items = useMemo(() => data, [data]);

  async function crearForma() {
    // "clave" es la que tiene el UNIQUE constraint (no "nombre") — mismo
    // patrón de sufijo numérico que crearMaterial usa para su UNIQUE en
    // nombre, pero acá aplicado sobre clave. Nace en estado "experimental"
    // (default de la tabla) para distinguirse a simple vista de una Forma
    // canónica curada por migración.
    let clave = "nueva-forma";
    let sufijo = 2;
    while (items.some((f) => f.clave === clave)) {
      clave = `nueva-forma-${sufijo}`;
      sufijo++;
    }
    const { data: nuevo, error } = await supabase
      .from(CONFIG_FORMAS_GEOMETRICAS.tabla)
      .insert([{ clave, nombre: "Nueva forma" }])
      .select()
      .single();
    if (error || !nuevo) {
      console.error("[useFormasGeometricas] error creando forma:", error);
      return null;
    }
    const fila = nuevo as unknown as FormaGeometrica;
    setData((prev) => [...prev, fila]);
    return fila;
  }

  async function renombrarForma(id: string, nuevoNombre: string) {
    const { error } = await supabase
      .from(CONFIG_FORMAS_GEOMETRICAS.tabla)
      .update({ nombre: nuevoNombre })
      .eq("id", id);
    if (error) {
      console.error("[useFormasGeometricas] error renombrando forma:", error);
      return;
    }
    setData((prev) => prev.map((f) => (f.id === id ? { ...f, nombre: nuevoNombre } : f)));
  }

  async function eliminarForma(id: string) {
    const { error } = await supabase.from(CONFIG_FORMAS_GEOMETRICAS.tabla).delete().eq("id", id);
    if (error) {
      console.error("[useFormasGeometricas] error eliminando forma:", error);
      return;
    }
    setData((prev) => prev.filter((f) => f.id !== id));
  }

  return { items, loading, crearForma, renombrarForma, eliminarForma };
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
