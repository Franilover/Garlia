"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/api/supabase";
import { useDataCache } from "@/components/features/control/DataContext";

// Importación de queries personalizadas
import { personajesQueries } from "@/lib/api/queries/personajes";
import { criaturasQueries } from "@/lib/api/queries/criaturas";
import { itemsQueries } from "@/lib/api/queries/items"; 

const QUERIES_MAP = {
  "personajes": personajesQueries,
  "criaturas": criaturasQueries,
  "items": itemsQueries 
};

export function useSupabaseData(tabla, opciones = {}) {
  const { cache, updateCache } = useDataCache();
  
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);
  
  // Ref para evitar actualizaciones en componentes desmontados
  const isMounted = useRef(true);

  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si ya hay datos y no forzamos, salimos para evitar loops
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
        // Blindaje: nos aseguramos de que resultado sea un array
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

      const finalData = resultado || [];
      
      if (isMounted.current) {
        setData(finalData);
        updateCache(tabla, finalData); 
      }

    } catch (err) {
      if (isMounted.current) {
        setError(err.message);
        console.error(`"Error fetching ${tabla}:"`, err);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [tabla, opcionesKey, updateCache, cache, data.length]); 

  // --- REALTIME Y MONTAJE ---
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    const channel = supabase
      .channel(`db-changes-${tabla}`)
      .on("postgres_changes", 
        { event: "*", schema: "public", table: tabla }, 
        (payload) => {
          // Si el componente está en medio de un guardado, el Realtime puede esperar
          console.log(`"Evento Realtime en ${tabla}. Sincronizando..."`);
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  const setSyncedData = useCallback((newDataOrFn) => {
    setData(prev => {
      const resolved = typeof newDataOrFn === "function" ? newDataOrFn(prev) : newDataOrFn;
      // Protección: si por error llega algo que no es array, lo ignoramos
      if (!Array.isArray(resolved)) return prev;
      
      updateCache(tabla, resolved); 
      return resolved;
    });
  }, [tabla, updateCache]);

  return { 
    data: data || [], // Siempre devolvemos un array vacío por defecto
    setData: setSyncedData, 
    loading, 
    error, 
    refetch: () => fetchData(true) 
  };
}