import { supabase } from "@/lib/api/queries/client/supabase";

// ─── RUTINAS ──────────────────────────────────────────────────────────────────
export const rutinasQueries = {

  // Obtener todas las rutinas con sus ejercicios anidados
  getAll: async () => {
    const { data, error } = await supabase
      .from("rutinas")
      .select(`
        id,
        nombre,
        descripcion,
        tag,
        created_at,
        ejercicios_rutina (
          id,
          nombre,
          series,
          reps,
          descanso,
          musculo,
          notas,
          orden
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Ordenar ejercicios por campo "orden"
    return (data ?? []).map((r: any) => ({
      ...r,
      ejercicios: [...(r.ejercicios_rutina ?? [])].sort(
        (a: any, b: any) => a.orden - b.orden
      ),
    }));
  },

  // Crear rutina (sin ejercicios, se añaden después)
  add: async (rutina: {
    nombre: string;
    descripcion: string;
    tag: string;
  }) => {
    const { data, error } = await supabase
      .from("rutinas")
      .insert([rutina])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar rutina (los ejercicios se borran en cascada)
  delete: async (id: string) => {
    const { error } = await supabase
      .from("rutinas")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Actualizar nombre/descripción/tag de una rutina
  update: async (
    id: string,
    campos: Partial<{ nombre: string; descripcion: string; tag: string }>
  ) => {
    const { data, error } = await supabase
      .from("rutinas")
      .update(campos)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ─── EJERCICIOS ───────────────────────────────────────────────────────────────
export const ejerciciosQueries = {

  // Añadir ejercicio a una rutina
  add: async (ejercicio: {
    rutina_id: string;
    nombre: string;
    series: number;
    reps: string;
    descanso: number;
    musculo: string;
    notas?: string;
    orden?: number;
  }) => {
    const { data, error } = await supabase
      .from("ejercicios_rutina")
      .insert([ejercicio])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar ejercicio
  delete: async (id: string) => {
    const { error } = await supabase
      .from("ejercicios_rutina")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Actualizar ejercicio
  update: async (
    id: string,
    campos: Partial<{
      nombre: string;
      series: number;
      reps: string;
      descanso: number;
      musculo: string;
      notas: string;
      orden: number;
    }>
  ) => {
    const { data, error } = await supabase
      .from("ejercicios_rutina")
      .update(campos)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Reemplazar todos los ejercicios de una rutina (útil al editar)
  reemplazar: async (
    rutinaId: string,
    ejercicios: {
      nombre: string;
      series: number;
      reps: string;
      descanso: number;
      musculo: string;
      notas?: string;
      orden: number;
    }[]
  ) => {
    // 1. Borrar los existentes
    const { error: delError } = await supabase
      .from("ejercicios_rutina")
      .delete()
      .eq("rutina_id", rutinaId);

    if (delError) throw delError;

    // 2. Insertar los nuevos
    if (ejercicios.length === 0) return [];

    const { data, error } = await supabase
      .from("ejercicios_rutina")
      .insert(ejercicios.map((e) => ({ ...e, rutina_id: rutinaId })))
      .select();

    if (error) throw error;
    return data ?? [];
  },
};