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

  getCapituloParaLectura: async (capId: string, libroId: string, isAdmin: boolean) => {
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
      .select("id, orden, titulo_capitulo, fecha_publicacion")
      .eq("libro_id", libroId);

    if (!isAdmin) {
      navQuery = navQuery.lte("fecha_publicacion", hoy);
    }

    const { data: navegacion } = await navQuery.order("orden", { ascending: true });

    return {
      data: {
        capitulo: capitulo as Capitulo,
        listaCapitulos: navegacion || [],
      },
      error: null,
    };
  },

  updateContenido: async (capId: string, contenido: string) => {
    
    const { error: updateError } = await supabase
      .from("capitulos")
      .update({ contenido })
      .eq("id", capId);

    if (updateError) return { data: null, error: updateError };

    
    
    const { data, error: fetchError } = await supabase
      .from("capitulos")
      .select("id, contenido")
      .eq("id", capId)
      .single();

    if (fetchError) return { data: null, error: fetchError };

    if (data.contenido !== contenido) {
      return {
        data: null,
        error: {
          message: "⚠️ El contenido no se guardó. Revisá los permisos RLS en Supabase (tabla capitulos, política UPDATE).",
          code: "RLS_SILENT_BLOCK",
        },
      };
    }

    return { data, error: null };
  },
};