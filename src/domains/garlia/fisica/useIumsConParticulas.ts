"use client";

/**
 * useIumsConParticulas.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Fase 4 del rediseño 1.0 — Iums.
 *
 * Reemplaza a useIums() como fuente de lectura del catálogo: en vez de
 * confiar en iums.composicion (jsonb, columna eliminada de Supabase), trae
 * iums_particulas (tabla relacional: ium_id, particula_id, cantidad) +
 * particulas (para resolver particula_id → nombre) y RECONSTRUYE el campo
 * composicion ({ particula, cantidad }[]) con esos datos antes de devolver
 * cada Ium. Mismo criterio que useOrisConIums.ts (Fase 3): las funciones
 * utilitarias de fisica/types.ts (contarLetrasDeIum, particulasDeIum, etc.)
 * siguen recibiendo el shape { particula: string; cantidad: number }[] tal
 * cual lo esperan, así que no hace falta tocarlas.
 *
 * iums.composicion (jsonb) ya no existe en Supabase — este hook es la
 * única fuente válida de lectura de la composición de un Ium.
 */

import { useMemo } from "react";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { supabase } from "@/infra/supabase/supabase";

import { useIums } from "./useFisica";
import { useParticulas } from "./useFisica";
import type { Ium } from "./types";

export const IUMS_PARTICULAS_CONFIG = {
  tabla: "iums_particulas",
  select: "id, ium_id, particula_id, cantidad",
};

export interface IumParticulaRow {
  id: string;
  ium_id: string;
  particula_id: string;
  cantidad: number;
}

export function useIumsConParticulas() {
  const { items: iumsBase, setItems: setIumsBase, loading: loadingBase } = useIums();
  const { items: particulas, loading: loadingParticulas } = useParticulas();
  // Fase 8: pasa por useSupabaseData → cache offline en Dexie
  // (iums_particulas debería estar en DEXIE_TABLES/OFFLINE_WRITABLE, mismo
  // criterio que oris_iums).
  const { data: filas, loading: loadingFilas } = useSupabaseData<IumParticulaRow>(
    IUMS_PARTICULAS_CONFIG.tabla,
    {
      select: IUMS_PARTICULAS_CONFIG.select,
      // Sin columna "orden" propia — se usa "id" solo para fijar un
      // criterio estable entre requests, mismo motivo que en oris_iums.
      order: { campo: "id" },
    },
  );

  const nombrePorParticulaId = useMemo(
    () => Object.fromEntries(particulas.map((p) => [p.id, p.nombre])),
    [particulas],
  );

  const composicionPorIum = useMemo(() => {
    const mapa = new Map<string, { particula: string; cantidad: number }[]>();
    for (const fila of filas) {
      const nombre = nombrePorParticulaId[fila.particula_id];
      if (!nombre) continue;
      const actual = mapa.get(fila.ium_id) ?? [];
      actual.push({ particula: nombre, cantidad: fila.cantidad });
      mapa.set(fila.ium_id, actual);
    }
    return mapa;
  }, [filas, nombrePorParticulaId]);

  const items = useMemo<Ium[]>(() => {
    return iumsBase.map((i) => ({
      ...i,
      composicion: composicionPorIum.get(i.id) ?? [],
    }));
  }, [iumsBase, composicionPorIum]);

  return {
    items,
    setItems: setIumsBase,
    loading: loadingBase || loadingParticulas || loadingFilas,
  };
}

// ─── Mutaciones de composición ─────────────────────────────────────────────
// Reemplazan a "actualizar iums.composicion (jsonb)" — agregar/quitar/editar
// una Partícula de un Ium escribe en iums_particulas. Recibe la composición
// ya resuelta a { particula_id, cantidad }[] (el caller resuelve nombre →
// id contra su propio catálogo de particulas, ya que este archivo no confía
// en un mapeo global hardcodeado).

export async function sincronizarParticulasDeIum(
  iumId: string,
  nuevaComposicion: { particula_id: string; cantidad: number }[],
): Promise<boolean> {
  const { data: actuales, error: errorLectura } = await supabase
    .from(IUMS_PARTICULAS_CONFIG.tabla)
    .select("particula_id, cantidad")
    .eq("ium_id", iumId);

  if (errorLectura) {
    console.error("[sincronizarParticulasDeIum] error leyendo estado actual:", errorLectura);
    return false;
  }

  const actualesPorParticula = new Map((actuales ?? []).map((r) => [r.particula_id, r.cantidad]));
  const nuevaPorParticula = new Map(nuevaComposicion.map((c) => [c.particula_id, c.cantidad]));

  const aQuitar = [...actualesPorParticula.keys()].filter((id) => !nuevaPorParticula.has(id));
  const aUpsertear = [...nuevaPorParticula.keys()].filter(
    (id) => actualesPorParticula.get(id) !== nuevaPorParticula.get(id),
  );

  if (aQuitar.length > 0) {
    const { error } = await supabase
      .from(IUMS_PARTICULAS_CONFIG.tabla)
      .delete()
      .eq("ium_id", iumId)
      .in("particula_id", aQuitar);
    if (error) {
      console.error("[sincronizarParticulasDeIum] error quitando:", error);
      return false;
    }
  }

  if (aUpsertear.length > 0) {
    const { error } = await supabase.from(IUMS_PARTICULAS_CONFIG.tabla).upsert(
      aUpsertear.map((particulaId) => ({
        ium_id: iumId,
        particula_id: particulaId,
        cantidad: nuevaPorParticula.get(particulaId)!,
      })),
      { onConflict: "ium_id,particula_id" },
    );
    if (error) {
      console.error("[sincronizarParticulasDeIum] error upserteando:", error);
      return false;
    }
  }

  return true;
}
