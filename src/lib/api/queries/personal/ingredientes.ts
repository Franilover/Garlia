import { supabase } from "@/lib/api/client/supabase";

export const ingredientesQueries = {
  getAll: async (opciones: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "No autenticado" };

    let query = supabase
      .from("ingredientes")
      .select(opciones.select || "*")
      .eq("user_id", user.id);

    if (opciones.order) {
      query = query.order(opciones.order.campo, { 
        ascending: opciones.order.asc ?? true 
      });
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  create: async (newData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autenticado" };

    const { data, error } = await supabase
      .from("ingredientes")
      .insert([{ ...newData, user_id: user.id }])
      .select()
      .single();

    return { data, error };
  },

  update: async (id: string | number, updates: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "No autenticado" };

    const { data, error } = await supabase
      .from("ingredientes")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    return { data, error };
  },

  delete: async (id: string | number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("ingredientes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return { error };
  }
};;