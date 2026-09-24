"use client";

/**
 * useOrisGrafo.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Trae, por oris_id, el grafo canónico de cada Oris (vista
 * v_oris_grafo_canonico): su topología (T01…T07), los nodos (un Ium por
 * posición: nucleo / a / b / c / d, con su rol funcional) y las uniones
 * dirigidas / recíprocas / de acoplamiento entre esas posiciones.
 *
 * Es una vista derivada de solo lectura (no una tabla base), así que no pasa
 * por useSupabaseData/Dexie — un fetch simple alcanza, mismo criterio que
 * useGeometriaIums.ts. Se llama UNA vez en el nivel alto y el resultado se
 * reparte por props, en vez de que cada tarjeta dispare su propio fetch.
 */

import { useCallback, useEffect, useState } from "react";

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

/** Cache de módulo (mismo criterio que useGeometriaIums): un fetch por sesión
 *  compartido por todos los OrisEditor. */
let cache: Map<string, OrisGrafo> | null = null;
let enCurso: Promise<Map<string, OrisGrafo> | null> | null = null;

async function cargarGrafos(): Promise<Map<string, OrisGrafo> | null> {
  if (cache) return cache;
  if (!enCurso) {
    enCurso = (async () => {
      const { data, error } = await supabase
        .from("v_oris_grafo_canonico")
        .select("oris_id, topologia_id, topologia, nodos, uniones");

      if (error) {
        console.error("[useOrisGrafo] error cargando grafo:", error);
        return null;
      }

      const mapa = new Map<string, OrisGrafo>();
      for (const fila of data ?? []) {
        mapa.set(fila.oris_id, {
          oris_id: fila.oris_id,
          topologia_id: fila.topologia_id ?? "",
          topologia: fila.topologia ?? "",
          nodos: parsearNodos(fila.nodos),
          uniones: parsearUniones(fila.uniones),
        });
      }
      cache = mapa;
      return mapa;
    })().finally(() => {
      enCurso = null;
    });
  }
  return enCurso;
}

export function useOrisGrafo() {
  const [porOrisId, setPorOrisId] = useState<Map<string, OrisGrafo>>(cache ?? new Map());
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache) return;
    let vivo = true;
    cargarGrafos().then((mapa) => {
      if (!vivo) return;
      if (mapa) setPorOrisId(mapa);
      setLoading(false);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /** Grafo de un Oris por su id, o null si Supabase no tiene topología
   *  asignada para él (el llamador cae al gráfico anterior). */
  const grafoDe = useCallback((orisId: string): OrisGrafo | null => porOrisId.get(orisId) ?? null, [porOrisId]);

  return { porOrisId, grafoDe, loading };
}
