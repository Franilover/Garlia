// src/lib/api/canciones.ts
import { supabase } from '@/lib/api/client/supabase';
import { cancionQuery, Cancion, Inserts, Updates } from '@/lib/types/queries';

export const cancionesQueries = {
  getAll: async (): Promise<Cancion[]> => {
    const { data, error } = await cancionQuery.order('titulo');
    if (error) throw error;
    return data as Cancion[]; // Cast explícito a array
  },
  getById: async (id: string): Promise<Cancion | null> => {
    // El .single() asegura que devuelva un objeto, no un array
    const { data, error } = await cancionQuery.eq('id', id).single();
    if (error) throw error;
    return data as Cancion; // Cast explícito a objeto
  },
  create: async (datos: Inserts<'canciones'>) => {
    return await supabase.from('canciones').insert(datos).select().single();
  },
  update: async (id: string, cambios: Updates<'canciones'>) => {
    return await supabase.from('canciones').update(cambios).eq('id', id).select().single();
  }
};