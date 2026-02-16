"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { useDataCache } from "@/components/providers/DataProvider";
import { personajesQueries } from "@/lib/api/queries/personajes";
import { criaturasQueries } from "@/lib/api/queries/criaturas";
import { itemsQueries } from "@/lib/api/queries/wiki/items"; 
import { librosQueries } from "@/lib/api/queries/libros";
import { recetasQueries } from "@/lib/api/queries/recetas";
import { tareasQueries } from "@/lib/api/queries/personal/tareas";
import { eventosQueries } from "@/lib/api/queries/wiki/eventos";
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
  const retryCount = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const optionsString = JSON.stringify(opciones);
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    if (data.length === 0 || forceRefresh) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const opt = JSON.parse(optionsString);
      let resultado;
      let errorFetch;
      
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
        retryCount.current = 0;
      }
    } catch (err: any) {
      if (isMounted.current) {
        const isNetworkError = 
          err.message?.includes("fetch") || 
          err.message?.includes("NetworkError") || 
          err.message?.includes("Failed to fetch");
        
        if (isNetworkError && retryCount.current < 3) {
          retryCount.current++;
          console.warn(`Intento de reintento ${retryCount.current} para la tabla ${tabla}...`);
          setTimeout(() => fetchData(true), 1000 * retryCount.current);
          return;
        }
        
        setError(err.message);
        console.error(`Error fetching ${tabla}:`, err);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, updateCache, optionsString]);
  
  // --- MÉTODOS CRUD CORREGIDOS ---
  
  const addRow = useCallback(async (newData: any) => {
    try {
      let errorInsert;
      let insertedData = null;
      
      if (QUERIES_MAP[tabla]?.create) {
        const res = await QUERIES_MAP[tabla].create(newData); // ✅ SIN tabla_destino
        errorInsert = res?.error;
        insertedData = res?.data;
      } else {
        const { data, error: err } = await supabase
          .from(tabla)
          .insert([newData])
          .select()
          .single();
        errorInsert = err;
        insertedData = data;
      }
      
      if (errorInsert) throw errorInsert;
      return { data: insertedData, error: null };
    } catch (err: any) {
      console.error(`❌ Error en addRow [${tabla}]:`, err);
      return { data: null, error: err.message };
    }
  }, [tabla]);
  
  const updateRow = useCallback(async (id: string | number, updates: any) => {
    try {
      let errorUpdate;
      let updatedData = null;
      
      if (QUERIES_MAP[tabla]?.update) {
        const res = await QUERIES_MAP[tabla].update(id, updates); // ✅ SIN tabla_destino
        errorUpdate = res?.error;
        updatedData = res?.data;
      } else {
        const { data, error: err } = await supabase
          .from(tabla)
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        errorUpdate = err;
        updatedData = data;
      }
      
      if (errorUpdate) throw errorUpdate;
      return { data: updatedData, error: null };
    } catch (err: any) {
      console.error(`❌ Error en updateRow [${tabla}]:`, err);
      return { data: null, error: err.message };
    }
  }, [tabla]);
  
  const deleteRow = useCallback(async (id: string | number) => {
    try {
      let errorDelete;
      
      if (QUERIES_MAP[tabla]?.delete) {
        const res = await QUERIES_MAP[tabla].delete(id); // ✅ Sin segundo parámetro
        errorDelete = res?.error;
      } else {
        const { error: err } = await supabase.from(tabla).delete().eq("id", id);
        errorDelete = err;
      }
      
      if (errorDelete) throw errorDelete;
      return { error: null };
    } catch (err: any) {
      console.error(`❌ Error en deleteRow [${tabla}]:`, err);
      return { error: err.message };
    }
  }, [tabla]);
  
  // --- EFECTO DE INICIALIZACIÓN Y REALTIME ---
  
  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    const channelName = `realtime-${tabla}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        () => fetchData(true)
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn(`Realtime falló en ${tabla}, activando polling...`);
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => {
              if (isMounted.current) fetchData(true);
            }, 20000);
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