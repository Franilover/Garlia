export interface Libro {
  id: string;
  titulo: string | null;
  sinopsis: string | null;
  portada_url: string | null;
  estado: string | null;
  created_at: string;
  fecha_proximo_capitulo: string | null;
}

export interface Capitulo {
  id: string;
  libro_id: string;
  orden: number;
  titulo_capitulo: string | null;
  contenido: string | null;
  created_at: string;
  fecha_publicacion: string | null;
}