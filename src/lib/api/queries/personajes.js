// src/lib/api/queries/personajes.js
import { supabase } from '../supabase';

/**
 * Nota: Se utiliza 'relaciones!personaje_id' para forzar la relación 
 * mediante la columna de ID numérico, evitando errores de ambigüedad.
 */

export const personajesQueries = {
  getAll: async (opciones = {}) => {
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
    // Al actualizar, devolvemos el objeto completo con sus relaciones 
    // para que la UI se refresque instantáneamente.
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