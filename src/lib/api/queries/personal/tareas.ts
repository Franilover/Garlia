"use client";
import { supabase } from "@/lib/api/client/supabase";

const USERNAME = "franilover"; // ← una sola fuente de verdad

export const tareasQueries = {
  getAll: async () => {
    return await supabase
      .from("tareas")
      .select("*")
      .eq("username", USERNAME)
      .order("created_at", { ascending: false });
  },

  add: async (titulo: string, categoria: string = "general") => {
    const { data, error } = await supabase
      .from("tareas")
      .insert([{ 
        titulo, 
        categoria, 
        username: USERNAME, 
        completada: false 
      }])
      .select();
    if (error) throw error;
    return data[0];
  },

  updateStatus: async (id: string, completada: boolean) => {
    const { error } = await supabase
      .from("tareas")
      .update({ completada })
      .eq("id", id)
      .eq("username", USERNAME);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("tareas")
      .delete()
      .eq("id", id)
      .eq("username", USERNAME);
    if (error) throw error;
  }
};