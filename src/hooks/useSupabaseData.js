"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useDataCache } from '@/components/features/control/DataContext';

// Importación de queries personalizadas (Asegúrate de que las rutas sean correctas)
import { personajesQueries } from '@/lib/api/queries/personajes';
import { criaturasQueries } from '@/lib/api/queries/criaturas';
import { itemsQueries } from '@/lib/api/queries/items'; 

const QUERIES_MAP = {
  'personajes': personajesQueries,
  'criaturas': criaturasQueries,
  'items': itemsQueries 
};

export function useSupabaseData(tabla, opciones = {}) {
  const { cache, updateCache } = useDataCache();
  
  // Inicializamos con lo que haya en caché para una carga instantánea (Optimistic UI)
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);

  // Memorizamos las opciones para evitar re-ejecuciones innecesarias del fetch
  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si tenemos datos en caché y no forzamos refresco, detenemos el loading
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

      // 1. Usar Query Optimizada si existe en el mapa (como la de Personajes + Canciones)
      if (QUERIES_MAP[tabla]) {
        console.log(`"Usando query optimizada para: ${tabla}"`);
        const res = await QUERIES_MAP[tabla].getAll(opt);
        // Manejamos tanto si la query devuelve {data, error} como si devuelve el array directo
        resultado = res.data !== undefined ? res.data : res;
        errorFetch = res.error !== undefined ? res.error : null;
      } 
      // 2. Query genérica de Supabase si no hay lógica personalizada
      else {
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
      
      // Actualizamos estado local y caché global
      setData(finalData);
      updateCache(tabla, finalData); 

    } catch (err) {
      setError(err.message);
      console.error(`"Error fetching ${tabla}:"`, err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, opcionesKey, updateCache, cache]); 

  // --- EFECTO DE CARGA INICIAL Y REALTIME ---
  useEffect(() => {
    fetchData();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel(`db-changes-${tabla}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: tabla }, 
        (payload) => {
          console.log(`"Cambio detectado en ${tabla}, refrescando..."`, payload.eventType);
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  // Función para actualizar datos localmente y sincronizar con la caché
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