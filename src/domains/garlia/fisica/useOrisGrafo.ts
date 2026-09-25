"use client";

/**
 * useOrisGrafo.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Trae, por oris_id, el grafo canónico de cada Oris (vista
 * v_oris_grafo_canonico): su topología (T01…T07), los nodos (un Ium por
 * posición: nucleo / a / b / c / d, con su rol funcional) y las uniones
 * dirigidas / recíprocas / de acoplamiento entre esas posiciones.
 *
 * Cache-first vía Dexie (tabla "v_oris_grafo_canonico", PK = oris_id — ver
 * v50 en infra/supabase/db.ts): antes esto era solo un cache de módulo en
 * memoria, así que en cada recarga/pestaña nueva arrancaba en 0 y, mientras
 * el fetch a Supabase estaba en vuelo, todo Oris no tenía nodos todavía —
 * OrisEditor caía al gráfico anterior (IumVisual genérico) en vez de dibujar
 * la topología real. Ahora se pinta primero lo que haya en IndexedDB
 * (instantáneo, funciona offline) y el fetch a Supabase reemplaza esa copia
 * en cuanto responde, reescribiéndola para la próxima carga — el diseño
 * antiguo deja de aparecer salvo la primerísima vez que se abre sin red y
 * sin cache previo. Se llama UNA vez en el nivel alto y el resultado se
 * reparte por props, en vez de que cada tarjeta dispare su propio fetch.
 */

import { useCallback, useEffect, useState } from "react";

import { db } from "@/infra/supabase/db";
import { supabase } from "@/infra/supabase/supabase";

export type PosicionOris = "nucleo" | "a" | "b" | "c" | "d";
export type TipoUnionOris = "dirigida" | "reciproca" | "acoplamiento";

export interface OrisGrafoNodo {
  /** id real en la tabla "iums" (ej. "fluxor" para Fluxus). */
  ium_id: string;
  /** Nombre visible del Ium (ej. "Fluxus"). */
  ium: string;
  rol: string;
  posicion: PosicionOris;
  cantidad: number;
}

export interface OrisGrafoUnion {
  orden: number;
  origen: PosicionOris;
  destino: PosicionOris;
  tipo_union: TipoUnionOris;
  descripcion: string;
}

export interface OrisGrafo {
  oris_id: string;
  topologia_id: string;
  topologia: string;
  nodos: OrisGrafoNodo[];
  uniones: OrisGrafoUnion[];
}

const POSICIONES: readonly string[] = ["nucleo", "a", "b", "c", "d"];
const TIPOS_UNION: readonly string[] = ["dirigida", "reciproca", "acoplamiento"];

function esPosicion(v: unknown): v is PosicionOris {
  return typeof v === "string" && POSICIONES.includes(v);
}

function esTipoUnion(v: unknown): v is TipoUnionOris {
  return typeof v === "string" && TIPOS_UNION.includes(v);
}

/** Los jsonb llegan como unknown: se valida cada elemento y se descarta lo
 *  malformado en vez de romper el render (mismo criterio "nunca romper" que
 *  el resto de gráficos de Física). */
function parsearNodos(raw: unknown): OrisGrafoNodo[] {
  if (!Array.isArray(raw)) return [];
  const out: OrisGrafoNodo[] = [];
  for (const n of raw) {
    if (!n || typeof n !== "object") continue;
    const r = n as Record<string, unknown>;
    if (!esPosicion(r.posicion) || typeof r.ium_id !== "string") continue;
    out.push({
      ium_id: r.ium_id,
      ium: typeof r.ium === "string" ? r.ium : r.ium_id,
      rol: typeof r.rol === "string" ? r.rol : "",
      posicion: r.posicion,
      cantidad: typeof r.cantidad === "number" ? r.cantidad : 1,
    });
  }
  return out;
}

function parsearUniones(raw: unknown): OrisGrafoUnion[] {
  if (!Array.isArray(raw)) return [];
  const out: OrisGrafoUnion[] = [];
  for (const u of raw) {
    if (!u || typeof u !== "object") continue;
    const r = u as Record<string, unknown>;
    if (!esPosicion(r.origen) || !esPosicion(r.destino)) continue;
    out.push({
      orden: typeof r.orden === "number" ? r.orden : out.length + 1,
      origen: r.origen,
      destino: r.destino,
      tipo_union: esTipoUnion(r.tipo_union) ? r.tipo_union : "dirigida",
      descripcion: typeof r.descripcion === "string" ? r.descripcion : "",
    });
  }
  return out.sort((a, b) => a.orden - b.orden);
}

const TABLA_DEXIE = "v_oris_grafo_canonico";

