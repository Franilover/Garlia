
import { supabase } from '@/lib/api/client/supabase';

export interface Reino {
  id: string; 
  nombre: string; 
  descripcion?: string; 
  orden?: number; 
  mapa_url?: string; 
  imagen_reino?: string; 
  coord_x?: number; 
  coord_y?: number; 
}

export const reinosQueries = {

  
  
  

  
  getAll: async () => {
    const { data, error } = await supabase
      .from('reinos')
      .select('*')
      .order('orden', { ascending: true });

    if (error) throw error;
    return data as Reino[];
  },

  
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('reinos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Reino;
  },

  
  search: async (query: string) => {
    const { data, error } = await supabase
      .from('reinos')
      .select('*')
      .ilike('nombre', `%${query}%`)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data as Reino[];
  },

  
  
  

  
  create: async (reino: Omit<Reino, 'id'>) => {
    const { data, error } = await supabase
      .from('reinos')
      .insert(reino)
      .select()
      .single();

    if (error) throw error;
    return data as Reino;
  },

  
  
  

  
  update: async (id: string, updates: Partial<Omit<Reino, 'id'>>) => {
    const { data, error } = await supabase
      .from('reinos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Reino;
  },

  
  
  

  
  delete: async (id: string) => {
    const { error } = await supabase
      .from('reinos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};