// lib/api/queries/personajes.js
import { supabase } from '../supabase';

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    // MODIFICACIÓN: En lugar de '*', pedimos todo el árbol de relaciones
    let query = supabase
      .from('personajes')
      .select(`
        *,
        relaciones (*),
        variantes (*),
        canciones (*)
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
        relaciones (*),
        variantes (*),
        canciones (*)
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
        relaciones (*),
        variantes (*)
      `)
      .single();
  }
};


// --- NUEVA SECCIÓN PARA CRIATURAS ---
export const criaturasQueries = {
  getAll: async (opciones = {}) => {
    let query = supabase.from('criaturas').select(`
      *,
      relaciones (*),
      variantes (*)
    `); // Si las criaturas no tienen canciones, quitamos esa tabla del select
    
    if (opciones.order) {
      query = query.order(opciones.order.campo, { 
        ascending: opciones.order.asc ?? true 
      });
    }
    
    return query;
  },

  getById: async (id) => {
    return supabase
      .from('criaturas')
      .select('*, relaciones(*), variantes(*)')
      .eq('id', id)
      .single();
  }
};