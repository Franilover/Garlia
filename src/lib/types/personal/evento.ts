
// ─── EVENTO ───
export interface Evento {
  id: string;
  created_at?: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  tipo?: string;
  user_id?: string;
}
