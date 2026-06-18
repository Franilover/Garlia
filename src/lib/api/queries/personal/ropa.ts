import { supabase } from '@/lib/api/client/supabase';
import { ropaFullQuery, Ropa, Inserts, Updates } from '@/lib/types/queries';

export const ropaQueries = {
  getAll: async (): Promise<Ropa[]> => {
    const { data, error } = await ropaFullQuery().order('categoria');
    if (error) throw error;
    return data;
  },

  updateStock: async (id: string, cambios: Updates<'ropa'>) => {
    return await supabase.from('ropa').update(cambios).eq('id', id).select().single();
  },

  addPrenda: async (prenda: Inserts<'ropa'>) => {
    return await supabase.from('ropa').insert(prenda).select().single();
  }
};