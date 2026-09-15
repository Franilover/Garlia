import { supabase } from "@/infra/supabase/supabase";

/** Fila cruda de la tabla `novedades` (ver sql/descubrimientos_publicos.sql). */
export interface Novedad {
  id: string;
  titulo: string;
  cuerpo: string;
  publicado: boolean;
  fecha: string;
  autor_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NovedadInput = Pick<Novedad, "titulo" | "cuerpo"> &
  Partial<Pick<Novedad, "publicado" | "fecha">>;

export const novedadesQueries = {
  /** Público: solo lo publicado, más reciente primero. */
  listPublicadas: async (): Promise<Novedad[]> => {
    const { data, error } = await supabase
      .from("novedades")
      .select("*")
      .eq("publicado", true)
      .order("fecha", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  /** Admin: todo, incluidos borradores. */
  listTodas: async (): Promise<Novedad[]> => {
    const { data, error } = await supabase
      .from("novedades")
      .select("*")
      .order("fecha", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  create: async (input: NovedadInput) => {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("novedades")
      .insert({
        titulo: input.titulo,
        cuerpo: input.cuerpo,
        publicado: input.publicado ?? false,
        fecha: input.fecha ?? new Date().toISOString(),
        autor_id: auth.user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Novedad;
  },

  update: async (id: string, input: Partial<NovedadInput>) => {
    const { error } = await supabase
      .from("novedades")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase.from("novedades").delete().eq("id", id);
    if (error) throw error;
  },
};
