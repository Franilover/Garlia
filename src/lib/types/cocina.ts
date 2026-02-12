export interface Ingrediente {
  id: string;
  created_at?: string;
  nombre: string;
  // "El precio ya no vive aquí, ahora se consulta en la tabla precios"
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

export interface Precio {
  id: string;
  created_at: string;
  ingrediente_id: string;
  monto_pagado: number;
  user_id: string;
  // "Esta relación permite que Supabase nos devuelva el nombre del ingrediente"
  ingredientes?: {
    nombre: string;
    categoria: string;
  };
}