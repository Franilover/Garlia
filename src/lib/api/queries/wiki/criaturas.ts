
import { supabase } from '@/lib/api/client/supabase';
import { Criatura, CriaturaConVariantes, CriaturaVariante } from '@/lib/config/types/wiki/criatura';

interface OrderConfig {
  campo: string;
  asc?: boolean;
}

interface GetAllOptions {
  order?: OrderConfig;
}

export const criaturasQueries = {
  /**
   * Obtener todas las criaturas
   */
  getAll: async (opciones: GetAllOptions = {}) => {
    let query = supabase
      .from('criaturas')
      .select(`
        *,
        variantes: criatura_variantes (*)
      `);
    
    
    if (opciones.order) {
      query = query.order(opciones.order.campo, { 
        ascending: opciones.order.asc ?? true 
      });
    } else {
      
      query = query.order('nombre', { ascending: true });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data as CriaturaConVariantes[];
  },
  
  /**
   * Obtener criatura por ID con sus variantes
   */
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('criaturas')
      .select(`
        *,
        variantes: criatura_variantes (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as CriaturaConVariantes;
  },

  /**
   * Obtener criaturas por habitat
   */
  getByHabitat: async (habitat: string) => {
    const { data, error } = await supabase
      .from('criaturas')
      .select(`
        *,
        variantes: criatura_variantes (*)
      `)
      .eq('habitat', habitat)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data as CriaturaConVariantes[];
  },

  /**
   * Obtener criaturas por tipo de alma
   */
  getByAlma: async (alma: string) => {
    const { data, error } = await supabase
      .from('criaturas')
      .select(`
        *,
        variantes: criatura_variantes (*)
      `)
      .eq('alma', alma)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data as CriaturaConVariantes[];
  },

  /**
   * Obtener criaturas por pensamiento
   */
  getByPensamiento: async (pensamiento: string) => {
    const { data, error } = await supabase
      .from('criaturas')
      .select(`
        *,
        variantes: criatura_variantes (*)
      `)
      .eq('pensamiento', pensamiento)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data as CriaturaConVariantes[];
  },

  /**
   * Crear nueva criatura
   */
  create: async (criatura: Omit<Criatura, 'id' | 'created_at' | 'variantes'>) => {
    const { data, error } = await supabase
      .from('criaturas')
      .insert(criatura)
      .select()
      .single();
    
    if (error) throw error;
    return data as Criatura;
  },

  /**
   * Actualizar criatura
   */
  update: async (id: string, updates: Partial<Omit<Criatura, 'id' | 'created_at' | 'variantes'>>) => {
    const { data, error } = await supabase
      .from('criaturas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Criatura;
  },

  /**
   * Eliminar criatura
   */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('criaturas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  /**
   * Buscar criaturas por nombre
   */
  search: async (query: string) => {
    const { data, error } = await supabase
      .from('criaturas')
      .select(`
        *,
        variantes: criatura_variantes (*)
      `)
      .ilike('nombre', `%${query}%`)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data as CriaturaConVariantes[];
  },

  /**
   * QUERIES PARA VARIANTES
   */
  variantes: {
    /**
     * Obtener variantes de una criatura
     */
    getByCriaturaId: async (criaturaId: string) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .select('*')
        .eq('criatura_id', criaturaId)
        .order('tipo', { ascending: true });
      
      if (error) throw error;
      return data as CriaturaVariante[];
    },

    /**
     * Obtener variante por ID
     */
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as CriaturaVariante;
    },

    /**
     * Crear variante
     */
    create: async (variante: Omit<CriaturaVariante, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .insert(variante)
        .select()
        .single();
      
      if (error) throw error;
      return data as CriaturaVariante;
    },

    /**
     * Actualizar variante
     */
    update: async (id: string, updates: Partial<Omit<CriaturaVariante, 'id' | 'created_at' | 'criatura_id'>>) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as CriaturaVariante;
    },

    /**
     * Eliminar variante
     */
    delete: async (id: string) => {
      const { error } = await supabase
        .from('criatura_variantes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },

    /**
     * Obtener variantes por tipo
     */
    getByTipo: async (tipo: string) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .select('*')
        .eq('tipo', tipo)
        .order('criatura_id', { ascending: true });
      
      if (error) throw error;
      return data as CriaturaVariante[];
    }
  }
};