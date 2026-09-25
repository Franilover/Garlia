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
 * Cache-first vía Dexie (tabla "v_iums_geometria_canonica_v1", PK = ium_id —
 * ver v50 en infra/supabase/db.ts): antes era solo un cache de módulo en
 * memoria, vacío en cada recarga/pestaña nueva mientras el fetch a Supabase
 * estaba en vuelo — el mismo síntoma que hacía caer al gráfico anterior en
 * OrisEditor/IumEditor. Ahora se pinta primero lo que haya en IndexedDB
 * (instantáneo, funciona offline) y el fetch real reemplaza esa copia en
 * cuanto responde, reescribiéndola para la próxima carga.
 */

import { useCallback, useEffect, useState } from "react";

import { db } from "@/infra/supabase/db";
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

const TABLA_DEXIE = "v_iums_geometria_canonica_v1";

/** Cache de módulo además del de Dexie: evita fetches duplicados a Supabase
 *  entre componentes montados a la vez en la misma sesión. No fija el
 *  resultado para siempre: `v_iums_geometria_canonica_v1` es una vista
 *  derivada sin tabla propia (no se puede suscribir a Realtime sobre
 *  ella), así que `cargarGeometrias()` siempre vuelve a pedir a Supabase
 *  en cada montaje nuevo — este cache solo deduplica fetches en vuelo,
 *  no evita relecturas (ver mismo criterio en useOrisGrafo.ts). */
let cacheMemoria: Map<string, GeometriaIumRow> | null = null;
let enCurso: Promise<Map<string, GeometriaIumRow> | null> | null = null;

function filaAGeometria(fila: any): GeometriaIumRow {
  return {
    geometria: esGeometriaIum(fila.geometria) ? fila.geometria : GEOMETRIA_DEFAULT.geometria,
    geometria_nombre: fila.geometria_nombre ?? GEOMETRIA_DEFAULT.geometria_nombre,
    geometria_familia: fila.geometria_familia ?? GEOMETRIA_DEFAULT.geometria_familia,
    dimensionalidad: fila.dimensionalidad ?? GEOMETRIA_DEFAULT.dimensionalidad,
  };
}

/** Lee la copia local (Dexie) de la geometría de todos los Iums —
 *  instantáneo, funciona offline. Primer pintado mientras el fetch real a
 *  Supabase está en vuelo. */
async function leerGeometriasDeDexie(): Promise<Map<string, GeometriaIumRow>> {
  const mapa = new Map<string, GeometriaIumRow>();
  try {
    if (!db) return mapa;
    const filas = await (db as any)[TABLA_DEXIE]?.toArray();
    for (const fila of filas ?? []) mapa.set(fila.ium_id, filaAGeometria(fila));
  } catch {
    // Sin Dexie disponible (SSR, IndexedDB bloqueado) — se sigue con mapa vacío.
  }
  return mapa;
}

/** Trae la geometría real desde Supabase y reescribe la copia local (Dexie)
 *  con el resultado — borra las filas que ya no vengan, para que la próxima
 *  carga no arrastre una geometría vieja de un Ium eliminado/renombrado. */
async function cargarGeometriasDeSupabase(): Promise<Map<string, GeometriaIumRow> | null> {
  const { data, error } = await supabase
    .from("v_iums_geometria_canonica_v1")
    .select("ium_id, geometria, geometria_nombre, geometria_familia, dimensionalidad");

  if (error) {
    console.error("[useGeometriaIums] error cargando geometría:", error);
    return null;
  }

  const filas = data ?? [];
  const mapa = new Map<string, GeometriaIumRow>();
  for (const fila of filas) mapa.set(fila.ium_id, filaAGeometria(fila));

  try {
    if (db) {
      const tabla = (db as any)[TABLA_DEXIE];
      if (tabla) {
        await tabla.bulkPut(filas);
        const idsRemotos = new Set(filas.map((f: any) => f.ium_id));
        const idsLocales: string[] = (await tabla.toArray()).map((f: any) => f.ium_id);
        const huerfanos = idsLocales.filter((id) => !idsRemotos.has(id));
        if (huerfanos.length > 0) await tabla.bulkDelete(huerfanos);
      }
    }
  } catch (e) {
    console.warn("[useGeometriaIums] no se pudo actualizar la cache local:", e);
  }

  return mapa;
}

async function cargarGeometrias(): Promise<Map<string, GeometriaIumRow> | null> {
  // Ya no corta acá si `cacheMemoria` existe — ver comentario junto a su
  // declaración. Solo deduplica un fetch ya en vuelo.
  if (!enCurso) {
    enCurso = cargarGeometriasDeSupabase()
      .then((mapa) => {
        if (mapa) cacheMemoria = mapa;
        return mapa;
      })
      .finally(() => {
        // Si falló, se permite reintentar en el próximo montaje.
        enCurso = null;
      });
  }
  return enCurso;
}

export function useGeometriaIums() {
  const [porIumId, setPorIumId] = useState<Map<string, GeometriaIumRow>>(cacheMemoria ?? new Map());
  // Siempre empieza en loading: cada montaje dispara su propio refetch
  // real (deduplicado por `enCurso` si coincide con otro en vuelo), en
  // vez de quedarse para siempre con el mapa de la primera carga de la
  // sesión — ver comentario en cacheMemoria.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;

    // 1) Pintado instantáneo: lo que ya haya en memoria de un montaje
    //    previo, o si no, lo último guardado en Dexie (offline-first)
    //    mientras el fetch real está en vuelo.
    if (cacheMemoria) {
      setPorIumId(cacheMemoria);
    } else {
      leerGeometriasDeDexie().then((mapaLocal) => {
        if (!vivo || cacheMemoria) return;
        if (mapaLocal.size > 0) setPorIumId(mapaLocal);
      });
    }

    // 2) Refresco real en CADA montaje: reemplaza lo anterior en cuanto
    //    Supabase responde, así una geometría cambiada en el backend
    //    aparece sin depender de recargar toda la página.
    cargarGeometrias().then((mapa) => {
      if (!vivo) return;
      if (mapa) setPorIumId(mapa);
      setLoading(false);
    });

    return () => {
      vivo = false;
    };
  }, []);

  /** Geometría de un Ium por su id, con fallback seguro si falta el dato
   *  (ni en Dexie ni en Supabase). */
  const geometriaDe = useCallback(
    (iumId: string): GeometriaIumRow => porIumId.get(iumId) ?? GEOMETRIA_DEFAULT,
    [porIumId],
  );

  return { porIumId, geometriaDe, loading };
}
