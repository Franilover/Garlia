export interface Reino {
  id: string;
  nombre: string | null;
  descripcion: string | null;
  orden: number;
  mapa_url: string | null;
  imagen_reino: string | null;
  coord_x: number | null;
  coord_y: number | null;
}

export interface LugarReino {
  id: string;
  reino_id: string;
  nombre: string | null;
  descripcion: string | null;
  coord_x: number | null;
  coord_y: number | null;
  tipo: string | null;
  created_at: string;
}