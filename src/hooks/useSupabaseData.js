"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useDataCache } from '@/components/features/control/DataContext';

// 1. IMPORTAMOS TUS QUERIES PERSONALIZADAS
import { personajesQueries } from '@/lib/api/queries/personajes';
import { criaturasQueries } from '@/lib/api/queries/criaturas';

// 2. MAPA DE QUERIES: El hook consultará aquí primero
const QUERIES_MAP = {
  'personajes': personajesQueries,
  'criaturas': criaturasQueries
};

export function useSupabaseData(tabla, opciones = {}) {
  const { cache, updateCache } = useDataCache();
  
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);

  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (cache[tabla] && !forceRefresh && !loading) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const opt = JSON.parse(opcionesKey);
      let resultado;
      let errorFetch;

      // --- CAMBIO CLAVE: LÓGICA DE SELECCIÓN DE QUERY ---
      if (QUERIES_MAP[tabla]) {
        // Si la tabla está en nuestro mapa (personajes/criaturas), usamos su getAll()
        // que ya trae relaciones, variantes, etc.
        const { data: res, error: err } = await QUERIES_MAP[tabla].getAll(opt);
        resultado = res;
        errorFetch = err;
      } else {
        // Fallback para tablas simples que no tengan archivo de query propio
        let query = supabase.from(tabla).select(opt.select || '*');
        if (opt.order) {
          query = query.order(opt.order.campo, { 
            ascending: opt.order.asc ?? true 
          });
        }
        const { data: res, error: err } = await query;
        resultado = res;
        errorFetch = err;
      }
      // ------------------------------------------------

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
  }, [tabla, opcionesKey, updateCache, cache]); 

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`custom-all-channel-${tabla}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabla },
        (payload) => {
          fetchData(true); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  const setSyncedData = useCallback((newDataOrFn) => {
    setData(prev => {
      const resolvedData = typeof newDataOrFn === 'function' ? newDataOrFn(prev) : newDataOrFn;
      updateCache(tabla, resolvedData); 
      return resolvedData;
    });
  }, [tabla, updateCache]);

  return { 
    data, 
    setData: setSyncedData, 
    loading, 
    error, 
    refetch: () => fetchData(true) 
  };
}