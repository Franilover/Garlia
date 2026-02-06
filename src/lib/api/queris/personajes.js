// lib/api/queries/personajes.js
import { supabase } from '../supabase';

export const personajesQueries = {
  getAll: async (opciones = {}) => {
    let query = supabase
      .from('personajes')
      .select('*');
    
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
      .select('*')
      .eq('id', id)
      .single();
  },
  
  update: async (id, datos) => {
    return supabase
      .from('personajes')
      .update(datos)
      .eq('id', id)
      .select()
      .single();
  }
};

// Uso en useSupabaseData.js
import { personajesQueries } from '@/lib/api/queries/personajes';

const { data, error } = await personajesQueries.getAll(opciones);