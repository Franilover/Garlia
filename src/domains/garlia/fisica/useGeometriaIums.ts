"use client";

/**
 * useGeometriaIums.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Trae, por ium_id, la geometría real asignada en Supabase (vista
 * v_iums_geometria_canonica_v1: puntual/lineal/red/radial/flexible, más
 * familia y dimensionalidad) — reemplaza el criterio anterior de IumVisual,
 * que dibujaba TODO Ium como partículas orbitando un anillo sin mirar su
 * geometría real.
 *
 * Es una vista de solo lectura (auditoría/derivada), no una tabla base, así
 * que no pasa por useSupabaseData/Dexie como iums_particulas u oris_iums —
 * un fetch simple alcanza, mismo criterio que useVisibilidadExplicacion.ts.
 */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

import type { GeometriaIum } from "./ParticulaVisual";

function esGeometriaIum(v: string | null | undefined): v is GeometriaIum {
  return (
    v === "puntual" ||
    v === "lineal" ||
    v === "red" ||
    v === "radial" ||
    v === "flexible" ||
    v === "angular"
  );
}

export interface GeometriaIumRow {
  geometria: GeometriaIum;
  geometria_nombre: string;
  geometria_familia: string;
  dimensionalidad: number;
}

/** Fallback si la vista no trae fila para un ium_id (dato faltante en
 *  Supabase) — mismo criterio "nunca romper el render" que el resto de
 *  gráficos de Física. */
const GEOMETRIA_DEFAULT: GeometriaIumRow = {
  geometria: "radial",
  geometria_nombre: "Radial",
  geometria_familia: "volumetrica",
  dimensionalidad: 3,
};

/** Cache de módulo: la vista es de solo lectura y cambia solo con migraciones,
 *  así que un fetch por sesión basta. Sin esto, cada componente que llama al
 *  hook (FisicaPage y cada OrisEditor que se abre) dispararía su propio fetch
 *  y el dibujo parpadearía vacío mientras carga. */
let cache: Map<string, GeometriaIumRow> | null = null;
let enCurso: Promise<Map<string, GeometriaIumRow> | null> | null = null;

async function cargarGeometrias(): Promise<Map<string, GeometriaIumRow> | null> {
  if (cache) return cache;
  if (!enCurso) {
    enCurso = (async () => {
      const { data, error } = await supabase
        .from("v_iums_geometria_canonica_v1")
        .select("ium_id, geometria, geometria_nombre, geometria_familia, dimensionalidad");

      if (error) {
        console.error("[useGeometriaIums] error cargando geometría:", error);
        return null;
      }

      const mapa = new Map<string, GeometriaIumRow>();
      for (const fila of data ?? []) {
        mapa.set(fila.ium_id, {
          geometria: esGeometriaIum(fila.geometria) ? fila.geometria : GEOMETRIA_DEFAULT.geometria,
          geometria_nombre: fila.geometria_nombre ?? GEOMETRIA_DEFAULT.geometria_nombre,
          geometria_familia: fila.geometria_familia ?? GEOMETRIA_DEFAULT.geometria_familia,
          dimensionalidad: fila.dimensionalidad ?? GEOMETRIA_DEFAULT.dimensionalidad,
        });
      }
      cache = mapa;
      return mapa;
    })().finally(() => {
      // Si falló, se permite reintentar en el próximo montaje.
      enCurso = null;
    });
  }
  return enCurso;
}

export function useGeometriaIums() {
  const [porIumId, setPorIumId] = useState<Map<string, GeometriaIumRow>>(cache ?? new Map());
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    cargarGeometrias().then((mapa) => {
      if (!vivo) return;
      if (mapa) setPorIumId(mapa);
      setLoading(false);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /** Geometría de un Ium por su id, con fallback seguro si falta el dato. */
  const geometriaDe = useCallback(
    (iumId: string): GeometriaIumRow => porIumId.get(iumId) ?? GEOMETRIA_DEFAULT,
    [porIumId],
  );

  return { porIumId, geometriaDe, loading };
}
