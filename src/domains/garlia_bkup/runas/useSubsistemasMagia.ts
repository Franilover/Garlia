"use client";

/**
 * useSubsistemasMagia
 * ───────────────────────────────────────────────────────────────────────────
 * Datos de `subsistemas_magia` — subsistemas como Luminia, Sintonía, Litonio,
 * Fitonio, Hemonia, etc. del sistema de magia. Cada subsistema tiene un
 * nombre, descripción libre, y tablas de Canales / Filtros / Complementos
 * (mismo formato que el documento de referencia: nombre + descripción +
 * qué Oris canaliza).
 *
 * Antes era un CRUD directo sin ningún cache local: cada apertura de la tab
 * Física esperaba el round-trip completo a Supabase para pintar la columna
 * de Subsistemas. Ahora pasa por useSupabaseData (mismo pipeline
 * cache-first + realtime que oris/iums/fisica_conceptos, ver v50 en
 * infra/supabase/db.ts): pinta primero lo que haya en Dexie (instantáneo,
 * funciona offline) y Supabase reemplaza esa copia en cuanto responde,
 * reescribiéndola para la próxima carga. crear/actualizar/eliminar siguen
 * pegando directo a Supabase (mismo estilo que useSubsistemasMagia de
 * siempre) — la fila resultante vuelve a este hook vía el canal realtime de
 * useSupabaseData, que ya se encarga de reflejarla en Dexie.
 */

import { useCallback, useMemo } from "react";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { supabase } from "@/infra/supabase/supabase";

export interface SubsistemaFila {
  nombre: string;
  descripcion?: string;
  canaliza?: string;
}

export interface SubsistemaMagia {
  id: string;
  nombre: string;
  descripcion: string;
  canales: SubsistemaFila[];
  filtros: SubsistemaFila[];
  complementos: SubsistemaFila[];
  orden: number;
  created_at: string;
  updated_at: string;
  /** Criaturas (por id) que pertenecen a este subsistema mágico —
   *  pertenencia exclusiva, asignada desde el editor de criaturas
   *  (BloqueSubsistemaMagicoCriatura). */
  criatura_ids?: string[];
}

export type SubsistemaInput = Partial<
  Pick<SubsistemaMagia, "nombre" | "descripcion" | "canales" | "filtros" | "complementos" | "orden">
>;

export function useSubsistemasMagia() {
  const {
    data,
    setData,
    loading,
  } = useSupabaseData<SubsistemaMagia>("subsistemas_magia", {
    select: "*",
    order: { campo: "orden" },
  });

  // useSupabaseData ordena solo por "orden" (ver `order`) — el criterio
  // original acá era orden + created_at como desempate. Se aplica ese
  // desempate acá encima del resultado, sin tocar el hook genérico.
  const subsistemas = useMemo(
    () =>
      [...data].sort((a, b) => {
        if (a.orden !== b.orden) return a.orden - b.orden;
        return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      }),
    [data],
  );

  const crear = useCallback(async (nombre: string) => {
    const { data: nuevo, error } = await supabase
      .from("subsistemas_magia")
      .insert([{ nombre, descripcion: "", canales: [], filtros: [], complementos: [], criatura_ids: [] }])
      .select()
      .single();
    if (error || !nuevo) return null;
    setData((prev) => [...prev, nuevo as SubsistemaMagia]);
    return nuevo as SubsistemaMagia;
  }, [setData]);

  const actualizar = useCallback(async (id: string, updates: SubsistemaInput) => {
    setData((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
    const { error } = await supabase
      .from("subsistemas_magia")
      .update(updates)
      .eq("id", id);
    if (error) {
      console.error("[useSubsistemasMagia] error actualizando:", error);
    }
  }, [setData]);

  const eliminar = useCallback(async (id: string) => {
    setData((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("subsistemas_magia").delete().eq("id", id);
  }, [setData]);

  return { subsistemas, loading, creating: false, crear, actualizar, eliminar };
}
