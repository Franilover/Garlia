import { supabase } from "@/infra/supabase/supabase";

import type { Teoria, TeoriaInput } from "./types";

export const teoriasQueries = {
  /** Lectura pública: todas las teorías, más recientes primero. */
  listar: async (): Promise<Teoria[]> => {
    const { data, error } = await supabase
      .from("teorias")
      .select(
        "id, autor_id, titulo, contenido, created_at, perfiles(username)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      autor_id: row.autor_id,
      autor_username: row.perfiles?.username ?? null,
      titulo: row.titulo,
      contenido: row.contenido,
      created_at: row.created_at,
    }));
  },

  /** Crea una teoría a nombre del usuario logueado. */
  crear: async (input: TeoriaInput) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Hay que iniciar sesión para publicar.");
    const { error } = await supabase.from("teorias").insert({
      autor_id: auth.user.id,
      titulo: input.titulo,
      contenido: input.contenido,
    });
    if (error) throw error;
  },

  /** Borra una teoría. RLS permite: autor propio, o admin sobre cualquiera. */
  eliminar: async (id: string) => {
    const { error } = await supabase.from("teorias").delete().eq("id", id);
    if (error) throw error;
  },
};
