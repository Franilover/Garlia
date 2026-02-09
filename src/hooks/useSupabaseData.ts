"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/api/supabase";
import { useDataCache } from "@/components/features/control/DataContext";

// Importación de queries personalizadas
import { personajesQueries } from "@/lib/api/queries/personajes";
import { criaturasQueries } from "@/lib/api/queries/criaturas";
import { itemsQueries } from "@/lib/api/queries/items"; 
import { librosQueries } from "@/lib/api/queries/libros"; // <--- Nueva importación

// Mapeo de tablas a sus queries específicas
const QUERIES_MAP: Record<string, any> = {
  "personajes": personajesQueries,
  "criaturas": criaturasQueries,
  "items": itemsQueries,
  "libros": librosQueries // <--- Añadido al mapa
};

interface UseSupabaseOptions {
  select?: string;
  order?: {
    campo: string;
    asc?: boolean;
  };
  [key: string]: any;
}

export function useSupabaseData(tabla: string, opciones: UseSupabaseOptions = {}) {
  const { cache, updateCache } = useDataCache();
  
  // Tipamos la data como array de cualquier cosa por ahora (any[])
  const [data, setData] = useState<any[]>(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);

  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si ya hay datos en caché y no forzamos refresh, no hacemos petición
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

      // Si existe una query personalizada en el MAP, la usamos
      if (QUERIES_MAP[tabla]) {
        // getAll es el estándar que estamos usando en nuestras queries
        const res = await QUERIES_MAP[tabla].getAll(opt);
        resultado = res?.data !== undefined ? res.data : (Array.isArray(res) ? res : []);
        errorFetch = res?.error !== undefined ? res.error : null;
      } 
      else {
        // Query genérica de Supabase si no hay lógica personalizada
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

    } catch (err: any) {
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
        () => {
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