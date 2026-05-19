import { supabase } from '@/lib/api/client/supabase';
import { itemFullQuery, Item, Inserts } from '@/lib/types/queries';

export const itemsQueries = {
  getAll: async (opt: { campo?: string; asc?: boolean } = {}) => {
    let query = itemFullQuery;
    if (opt.campo) {
      query = query.order(opt.campo as any, { ascending: opt.asc ?? true });
    }
    return await query;
  },

  getFilterOptions: async () => {
    const { data, error } = await supabase.from('items').select('categoria');
    if (error) return { data: [], error };

    const unicos = [...new Set(data.map(i => i.categoria))].filter(Boolean).sort();
    return { data: unicos, error: null };
  }
};