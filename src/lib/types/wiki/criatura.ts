export interface Criatura {
  id: string;
  nombre: string | null;
  img_url: string | null;
  sobre: string | null;
  reino: string | null;
  especie: string | null;
  habitat?: string | null;
  alma?: string | null;
  pensamiento?: string | null;
  created_at?: string;
}

export interface CriaturaVariante {
  id: string;
  criatura_id: string;
  tipo: string | null;
  descripcion_variante: string | null;
  imagen_url: string | null;
  created_at: string;
}

export interface CriaturaConVariantes extends Criatura {
  variantes: CriaturaVariante[];
}