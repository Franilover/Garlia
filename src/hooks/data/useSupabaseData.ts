"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { useDataCache } from "@/components/providers/DataProvider";

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
import { cancionesQueries } from "@/lib/api/queries/personal/canciones"; // ✅ Añadido

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
  "ropa_outfits": ropaQueries,
  "canciones": cancionesQueries // ✅ Añadido al mapa
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
  
  // Inicializamos con la caché si existe
  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const optionsString = JSON.stringify(opciones);
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Solo mostramos loading si no hay datos previos o si es un refresh forzado explícito
    if (data.length === 0 && !forceRefresh) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const opt = JSON.parse(optionsString);
      let resultado;
      let errorFetch;
      
      if (QUERIES_MAP[tabla]) {
        // Usamos la query personalizada (ej: cancionesQueries.getAll())
        const res = await QUERIES_MAP[tabla].getAll({ ...opt, tabla });
        // Manejo flexible de la respuesta según cómo devuelva los datos tu API
        resultado = res?.data !== undefined ? res.data : (Array.isArray(res) ? res : []);
        errorFetch = res?.error !== undefined ? res.error : null;
      } else {
        // Fallback a query genérica de Supabase
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
  }, [tabla, updateCache, optionsString, data.length]);

  // --- MÉTODOS CRUD ---
  
  const addRow = useCallback(async (newData: any) => {
    try {
      let errorInsert;
      let insertedData = null;
      
      if (QUERIES_MAP[tabla]?.create) {
        const res = await QUERIES_MAP[tabla].create(newData);
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
        const res = await QUERIES_MAP[tabla].update(id, updates);
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
        const res = await QUERIES_MAP[tabla].delete(id);
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
  
  // --- EFECTO DE INICIALIZACIÓN Y REALTIME (OPCIÓN B IMPLEMENTADA) ---
  
  useEffect(() => {
    isMounted.current = true;

    // Si hay datos en caché, hacemos un refresh silencioso para asegurar que están actualizados
    if (cache[tabla] && cache[tabla].length > 0) {
      fetchData(true); 
    } else {
      fetchData();
    }
    
    const channelName = `realtime-${tabla}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        () => fetchData(true)
      )
      .subscribe((status) => {
        if (status === status) { // Conexión exitosa
           // Opcional: log de suscripción
        }
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
      if (channel) supabase.removeChannel(channel);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [tabla, fetchData]); // fetchData ya incluye optionsString en sus dependencias
  
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