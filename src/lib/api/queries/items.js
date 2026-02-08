import { supabase } from '@/lib/api/supabase';

export const itemsQueries = {
  // Para traer todos los items con su info
  getAll: async (opt = {}) => {
    let query = supabase.from('items').select('*');
    
    if (opt.order) {
      query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
    }
    
    return await query;
  },

  // Esta es la clave: traemos solo las categorías únicas para los filtros
  getFilterOptions: async () => {
    const { data, error } = await supabase
      .from('items')
      .select('categoria')
      .not('categoria', 'is', null);

    if (error) return { data: [], error };

    // Formateamos para que siempre sea consistente (ej: "Herramienta", "Arma")
    const unicos = [...new Set(data.map(i => i.categoria))].sort();
    return { data: unicos, error: null };
  }
};