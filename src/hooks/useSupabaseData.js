"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useDataCache } from '@/components/features/control/DataContext';

// Importación de queries personalizadas
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
  
  // 1. CARGA INSTANTÁNEA: Si existe en caché, el usuario ve los datos de inmediato
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);

  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si ya hay datos en caché y no es un refresco forzado (Realtime), no disparamos la red
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

      // 2. DISPATCHER: ¿Tiene esta tabla una query optimizada (como Personajes + Canciones)?
      if (QUERIES_MAP[tabla]) {
        console.log(`"Ejecutando lógica optimizada para: ${tabla}"`);
        const res = await QUERIES_MAP[tabla].getAll(opt);
        resultado = res.data !== undefined ? res.data : res;
        errorFetch = res.error !== undefined ? res.error : null;
      } 
      // 3. FALLBACK: Query estándar para tablas simples
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
      
      // 4. SINCRONIZACIÓN: Actualizamos estado local y caché global del contexto
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

  // --- 5. REALTIME: Escucha cambios en Supabase y refresca automáticamente ---
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`db-changes-${tabla}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: tabla }, 
        (payload) => {
          console.log(`"Evento [${payload.eventType}] en ${tabla}. Refrescando..."`);
          fetchData(true); // El true fuerza el salto de la caché
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  // --- 6. SETTER SINCRONIZADO: Para actualizaciones locales manuales ---
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