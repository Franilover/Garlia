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

    // 1. CARGA DE CANCIONES
    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, portada_url");

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      return { data: personajes || [], error: null };
    }

    // 2. FILTRADO ROBUSTO (Ignora espacios y mayúsculas)
    const personajesConCanciones = (personajes || []).map(personaje => ({
      ...personaje,
      canciones: canciones.filter(cancion => {
        if (!cancion.personaje || !personaje.nombre) return false;
        // Limpiamos espacios y comparamos en minúsculas para evitar fallos de vinculación
        return cancion.personaje.trim().toLowerCase() === personaje.nombre.trim().toLowerCase();
      })
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
      .maybeSingle();

    if (pError) throw pError;
    if (!personaje) return { data: null, error: "No encontrado" };

    // Búsqueda de canciones específica usando ILIKE para que sea insensible a mayúsculas
    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, portada_url")
      .ilike("personaje", personaje.nombre.trim());

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

    // Extraemos las canciones para manejarlas por separado de la tabla personajes
    const { canciones, ...datosParaUpdate } = datos;

    // 1. Actualizar datos base del personaje
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
      // Limpiar vinculaciones anteriores para evitar duplicados o huérfanos
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

    // 3. Obtener relaciones actualizadas para devolver el objeto completo
    const { data: relacionesRecientes } = await supabase
      .from("relaciones")
      .select("*")
      .eq("personaje_id", id);

    // 4. Retornar estructura idéntica a getById para actualizar la UI sin refrescar
    return {
      data: {
        ...personajeActualizado,
        relaciones: relacionesRecientes || [],
        canciones: canciones || [] 
      },
      error: null
    }; 
  }
};;