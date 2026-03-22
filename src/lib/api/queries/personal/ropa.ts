"use client";
import { supabase } from "@/lib/api/client/supabase";

const FRANILOVER_ID = "52e9a913-ebb4-44be-847b-f2387b60d4ff";

export const ropaQueries = {
  
  getAll: async (opt?: any) => {
    const tabla = opt?.tabla || "ropa";
    
    const query = supabase
      .from(tabla)
      .select(opt?.select || "*")
      .eq("user_id", FRANILOVER_ID) 
      .order(opt?.order?.campo || "created_at", { 
        ascending: opt?.order?.asc ?? false 
      });

    return await query;
  },

  
  create: async (newData: any) => {
    const { tabla_destino, ...datos } = newData;
    const destino = tabla_destino || "ropa";

    const { data, error } = await supabase
      .from(destino)
      .insert([{ 
        ...datos, 
        user_id: FRANILOVER_ID 
      }])
      .select();

    return { data: data?.[0], error };
  },

  
  update: async (id: string | number, updates: any) => {
    const { tabla_destino, ...datos } = updates;
    const destino = tabla_destino || "ropa";

    const { data, error } = await supabase
      .from(destino)
      .update(datos)
      .eq("id", id)
      .eq("user_id", FRANILOVER_ID) 
      .select();

    return { data: data?.[0], error };
  },

  
  delete: async (id: string | number, tabla: string) => {
    const { error } = await supabase
      .from(tabla || "ropa")
      .delete()
      .eq("id", id)
      .eq("user_id", FRANILOVER_ID); 

    return { error };
  }
};