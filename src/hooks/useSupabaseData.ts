"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/api/supabase";
import { useDataCache } from "@/components/features/control/DataContext";

import { personajesQueries } from "@/lib/api/queries/personajes";
import { criaturasQueries } from "@/lib/api/queries/criaturas";
import { itemsQueries } from "@/lib/api/queries/items"; 
import { librosQueries } from "@/lib/api/queries/libros";
import { recetasQueries } from "@/lib/api/queries/recetas";
import { tareasQueries } from "@/lib/api/queries/tareas";
import { eventosQueries } from "@/lib/api/queries/eventos";
import { ingredientesQueries } from "@/lib/api/queries/ingredientes";
import { ropaQueries } from "@/lib/api/queries/ropa";

const QUERIES_MAP: Record<string, any> = {
  "personajes": personajesQueries,
  "criaturas": criaturasQueries, 
  "items": itemsQueries,
  "libros": librosQueries,
  "recetas": recetasQueries,
  "tareas": tareasQueries,
  "eventos": eventosQueries,
  "ingredientes": ingredientesQueries,
  "ropa": ropaQueries,          
  "ropa_outfits": ropaQueries   
};

interface UseSupabaseOptions {
  select?: string;
  order?: {
    campo: string;
    asc?: boolean;
  };
  [key: string]: any;
}

export function useSupabaseData<T = any>(tabla: string, opciones: UseSupabaseOptions = {}) {
  const { cache, updateCache } = useDataCache();
  
  // Estado inicial desde caché para carga instantánea
  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memorizamos las opciones para evitar re-renders infinitos si se pasan objetos literales
  const optionsString = JSON.stringify(opciones);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Solo mostramos loading si no hay datos o si es un refresco manual
    if (data.length === 0 || forceRefresh) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const opt = JSON.parse(optionsString);
      let resultado;
      let errorFetch;

      // 1. Lógica de consulta (Queries personalizadas o Supabase genérico)
      if (QUERIES_MAP[tabla]) {
        const res = await QUERIES_MAP[tabla].getAll({ ...opt, tabla });
        resultado = res?.data !== undefined ? res.data : (Array.isArray(res) ? res : []);
        errorFetch = res?.error !== undefined ? res.error : null;
      } else {
        let selectStr = opt.select || "*";
        if (tabla === "precios" && !opt.select) {
          selectStr = "*, ingredientes(nombre, categoria)";
        }

        let query = supabase.from(tabla).select(selectStr);
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        const { data: res, error: err } = await query;
        resultado = res;
        errorFetch = err;
      }

      if (errorFetch) throw errorFetch;

      // 2. Éxito: Actualizar estados y caché
      const finalData = (resultado || []) as T[];
      
      if (isMounted.current) {
        setData(finalData);
        updateCache(tabla, finalData);
        retryCount.current = 0; // Resetear contador de reintentos
      }
    } catch (err: any) {
      if (isMounted.current) {
        // Detectar si es un error de red (CORS, DNS, Conexión perdida)
        const isNetworkError = 
          err.message?.includes("fetch") || 
          err.message?.includes("NetworkError") || 
          err.message?.includes("Failed to fetch");

        // Lógica de auto-reintento (hasta 3 veces con delay progresivo)
        if (isNetworkError && retryCount.current < 3) {
          retryCount.current++;
          console.warn(`"Intento de reintento ${retryCount.current} para la tabla ${tabla}..."`);
          setTimeout(() => fetchData(true), 1000 * retryCount.current);
          return;
        }

        setError(err.message);
        console.error(`"Error fetching ${tabla}:"`, err);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, updateCache, optionsString]); // Quitamos data.length de aquí para evitar ciclos

  // --- MÉTODOS CRUD ---

  const addRow = useCallback(async (newData: any) => {
    try {
      let errorInsert;
      if (QUERIES_MAP[tabla]?.create) {
        const res = await QUERIES_MAP[tabla].create({ ...newData, tabla_destino: tabla });
        errorInsert = res?.error;
      } else {
        const { error: err } = await supabase.from(tabla).insert([newData]);
        errorInsert = err;
      }
      if (errorInsert) throw errorInsert;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [tabla]);

  const updateRow = useCallback(async (id: string | number, updates: any) => {
    try {
      let errorUpdate;
      if (QUERIES_MAP[tabla]?.update) {
        const res = await QUERIES_MAP[tabla].update(id, { ...updates, tabla_destino: tabla });
        errorUpdate = res?.error;
      } else {
        const { error: err } = await supabase.from(tabla).update(updates).eq("id", id);
        errorUpdate = err;
      }
      if (errorUpdate) throw errorUpdate;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [tabla]);

  const deleteRow = useCallback(async (id: string | number) => {
    try {
      let errorDelete;
      if (QUERIES_MAP[tabla]?.delete) {
        const res = await QUERIES_MAP[tabla].delete(id, tabla);
        errorDelete = res?.error;
      } else {
        const { error: err } = await supabase.from(tabla).delete().eq("id", id);
        errorDelete = err;
      }
      if (errorDelete) throw errorDelete;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [tabla]);

  // --- EFECTO DE INICIALIZACIÓN Y REALTIME ---

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    // Crear un canal de realtime único por instancia del hook
    const channelName = `realtime-${tabla}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        () => fetchData(true)
      )
      .subscribe((status) => {
        // Si el canal de Realtime falla, activamos Polling como respaldo
        if (status === "CHANNEL_ERROR") {
          console.warn(`"Realtime falló en ${tabla}, activando polling..."`);
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => {
              if (isMounted.current) fetchData(true);
            }, 20000); // Polling cada 20 segundos
          }
        }
      });

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [tabla, fetchData]);

  const setSyncedData = useCallback((newDataOrFn: any) => {
    setData(prev => {
      const resolved = typeof newDataOrFn === "function" ? newDataOrFn(prev) : newDataOrFn;
      if (Array.isArray(resolved)) {
        updateCache(tabla, resolved); 
        return resolved;
      }
      return prev;
    });
  }, [tabla, updateCache]);

  return { 
    data: data || [], 
    setData: setSyncedData, 
    loading, 
    error, 
    refetch: () => fetchData(true),
    mutate: () => fetchData(true),
    addRow,
    updateRow,
    deleteRow 
  };
}