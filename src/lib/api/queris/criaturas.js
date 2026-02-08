// lib/api/queries/criaturas.js
import { supabase } from '../supabase';

export const criaturasQueries = {
  getAll: async (opciones = {}) => {
    // MODIFICACIÓN: Usamos 'criatura_variantes' que es el nombre real en tu DB
    let query = supabase
      .from('criaturas')
      .select(`
        *,
        relaciones (*),
        variantes: criatura_variantes (*) 
      `); 
    
    // El alias 'variantes:' nos permite seguir usando el mismo nombre de prop 
    // en el DetalleMaestro aunque en la DB se llame 'criatura_variantes'
    
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
      .select('*, relaciones(*), variantes: criatura_variantes(*)')
      .eq('id', id)
      .single();
  }
};