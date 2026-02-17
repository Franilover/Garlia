export interface Cancion {
  id: string;
  titulo: string;
  personaje: string | null;
  estado: string | null;
  portada_url: string | null;
  created_at: string;
  updated_at: string;
  visible: boolean;
  links: Record<string, string> | null;
  cantante: string | null;
  compositor: string | null;
  idioma: string | null;
}