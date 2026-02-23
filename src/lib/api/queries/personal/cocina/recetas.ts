// queries/personal/cocina/recetas.ts
import { supabase } from '@/lib/api/client/supabase';
import { Receta, NuevaReceta, RecetaCategoria } from '@/lib/types/personal/receta';

export const recetasQueries = {

  // ─────────────────────────────────────────
  // 📖 LEER
  // ─────────────────────────────────────────

  /** Obtener todas las recetas del usuario actual */
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('autor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Receta[];
  },

  /** Obtener una receta por ID */
  getById: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('id', id)
      .eq('autor_id', user.id)
      .single();

    if (error) throw error;
    return data as Receta;
  },

  /** Obtener recetas por categoría */
  getByCategoria: async (categoria: RecetaCategoria) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('autor_id', user.id)
      .eq('categoria', categoria)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Receta[];
  },

  /** Buscar recetas por nombre */
  search: async (query: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('autor_id', user.id)
      .ilike('nombre', `%${query}%`)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data as Receta[];
  },

  // ─────────────────────────────────────────
  // ➕ CREAR
  // ─────────────────────────────────────────

  /** Crear nueva receta */
  create: async (nuevaReceta: NuevaReceta) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const recetaData = {
      ...nuevaReceta,
      autor_id: user.id,
      // Convertir arrays a JSON si vienen como objetos
      ingredientes: typeof nuevaReceta.ingredientes === 'string'
        ? nuevaReceta.ingredientes
        : JSON.stringify(nuevaReceta.ingredientes),
      instrucciones: typeof nuevaReceta.instrucciones === 'string'
        ? nuevaReceta.instrucciones
        : JSON.stringify(nuevaReceta.instrucciones),
    };

    const { data, error } = await supabase
      .from('recetas')
      .insert(recetaData)
      .select()
      .single();

    if (error) throw error;
    return data as Receta;
  },

  // ─────────────────────────────────────────
  // ✏️ ACTUALIZAR
  // ─────────────────────────────────────────

  /** Actualizar una receta existente */
  update: async (id: string, updates: Partial<NuevaReceta>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const updateData = {
      ...updates,
      // Convertir arrays a JSON si vienen como objetos
      ...(updates.ingredientes && {
        ingredientes: typeof updates.ingredientes === 'string'
          ? updates.ingredientes
          : JSON.stringify(updates.ingredientes),
      }),
      ...(updates.instrucciones && {
        instrucciones: typeof updates.instrucciones === 'string'
          ? updates.instrucciones
          : JSON.stringify(updates.instrucciones),
      }),
    };

    const { data, error } = await supabase
      .from('recetas')
      .update(updateData)
      .eq('id', id)
      .eq('autor_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Receta;
  },

  // ─────────────────────────────────────────
  // 🗑️ BORRAR
  // ─────────────────────────────────────────

  /** Eliminar una receta */
  delete: async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('recetas')
      .delete()
      .eq('id', id)
      .eq('autor_id', user.id);

    if (error) throw error;
    return true;
  },
};