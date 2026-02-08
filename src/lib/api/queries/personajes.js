// src/lib/api/queris/personajes.js
import { supabase } from '../supabase';

/**
 * Nota: He eliminado 'canciones (*)' del select porque en tu captura
 * se ve que 'canciones' es una columna de texto[] dentro de la misma tabla,
 * no una tabla relacionada aparte. Al usar '*', ya las traes.
 */

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    let query = supabase
      .from('personajes')
      .select(`
        *,
        relaciones (*)
      `); // Trae personajes y sus vínculos vinculados por ID
    
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
        relaciones (*)
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
        relaciones (*)
      `)
      .single();
  }
};