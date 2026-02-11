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
  
  // Iniciamos con lo que haya en caché para carga instantánea
  const [data, setData] = useState<T[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); // No mostramos loading si ya hay caché
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  // Usamos JSON.stringify para comparar opciones y evitar re-renders infinitos
  const opcionesRef = useRef(JSON.stringify(opciones));
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    opcionesRef.current = JSON.stringify(opciones);
  }, [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    
    // Solo ponemos loading si no hay datos previos (evita parpadeos)
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

  useEffect(() => {
    isMounted.current = true;
    
    // Carga inicial (solo si la caché está vacía o necesitamos refrescar)
    fetchData();

    // Suscripción Realtime
    const channel = supabase
      .channel(`db-${tabla}-${Math.random().toString(36).substring(7)}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        () => {
          // Pequeño debounce para no saturar si hay cambios masivos
          fetchData(true);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          // Fallback a Polling
          if (!pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => {
              if (isMounted.current) fetchData(true);
            }, 10000); // Polling cada 10s para no saturar
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

  // Función para actualizaciones manuales/optimistas
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
    refetch: () => fetchData(true) 
  };
}