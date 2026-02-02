import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useSupabaseData(tabla, opciones = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
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
            query = query.eq(campo, valor);
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
    };

    fetchData();
  }, [tabla, JSON.stringify(opciones)]); // ⚠️ Cuidado con deps

  return { data, loading, error, refetch: () => setLoading(true) };
}