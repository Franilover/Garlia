
import { supabase } from '@/lib/api/client/supabase';
import { Criatura, CriaturaConVariantes, CriaturaVariante } from '@/lib/types/wiki/criatura';

interface OrderConfig {
  campo: string;
  asc?: boolean;
}

interface GetAllOptions {
  order?: OrderConfig;
}

export const criaturasQueries = {
  
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

  
  create: async (criatura: Omit<Criatura, 'id' | 'created_at' | 'variantes'>) => {
    const { data, error } = await supabase
      .from('criaturas')
      .insert(criatura)
      .select()
      .single();
    
    if (error) throw error;
    return data as Criatura;
  },

  
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

  
  delete: async (id: string) => {
    const { error } = await supabase
      .from('criaturas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  
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

  
  variantes: {
    
    getByCriaturaId: async (criaturaId: string) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .select('*')
        .eq('criatura_id', criaturaId)
        .order('tipo', { ascending: true });
      
      if (error) throw error;
      return data as CriaturaVariante[];
    },

    
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as CriaturaVariante;
    },

    
    create: async (variante: Omit<CriaturaVariante, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('criatura_variantes')
        .insert(variante)
        .select()
        .single();
      
      if (error) throw error;
      return data as CriaturaVariante;
    },

    
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

    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('criatura_variantes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },

    
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