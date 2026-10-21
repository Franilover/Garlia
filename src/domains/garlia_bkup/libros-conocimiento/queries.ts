import { supabase } from "@/infra/supabase/supabase";

import type {
  LibroConocimiento,
  LibroConocimientoConPaginas,
  LibroConocimientoInput,
  PaginaLibroConocimiento,
} from "./types";

export const librosConocimientoQueries = {
  /** Lectura pública: todos los libros (sin páginas), más recientes primero. */
  listar: async (): Promise<LibroConocimiento[]> => {
    const { data, error } = await supabase
      .from("libros_conocimiento")
      .select("id, titulo, autor_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as LibroConocimiento[];
  },

  /** Trae un libro con sus páginas ya ordenadas — para abrir el visor. */
  obtenerConPaginas: async (
    id: string,
  ): Promise<LibroConocimientoConPaginas | null> => {
    const { data: libro, error: errLibro } = await supabase
      .from("libros_conocimiento")
      .select("id, titulo, autor_id, created_at")
      .eq("id", id)
      .maybeSingle();
    if (errLibro) throw errLibro;
    if (!libro) return null;

    const { data: paginas, error: errPaginas } = await supabase
      .from("libros_conocimiento_paginas")
      .select("id, libro_id, orden, contenido")
      .eq("libro_id", id)
      .order("orden", { ascending: true });
    if (errPaginas) throw errPaginas;

    return {
      ...(libro as LibroConocimiento),
      paginas: (paginas ?? []) as PaginaLibroConocimiento[],
    };
  },

  /**
   * Crea un libro y todas sus páginas de una vez. Solo admin (ver RLS de
   * libros_conocimiento_insert_admin) — a diferencia de Teorías, esto no
   * lo puede publicar cualquier usuario.
   */
  crear: async (input: LibroConocimientoInput) => {
    const { data: auth } = await supabase.auth.getUser();

    const { data: libro, error: errLibro } = await supabase
      .from("libros_conocimiento")
      .insert({
        titulo: input.titulo,
        autor_id: auth.user?.id ?? null,
      })
      .select("id")
      .single();
    if (errLibro) throw errLibro;

    const paginasNoVacias = input.paginas
      .map((contenido) => contenido.trim())
      .filter((contenido) => contenido.length > 0);

    if (paginasNoVacias.length > 0) {
      const filas = paginasNoVacias.map((contenido, i) => ({
        libro_id: libro.id,
        orden: i,
        contenido,
      }));
      const { error: errPaginas } = await supabase
        .from("libros_conocimiento_paginas")
        .insert(filas);
      if (errPaginas) throw errPaginas;
    }

    return libro.id as string;
  },

  /** Borra un libro (las páginas se van con ON DELETE CASCADE). Solo admin. */
  eliminar: async (id: string) => {
    const { error } = await supabase
      .from("libros_conocimiento")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
