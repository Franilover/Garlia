"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── CONFIGURACIÓN DE TABLAS ──────────────────────────────────────────────────
// Mapea cada tabla Dexie → su tabla en Supabase + opciones de query

interface TableConfig {
  supabaseTable: string;
  select?: string;           // columnas a seleccionar (default: "*")
  orderBy?: string;          // campo para ordenar
  orderAsc?: boolean;
  filters?: Record<string, any>; // filtros fijos ej: { username: "Franilover" }
}

const TABLE_CONFIG: Record<string, TableConfig> = {
  tareas: {
    supabaseTable: "tareas",
    orderBy: "created_at",
    orderAsc: false,
    filters: { username: "franilover" },
  },
  eventos: {
    supabaseTable: "eventos",
    orderBy: "fecha",
    orderAsc: true,
    filters: { username: "Franilover" },
  },
  notas: {
    supabaseTable: "ensayos",
    orderBy: "updated_at",
    orderAsc: false,
  },
  rutinas: {
    supabaseTable: "rutinas",
    orderBy: "created_at",
    orderAsc: false,
  },
  ejercicios_rutina: {
    supabaseTable: "ejercicios_rutina",
  },
  // Wiki (solo lectura)
  personajes: {
    supabaseTable: "personajes",
    orderBy: "nombre",
    orderAsc: true,
  },
  criaturas: {
    supabaseTable: "criaturas",
    orderBy: "nombre",
    orderAsc: true,
  },
  items: {
    supabaseTable: "items",
    orderBy: "nombre",
    orderAsc: true,
  },
  canciones: {
    supabaseTable: "canciones",
    orderBy: "created_at",
    orderAsc: false,
    filters: { visible: true },
  },
  reinos: {
    supabaseTable: "reinos",
    orderBy: "orden",
    orderAsc: true,
  },
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

interface UseOfflineDataOptions<T> {
  /** Nombre de la tabla (debe existir en TABLE_CONFIG y en db) */
  table: string;
  /** Filtros dinámicos adicionales (se combinan con los fijos del config) */
  extraFilters?: Record<string, any>;
  /** Transformación opcional sobre los datos crudos */
  transform?: (data: any[]) => T[];
  /** No cargar automáticamente al montar */
  manual?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  /** Fuerza una recarga desde Supabase (si hay internet) o Dexie */
  refresh: () => Promise<void>;
  /** Actualiza el caché local sin ir a Supabase */
  updateCache: (items: T[]) => Promise<void>;
}

export function useOfflineData<T = any>({
  table,
  extraFilters,
  transform,
  manual = false,
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const config = TABLE_CONFIG[table];

  const load = useCallback(async () => {
    if (!config) {
      setError(`Tabla "${table}" no configurada en useOfflineData`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const online = navigator.onLine;
    setIsOffline(!online);

    try {
      let result: any[] = [];

      if (online) {
        // ── ONLINE: leer de Supabase y cachear en Dexie ──────────────────
        let query = supabase
          .from(config.supabaseTable)
          .select(config.select ?? "*");

        // Aplicar filtros fijos
        const allFilters = { ...config.filters, ...extraFilters };
        for (const [key, value] of Object.entries(allFilters ?? {})) {
          query = query.eq(key, value);
        }

        // Ordenar
        if (config.orderBy) {
          query = query.order(config.orderBy, {
            ascending: config.orderAsc ?? true,
          });
        }

        const { data: supabaseData, error: supabaseError } = await query;

        if (supabaseError) throw supabaseError;

        result = supabaseData ?? [];

        // Guardar en Dexie para uso offline
        const dexieTable = (db as any)[table];
        if (dexieTable && result.length > 0) {
          await dexieTable.bulkPut(result);
        }

      } else {
        // ── OFFLINE: leer de Dexie ────────────────────────────────────────
        const dexieTable = (db as any)[table];
        if (!dexieTable) throw new Error(`Tabla "${table}" no existe en Dexie`);

        result = await dexieTable.toArray();

        // Filtrar registros marcados como eliminados localmente
        result = result.filter((r: any) => !r.deleted);
      }

      // Transformar si se proporcionó función
      const final = transform ? transform(result) : (result as T[]);
      setData(final);

    } catch (err: any) {
      console.error(`[useOfflineData:${table}]`, err);

      // Si falla online, intentar Dexie como fallback
      try {
        const dexieTable = (db as any)[table];
        if (dexieTable) {
          const fallback = await dexieTable.toArray();
          const filtered = fallback.filter((r: any) => !r.deleted);
          const final = transform ? transform(filtered) : (filtered as T[]);
          setData(final);
          setIsOffline(true);
          setError("Sin conexión — mostrando datos guardados");
          return;
        }
      } catch {
        // fallback también falló
      }

      setError(err?.message ?? "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [table, JSON.stringify(extraFilters)]);

  // Actualizar caché local sin ir a Supabase
  const updateCache = useCallback(async (items: T[]) => {
    const dexieTable = (db as any)[table];
    if (dexieTable) {
      await dexieTable.bulkPut(items);
      setData(items);
    }
  }, [table]);

  // Escuchar cambios de conectividad
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      load(); // re-sincronizar al volver
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [load]);

  useEffect(() => {
    if (!manual) load();
  }, [load, manual]);

  return { data, loading, error, isOffline, refresh: load, updateCache };
}