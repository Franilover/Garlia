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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const opcionesRef = useRef(opciones);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    opcionesRef.current = opciones;
  }, [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const opt = opcionesRef.current;
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
  }, [tabla, updateCache]);

  useEffect(() => {
    isMounted.current = true;
    
    // Carga inicial
    fetchData(true);

    // Intentar suscripción en tiempo real
    const channel = supabase
      .channel(`db-changes-${tabla}-${Math.random()}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        (payload) => {
          console.log(`✅ Cambio detectado en ${tabla}:`, payload.eventType);
          setTimeout(() => {
            fetchData(true);
          }, 100);
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Suscripción a ${tabla}:`, status);
        
        if (status === "CHANNEL_ERROR") {
          console.warn(`⚠️ Error en suscripción realtime para ${tabla}, usando polling como fallback`);
          
          // FALLBACK: Polling cada 5 segundos si realtime falla
          pollingIntervalRef.current = setInterval(() => {
            if (isMounted.current) {
              console.log(`🔄 Polling ${tabla}...`);
              fetchData(true);
            }
          }, 5000);
        } else if (status === "SUBSCRIBED") {
          console.log(`✅ Suscripción exitosa a ${tabla}`);
          // Limpiar polling si la suscripción funciona
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
        
        if (err) {
          console.error(`❌ Error en canal ${tabla}:`, err);
        }
      });

    return () => {
      isMounted.current = false;
      
      // Limpiar suscripción
      supabase.removeChannel(channel);
      
      // Limpiar polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [tabla, fetchData]);

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