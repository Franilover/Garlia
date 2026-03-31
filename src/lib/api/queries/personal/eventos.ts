"use client";
import { supabase } from "@/lib/api/client/supabase";
import { USERNAME } from "@/lib/config/constants";

export const eventosQueries = {
  getAll: async () => {
    return await supabase
      .from("eventos")
      .select("*")
      .eq("username", USERNAME)
      .order("fecha", { ascending: true });
  },

  add: async (evento: { titulo: string; fecha: string; tipo: string; hora_inicio?: string }) => {
    const { data, error } = await supabase
      .from("eventos")
      .insert([{ ...evento, username: USERNAME }])
      .select();

    if (error) throw error;
    return data[0];
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", id)
      .eq("username", USERNAME);

    if (error) throw error;
  },
};