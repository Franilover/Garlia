"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { useDataCache } from "@/providers/DataProvider";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";

import { personajesQueries }   from "@/lib/api/queries/wiki/personajes";
import { criaturasQueries }    from "@/lib/api/queries/wiki/criaturas";
import { itemsQueries }        from "@/lib/api/queries/wiki/items";
import { librosQueries }       from "@/lib/api/queries/wiki/libros";
import { recetasQueries }      from "@/lib/api/queries/personal/cocina/recetas";
import { tareasQueries }       from "@/lib/api/queries/personal/tareas";
import { eventosQueries }      from "@/lib/api/queries/personal/eventos";
import { ingredientesQueries } from "@/lib/api/queries/personal/cocina/ingredientes";
import { ropaQueries }         from "@/lib/api/queries/personal/ropa";
import { cancionesQueries }    from "@/lib/api/queries/wiki/canciones";
import { comprasQueries }      from "@/lib/api/queries/personal/cocina/carrito";

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
  // Wiki / mundo
  "personajes", "criaturas", "criatura_variantes", "items",
  "libros", "canciones", "reinos", "relaciones",
  // Escritura
  "secciones_cancion", "capitulos",
  // Personal
  "tareas", "eventos", "recetas", "ingredientes",
  "ropa", "ropa_outfits", "diario_fotos", "dibujos",
  "compras", "notas", "ensayos", "rutinas", "ejercicios_rutina",
  // Nota: reproductor_handles NO está aquí — guarda FileSystemDirectoryHandle
  // que no es serializable a JSON y se maneja aparte con db directamente.
]);

const OFFLINE_WRITABLE = new Set([
  // Escritura creativa
  "notas", "ensayos", "secciones_cancion", "capitulos",
  // Agenda
  "tareas", "eventos",
  // Ejercicio
  "rutinas", "ejercicios_rutina",
  // Cocina
  "recetas", "ingredientes", "compras",
  // Ropa
  "ropa", "ropa_outfits",
  // Galería / multimedia (id numérico autoincremental — solo update/delete offline,
  // los creates se bloquean sin conexión porque el id lo asigna Supabase)
  "diario_fotos", "dibujos",
  // Wiki (solo update/delete — creates de entidades requieren conexión)
  "personajes", "criaturas", "criatura_variantes", "items", "reinos", "relaciones",
]);

// Tablas cuyo id es numérico autoincremental (++id en Dexie / serial en Supabase).
// Para estas, addRow offline está bloqueado: el id definitivo lo asigna Supabase.
// updateRow y deleteRow sí funcionan offline porque el id ya existe.
const NUMERIC_ID_TABLES = new Set([
  "diario_fotos", "dibujos",
]);

// Timeout más generoso para conexiones lentas (12s en lugar de 5s)
const FETCH_TIMEOUT_MS = 12_000;

