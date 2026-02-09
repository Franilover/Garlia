"use client";
import { supabase } from "@/lib/api/supabase";

export const tareasQueries = {
  /**
   * Obtiene todas las tareas (usado por el hook useSupabaseData)
   */
  getAll: async () => {
    return await supabase
      .from("tareas")
      .select("*")
      .eq("username", "Franilover")
      .order("created_at", { ascending: false });
  },

  /**
   * Crea una nueva tarea
   */
  add: async (titulo: string, categoria: string = "general") => {
    const { data, error } = await supabase
      .from("tareas")
      .insert([{ 
        titulo, 
        categoria, 
        username: "Franilover", 
        completada: false 
      }])
      .select();

    if (error) throw error;
    return data[0];
  },

  /**
   * Actualiza el estado
   */
  updateStatus: async (id: string, completada: boolean) => {
    const { error } = await supabase
      .from("tareas")
      .update({ completada })
      .eq("id", id)
      .eq("username", "Franilover");

    if (error) throw error;
  },

  /**
   * Elimina permanentemente
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from("tareas")
      .delete()
      .eq("id", id)
      .eq("username", "Franilover");

    if (error) throw error;
  }
};