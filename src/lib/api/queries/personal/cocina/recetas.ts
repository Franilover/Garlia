
import { supabase } from '@/lib/api/client/supabase';
import { Receta, NuevaReceta, RecetaCategoria } from '@/lib/types/personal/receta';

export const recetasQueries = {

  
  
  

  
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('autor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Receta[];
  },

  
  getById: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('id', id)
      .eq('autor_id', user.id)
      .single();

    if (error) throw error;
    return data as Receta;
  },

  
  getByCategoria: async (categoria: RecetaCategoria) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('autor_id', user.id)
      .eq('categoria', categoria)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Receta[];
  },

  
  search: async (query: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('autor_id', user.id)
      .ilike('nombre', `%${query}%`)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data as Receta[];
  },

  
  
  

  
  create: async (nuevaReceta: NuevaReceta) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const recetaData = {
      ...nuevaReceta,
      autor_id: user.id,
      
      ingredientes: typeof nuevaReceta.ingredientes === 'string'
        ? nuevaReceta.ingredientes
        : JSON.stringify(nuevaReceta.ingredientes),
      instrucciones: typeof nuevaReceta.instrucciones === 'string'
        ? nuevaReceta.instrucciones
        : JSON.stringify(nuevaReceta.instrucciones),
    };

    const { data, error } = await supabase
      .from('recetas')
      .insert(recetaData)
      .select()
      .single();

    if (error) throw error;
    return data as Receta;
  },

  
  
  

  
  update: async (id: string, updates: Partial<NuevaReceta>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const updateData = {
      ...updates,
      
      ...(updates.ingredientes && {
        ingredientes: typeof updates.ingredientes === 'string'
          ? updates.ingredientes
          : JSON.stringify(updates.ingredientes),
      }),
      ...(updates.instrucciones && {
        instrucciones: typeof updates.instrucciones === 'string'
          ? updates.instrucciones
          : JSON.stringify(updates.instrucciones),
      }),
    };

    const { data, error } = await supabase
      .from('recetas')
      .update(updateData)
      .eq('id', id)
      .eq('autor_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Receta;
  },

  
  
  

  
  delete: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('recetas')
      .delete()
      .eq('id', id)
      .eq('autor_id', user.id);

    if (error) throw error;
    return true;
  },
};