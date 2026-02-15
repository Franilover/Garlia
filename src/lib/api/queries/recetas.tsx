import { supabase } from "@/lib/api/supabase";
import { Receta, NuevaReceta } from "@/lib/types/recetas";

export const recetasQueries = {
  /**
   * Obtiene todas las recetas del usuario actual
   */
  getAll: async (options: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "No autenticado" };

    const { data, error } = await supabase
      .from("recetas")
      .select(options.select || "*")
      .eq("user_id", user.id)
      .order(options.order?.campo || "created_at", { 
        ascending: options.order?.asc ?? false 
      });
    
    return { data: data || [], error };
  },

  /**
   * Obtiene una receta específica por su ID
   */
  getById: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autenticado" };

    const { data, error } = await supabase
      .from("recetas")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    
    return { data, error };
  },

  /**
   * Inserta una nueva receta
   */
  create: async (nuevaReceta: NuevaReceta) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autenticado" };

    // Convertir ingredientes a JSON string si es necesario
    const recetaData = {
      ...nuevaReceta,
      user_id: user.id,
      ingredientes: typeof nuevaReceta.ingredientes === 'string' 
        ? nuevaReceta.ingredientes 
        : JSON.stringify(nuevaReceta.ingredientes)
    };

    console.log('📤 Guardando receta:', recetaData); // Para debugging

    const { data, error } = await supabase
      .from("recetas")
      .insert([recetaData])
      .select()
      .single();
    
    return { data, error };
  },

  /**
   * Actualiza una receta existente
   */
  update: async (id: string, updates: Partial<NuevaReceta>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autenticado" };

    const updateData = {
      ...updates,
      ingredientes: updates.ingredientes && typeof updates.ingredientes !== 'string'
        ? JSON.stringify(updates.ingredientes)
        : updates.ingredientes
    };

    const { data, error } = await supabase
      .from("recetas")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    
    return { data, error };
  },

  /**
   * Elimina una receta
   */
  delete: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("recetas")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    
    return { error };
  }
};