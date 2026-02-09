import { supabase } from "@/lib/api/supabase";
import { Receta } from "@/lib/types/recetas"; // Ajusta la ruta a tus tipo

export const recetasQueries = {
  /**
   * Obtiene todas las recetas
   * Estándar para el QUERIES_MAP del hook useSupabaseData
   */
  getAll: async (options: any = {}) => {
    const { data, error } = await supabase
      .from("recetas")
      .select(options.select || "*")
      .order(options.order?.campo || "created_at", { 
        ascending: options.order?.asc ?? false 
      });

    return { data, error };
  },

  /**
   * Obtiene una receta específica por su ID
   */
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("recetas")
      .select("*")
      .eq("id", id)
      .single();

    return { data, error };
  },

  /**
   * Inserta una nueva receta
   */
  create: async (nuevaReceta: any) => {
    const { data, error } = await supabase
      .from("recetas")
      .insert([nuevaReceta])
      .select()
      .single();

    return { data, error };
  },

  /**
   * Elimina una receta
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from("recetas")
      .delete()
      .eq("id", id);

    return { error };
  }
};