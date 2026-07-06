"use client";

import type { Receta } from "@/lib/types/queries";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";

/** Carga de las recetas guardadas (tabla `recetas`). */
export function useRecetas() {
  const { data: recetas, loading, addRow, updateRow, deleteRow, refetch } =
    useSupabaseData<Receta>("recetas");

  return { recetas, loading, addRow, updateRow, deleteRow, refetch };
}
