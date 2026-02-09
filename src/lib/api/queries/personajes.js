import { supabase } from "../supabase";

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    // 1. Consultar Personajes y sus relaciones
    // Usamos * para traer id, nombre, img_url, sobre, reino, etc.
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

    // 2. Consultar canciones (CORREGIDO: quitamos 'links' que no existe en tu tabla)
    const { data: canciones, error: cError } = await supabase
      .from("canciones")
      .select("id, titulo, personaje, portada_url");

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      return { data: personajes, error: null };
    }

    // 3. Vincular en memoria basándonos en el NOMBRE del personaje
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

    // CORREGIDO: Seleccionamos columnas existentes
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

  /**
   * ACTUALIZADO: Maneja la relación lógica entre tablas
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
      // Limpiar vinculaciones previas del nombre antiguo/actual
      await supabase
        .from("canciones")
        .update({ personaje: null })
        .eq("personaje", personajeActualizado.nombre);

      if (canciones.length > 0) {
        // Extraemos solo los IDs si vienen como objetos
        const idsCanciones = canciones.map(c => typeof c === "object" ? c.id : c);

        const { error: musicError } = await supabase
          .from("canciones")
          .update({ personaje: personajeActualizado.nombre })
          .in("id", idsCanciones);
          
        if (musicError) throw musicError;
      }
    }

    // C. RESPUESTA FINAL
    const respuestaDetallada = await personajesQueries.getById(id);
    return respuestaDetallada.data; 
  }
};