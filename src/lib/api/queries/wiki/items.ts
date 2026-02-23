import { supabase } from '@/lib/api/queries/client/supabase';

interface OrderOption {
  campo: string;
  asc?: boolean;
}

interface ItemsOptions {
  order?: OrderOption;
}

export const itemsQueries = {
  getAll: async (opt: ItemsOptions = {}) => {
    let query = supabase.from('items').select('*');
    
    if (opt.order) {
      query = query.order(opt.order.campo, { ascending: opt.order.asc ?? true });
    }
    
    return await query;
  },

  getFilterOptions: async () => {
    const { data, error } = await supabase
      .from('items')
      .select('categoria')
      .not('categoria', 'is', null);

    if (error) return { data: [], error };

    const unicos = [...new Set(data.map(i => i.categoria))].sort();
    return { data: unicos, error: null };
  }
};