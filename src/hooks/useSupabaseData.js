"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useDataCache } from '@/components/features/control/DataContext';

/**
 * HOOK MAESTRO: useSupabaseData (v13.0 - Realtime + Cache)
 * Gestiona la sincronizaciÃ³n total entre Supabase, el Cache Global y la UI.
 */
export function useSupabaseData(tabla, opciones = {}) {
  const { cache, updateCache } = useDataCache();
  
  // 1. Estados locales sincronizados con el CachÃ© Global
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);

  const opcionesKey = JSON.stringify(opciones);

  // 2. FunciÃ³n de carga (Fetch) con soporte para forzar refresco
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si ya hay cachÃ© y no forzamos, salimos para evitar trÃ¡fico innecesario
    if (cache[tabla] && !forceRefresh) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      let query = supabase.from(tabla).select(opciones.select || '*');
      
      if (opciones.order) {
        query = query.order(opciones.order.campo, { 
          ascending: opciones.order.asc ?? true 
        });
      }
      
      const { data: resultado, error: err } = await query;
      
      if (err) throw err;

      const finalData = resultado || [];
      setData(finalData);
      updateCache(tabla, finalData); 

    } catch (err) {
      setError(err.message);
      console.error(`Error fetching ${tabla}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tabla, opcionesKey, cache, updateCache]);

  // 3. EFECTO REAL-TIME: Escucha cambios en la DB (INSERT, UPDATE, DELETE)
  useEffect(() => {
    fetchData(); // Carga inicial

    // Creamos el canal de suscripciÃ³n para la tabla
    const channel = supabase
      .channel(`custom-all-channel-${tabla}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabla },
        (payload) => {
          console.log(`ð Cambio detectado en ${tabla}:`, payload);
          
          /**
           * Al detectar un cambio, forzamos un refetch suave.
           * Esto asegura que los filtros y el orden se mantengan perfectos
           * segÃºn la lÃ³gica de la base de datos.
           */
          fetchData(true); 
        }
      )
      .subscribe();

    // Limpieza al desmontar el componente
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]);

  // 4. Actualizador manual sincronizado con el Cache Maestro
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