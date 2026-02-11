import { supabase } from "../supabase";

// --- INTERFACES ---
interface Seccion {
  id: number;
  cancion_id: number;
  nombre_seccion: string;
  letra_es: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
}

interface Cancion {
  id: number;
  titulo: string;
  artista?: string;
  estado: "BORRADOR" | "EN PROCESO" | "TERMINADA";
  secciones?: Seccion[];
}

export const cancionesQueries = {
  /**
   * Obtiene una canción completa con sus secciones ordenadas
   */
  getById: async (id: string | number) => {
    const { data, error } = await supabase
      .from("canciones")
      .select(`
        *,
        secciones:secciones_cancion (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    // Ordenar las secciones por el campo 'id' o 'orden' si existe
    if (data && data.secciones) {
      data.secciones.sort((a: any, b: any) => a.id - b.id);
    }

    return data;
  },

  /**
   * Actualiza los datos base de la canción
   */
  update: async (id: string | number, datos: Partial<Cancion>) => {
    const { data, error } = await supabase
      .from("canciones")
      .update(datos)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * QUERIES PARA SECCIONES (Estrofas/Coros)
   */
  secciones: {
    // Crear una nueva sección
    create: async (datos: Omit<Seccion, "id">) => {
      const { data, error } = await supabase
        .from("secciones_cancion")
        .insert([datos])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // Actualizar sección existente
    update: async (id: number, datos: Partial<Seccion>) => {
      const { data, error } = await supabase
        .from("secciones_cancion")
        .update(datos)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // Eliminar sección
    delete: async (id: number) => {
      const { error } = await supabase
        .from("secciones_cancion")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    }
  }
};