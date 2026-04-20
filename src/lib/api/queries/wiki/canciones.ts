import { supabase } from '@/lib/api/client/supabase';

export interface EscenaMV {
  id: string;
  timestamp_seg: number;  
  descripcion: string;
  tipo: "escena" | "camara" | "efecto" | "transicion" | "personaje";
}

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
  
  info_cancion?: string | null;
  guion_mv?: EscenaMV[] | null;
}

export const cancionesQueries = {
  
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

  create: async (cancion: Omit<Cancion, 'id' | 'created_at' | 'updated_at' | 'secciones'>) => {
    const { data, error } = await supabase
      .from('canciones')
      .insert(cancion)
      .select()
      .single();

    if (error) throw error;
    return data as Cancion;
  },

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

  delete: async (id: string) => {
    const { error } = await supabase
      .from('canciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

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

  
  updateInfo: async (id: string, info_cancion: string | null) => {
    const { data, error } = await supabase
      .from('canciones')
      .update({ info_cancion, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, info_cancion')
      .single();

    if (error) throw error;
    return data;
  },

  
  updateGuionMV: async (id: string, guion_mv: EscenaMV[]) => {
    const { data, error } = await supabase
      .from('canciones')
      .update({ guion_mv, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, guion_mv')
      .single();

    if (error) throw error;
    return data;
  },

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