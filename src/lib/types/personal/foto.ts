
// ─── FOTO ───
export interface Foto {
  id: number;
  fecha: string;
  url_imagen: string;
  categoria: string; // "yo" | "amigos"
  created_at?: string;
}
