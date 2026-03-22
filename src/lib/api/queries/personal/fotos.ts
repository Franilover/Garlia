
import { supabase } from '@/lib/api/client/supabase';

export interface DiarioFoto {
  id: number; 
  fecha: string; 
  url_imagen: string; 
  categoria: string; 
  created_at: string; 
}

export const fotosQueries = {

  
  
  

  
  getAll: async () => {
    const { data, error } = await supabase
      .from('diario_fotos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as DiarioFoto[];
  },

  
  getByCategoria: async (categoria: string) => {
    const { data, error } = await supabase
      .from('diario_fotos')
      .select('*')
      .eq('categoria', categoria)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as DiarioFoto[];
  },

  
  getById: async (id: number) => {
    const { data, error } = await supabase
      .from('diario_fotos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as DiarioFoto;
  },

  
  
  

  
  create: async (foto: Omit<DiarioFoto, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('diario_fotos')
      .insert(foto)
      .select()
      .single();

    if (error) throw error;
    return data as DiarioFoto;
  },

  
  
  

  
  update: async (id: number, updates: Partial<Omit<DiarioFoto, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('diario_fotos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DiarioFoto;
  },

  
  
  

  
  delete: async (id: number) => {
    const { error } = await supabase
      .from('diario_fotos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};