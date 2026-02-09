"use client";

/**
 * "Tipos de unión para asegurar que solo uses valores válidos"
 */
export type RecetaCategoria = "Postres" | "Almuerzos" | "Cenas" | "Desayunos" | "Snacks" | "General";
export type RecetaDificultad = "Fácil" | "Media" | "Difícil";

/**
 * "Interfaz que define la estructura de una Receta"
 * "Coincide exactamente con las columnas de tu tabla en Supabase"
 */
export interface Receta {
  id?: string;               // "UUID generado por Supabase"
  created_at?: string;       // "Timestamp de creación"
  nombre: string;            // "Nombre del plato"
  descripcion?: string;      // "Breve introducción o historia"
  categoria: RecetaCategoria; // "Usa los tipos definidos arriba"
  tiempo: string;            // "Ejemplo: 45 min"
  dificultad: RecetaDificultad;
  ingredientes: string[];    // "Array de strings (JSONB en la base de datos)"
  instrucciones: string[];   // "Array de pasos (JSONB en la base de datos)"
  imagen_url?: string;       // "URL de la foto guardada en el Storage"
  autor_id?: string;         // "ID del usuario que la creó"
}

/**
 * "Tipo útil para el formulario de creación"
 * "Omite los campos que Supabase genera automáticamente"
 */
export type NuevaReceta = Omit<Receta, "id" | "created_at" | "autor_id">;