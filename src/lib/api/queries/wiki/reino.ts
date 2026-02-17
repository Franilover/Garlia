// queries/wiki/reinos.ts
import { supabase } from '@/lib/api/client/supabase';

export interface Reino {
  id: string; // uuid - NO nullable
  nombre: string; // text - NO nullable
  descripcion?: string; // text - YES nullable
  orden?: number; // integer - YES nullable
  mapa_url?: string; // text - YES nullable
  imagen_reino?: string; // text - YES nullable
  coord_x?: number; // double precision - YES nullable
  coord_y?: number; // double precision - YES nullable
}

export const reinosQueries = {

  // ─────────────────────────────────────────
  // 📖 LEER
  // ─────────────────────────────────────────

  /** Obtener todos los reinos ordenados */
  getAll: async () => {
    const { data, error } = await supabase
      .from('reinos')
      .select('*')
      .order('orden', { ascending: true });

    if (error) throw error;
    return data as Reino[];
  },

  /** Obtener un reino por ID */
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('reinos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Reino;
  },

  /** Buscar reinos por nombre */
  search: async (query: string) => {
    const { data, error } = await supabase
      .from('reinos')
      .select('*')
      .ilike('nombre', `%${query}%`)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data as Reino[];
  },

  // ─────────────────────────────────────────
  // ➕ CREAR
  // ─────────────────────────────────────────

  /** Crear nuevo reino */
  create: async (reino: Omit<Reino, 'id'>) => {
    const { data, error } = await supabase
      .from('reinos')
      .insert(reino)
      .select()
      .single();

    if (error) throw error;
    return data as Reino;
  },

  // ─────────────────────────────────────────
  // ✏️ ACTUALIZAR
  // ─────────────────────────────────────────

  /** Actualizar un reino existente */
  update: async (id: string, updates: Partial<Omit<Reino, 'id'>>) => {
    const { data, error } = await supabase
      .from('reinos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Reino;
  },

  // ─────────────────────────────────────────
  // 🗑️ BORRAR
  // ─────────────────────────────────────────

  /** Eliminar un reino */
  delete: async (id: string) => {
    const { error } = await supabase
      .from('reinos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};