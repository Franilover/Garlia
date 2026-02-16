import { supabase } from "@/api/client/supabase";

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
  // ESTA ES LA FUNCIÓN QUE FALTABA
  getAll: async (options: any = {}) => {
    let query = supabase.from("libros").select("*");

    if (options.order) {
      query = query.order(options.order.campo, { 
        ascending: options.order.asc ?? false 
      });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    return await query;
  },

  getCapituloParaLectura: async (capId: string, libroId: string, isAdmin: boolean) => {
    // Corregido: Usamos la fecha completa para comparar
    const hoy = new Date().toISOString(); 

    const { data: capitulo, error: capError } = await supabase
      .from("capitulos")
      .select("*, libros ( titulo )")
      .eq("id", capId)
      .maybeSingle();

    if (capError) throw capError;
    if (!capitulo) return { data: null, error: "Capítulo no encontrado" };

    if (!isAdmin && capitulo.fecha_publicacion > hoy) {
      return { data: null, error: "Este capítulo aún no ha sido revelado." };
    }

    let navQuery = supabase
      .from("capitulos")
      .select("id, orden")
      .eq("libro_id", libroId);

    if (!isAdmin) {
      navQuery = navQuery.lte("fecha_publicacion", hoy);
    }

    const { data: navegacion } = await navQuery.order("orden", { ascending: true });

    return {
      data: {
        capitulo: capitulo as Capitulo,
        listaCapitulos: navegacion || []
      },
      error: null
    };
  },

  updateContenido: async (capId: string, contenido: string) => {
    const { data, error } = await supabase
      .from("capitulos")
      .update({ contenido })
      .eq("id", capId)
      .select()
      .single();

    return { data, error };
  }
};