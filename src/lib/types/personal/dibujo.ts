// ─── DIBUJO ───
export interface Dibujo {
  id: number;
  titulo: string;
  url_imagen: string;
  categoria: string; // "original" | "fanart" | "bocetos"
}