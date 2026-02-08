"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useDataCache } from '@/components/features/control/DataContext';

// Ajusta esta ruta si no renombraste la carpeta a 'queries'
import { personajesQueries } from '@/lib/api/queries/personajes';
import { criaturasQueries } from '@/lib/api/queries/criaturas';

const QUERIES_MAP = {
  'personajes': personajesQueries,
  'criaturas': criaturasQueries
};

export function useSupabaseData(tabla, opciones = {}) {
  const { cache, updateCache } = useDataCache();
  
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);

  // Evitamos recrear la key en cada render
  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si ya hay datos en el estado local y no es un refetch, evitamos la carga
    if (!forceRefresh && data.length > 0) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const opt = JSON.parse(opcionesKey);
      let resultado;
      let errorFetch;

      if (QUERIES_MAP[tabla]) {
        const { data: res, error: err } = await QUERIES_MAP[tabla].getAll(opt);
        resultado = res;
        errorFetch = err;
      } else {
        let query = supabase.from(tabla).select(opt.select || '*');
        if (opt.order) {
          query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
        }
        const { data: res, error: err } = await query;
        resultado = res;
        errorFetch = err;
      }

      if (errorFetch) throw errorFetch;

      const finalData = resultado || [];
      setData(finalData);
      updateCache(tabla, finalData); 

    } catch (err) {
      setError(err.message);
      console.error(`Error fetching ${tabla}:`, err);
    } finally {
      setLoading(false);
    }
    // NOTA: Quitamos 'cache' de las dependencias para romper el bucle infinito
  }, [tabla, opcionesKey, updateCache, data.length]); 

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`db-changes-${tabla}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla }, 
        () => fetchData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  const setSyncedData = useCallback((newDataOrFn) => {
    setData(prev => {
      const resolved = typeof newDataOrFn === 'function' ? newDataOrFn(prev) : newDataOrFn;
      updateCache(tabla, resolved); 
      return resolved;
    });
  }, [tabla, updateCache]);

  return { data, setData: setSyncedData, loading, error, refetch: () => fetchData(true) };
}