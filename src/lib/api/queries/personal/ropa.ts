"use client";
import { supabase } from "@/lib/api/queries/client/supabase";

/** * ID Único de Franilover (UUID)
 * Este ID es el que vincula tus perfiles con la ropa
 */
const FRANILOVER_ID = "52e9a913-ebb4-44be-847b-f2387b60d4ff";

export const ropaQueries = {
  /**
   * Obtiene los datos de la tabla 'ropa' o 'ropa_outfits'
   */
  getAll: async (opt?: any) => {
    const tabla = opt?.tabla || "ropa";
    
    const query = supabase
      .from(tabla)
      .select(opt?.select || "*")
      .eq("user_id", FRANILOVER_ID) // <--- CAMBIO: Ahora usamos user_id
      .order(opt?.order?.campo || "created_at", { 
        ascending: opt?.order?.asc ?? false 
      });

    return await query;
  },

  /**
   * Crea un nuevo registro
   */
  create: async (newData: any) => {
    const { tabla_destino, ...datos } = newData;
    const destino = tabla_destino || "ropa";

    const { data, error } = await supabase
      .from(destino)
      .insert([{ 
        ...datos, 
        user_id: FRANILOVER_ID // <--- CAMBIO: Inyectamos el UUID
      }])
      .select();

    return { data: data?.[0], error };
  },

  /**
   * Actualiza un registro existente
   */
  update: async (id: string | number, updates: any) => {
    const { tabla_destino, ...datos } = updates;
    const destino = tabla_destino || "ropa";

    const { data, error } = await supabase
      .from(destino)
      .update(datos)
      .eq("id", id)
      .eq("user_id", FRANILOVER_ID) // <--- CAMBIO: Seguridad por UUID
      .select();

    return { data: data?.[0], error };
  },

  /**
   * Elimina un registro
   */
  delete: async (id: string | number, tabla: string) => {
    const { error } = await supabase
      .from(tabla || "ropa")
      .delete()
      .eq("id", id)
      .eq("user_id", FRANILOVER_ID); // <--- CAMBIO: Seguridad por UUID

    return { error };
  }
};