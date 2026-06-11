import { supabase } from "@/lib/api/client/supabase";
import { Inserts, Tables } from "@/lib/types/queries";

const USERNAME = "franilover";
export const eventosQueries = {
  getAll: async (): Promise<Tables<'eventos'>[]> => {
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .eq("username", USERNAME)
      .order("fecha");
    if (error) throw error;
    return data;
  },
  add: async (evento: Omit<Inserts<'eventos'>, 'username'>) => {
    return await supabase.from("eventos").insert({ ...evento, username: USERNAME }).select().single();
  }
};