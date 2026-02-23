"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/api/queries/client/supabase";
import { useDataCache } from "@/components/providers/DataProvider";
import { db } from "@/lib/api/client/db"; // 👈 Dexie

// Importaciones de queries
import { personajesQueries } from "@/lib/api/queries/wiki/personajes";
import { criaturasQueries } from "@/lib/api/queries/wiki/criaturas";
import { itemsQueries } from "@/lib/api/queries/wiki/items";
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { recetasQueries } from "@/lib/api/queries/personal/cocina/recetas";
import { tareasQueries } from "@/lib/api/queries/personal/tareas";
import { eventosQueries } from "@/lib/api/queries/personal/eventos";
import { ingredientesQueries } from "@/lib/api/queries/personal/cocina/ingredientes";
import { ropaQueries } from "@/lib/api/queries/personal/ropa";
import { cancionesQueries } from "@/lib/api/queries/wiki/canciones";

const QUERIES_MAP: Record<string, any> = {
  personajes:   personajesQueries,
  criaturas:    criaturasQueries,
  items:        itemsQueries,
  libros:       librosQueries,
  recetas:      recetasQueries,
  tareas:       tareasQueries,
  eventos:      eventosQueries,
  ingredientes: ingredientesQueries,
  ropa:         ropaQueries,
  ropa_outfits: ropaQueries,
  canciones:    cancionesQueries,
};

// Tablas que tienen tabla Dexie equivalente
const DEXIE_TABLES = new Set([
  "personajes", "criaturas", "items", "libros", "canciones",
  "tareas", "eventos", "recetas", "ingredientes",
  "ropa", "ropa_outfits", "diario_fotos", "dibujos",
]);

interface UseSupabaseOptions {
  select?: string;
  order?: { campo: string; asc?: boolean };
  isAdmin?: boolean;
  [key: string]: any;
}

// ─── Helper: leer desde Dexie ────────────────────────────────
async function readFromDexie<T>(tabla: string): Promise<T[]> {
  try {
    if (!db || !DEXIE_TABLES.has(tabla)) return [];
    const table = (db as any)[tabla];
    if (!table) return [];
    return (await table.toArray()) as T[];
  } catch {
    return [];
  }
}

// ─── Helper: persistir en Dexie ──────────────────────────────
async function writeToDexie(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db || !DEXIE_TABLES.has(tabla) || rows.length === 0) return;
    const table = (db as any)[tabla];
    if (!table) return;
    await table.bulkPut(rows);
  } catch (e) {
    console.warn(`[Dexie] No se pudo guardar en '${tabla}':`, e);
  }
}

// ─────────────────────────────────────────────────────────────

export function useSupabaseData<T = any>(tabla: string, opciones: UseSupabaseOptions = {}) {
  const { cache, updateCache } = useDataCache();

  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsString = JSON.stringify(opciones);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    if (data.length === 0 || forceRefresh) setLoading(true);
    setError(null);

    // ── OFFLINE: leer de Dexie ────────────────────────────────
    if (!navigator.onLine) {
      const localData = await readFromDexie<T>(tabla);
      if (isMounted.current) {
        setData(localData);
        setIsOffline(true);
        setLoading(false);
      }
      return;
    }

    setIsOffline(false);

    // ── ONLINE: leer de Supabase ──────────────────────────────
    try {
      const opt = JSON.parse(optionsString);
      let res: any;

      if (QUERIES_MAP[tabla]) {
        res = await QUERIES_MAP[tabla].getAll(opt);
      } else {
        let query = supabase.from(tabla).select(opt.select || "*");
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        res = await query;
      }

      const finalData = Array.isArray(res) ? res : (res?.data || []);
      const errorFetch = res?.error || null;

      if (errorFetch) throw errorFetch;

      if (isMounted.current) {
        setData(finalData as T[]);
        updateCache(tabla, finalData);
        retryCount.current = 0;

        // ✅ Persistir en Dexie para uso offline futuro
        writeToDexie(tabla, finalData);
      }
    } catch (err: any) {
      // Si falla la red, intentamos Dexie como fallback
      const isNetworkError =
        err.message?.includes("fetch") || err.message?.includes("NetworkError");

      if (isNetworkError) {
        const localData = await readFromDexie<T>(tabla);
        if (localData.length > 0 && isMounted.current) {
          setData(localData);
          setIsOffline(true);
          setLoading(false);
          return;
        }
        if (retryCount.current < 3) {
          retryCount.current++;
          setTimeout(() => fetchData(true), 1000 * retryCount.current);
          return;
        }
      }

      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, updateCache, optionsString]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── CRUD ─────────────────────────────────────────────────

  const addRow = useCallback(async (newData: any) => {
    try {
      const res = QUERIES_MAP[tabla]?.create
        ? await QUERIES_MAP[tabla].create(newData)
        : await supabase.from(tabla).insert([newData]).select().single();

      const created = res?.data || res;

      // Persistir localmente si la operación fue exitosa
      if (created?.id) writeToDexie(tabla, [created]);

      return { data: created, error: res?.error || null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [tabla]);

  const updateRow = useCallback(async (id: string | number, updates: any) => {
    try {
      const res = QUERIES_MAP[tabla]?.update
        ? await QUERIES_MAP[tabla].update(id, updates)
        : await supabase.from(tabla).update(updates).eq("id", id).select().single();

      const updated = res?.data || res;
      if (updated?.id) writeToDexie(tabla, [updated]);

      return { data: updated, error: res?.error || null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [tabla]);

  const deleteRow = useCallback(async (id: string | number) => {
    try {
      const res = QUERIES_MAP[tabla]?.delete
        ? await QUERIES_MAP[tabla].delete(id)
        : await supabase.from(tabla).delete().eq("id", id);

      // Eliminar también de Dexie
      try {
        if (db && DEXIE_TABLES.has(tabla)) {
          await (db as any)[tabla]?.delete(id);
        }
      } catch {}

      return { error: res?.error || null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [tabla]);

  // ─── REALTIME + POLLING ───────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    const channel = supabase
      .channel(`rt-${tabla}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabla }, () =>
        fetchData(true)
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" && !pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(() => fetchData(true), 20000);
        }
      });

    // Refetch al recuperar conexión
    const handleOnline = () => fetchData(true);
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [tabla, fetchData]);

  return {
    data: data || [],
    setData,
    loading,
    error,
    isOffline,         // 👈 nuevo: útil para mostrar un banner "Sin conexión"
    refetch: () => fetchData(true),
    mutate: () => fetchData(true),
    addRow,
    updateRow,
    deleteRow,
  };
}