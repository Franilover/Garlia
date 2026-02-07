"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useDataCache } from '@/components/features/control/DataContext';

/**
 * HOOK MAESTRO: useSupabaseData (v13.1 - Optimizado)
 * Gestiona la sincronización total entre Supabase, el Cache Global y la UI.
 */
export function useSupabaseData(tabla, opciones = {}) {
  const { cache, updateCache } = useDataCache();
  
  // 1. Estados locales sincronizados
  const [data, setData] = useState(cache[tabla] || []);
  const [loading, setLoading] = useState(!cache[tabla]); 
  const [error, setError] = useState(null);

  // Serializamos las opciones para comparar valores reales, no referencias de objetos
  const opcionesKey = useMemo(() => JSON.stringify(opciones), [opciones]);

  // 2. Función de carga (Fetch)
  // Quitamos 'cache' de las dependencias de useCallback para evitar bucles, 
  // ya que solo lo necesitamos para la validación inicial del estado.
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Si ya hay datos en caché y no forzamos, no hacemos nada
    if (cache[tabla] && !forceRefresh && !loading) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Parseamos opcionesKey para obtener los valores actuales
      const opt = JSON.parse(opcionesKey);
      let query = supabase.from(tabla).select(opt.select || '*');
      
      if (opt.order) {
        query = query.order(opt.order.campo, { 
          ascending: opt.order.asc ?? true 
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, opcionesKey, updateCache]); 

  // 3. EFECTO DE CARGA Y REAL-TIME
  useEffect(() => {
    fetchData(); // Se dispara si cambia la tabla o las opciones (opcionesKey)

    const channel = supabase
      .channel(`custom-all-channel-${tabla}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tabla },
        (payload) => {
          console.log(`🔔 Cambio detectado en ${tabla}:`, payload);
          fetchData(true); // Refetch suave ante cambios en la DB
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, tabla]); // fetchData ya incluye la sensibilidad a opcionesKey

  // 4. Actualizador manual sincronizado
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