"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { useDataCache } from "@/app/providers/DataProvider";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";

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
import { comprasQueries } from "@/lib/api/queries/personal/cocina/carrito";

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
  compras:      comprasQueries,
};

const DEXIE_TABLES = new Set([
  "personajes", "criaturas", "items", "libros", "canciones",
  "tareas", "eventos", "recetas", "ingredientes",
  "ropa", "ropa_outfits", "diario_fotos", "dibujos",
  "compras", "notas", "rutinas", "ejercicios_rutina",
  "secciones_cancion",   // ← LyricStudio offline
  "capitulos",           // ← ChapterStudio offline
]);

// Tablas que soportan escritura offline (encolado para sync posterior)
const OFFLINE_WRITABLE = new Set([
  "notas", "tareas", "eventos", "rutinas", "ejercicios_rutina",
  "secciones_cancion",   // ← LyricStudio offline
  "capitulos",           // ← ChapterStudio offline
]);

interface UseSupabaseOptions {
  select?: string;
  order?: { campo: string; asc?: boolean };
  isAdmin?: boolean;
  [key: string]: any;
}

async function readFromDexie<T>(tabla: string): Promise<T[]> {
  try {
    if (!db || !DEXIE_TABLES.has(tabla)) return [];
    const table = (db as any)[tabla];
    if (!table) return [];
    // Filtra registros marcados como eliminados
    const rows = (await table.toArray()) as any[];
    return rows.filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}

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

export function useSupabaseData<T = any>(tabla: string, opciones: UseSupabaseOptions = {}) {
  const { cache, updateCache } = useDataCache();

  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(tabla !== "__skip__");
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsKey = JSON.stringify(opciones);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    if (tabla === "__skip__") return;

    setLoading(true);
    setError(null);

    // ── OFFLINE: leer de Dexie ───────────────────────────────────────────────
    if (!navigator.onLine) {
      const localData = await readFromDexie<T>(tabla);
      if (isMounted.current) {
        setData(localData);
        setIsOffline(true);
        setLoading(false);
      }
      return;
    }

    // ── ONLINE: siempre buscar en Supabase ───────────────────────────────────
    setIsOffline(false);

    try {
      const currentOptions = JSON.parse(optionsKey);
      let res: any;

      if (QUERIES_MAP[tabla]) {
        res = await QUERIES_MAP[tabla].getAll(currentOptions);
      } else {
        let query = supabase.from(tabla).select(currentOptions.select || "*");
        if (currentOptions.order) {
          query = query.order(currentOptions.order.campo, { ascending: currentOptions.order.asc ?? true });
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
        writeToDexie(tabla, finalData);
      }
    } catch (err: any) {
      const isNetworkError =
        err.message?.includes("fetch") ||
        err.message?.includes("NetworkError") ||
        err.message?.includes("Failed to fetch");

      if (isNetworkError) {
        // Red caída aunque navigator.onLine diga true — usar Dexie como fallback
        const localData = await readFromDexie<T>(tabla);
        if (isMounted.current) {
          if (localData.length > 0) {
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
      }
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, updateCache, optionsKey]);

  // ── addRow: guarda offline si no hay red ────────────────────────────────────
  const addRow = useCallback(async (newData: any) => {
    if (!navigator.onLine && OFFLINE_WRITABLE.has(tabla)) {
      // Guardar localmente y encolar para sync
      const row = { ...newData, status: "pending" };
      await writeToDexie(tabla, [row]);
      await enqueueOperation(tabla, "upsert", newData.id, row);
      setData(prev => [...prev, row as any]);
      return { data: row, error: null };
    }

    try {
      const res = QUERIES_MAP[tabla]?.create
        ? await QUERIES_MAP[tabla].create(newData)
        : await supabase.from(tabla).insert([newData]).select().single();
      const created = res?.data || res;
      if (created?.id) {
        writeToDexie(tabla, [{ ...created, status: "synced" }]);
      }
      return { data: created, error: res?.error || null };
    } catch (err: any) {
      // Falló la red aunque onLine=true — guardar offline igual
      if (OFFLINE_WRITABLE.has(tabla)) {
        const row = { ...newData, status: "pending" };
        await writeToDexie(tabla, [row]);
        await enqueueOperation(tabla, "upsert", newData.id, row);
        setData(prev => [...prev, row as any]);
        return { data: row, error: null };
      }
      return { data: null, error: err.message };
    }
  }, [tabla]);

  // ── updateRow: guarda offline si no hay red ──────────────────────────────────
  const updateRow = useCallback(async (id: string | number, updates: any) => {
    if (!navigator.onLine && OFFLINE_WRITABLE.has(tabla)) {
      const existing = db ? await (db as any)[tabla]?.get(id) : null;
      const row = { ...existing, ...updates, id, status: "pending" };
      await writeToDexie(tabla, [row]);
      await enqueueOperation(tabla, "update", String(id), row);
      setData(prev => prev.map((r: any) => r.id === id ? row : r));
      return { data: row, error: null };
    }

    try {
      const res = QUERIES_MAP[tabla]?.update
        ? await QUERIES_MAP[tabla].update(id, updates)
        : await supabase.from(tabla).update(updates).eq("id", id).select().single();
      const updated = res?.data || res;
      if (updated?.id) {
        writeToDexie(tabla, [{ ...updated, status: "synced" }]);
      }
      return { data: updated, error: res?.error || null };
    } catch (err: any) {
      if (OFFLINE_WRITABLE.has(tabla)) {
        const existing = db ? await (db as any)[tabla]?.get(id) : null;
        const row = { ...existing, ...updates, id, status: "pending" };
        await writeToDexie(tabla, [row]);
        await enqueueOperation(tabla, "update", String(id), row);
        setData(prev => prev.map((r: any) => r.id === id ? row : r));
        return { data: row, error: null };
      }
      return { data: null, error: err.message };
    }
  }, [tabla]);

  // ── deleteRow: marca como eliminado offline ──────────────────────────────────
  const deleteRow = useCallback(async (id: string | number) => {
    if (!navigator.onLine && OFFLINE_WRITABLE.has(tabla)) {
      // Marcar como eliminado localmente, sincronizar después
      const existing = db ? await (db as any)[tabla]?.get(id) : null;
      if (existing) {
        await writeToDexie(tabla, [{ ...existing, deleted: true, status: "pending" }]);
      }
      await enqueueOperation(tabla, "delete", String(id));
      setData(prev => prev.filter((r: any) => r.id !== id));
      return { error: null };
    }

    try {
      const res = QUERIES_MAP[tabla]?.delete
        ? await QUERIES_MAP[tabla].delete(id)
        : await supabase.from(tabla).delete().eq("id", id);
      try {
        if (db && DEXIE_TABLES.has(tabla)) await (db as any)[tabla]?.delete(id);
      } catch {}
      return { error: res?.error || null };
    } catch (err: any) {
      if (OFFLINE_WRITABLE.has(tabla)) {
        await enqueueOperation(tabla, "delete", String(id));
        setData(prev => prev.filter((r: any) => r.id !== id));
        return { error: null };
      }
      return { error: err.message };
    }
  }, [tabla]);

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

    const handleOnline = () => {
      retryCount.current = 0;
      fetchData(true);
    };
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
    isOffline,
    refetch: () => fetchData(true),
    mutate: () => fetchData(true),
    addRow,
    updateRow,
    deleteRow,
  };
}