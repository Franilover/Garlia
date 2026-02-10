import { supabase } from "@/lib/supabase/client";
import { Ingrediente } from "@/lib/types/cocina"; // Asegúrate de crear este tipo

export const ingredientesQueries = {
  // Obtener todos los ingredientes
  getAll: async () => {
    const { data, error } = await supabase
      .from("ingredientes")
      .select("*")
      .order("nombre", { ascending: true });
    return { data, error };
  },

  // Obtener por categoría
  getByCategoria: async (categoria: string) => {
    const { data, error } = await supabase
      .from("ingredientes")
      .select("*")
      .eq("categoria", categoria);
    return { data, error };
  },

  // Crear uno nuevo (por si quieres añadirlos desde la web)
  create: async (ingrediente: Omit<Ingrediente, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("ingredientes")
      .insert([ingrediente])
      .select();
    return { data, error };
  },

  // Actualizar stock o precio
  update: async (id: string, updates: Partial<Ingrediente>) => {
    const { data, error } = await supabase
      .from("ingredientes")
      .update(updates)
      .eq("id", id)
      .select();
    return { data, error };
  },

  // Eliminar
  delete: async (id: string) => {
    const { error } = await supabase
      .from("ingredientes")
      .delete()
      .eq("id", id);
    return { error };
  }
};