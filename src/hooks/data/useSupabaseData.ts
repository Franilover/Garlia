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
import { cancionesQueries } from "@/lib/api/queries/personal/canciones";

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
  
  // 1. Inicializar con caché si existe para carga instantánea
  const [data, setData] = useState<T[]>(() => cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const retryCount = useRef(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const optionsString = JSON.stringify(opciones);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Solo activamos loading si no hay datos en absoluto
    if (data.length === 0 && !forceRefresh) {
      setLoading(true);
    }
    
    try {
      const opt = JSON.parse(optionsString);
      let resultado: any;
      
      if (QUERIES_MAP[tabla]) {
        // Llamada a la query personalizada (ej: canciones.getAll)
        const res = await QUERIES_MAP[tabla].getAll({ ...opt, tabla });
        
        // Manejo de respuesta: cancionesQueries devuelve el array directamente
        resultado = Array.isArray(res) ? res : (res?.data || []);
      } else {
        // Fallback genérico a Supabase
        let selectStr = opt.select || "*";
        let query = supabase.from(tabla).select(selectStr);
        
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        
        const { data: res, error: err } = await query;
        if (err) throw err;
        resultado = res;
      }
      
      if (isMounted.current) {
        const finalData = (resultado || []) as T[];
        setData(finalData);
        updateCache(tabla, finalData); // Sincroniza con el DataProvider
        setError(null);
        retryCount.current = 0;
      }
    } catch (err: any) {
      console.error(`❌ Error en fetchData [${tabla}]:`, err);
      if (isMounted.current) {
        setError(err.message);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
    // IMPORTANTE: Quitamos 'cache' de las dependencias para evitar bucles infinitos
  }, [tabla, updateCache, optionsString, data.length]);

  // --- MÉTODOS CRUD ---
  const addRow = useCallback(async (newData: any) => {
    try {
      let res;
      if (QUERIES_MAP[tabla]?.create) {
        res = await QUERIES_MAP[tabla].create(newData);
      } else {
        res = await supabase.from(tabla).insert([newData]).select().single();
      }
      if (res.error) throw res.error;
      return { data: res.data || res, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [tabla]);

  const updateRow = useCallback(async (id: string | number, updates: any) => {
    try {
      let res;
      if (QUERIES_MAP[tabla]?.update) {
        res = await QUERIES_MAP[tabla].update(id, updates);
      } else {
        res = await supabase.from(tabla).update(updates).eq("id", id).select().single();
      }
      if (res.error) throw res.error;
      return { data: res.data || res, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  }, [tabla]);

  const deleteRow = useCallback(async (id: string | number) => {
    try {
      let res;
      if (QUERIES_MAP[tabla]?.delete) {
        res = await QUERIES_MAP[tabla].delete(id);
      } else {
        res = await supabase.from(tabla).delete().eq("id", id);
      }
      if (res?.error) throw res.error;
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [tabla]);
  
  // --- EFECTO DE INICIALIZACIÓN (OPCIÓN B: RE-VALIDACIÓN) ---
  useEffect(() => {
    isMounted.current = true;

    // Lógica: Si hay algo en caché, lo mostramos (vía useState inicial)
    // Pero disparamos fetchData(true) para refrescar en background por si hubo cambios
    fetchData(!!cache[tabla]);
    
    const channel = supabase
      .channel(`rt-${tabla}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => {
        fetchData(true);
      })
      .subscribe();
    
    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [tabla, fetchData]); // Solo re-ejecutar si cambia la tabla o la función fetchData
  
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