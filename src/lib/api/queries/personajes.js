import { supabase } from '../supabase';

/**
 * Nota: Se utiliza 'relaciones!personaje_id' para forzar la relación 
 * mediante la columna de ID numérico.
 * * SOLUCIÓN ACTUALIZADA: Rutas Internas (/wiki/canciones/{id})
 */

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    // 1. Consultar Personajes con sus relaciones (Mantenemos tu lógica original)
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

    // 2. CAMBIO AQUÍ: Traemos ID y Título explícitamente para rutas internas
    const { data: canciones, error: cError } = await supabase
      .from('canciones')
      .select('id, titulo, personaje, links, url'); // Agregamos id y titulo

    if (cError) {
      console.error("Error cargando canciones vinculadas:", cError);
      return { data: personajes, error: null };
    }

    // 3. Vinculación lógica: Cada personaje lleva sus objetos de canción completos
    const personajesConCanciones = personajes.map(personaje => ({
      ...personaje,
      canciones: canciones.filter(cancion => cancion.personaje === personaje.nombre)
    }));

    console.log("Query actualizada: Listo para rutas internas /wiki/canciones/{id}");
    
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

    // CAMBIO AQUÍ: También en getById traemos los campos necesarios
    const { data: canciones, error: cError } = await supabase
      .from('canciones')
      .select('id, titulo, personaje, links, url')
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
  
  update: async (id, datos) => {
    const { canciones, ...datosParaUpdate } = datos;

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

    if (canciones && Array.isArray(canciones)) {
      console.log("Sincronizando canciones por ID para:", personajeActualizado.nombre);
      
      // Limpiamos vinculaciones anteriores del personaje
      await supabase
        .from('canciones')
        .update({ personaje: null })
        .eq('personaje', personajeActualizado.nombre);

      // Vinculamos las nuevas por ID
      if (canciones.length > 0) {
        await supabase
          .from('canciones')
          .update({ personaje: personajeActualizado.nombre })
          .in('id', canciones);
      }
    }

    // Usamos personajesQueries para referenciar al objeto actual
    return personajesQueries.getById(id);
  }
};