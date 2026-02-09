import { supabase } from '../supabase';

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    // 1. Consultar Personajes y sus relaciones
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

    // 2. Consultar canciones (sin la columna 'url' que no existe)
    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, links");

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      return { data: personajes, error: null };
    }

    // 3. Vincular en memoria para que cada personaje tenga su array de objetos canción
    const personajesConCanciones = personajes.map(personaje => ({
      ...personaje,
      canciones: canciones.filter(cancion => cancion.personaje === personaje.nombre)
    }));

    return { data: personajesConCanciones, error: null };
  },
  
  getById: async (id) => {
    const { data: personaje, error: pError } = await supabase
      .from("personajes")
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .eq("id", id)
      .single();

    if (pError) throw pError;

    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, links")
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

  /**
   * ACTUALIZADO: Retorna directamente los datos para evitar el crash en el cliente
   */
  update: async (id, datos) => {
    const { canciones, ...datosParaUpdate } = datos;

    // A. Actualizar datos base del personaje
    const { data: personajeActualizado, error: uError } = await supabase
      .from("personajes")
      .update(datosParaUpdate)
      .eq("id", id)
      .select()
      .single();

    if (uError) throw uError;

    // B. Sincronizar canciones por ID
    if (canciones && Array.isArray(canciones)) {
      // Limpiar vinculaciones previas (usando el nombre actualizado)
      await supabase
        .from("canciones")
        .update({ personaje: null })
        .eq("personaje", personajeActualizado.nombre);

      if (canciones.length > 0) {
        const { error: musicError } = await supabase
          .from("canciones")
          .update({ personaje: personajeActualizado.nombre })
          .in("id", canciones);
          
        if (musicError) throw musicError;
      }
    }

    // C. RESPUESTA FINAL: Obtenemos el objeto completo y devolvemos SOLO el .data
    // Esto evita que useSupabaseData reciba un objeto {data: {..}} anidado.
    const respuestaDetallada = await personajesQueries.getById(id);
    return respuestaDetallada.data; 
  }
};