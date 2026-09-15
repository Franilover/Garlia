/**
 * Sistema de "libros de conocimiento" — Universo > Libros.
 *
 * OJO: esto es DISTINTO de /garlia/libros (biblioteca de historia/aventura,
 * con capítulos, lector interactivo, grafo de nodos, etc — ver
 * domains/garlia/libros/*). Este es un sistema simple y separado: un libro
 * acá es sólo un título + una lista ordenada de páginas de texto, pensado
 * para leerse como un libro físico (dos páginas abiertas a la vez).
 *
 * Persistencia esperada (no incluida en este export, ver sql/ del repo
 * real): tabla `libros_conocimiento` (id, titulo, created_at, autor_id) +
 * tabla `libros_conocimiento_paginas` (id, libro_id, orden, contenido).
 */

/** Una página individual de un libro de conocimiento. */
export interface PaginaLibroConocimiento {
  id: string;
  libro_id: string;
  orden: number;
  contenido: string;
}

/** Fila del libro (sin páginas resueltas). */
export interface LibroConocimiento {
  id: string;
  titulo: string;
  autor_id: string | null;
  created_at: string;
}

/** Libro con sus páginas ya cargadas y ordenadas — lo que consume el visor. */
export interface LibroConocimientoConPaginas extends LibroConocimiento {
  paginas: PaginaLibroConocimiento[];
}

/**
 * Payload para crear un libro desde el modal admin: título + páginas en
 * orden, escritas una por una (el autor decide cuántas agregar).
 */
export interface LibroConocimientoInput {
  titulo: string;
  paginas: string[]; // contenido de cada página, en orden
}
