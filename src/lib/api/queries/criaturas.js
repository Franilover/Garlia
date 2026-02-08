// lib/api/queries/criaturas.js
import { supabase } from '../supabase';

export const criaturasQueries = {
  getAll: async (opciones = {}) => {
    let query = supabase
      .from('criaturas')
      .select(`
        *,
        variantes: criatura_variantes (*) 
      `); // Eliminamos relaciones(*) porque no existe ese vínculo en la DB
    
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
      .select('*, variantes: criatura_variantes(*)') // Quitamos relaciones(*) aquí también
      .eq('id', id)
      .single();
  }
};