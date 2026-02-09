import { supabase } from '../supabase';

/**
 * Nota: Se utiliza 'relaciones!personaje_id' para forzar la relación 
 * mediante la columna de ID numérico.
 * * SOLUCIÓN OPTIMIZADA: Ahora getAll y getById vinculan automáticamente
 * las canciones filtrando por el nombre del personaje.
 */

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    // 1. Consultar Personajes con sus relaciones
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

    // 2. Consultar TODAS las canciones para vincularlas en memoria (más eficiente que múltiples queries)
    const { data: canciones, error: cError } = await supabase
      .from('canciones')
      .select('*');

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      // Retornamos personajes aunque fallen las canciones para no romper la app
      return { data: personajes, error: null };
    }

    // 3. Vinculación lógica: Mapeamos cada personaje con sus canciones correspondientes
    const personajesConCanciones = personajes.map(personaje => ({
      ...personaje,
      canciones: canciones.filter(cancion => cancion.personaje === personaje.nombre)
    }));

    console.log("Query optimizada: Personajes y canciones vinculados correctamente.");
    
    return { data: personajesConCanciones, error: null };
  },
  
  getById: async (id) => {
    // 1. Obtener el personaje
    const { data: personaje, error: pError } = await supabase
      .from('personajes')
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .eq('id', id)
      .single();

    if (pError) throw pError;

    // 2. Obtener sus canciones vinculadas por nombre
    const { data: canciones, error: cError } = await supabase
      .from('canciones')
      .select('*')
      .eq('personaje', personaje.nombre);

    if (cError) console.error("Error al obtener canciones del personaje:", cError);

    // 3. Retornar objeto compuesto
    return {
      data: {
        ...personaje,
        canciones: canciones || []
      },
      error: null
    };
  },
  
  update: async (id, datos) => {
    // Extraemos canciones de los datos si vienen ahí para evitar errores en el update de la tabla personajes
    const { canciones, ...datosParaUpdate } = datos;

    // 1. Actualizar datos básicos del personaje
    const { data: personajeActualizado, error: uError } = await supabase
      .from('personajes')
      .update(datosParaUpdate)
      .eq('id', id)
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .single();

    if (uError) throw uError;

    // 2. Si se pasaron canciones, actualizamos la vinculación en la tabla 'canciones'
    // Nota: Esto asume que 'canciones' es un array de IDs seleccionados
    if (canciones && Array.isArray(canciones)) {
      console.log("Sincronizando canciones para el personaje:", personajeActualizado.nombre);
      
      // Primero desvinculamos las antiguas (opcional, según tu lógica de negocio)
      await supabase
        .from('canciones')
        .update({ personaje: null })
        .eq('personaje', personajeActualizado.nombre);

      // Vinculamos las nuevas
      if (canciones.length > 0) {
        await supabase
          .from('canciones')
          .update({ personaje: personajeActualizado.nombre })
          .in('id', canciones);
      }
    }

    // 3. Recuperar objeto final para refrescar UI
    return this.personajesQueries.getById(id);
  }
};