/** Cache de módulo además del de Dexie: evita que dos OrisEditor montados
 *  a la vez disparen dos fetch a Supabase en paralelo dentro de la misma
 *  sesión — una vez que la primera llamada resuelve, el resto reusa este
 *  mapa en memoria. Dexie sigue siendo la fuente de verdad entre sesiones
 *  (recargas, pestañas nuevas, offline). */
let cacheMemoria: Map<string, OrisGrafo> | null = null;
let enCurso: Promise<Map<string, OrisGrafo> | null> | null = null;

function filaAGrafo(fila: any): OrisGrafo {
  return {
    oris_id: fila.oris_id,
    topologia_id: fila.topologia_id ?? "",
    topologia: fila.topologia ?? "",
    nodos: parsearNodos(fila.nodos),
    uniones: parsearUniones(fila.uniones),
  };
}

/** Lee la copia local (Dexie) del grafo de todos los Oris — instantáneo,
 *  funciona offline. Se usa como primer pintado mientras el fetch real a
 *  Supabase está en vuelo. */
async function leerGrafosDeDexie(): Promise<Map<string, OrisGrafo>> {
  const mapa = new Map<string, OrisGrafo>();
  try {
    if (!db) return mapa;
    const filas = await (db as any)[TABLA_DEXIE]?.toArray();
    for (const fila of filas ?? []) mapa.set(fila.oris_id, filaAGrafo(fila));
  } catch {
    // Sin Dexie disponible (SSR, IndexedDB bloqueado) — se sigue con mapa vacío.
  }
  return mapa;
}

/** Trae el grafo real desde Supabase y reescribe la copia local (Dexie) con
 *  el resultado — borra las filas que ya no vengan (Oris cuya topología se
 *  desasignó) para que la próxima carga no arrastre un grafo viejo. */
async function cargarGrafosDeSupabase(): Promise<Map<string, OrisGrafo> | null> {
  const { data, error } = await supabase
    .from("v_oris_grafo_canonico")
    .select("oris_id, topologia_id, topologia, nodos, uniones");

  if (error) {
    console.error("[useOrisGrafo] error cargando grafo:", error);
    return null;
  }

  const filas = data ?? [];
  const mapa = new Map<string, OrisGrafo>();
  for (const fila of filas) mapa.set(fila.oris_id, filaAGrafo(fila));

  try {
    if (db) {
      const tabla = (db as any)[TABLA_DEXIE];
      if (tabla) {
        await tabla.bulkPut(filas);
        const idsRemotos = new Set(filas.map((f: any) => f.oris_id));
        const idsLocales: string[] = (await tabla.toArray()).map((f: any) => f.oris_id);
        const huerfanos = idsLocales.filter((id) => !idsRemotos.has(id));
        if (huerfanos.length > 0) await tabla.bulkDelete(huerfanos);
      }
    }
  } catch (e) {
    console.warn("[useOrisGrafo] no se pudo actualizar la cache local:", e);
  }

  return mapa;
}

async function cargarGrafos(): Promise<Map<string, OrisGrafo> | null> {
  if (cacheMemoria) return cacheMemoria;
  if (!enCurso) {
    enCurso = cargarGrafosDeSupabase()
      .then((mapa) => {
        if (mapa) cacheMemoria = mapa;
        return mapa;
      })
      .finally(() => {
        enCurso = null;
      });
  }
  return enCurso;
}

export function useOrisGrafo() {
  const [porOrisId, setPorOrisId] = useState<Map<string, OrisGrafo>>(cacheMemoria ?? new Map());
  const [loading, setLoading] = useState(cacheMemoria === null);

  useEffect(() => {
    if (cacheMemoria) return;
    let vivo = true;

    // 1) Pintado instantáneo desde Dexie (offline-first) mientras el fetch
    //    real está en vuelo — evita el "diseño antiguo" que se veía al
    //    depender solo del cache de memoria (vacío en cada recarga).
    leerGrafosDeDexie().then((mapaLocal) => {
      if (!vivo || cacheMemoria) return;
      if (mapaLocal.size > 0) setPorOrisId(mapaLocal);
    });

    // 2) Refresco real: reemplaza lo anterior en cuanto Supabase responde.
    cargarGrafos().then((mapa) => {
      if (!vivo) return;
      if (mapa) setPorOrisId(mapa);
      setLoading(false);
    });

    return () => {
      vivo = false;
    };
  }, []);

  /** Grafo de un Oris por su id, o null si no hay topología asignada para
   *  él todavía (ni en Dexie ni en Supabase) — el llamador cae al gráfico
   *  anterior. */
  const grafoDe = useCallback((orisId: string): OrisGrafo | null => porOrisId.get(orisId) ?? null, [porOrisId]);

  return { porOrisId, grafoDe, loading };
}
