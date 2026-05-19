import { supabase } from "@/lib/api/client/supabase";
import { rutinaFullQuery, RutinaFull, Inserts } from "@/lib/types/queries";

export const rutinasQueries = {
  getAll: async (): Promise<RutinaFull[]> => {
    const { data, error } = await rutinaFullQuery.order('created_at', { ascending: false });
    if (error) throw error;
    
    // El orden de los ejercicios ahora es type-safe
    return (data || []).map(rutina => ({
      ...rutina,
      ejercicios: rutina.ejercicios.sort((a, b) => a.orden - b.orden)
    }));
  },
  add: async (datos: Inserts<'rutinas'>) => {
    return await supabase.from('rutinas').insert(datos).select().single();
  }
};