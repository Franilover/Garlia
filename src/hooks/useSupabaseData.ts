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
  
  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const optionsString = JSON.stringify(opciones); // Para el useEffect
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Si ya tenemos datos y no es refresh forzado, no ponemos loading para evitar parpadeos
    if (data.length === 0 || forceRefresh) {
        setLoading(true);
    }
    setError(null);
    
    try {
      const opt = JSON.parse(optionsString);
      let resultado;
      let errorFetch;

      // Usar Map de queries o consulta directa
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

      const finalData = (resultado || []) as T[];
      
      if (isMounted.current) {
        setData(finalData);
        updateCache(tabla, finalData);
        retryCount.current = 0; // Resetear intentos si hubo éxito
      }
    } catch (err: any) {
      if (isMounted.current) {
        const isNetworkError = err.message?.includes("fetch") || err.message?.includes("NetworkError");
        
        // AUTO-REINTENTO si es error de red (máximo 3 veces)
        if (isNetworkError && retryCount.current < 3) {
          retryCount.current++;
          setTimeout(() => fetchData(true), 1500); 
          return;
        }

        setError(err.message);
        console.error(`"Error fetching ${tabla}:"`, err);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, updateCache, optionsString, data.length]);

  // CRUD Methods (addRow, updateRow, deleteRow) 
  // Se mantienen iguales pero con logs mejorados
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

  // Manejo de Realtime y Polling de respaldo
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    // Nombre de canal único para evitar colisiones
    const channelName = `db-${tabla}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        () => fetchData(true)
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Si Realtime falla, activamos polling cada 15 seg
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => {
              if (isMounted.current) fetchData(true);
            }, 15000);
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