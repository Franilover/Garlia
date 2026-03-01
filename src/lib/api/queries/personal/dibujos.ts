
import { supabase } from '@/lib/api/client/supabase';

export interface Dibujo {
  id: number; 
  titulo: string; 
  url_imagen: string; 
  categoria: string; 
}

export const dibujosQueries = {

  
  
  

  /** Obtener todos los dibujos */
  getAll: async () => {
    const { data, error } = await supabase
      .from('dibujos')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    return data as Dibujo[];
  },

  /** Obtener dibujos por categoría (ej: "original", "fanart", "bocetos") */
  getByCategoria: async (categoria: string) => {
    const { data, error } = await supabase
      .from('dibujos')
      .select('*')
      .eq('categoria', categoria)
      .order('id', { ascending: false });

    if (error) throw error;
    return data as Dibujo[];
  },

  /** Obtener un dibujo por ID */
  getById: async (id: number) => {
    const { data, error } = await supabase
      .from('dibujos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Dibujo;
  },

  /** Buscar dibujos por título */
  search: async (query: string) => {
    const { data, error } = await supabase
      .from('dibujos')
      .select('*')
      .ilike('titulo', `%${query}%`)
      .order('id', { ascending: false });

    if (error) throw error;
    return data as Dibujo[];
  },

  
  
  

  /** Agregar un nuevo dibujo */
  create: async (dibujo: Omit<Dibujo, 'id'>) => {
    const { data, error } = await supabase
      .from('dibujos')
      .insert(dibujo)
      .select()
      .single();

    if (error) throw error;
    return data as Dibujo;
  },

  
  
  

  /** Actualizar un dibujo existente */
  update: async (id: number, updates: Partial<Omit<Dibujo, 'id'>>) => {
    const { data, error } = await supabase
      .from('dibujos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Dibujo;
  },

  
  
  

  /** Eliminar un dibujo por ID */
  delete: async (id: number) => {
    const { error } = await supabase
      .from('dibujos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};