// Tiempo mínimo entre revalidaciones tras volver de background (ms)
const REVALIDATE_THROTTLE_MS = 30_000;

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

  const [data,      setData]      = useState<T[]>(cache[tabla] || []);
  const [loading,   setLoading]   = useState(tabla !== "__skip__");
  const [error,     setError]     = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const isMounted       = useRef(true);
  const retryCount      = useRef(0);
  const pollingRef      = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef    = useRef<number>(0);
  const lastVisibleRef  = useRef<number>(Date.now());
  const optionsKey      = JSON.stringify(opciones);

  // ─── Fetch principal ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    if (tabla === "__skip__") return;

    setError(null);

    // 1. Servir datos locales inmediatamente (stale-while-revalidate)
    const localData    = await readFromDexie<T>(tabla);
    const hasLocalData = localData.length > 0;

    if (hasLocalData && isMounted.current) {
      setData(localData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Sin conexión → quedarse con local
    if (!navigator.onLine) {
      if (isMounted.current) {
        if (!hasLocalData) setLoading(false);
        setIsOffline(true);
      }
      return;
    }

    setIsOffline(false);

    // 3. Fetch a Supabase con timeout generoso
    try {
      const currentOptions = JSON.parse(optionsKey);

      const fetchPromise = async () => {
        if (QUERIES_MAP[tabla]) {
          return await QUERIES_MAP[tabla].getAll(currentOptions);
        }
        let query = supabase.from(tabla).select(currentOptions.select || "*");
        if (currentOptions.order) {
          query = query.order(currentOptions.order.campo, {
            ascending: currentOptions.order.asc ?? true,
          });
        }
        return await query;
      };

      const timeoutPromise = new Promise<"timeout">(resolve =>
        setTimeout(() => resolve("timeout"), FETCH_TIMEOUT_MS)
      );

      const result = await Promise.race([fetchPromise(), timeoutPromise]);

      if (result === "timeout") {
        if (isMounted.current) {
          if (!hasLocalData) setLoading(false);
          setIsOffline(true);
          if (!hasLocalData) {
            setTimeout(() => fetchData(true), 8_000);
          }
        }
        return;
      }

      const res       = result as any;
      const finalData = Array.isArray(res) ? res : (res?.data || []);
      const fetchErr  = res?.error || null;

      if (fetchErr) throw fetchErr;

      if (isMounted.current) {
        setData(finalData as T[]);
        updateCache(tabla, finalData);
        retryCount.current = 0;
        lastFetchRef.current = Date.now();
        writeToDexie(tabla, finalData);
        setLoading(false);
        setIsOffline(false);
      }
    } catch (err: any) {
      if (isMounted.current) {
        if (!hasLocalData) {
          const isNetworkError =
            err.message?.includes("fetch") ||
            err.message?.includes("NetworkError") ||
            err.message?.includes("Failed to fetch");

          if (isNetworkError && retryCount.current < 5) {
            retryCount.current++;
            const delay = Math.min(2000 * Math.pow(2, retryCount.current - 1), 32_000);
            setTimeout(() => fetchData(true), delay);
            return;
          }
          setError(err.message);
        }
        setIsOffline(true);
        setLoading(false);
      }
    }
  }, [tabla, updateCache, optionsKey]);

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const addRow = useCallback(async (newData: any) => {
    // Tablas con id numérico autoincremental no pueden crearse offline:
    // el id lo asigna Supabase y no hay forma de predecirlo localmente.
    if (!navigator.onLine && NUMERIC_ID_TABLES.has(tabla)) {
      return { data: null, error: "Esta tabla requiere conexión para crear registros." };
    }

    if (!navigator.onLine && OFFLINE_WRITABLE.has(tabla)) {
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
      if (created?.id) writeToDexie(tabla, [{ ...created, status: "synced" }]);
      return { data: created, error: res?.error || null };
    } catch (err: any) {
      if (OFFLINE_WRITABLE.has(tabla) && !NUMERIC_ID_TABLES.has(tabla)) {
        const row = { ...newData, status: "pending" };
        await writeToDexie(tabla, [row]);
        await enqueueOperation(tabla, "upsert", newData.id, row);
        setData(prev => [...prev, row as any]);
        return { data: row, error: null };
      }
      return { data: null, error: err.message };
    }
  }, [tabla]);

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
      if (updated?.id) writeToDexie(tabla, [{ ...updated, status: "synced" }]);
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

  const deleteRow = useCallback(async (id: string | number) => {
    if (!navigator.onLine && OFFLINE_WRITABLE.has(tabla)) {
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

  // ─── Efectos de conexión ────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    const channelName = `rt-${tabla}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => {
        fetchData(true);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!pollingRef.current) {
            pollingRef.current = setInterval(() => fetchData(true), 30_000);
          }
        }
      });

    const handleOnline = () => {
      retryCount.current = 0;
      fetchData(true);
      supabase.realtime.connect();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const now                  = Date.now();
        const timeSinceLastFetch   = now - lastFetchRef.current;
        const timeSinceHidden      = now - lastVisibleRef.current;

        if (timeSinceHidden > REVALIDATE_THROTTLE_MS || timeSinceLastFetch > REVALIDATE_THROTTLE_MS) {
          retryCount.current = 0;
          supabase.realtime.connect();
          setTimeout(() => fetchData(true), 500);
        }
        lastVisibleRef.current = now;
      } else {
        lastVisibleRef.current = Date.now();
      }
    };

    window.addEventListener("online",  handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [tabla, fetchData]);

  return {
    data:    data || [],
    setData,
    loading,
    error,
    isOffline,
    refetch: () => fetchData(true),
    mutate:  () => fetchData(true),
    addRow,
    updateRow,
    deleteRow,
  };
}