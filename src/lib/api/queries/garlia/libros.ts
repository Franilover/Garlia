import { supabase } from "@/lib/api/client/supabase";

export interface Capitulo {
  id: string;
  libro_id: string;
  orden: number;
  titulo_capitulo: string;
  contenido: string;
  fecha_publicacion: string;
  libros?: { titulo: string };
}

export const librosQueries = {
  // 1. Obtener todos los libros
  getAll: async (options: any = {}) => {
    let query = supabase.from("libros").select("*");

    if (!options.isAdmin) {
      query = query.eq("visibilidad", "publico");
    }

    if (options.order) {
      query = query.order(options.order.campo, { ascending: options.order.asc ?? false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    return await query;
  },

  // 2. Obtener capítulo para lectura (LA QUE TE FALTABA)
  getCapituloParaLectura: async (capId: string) => {
    // Retornamos directamente la promesa de Supabase para que el componente maneje {data, error}
    return await supabase
      .from("capitulos")
      .select("*, libros ( titulo )")
      .eq("id", capId)
      .single();
  },

  // 3. Actualizar contenido (LA QUE AÑADIMOS RECIÉN)
  updateContenido: async (capId: string, contenido: string) => {
    const { data, error } = await supabase
      .from("capitulos")
      .update({ contenido })
      .eq("id", capId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};