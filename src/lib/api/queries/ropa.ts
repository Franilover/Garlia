"use client";
import { supabase } from "@/lib/api/supabase";

export const ropaQueries = {
  /**
   * Obtiene datos (ropa o outfits) filtrados por Franilover
   */
  getAll: async (opt?: any) => {
    // El hook llama a esta función. El contexto de la tabla viene implícito
    // pero forzamos el filtrado por usuario aquí.
    return await supabase
      .from(opt?.tabla || "ropa") 
      .select(opt?.select || "*")
      .eq("username", "Franilover")
      .order(opt?.order?.campo || "created_at", { 
        ascending: opt?.order?.asc ?? false 
      });
  },

  /**
   * Añade una prenda o un outfit
   */
  create: async (newData: any) => {
    // Extraemos la tabla del objeto si la envías, o por defecto 'ropa'
    const { tabla_destino, ...datos } = newData;
    
    const { data, error } = await supabase
      .from(tabla_destino || "ropa")
      .insert([{ 
        ...datos, 
        username: "Franilover" 
      }])
      .select();

    return { data: data?.[0], error };
  },

  /**
   * Elimina registros (ropa u outfits)
   */
  delete: async (id: string | number) => {
    // Nota: El hook de Supabase suele pasar el ID. 
    // Para borrar, necesitamos saber la tabla. Si el hook no la provee a la query,
    // usamos una lógica genérica o dejamos que la lógica por defecto del hook actúe.
    const { error } = await supabase
      .from("ropa_outfits")
      .delete()
      .eq("id", id)
      .eq("username", "Franilover");

    return { error };
  }
};