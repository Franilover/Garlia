import { useState, useEffect, useCallback } from 'react'; // Agregamos useCallback
import { supabase } from '@/lib/supabase';

export function useSupabaseData(tabla, opciones = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Serializamos opciones para la dependencia del useEffect de forma segura
  const opcionesKey = JSON.stringify(opciones);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase.from(tabla).select(opciones.select || '*');
      
      if (opciones.order) {
        query = query.order(opciones.order.campo, { 
          ascending: opciones.order.asc ?? true 
        });
      }
      
      if (opciones.filtros) {
        Object.entries(opciones.filtros).forEach(([campo, valor]) => {
          if (valor !== undefined && valor !== null) {
            query = query.eq(campo, valor);
          }
        });
      }

      const { data: resultado, error: err } = await query;
      
      if (err) throw err;
      setData(resultado || []);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching ${tabla}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tabla, opcionesKey]); // Usamos la key serializada

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Retornamos setData para que personajes.jsx pueda usarlo
  return { 
    data, 
    setData, // <--- CAMBIO CRÍTICO
    loading, 
    error, 
    refetch: fetchData 
  };
}