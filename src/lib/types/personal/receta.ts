
// ─── RECETA ───
export type RecetaCategoria = "Postres" | "Almuerzos" | "Cenas" | "Desayunos" | "Snacks" | "General";
export type RecetaDificultad = "Fácil" | "Media" | "Difícil";

export interface IngredienteReceta {
  nombre: string;
  cantidad: string;
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface Receta {
  id?: string;
  created_at?: string;
  nombre: string;
  descripcion?: string;
  categoria: RecetaCategoria;
  tiempo: string;
  dificultad: RecetaDificultad;
  ingredientes: IngredienteReceta[] | string;
  instrucciones: string[];
  imagen_url?: string;
  autor_id?: string;
}

export type NuevaReceta = Omit<Receta, "id" | "created_at" | "autor_id">;
