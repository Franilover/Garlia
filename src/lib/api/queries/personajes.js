import { supabase } from "../supabase";

export const personajesQueries = {
  getAll: async (opciones = {}) => {
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

    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, portada_url");

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      return { data: personajes || [], error: null };
    }

    const personajesConCanciones = (personajes || []).map(personaje => ({
      ...personaje,
      canciones: canciones.filter(cancion => cancion.personaje === personaje.nombre)
    }));

    return { data: personajesConCanciones, error: null };
  },
  
  getById: async (id) => {
    if (!id) throw new Error("ID no proporcionado");

    const { data: personaje, error: pError } = await supabase
      .from("personajes")
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .eq("id", id)
      .maybeSingle(); // Usamos maybeSingle para evitar excepciones pesadas

    if (pError) throw pError;
    if (!personaje) return { data: null, error: "No encontrado" };

    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, portada_url")
      .eq("personaje", personaje.nombre);

    if (cError) console.error("Error al obtener canciones del personaje:", cError);

    return {
      data: {
        ...personaje,
        canciones: canciones || []
      },
      error: null
    };
  },

  update: async (id, datos) => {
    if (!id) throw new Error("ID de personaje requerido para actualizar");

    const { canciones, ...datosParaUpdate } = datos;

    // 1. Actualizar datos base
    const { data: personajeActualizado, error: uError } = await supabase
      .from("personajes")
      .update(datosParaUpdate)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (uError) throw uError;
    if (!personajeActualizado) throw new Error("No se pudo encontrar el personaje para actualizar");

    // 2. Sincronizar canciones
    if (canciones && Array.isArray(canciones)) {
      // Limpiar vinculaciones previas
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

    // 3. RESPUESTA DE SEGURIDAD
    // En lugar de llamar a getById (que hace otra petición), 
    // construimos la respuesta con lo que ya tenemos para ser instantáneos.
    const { data: relacionesRecientes } = await supabase
      .from("relaciones")
      .select("*")
      .eq("personaje_id", id);

    return {
      ...personajeActualizado,
      relaciones: relacionesRecientes || [],
      canciones: canciones || [] // Mantenemos las que acabamos de setear
    }; 
  }
};;