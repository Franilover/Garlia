import { supabase } from '@/lib/api/client/supabase';


interface Seccion {
  id: string; 
  cancion_id: string; 
  nombre_seccion: string;
  letra_es: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
  created_at?: string;
}

interface Cancion {
  id: string; 
  titulo: string;
  personaje: string;
  cantante: string;
  compositor: string;
  idioma: string;
  estado: string; 
  portada_url: string;
  links: any; 
  visible: boolean;
  created_at: string;
  updated_at: string;
  secciones?: Seccion[];
}

export const cancionesQueries = {
  /**
   * Obtiene todas las canciones.
   * @param options - Permite pasar { isAdmin: true } para saltar el filtro de visibilidad.
   */
  getAll: async (options?: { isAdmin?: boolean }) => {
    let query = supabase
      .from('canciones')
      .select('*')
      .order('created_at', { ascending: false });
    
    
    if (!options?.isAdmin) {
      query = query.eq('visible', true);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error en cancionesQueries.getAll:", error);
      throw error;
    }
    
    return data as Cancion[];
  },

  /**
   * Obtiene una canción completa con sus secciones ordenadas
   */
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('canciones')
      .select(`
        *,
        secciones:secciones_cancion (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    
    if (data && data.secciones) {
      data.secciones.sort((a: Seccion, b: Seccion) => a.orden - b.orden);
    }

    return data as Cancion;
  },

  /**
   * Crear nueva canción
   */
  create: async (cancion: Omit<Cancion, 'id' | 'created_at' | 'updated_at' | 'secciones'>) => {
    const { data, error } = await supabase
      .from('canciones')
      .insert(cancion)
      .select()
      .single();

    if (error) throw error;
    return data as Cancion;
  },

  /**
   * Actualiza los datos base de la canción
   */
  update: async (id: string, datos: Partial<Omit<Cancion, 'id' | 'created_at' | 'secciones'>>) => {
    const { data, error } = await supabase
      .from('canciones')
      .update({
        ...datos,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Cancion;
  },

  /**
   * Eliminar canción
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('canciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Filtrar por personaje
   */
  getByPersonaje: async (personaje: string, options?: { isAdmin?: boolean }) => {
    let query = supabase
      .from('canciones')
      .select('*')
      .eq('personaje', personaje)
      .order('titulo', { ascending: true });

    
    if (!options?.isAdmin) {
      query = query.eq('visible', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Cancion[];
  },

  /**
   * QUERIES PARA SECCIONES (Estrofas/Coros)
   */
  secciones: {
    getByCancionId: async (cancionId: string) => {
      const { data, error } = await supabase
        .from('secciones_cancion')
        .select('*')
        .eq('cancion_id', cancionId)
        .order('orden', { ascending: true });

      if (error) throw error;
      return data as Seccion[];
    },

    create: async (datos: Omit<Seccion, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('secciones_cancion')
        .insert(datos)
        .select()
        .single();

      if (error) throw error;
      return data as Seccion;
    },

    update: async (id: string, datos: Partial<Omit<Seccion, 'id' | 'created_at'>>) => {
      const { data, error } = await supabase
        .from('secciones_cancion')
        .update(datos)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Seccion;
    },

    delete: async (id: string) => {
      const { error } = await supabase
        .from('secciones_cancion')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },

    reorder: async (secciones: { id: string; orden: number }[]) => {
      const updates = secciones.map(({ id, orden }) =>
        supabase
          .from('secciones_cancion')
          .update({ orden })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;
      return true;
    }
  }
};