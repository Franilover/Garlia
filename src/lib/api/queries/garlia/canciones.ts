import { supabase } from '@/lib/api/client/supabase';
import { cancionFullQuery, CancionFull, Inserts, Updates } from '@/lib/types/queries';

export const cancionesQueries = {
  getAll: async (): Promise<CancionFull[]> => {
    const { data, error } = await cancionFullQuery.order('titulo');
    if (error) throw error;
    return data;
  },
  getById: async (id: string): Promise<CancionFull | null> => {
    const { data, error } = await cancionFullQuery.eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (datos: Inserts<'canciones'>) => {
    return await supabase.from('canciones').insert(datos).select().single();
  },
  update: async (id: string, cambios: Updates<'canciones'>) => {
    return await supabase.from('canciones').update(cambios).eq('id', id).select().single();
  }
};