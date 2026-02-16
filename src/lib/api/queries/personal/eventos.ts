"use client";
import { supabase } from "@/lib/api/client/supabase";

export const eventosQueries = {
  /**
   * Obtiene los eventos (usado por el hook useSupabaseData)
   */
  getAll: async () => {
    return await supabase
      .from("eventos")
      .select("*")
      .eq("username", "Franilover")
      .order("fecha", { ascending: true });
  },

  /**
   * Añade un evento
   */
  add: async (evento: { titulo: string, fecha: string, tipo: string, hora_inicio?: string }) => {
    const { data, error } = await supabase
      .from("eventos")
      .insert([{ 
        ...evento, 
        username: "Franilover" 
      }])
      .select();

    if (error) throw error;
    return data[0];
  },

  /**
   * Elimina un evento
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", id)
      .eq("username", "Franilover");

    if (error) throw error;
  }
};