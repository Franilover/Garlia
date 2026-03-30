"use client";
import { supabase } from "@/lib/api/client/supabase";

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const ropaQueries = {
  getAll: async (opt?: any) => {
    const userId = await getUserId();
    if (!userId) return { data: [], error: "No autenticado" };

    const tabla = opt?.tabla || "ropa";
    const query = supabase
      .from(tabla)
      .select(opt?.select || "*")
      .eq("user_id", userId)
      .order(opt?.order?.campo || "created_at", {
        ascending: opt?.order?.asc ?? false,
      });

    return await query;
  },

  create: async (newData: any) => {
    const userId = await getUserId();
    if (!userId) return { data: null, error: "No autenticado" };

    const { tabla_destino, ...datos } = newData;
    const destino = tabla_destino || "ropa";

    const { data, error } = await supabase
      .from(destino)
      .insert([{ ...datos, user_id: userId }])
      .select();

    return { data: data?.[0], error };
  },

  update: async (id: string | number, updates: any) => {
    const userId = await getUserId();
    if (!userId) return { data: null, error: "No autenticado" };

    const { tabla_destino, ...datos } = updates;
    const destino = tabla_destino || "ropa";

    const { data, error } = await supabase
      .from(destino)
      .update(datos)
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    return { data: data?.[0], error };
  },

  delete: async (id: string | number, tabla: string) => {
    const userId = await getUserId();
    if (!userId) return { error: "No autenticado" };

    const { error } = await supabase
      .from(tabla || "ropa")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    return { error };
  },
};