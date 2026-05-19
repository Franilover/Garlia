import { supabase } from "@/lib/api/client/supabase";
import { 
  personajeFullQuery, 
  PersonajeFull, 
  Inserts, 
  Updates 
} from "@/lib/types/queries";

export const personajesQueries = {
  /**
   * Obtiene todos los personajes con sus canciones vinculadas en una sola petición
   */
  getAll: async (orden: { campo: string; asc: boolean } = { campo: "nombre", asc: true }): Promise<PersonajeFull[]> => {
    const { data, error } = await personajeFullQuery
      .order(orden.campo as any, { ascending: orden.asc });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Obtiene un personaje específico por ID
   */
  getById: async (id: string): Promise<PersonajeFull | null> => {
    const { data, error } = await personajeFullQuery
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Crea un nuevo personaje
   * El tipo 'Inserts' asegura que cumplas con los campos obligatorios de la DB
   */
  create: async (nuevo: Inserts<'personajes'>) => {
    const { data, error } = await supabase
      .from("personajes")
      .insert(nuevo)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualiza un personaje
   * 'Updates' hace que todos los campos sean opcionales automáticamente
   */
  update: async (id: string, cambios: Updates<'personajes'>) => {
    const { data, error } = await supabase
      .from("personajes")
      .update(cambios)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Elimina un personaje
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from("personajes")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};