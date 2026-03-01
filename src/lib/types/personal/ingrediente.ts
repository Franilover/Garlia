
export interface Ingrediente {
  id: string;
  created_at?: string;
  nombre: string;
  porcion_texto: string;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  kcal: number;
  fibra: number;
  sodio: number;
  agua_ml: number;
  categoria: string;
  stock_actual: number;
  user_id?: string;
}