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
import { cancionesQueries } from "@/lib/api/queries/wiki/canciones";

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
  "canciones": cancionesQueries 
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
  
  // Inicialización inmediata con caché
  const [data, setData] = useState<T[]>(() => cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const optionsString = JSON.stringify(opciones);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Solo cargando si no hay datos previos
    if (data.length === 0 && !forceRefresh) {
      setLoading(true);
    }
    
    try {
      let resultado: any;
      const queryManager = QUERIES_MAP[tabla];

      if (queryManager) {
        /**
         * CORRECCIÓN PARA CANCIONES:
         * Tu canciones.ts tiene getAll: async () => ...
         * No acepta el objeto de opciones.
         */
        if (tabla === "canciones") {
          resultado = await queryManager.getAll();
        } else {
          const opt = JSON.parse(optionsString);
          resultado = await queryManager.getAll({ ...opt, tabla });
        }
      } else {
        // Fallback estándar
        const opt = JSON.parse(optionsString);
        let query = supabase.from(tabla).select(opt.select || "*");
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        const { data: res, error: err } = await query;
        if (err) throw err;
        resultado = res;
      }
      
      /**
       * NORMALIZACIÓN DE RESPUESTA:
       * canciones.ts devuelve el array directamente. 
       * Otras queries pueden devolver { data, error }.
       */
      const finalData = Array.isArray(resultado) ? resultado : (resultado?.data || []);

      if (isMounted.current) {
        setData(finalData as T[]);
        updateCache(tabla, finalData);
        setError(null);
      }
    } catch (err: any) {
      console.error(`❌ Error en tabla [${tabla}]:`, err);
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, updateCache, optionsString, data.length]);

  // --- MÉTODOS CRUD ---
  const addRow = useCallback(async (newData: any) => {
    try {
      const res = QUERIES_MAP[tabla]?.create 
        ? await QUERIES_MAP[tabla].create(newData)
        : await supabase.from(tabla).insert([newData]).select().single();
      return { data: res?.data || res, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [tabla]);

  const updateRow = useCallback(async (id: string | number, updates: any) => {
    try {
      const res = QUERIES_MAP[tabla]?.update
        ? await QUERIES_MAP[tabla].update(id, updates)
        : await supabase.from(tabla).update(updates).eq("id", id).select().single();
      return { data: res?.data || res, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [tabla]);

  const deleteRow = useCallback(async (id: string | number) => {
    try {
      if (QUERIES_MAP[tabla]?.delete) {
        await QUERIES_MAP[tabla].delete(id);
      } else {
        await supabase.from(tabla).delete().eq("id", id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [tabla]);
  
  // --- EFECTO DE INICIALIZACIÓN (OPCIÓN B) ---
  useEffect(() => {
    isMounted.current = true;

    // Si hay caché, validamos en background (silent refresh)
    // Si no hay caché, hacemos carga inicial con loader
    fetchData(!!cache[tabla]);
    
    // Suscripción Realtime corregida
    const channel = supabase
      .channel(`rt-${tabla}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => {
        fetchData(true);
      })
      .subscribe();
    
    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [tabla, fetchData]); 
  
  return { 
    data: data || [], 
    setData, 
    loading, 
    error, 
    refetch: () => fetchData(true),
    mutate: () => fetchData(true),
    addRow,
    updateRow,
    deleteRow 
  };
}