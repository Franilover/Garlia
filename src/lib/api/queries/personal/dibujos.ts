import { supabase } from '@/lib/api/client/supabase';
import { dibujoFullQuery, Dibujo, Inserts, Updates } from '@/lib/types/queries';

export const dibujosQueries = {
  getAll: async (): Promise<Dibujo[]> => {
    const { data, error } = await dibujoFullQuery.order('id', { ascending: false });
    if (error) throw error;
    return data;
  },

  create: async (dibujo: Inserts<'dibujos'>) => {
    const { data, error } = await supabase.from('dibujos').insert(dibujo).select().single();
    if (error) throw error;
    return data;
  },

  update: async (id: number, updates: Updates<'dibujos'>) => {
    const { data, error } = await supabase.from('dibujos').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};