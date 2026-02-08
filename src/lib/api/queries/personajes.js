// src/lib/api/queries/personajes.js
import { supabase } from '../supabase';

/**
 * Nota: He ajustado la relación para que use 'personaje_id' como clave foránea.
 * También mantenemos el '*' para traer 'canciones' que es un array de texto.
 */

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    let query = supabase
      .from('personajes')
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `); // Forzamos el uso de personaje_id para vincular los datos
    
    if (opciones.order) {
      query = query.order(opciones.order.campo, { 
        ascending: opciones.order.asc ?? true 
      });
    }
    
    return query;
  },
  
  getById: async (id) => {
    return supabase
      .from('personajes')
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .eq('id', id)
      .single();
  },
  
  update: async (id, datos) => {
    return supabase
      .from('personajes')
      .update(datos)
      .eq('id', id)
      .select(`
        *,
        relaciones:relaciones!personaje_id (*)
      `)
      .single();
  }
};