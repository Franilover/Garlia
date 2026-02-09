import { supabase } from '../supabase';

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    // 1. Consultar Personajes
    let query = supabase
      .from('personajes')
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

    // 2. CORRECCIÓN AQUÍ: Eliminamos 'url' del select para evitar el error 400
    // Solo pedimos lo que tu tabla SÍ tiene según la captura
    const { data: canciones, error: cError } = await supabase
      .from('canciones')
      .select('id, titulo, personaje, links'); // Quitamos 'url' de aquí

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      return { data: personajes, error: null };
    }

    // 3. Vinculación en memoria
    const personajesConCanciones = personajes.map(personaje => ({
      ...personaje,
      canciones: canciones.filter(cancion => cancion.personaje === personaje.nombre)
    }));

    return { data: personajesConCanciones, error: null };
  },
  
  getById: async (id) => {
    const { data: personaje, error: pError } = await supabase
      .from('personajes')
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .eq('id', id)
      .single();

    if (pError) throw pError;

    // CORRECCIÓN AQUÍ: Eliminamos 'url' también en el getById
    const { data: canciones, error: cError } = await supabase
      .from('canciones')
      .select('id, titulo, personaje, links') // Solo campos existentes
      .eq('personaje', personaje.nombre);

    if (cError) console.error("Error al obtener canciones del personaje:", cError);

    return {
      data: {
        ...personaje,
        canciones: canciones || []
      },
      error: null
    };
  },

  // El método update se mantiene igual ya que usa los IDs
  update: async (id, datos) => {
    const { canciones, ...datosParaUpdate } = datos;
    const { data: personajeActualizado, error: uError } = await supabase
      .from('personajes')
      .update(datosParaUpdate)
      .eq('id', id)
      .select()
      .single();

    if (uError) throw uError;

    if (canciones && Array.isArray(canciones)) {
      await supabase
        .from('canciones')
        .update({ personaje: null })
        .eq('personaje', personajeActualizado.nombre);

      if (canciones.length > 0) {
        await supabase
          .from('canciones')
          .update({ personaje: personajeActualizado.nombre })
          .in('id', canciones);
      }
    }
    return personajesQueries.getById(id);
  }
};