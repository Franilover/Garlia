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

const QUERIES_MAP: Record<string, any> = {
  "personajes": personajesQueries,
  "criaturas": criaturasQueries, 
  "items": itemsQueries,
  "libros": librosQueries,
  "recetas": recetasQueries,
  "tareas": tareasQueries,
  "eventos": eventosQueries,
  "ingredientes": ingredientesQueries
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
  
  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const opcionesRef = useRef(JSON.stringify(opciones));
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    opcionesRef.current = JSON.stringify(opciones);
  }, [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    if (data.length === 0 || forceRefresh) {
        setLoading(true);
    }
    setError(null);
    
    try {
      const opt = JSON.parse(opcionesRef.current);
      let resultado;
      let errorFetch;

      if (QUERIES_MAP[tabla]) {
        const res = await QUERIES_MAP[tabla].getAll(opt);
        resultado = res?.data !== undefined ? res.data : (Array.isArray(res) ? res : []);
        errorFetch = res?.error !== undefined ? res.error : null;
      } else {
        let query = supabase.from(tabla).select(opt.select || "*");
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        const { data: res, error: err } = await query;
        resultado = res;
        errorFetch = err;
      }

      if (errorFetch) throw errorFetch;

      const finalData = (resultado || []) as T[];
      
      if (isMounted.current) {
        setData(finalData);
        updateCache(tabla, finalData); 
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message);
        console.error(`Error fetching ${tabla}:`, err);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, updateCache, data.length]);

  // Función para insertar nuevas filas (addRow)
  const addRow = useCallback(async (newData: any) => {
    try {
      let errorInsert;

      if (QUERIES_MAP[tabla]?.create) {
        const res = await QUERIES_MAP[tabla].create(newData);
        errorInsert = res?.error;
      } else {
        const { error: err } = await supabase.from(tabla).insert([newData]);
        errorInsert = err;
      }

      if (errorInsert) throw errorInsert;
      return { error: null };
    } catch (err: any) {
      console.error(`Error al insertar en ${tabla}:`, err);
      return { error: err.message };
    }
  }, [tabla]);

  // Función para actualizar filas (updateRow) - ESTA ES LA QUE FALTABA
  const updateRow = useCallback(async (id: string | number, updates: any) => {
    try {
      let errorUpdate;

      if (QUERIES_MAP[tabla]?.update) {
        const res = await QUERIES_MAP[tabla].update(id, updates);
        errorUpdate = res?.error;
      } else {
        const { error: err } = await supabase.from(tabla).update(updates).eq("id", id);
        errorUpdate = err;
      }

      if (errorUpdate) throw errorUpdate;
      return { error: null };
    } catch (err: any) {
      console.error(`Error al actualizar en ${tabla}:`, err);
      return { error: err.message };
    }
  }, [tabla]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    const channel = supabase
      .channel(`db-${tabla}-${Math.random().toString(36).substring(7)}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        () => fetchData(true)
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => {
              if (isMounted.current) fetchData(true);
            }, 10000);
          }
        } else if (status === "SUBSCRIBED") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
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
    updateRow // Exportado correctamente para que ingredientes.tsx lo vea
  };
}