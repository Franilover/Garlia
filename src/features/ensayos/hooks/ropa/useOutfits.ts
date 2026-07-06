"use client";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

export type Temporada = "Primavera" | "Verano" | "Otoño" | "Invierno";
export type Vibra     = "Casual" | "Formal" | "Sport" | "Noche" | "Aesthetic";
export type Color     = "Negro" | "Blanco" | "Gris" | "Rosa" | "Rojo" | "Azul" | "Verde" | "Beige" | "Marrón" | "Lila";

export interface Outfit {
  id: string;
  nombre: string;
  descripcion?: string;
  imagen_url: string;
  temporadas?: Temporada[];
  vibras?: Vibra[];
  colores?: Color[];
}

/** Carga y CRUD de los outfits guardados (tabla `ropa`). */
export function useOutfits() {
  const {
    data: outfits = [],
    loading,
    addRow: addOutfit,
    updateRow: updateOutfit,
    deleteRow: deleteOutfit,
    refetch: refetchOutfits,
  } = useSupabaseData<Outfit>("ropa", {
    order: { campo: "created_at", asc: false },
  });

  return { outfits, loading, addOutfit, updateOutfit, deleteOutfit, refetchOutfits };
}
