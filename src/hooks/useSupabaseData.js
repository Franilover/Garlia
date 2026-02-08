"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useDataCache } from '@/components/features/control/DataContext';

// Importación de queries personalizadas
import { personajesQueries } from '@/lib/api/queries/personajes';
import { criaturasQueries } from '@/lib/api/queries/criaturas';

const QUERIES_MAP = {
  'personajes': personajesQueries,
  'criaturas': criaturasQueries
};

export function useSupabaseData(tabla, opciones = {}) {
  const { cache, updateCache } = useDataCache();
  
  // Inicializamos con el caché si existe
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);

  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si hay caché y no forzamos refresco, nos saltamos la carga inicial pesada
    if (cache[tabla] && !forceRefresh && data.length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const opt = JSON.parse(opcionesKey);
      let resultado;
      let errorFetch;

      // Usamos la query personalizada (que ya trae las relaciones corregidas)
      if (QUERIES_MAP[tabla]) {
        const { data: res, error: err } = await QUERIES_MAP[tabla].getAll(opt);
        resultado = res;
        errorFetch = err;
      } else {
        // Fallback genérico
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
  }, [tabla, opcionesKey, updateCache, cache, data.length]); 

  useEffect(() => {
    fetchData();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel(`db-changes-${tabla}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: tabla }, 
        () => fetchData(true) // Refrescar cuando algo cambie en la DB
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  // Función para actualizar datos manualmente y sincronizar con el Contexto/Caché
  const setSyncedData = useCallback((newDataOrFn) => {
    setData(prev => {
      const resolved = typeof newDataOrFn === 'function' ? newDataOrFn(prev) : newDataOrFn;
      updateCache(tabla, resolved); 
      return resolved;
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