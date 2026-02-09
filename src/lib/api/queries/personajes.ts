import { supabase } from "../supabase";

// --- INTERFACES DE DATOS ---

interface Relacion {
  id: string;
  personaje_id: string;
  // Añade aquí otros campos de tu tabla relaciones (ej. destino_id, tipo, etc.)
  [key: string]: any; 
}

interface Cancion {
  id: string;
  titulo: string;
  personaje: string | null;
  portada_url: string | null;
}

interface Personaje {
  id: string;
  nombre: string;
  visible: boolean;
  relaciones?: Relacion[];
  canciones?: Cancion[];
  [key: string]: any; // Para permitir campos dinámicos de la tabla personajes
}

// --- INTERFACES DE OPCIONES ---

interface QueryOptions {
  order?: {
    campo: string;
    asc?: boolean;
  };
}

export const personajesQueries = {
  getAll: async (opciones: QueryOptions = {}) => {
    let query = supabase
      .from("personajes")
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `); 
    
    if (opciones.order) {
      query = query.order(opciones.order.campo, { 
        ascending: opciones.order.asc ?? true 
      });
    }

    const { data: personajes, error: pError } = await query;
    if (pError) throw pError;

    // 1. CARGA DE CANCIONES
    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, portada_url");

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      return { data: (personajes as Personaje[]) || [], error: null };
    }

    // 2. FILTRADO ROBUSTO
    const personajesConCanciones = (personajes || []).map((personaje: any) => ({
      ...personaje,
      canciones: (canciones as Cancion[]).filter(cancion => {
        if (!cancion.personaje || !personaje.nombre) return false;
        return cancion.personaje.trim().toLowerCase() === personaje.nombre.trim().toLowerCase();
      })
    }));

    return { data: personajesConCanciones as Personaje[], error: null };
  },
  
  getById: async (id: string | number) => {
    if (!id) throw new Error("ID no proporcionado");

    const { data: personaje, error: pError } = await supabase
      .from("personajes")
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (pError) throw pError;
    if (!personaje) return { data: null, error: "No encontrado" };

    // Búsqueda de canciones específica
    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, portada_url")
      .ilike("personaje", personaje.nombre.trim());

    if (cError) console.error("Error al obtener canciones del personaje:", cError);

    return {
      data: {
        ...personaje,
        canciones: (canciones as Cancion[]) || []
      } as Personaje,
      error: null
    };
  },

  update: async (id: string | number, datos: Partial<Personaje> & { canciones?: any[] }) => {
    if (!id) throw new Error("ID de personaje requerido para actualizar");

    // Extraemos las canciones para manejarlas por separado
    const { canciones, ...datosParaUpdate } = datos;

    // 1. Actualizar datos base
    const { data: personajeActualizado, error: uError } = await supabase
      .from("personajes")
      .update(datosParaUpdate)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (uError) throw uError;
    if (!personajeActualizado) throw new Error("No se pudo encontrar el personaje");

    // 2. Sincronizar vinculación de canciones
    if (canciones && Array.isArray(canciones)) {
      await supabase
        .from("canciones")
        .update({ personaje: null })
        .eq("personaje", personajeActualizado.nombre);

      if (canciones.length > 0) {
        const idsCanciones = canciones.map(c => 
          (typeof c === "object" && c !== null) ? c.id : c
        ).filter(Boolean);

        if (idsCanciones.length > 0) {
          const { error: musicError } = await supabase
            .from("canciones")
            .update({ personaje: personajeActualizado.nombre })
            .in("id", idsCanciones);
          
          if (musicError) throw musicError;
        }
      }
    }

    // 3. Obtener relaciones actualizadas
    const { data: relacionesRecientes } = await supabase
      .from("relaciones")
      .select("*")
      .eq("personaje_id", id);

    return {
      data: {
        ...personajeActualizado,
        relaciones: relacionesRecientes || [],
        canciones: canciones || [] 
      } as Personaje,
      error: null
    }; 
  }
};