"use client";

import type { Ingrediente } from "@/lib/types/queries";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";

/** Carga y CRUD de los ingredientes guardados (tabla `ingredientes`). */
export function useIngredientes() {
  const {
    data: ingredientes,
    loading,
    refetch,
    addRow,
    updateRow,
    deleteRow,
  } = useSupabaseData<Ingrediente>("ingredientes");

  return { ingredientes, loading, refetch, addRow, updateRow, deleteRow };
}
