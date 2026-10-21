"use client";

/**
 * useMateriales.ts
 * ────────────────────────
 * Catálogo de Materiales (tabla real "materiales"). Las propiedades físicas
 * (propiedades_calculadas, capacidades_reactivas, estado_calculo) siguen
 * siendo de solo lectura desde el frontend — se derivan de composición/
 * microestructura por Supabase, no se editan a mano.
 *
 * Lo que SÍ se agregó acá:
 *  - 2026-08-28: renombrarMaterial/eliminarMaterial (click en título →
 *    Editar → renombrar/borrar).
 *  - 2026-09-09: crearMaterial (click en título → Añadir), pedido
 *    explícito de permitir crear Materiales a mano. Nace con
 *    tipo_material="experimental" (para distinguir a simple vista de una
 *    "clase" curada) y el resto en sus defaults. "nombre" tiene un UNIQUE
 *    constraint en la tabla — si "Nuevo material" ya existe, se agrega un
 *    sufijo numérico hasta encontrar uno libre, igual que evitaría el
 *    usuario a mano.
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

  async function crearMaterial() {
    let nombre = "Nuevo material";
    let sufijo = 2;
    while (items.some((m) => m.nombre === nombre)) {
      nombre = `Nuevo material ${sufijo}`;
      sufijo++;
    }
    const { data: nuevo, error } = await supabase
      .from(CONFIG_MATERIALES.tabla)
      .insert([{ nombre, tipo_material: "experimental" }])
      .select()
      .single();
    if (error || !nuevo) {
      console.error("[useMateriales] error creando material:", error);
      return null;
    }
    const fila = nuevo as unknown as Material;
    setData((prev) => [...prev, fila]);
    return fila;
  }

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
    crearMaterial,
    renombrarMaterial,
    eliminarMaterial,
  };
}
