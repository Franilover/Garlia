"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/api/supabase";
import { useDataCache } from "@/components/features/control/DataContext";

// ... (tus importaciones se mantienen igual)
import { personajesQueries } from "@/lib/api/queries/personajes";
import { criaturasQueries } from "@/lib/api/queries/criaturas";
import { itemsQueries } from "@/lib/api/queries/items"; 
import { librosQueries } from "@/lib/api/queries/libros";
import { recetasQueries } from "@/lib/api/queries/recetas";

const QUERIES_MAP: Record<string, any> = {
  "personajes": personajesQueries,
  "criaturas": criaturasQueries,
  "items": itemsQueries,
  "libros": librosQueries,
  "recetas": recetasQueries
};

interface UseSupabaseOptions {
  select?: string;
  order?: {
    campo: string;
    asc?: boolean;
  };
  [key: string]: any;
}

// ✅ CAMBIO 1: Añadir <T = any> aquí
export function useSupabaseData<T = any>(tabla: string, opciones: UseSupabaseOptions = {}) {
  const { cache, updateCache } = useDataCache();
  
  // ✅ CAMBIO 2: Usar T[] en lugar de any[]
  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);

  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (cache[tabla] && !forceRefresh && data.length > 0) {
      if (isMounted.current) setLoading(false);
      return;
    }

    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const opt = JSON.parse(opcionesKey);
      let resultado;
      let errorFetch;

      if (QUERIES_MAP[tabla]) {
        const res = await QUERIES_MAP[tabla].getAll(opt);
        resultado = res?.data !== undefined ? res.data : (Array.isArray(res) ? res : []);
        errorFetch = res?.error !== undefined ? res.error : null;
      } 
      else {
        let query = supabase.from(tabla).select(opt.select || "*");
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        const { data: res, error: err } = await query;
        resultado = res;
        errorFetch = err;
      }

      if (errorFetch) throw errorFetch;

      // ✅ CAMBIO 3: Asegurar que el resultado se trate como T[]
      const finalData = (resultado || []) as T[];
      
      if (isMounted.current) {
        setData(finalData);
        updateCache(tabla, finalData); 
      }

    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message);
        console.error(`"Error fetching ${tabla}:"`, err);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, opcionesKey, updateCache, cache, data.length]); 

  // --- El resto del código (useEffect, setSyncedData) se mantiene igual ---
  // Solo asegúrate de que setData dentro de setSyncedData use el tipo correcto

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    const channel = supabase
      .channel(`db-changes-${tabla}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  const setSyncedData = useCallback((newDataOrFn: any) => {
    setData(prev => {
      const resolved = typeof newDataOrFn === "function" ? newDataOrFn(prev) : newDataOrFn;
      if (!Array.isArray(resolved)) return prev;
      updateCache(tabla, resolved); 
      return resolved;
    });
  }, [tabla, updateCache]);

  return { 
    data: data || [], 
    setData: setSyncedData, 
    loading, 
    error, 
    refetch: () => fetchData(true) 
  };
}