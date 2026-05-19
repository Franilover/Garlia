import { supabase } from '@/lib/api/client/supabase';
import { tareaFullQuery, Tarea, Inserts, Updates } from '@/lib/types/queries';

export const tareasQueries = {
  getAll: async (): Promise<Tarea[]> => {
    const { data, error } = await tareaFullQuery
      .order('completada', { ascending: true })
      .order('prioridad', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  toggleCompletada: async (id: string, estadoActual: boolean) => {
    return await supabase
      .from('tareas')
      .update({ completada: !estadoActual })
      .eq('id', id)
      .select()
      .single();
  },

  create: async (tarea: Inserts<'tareas'>) => {
  return await supabase.from('tareas').insert(tarea).select().single();
},

// Alias para compatibilidad con componentes que usan .add()
add: async (tarea: Inserts<'tareas'>) => {
  return await supabase.from('tareas').insert(tarea).select().single();
},
  
};