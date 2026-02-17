// types/wiki/criatura.ts

// Tipo para variantes de criaturas
export interface CriaturaVariante {
  id: string; // uuid
  criatura_id: string; // uuid (foreign key)
  tipo: string; // text - Ej: "Universal", "Hielo", "Acosadores", etc.
  descripcion_variante: string; // text - Descripción de la variante
  imagen_url: string; // text - URL de la imagen
  created_at?: string;
}

// Tipo principal de criatura
export interface Criatura {
  id: string; // uuid
  nombre: string; // text
  descripcion: string; // text
  imagen_url: string; // text
  created_at: string; // timestamp with time zone
  habitat: string; // text
  pensamiento: string; // text
  alma: string; // text
  variantes?: CriaturaVariante[]; // Relación con variantes
}

// Tipo para criatura con variantes incluidas
export interface CriaturaConVariantes extends Criatura {
  variantes: CriaturaVariante[];
}