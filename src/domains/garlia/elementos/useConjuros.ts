"use client";

/**
 * useConjuros.ts
 * ───────────────
 * Catálogo de Conjuraciones (tabla "conjuraciones"). Mismo patrón que useFenomenos.ts.
 */

import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { supabase } from "@/infra/supabase/supabase";
import { CONFIG_CONJUROS, type Conjuro } from "./types";

export function useConjuros() {
  const { data, setData, loading } = useSupabaseData<Conjuro>(CONFIG_CONJUROS.tabla, {
    select: CONFIG_CONJUROS.select,
    order: { campo: "created_at" },
  });

  async function renombrarConjuro(id: string, nuevoNombre: string) {
    const { error } = await supabase
      .from(CONFIG_CONJUROS.tabla)
      .update({ nombre: nuevoNombre })
      .eq("id", id);
    if (error) {
      console.error("[useConjuros] error renombrando:", error);
      return;
    }
    setData((prev) => prev.map((c) => (c.id === id ? { ...c, nombre: nuevoNombre } : c)));
  }

  async function eliminarConjuro(id: string) {
    const { error } = await supabase.from(CONFIG_CONJUROS.tabla).delete().eq("id", id);
    if (error) {
      console.error("[useConjuros] error eliminando:", error);
      return;
    }
    setData((prev) => prev.filter((c) => c.id !== id));
  }

  async function crearConjuro(nombre: string): Promise<string | null> {
    const { data: row, error } = await supabase
      .from(CONFIG_CONJUROS.tabla)
      .insert({ nombre })
      .select(CONFIG_CONJUROS.select)
      .single();
    if (error) {
      console.error("[useConjuros] error creando:", error);
      return null;
    }
    setData((prev) => [...prev, row as unknown as Conjuro]);
    return row.id;
  }

  return { items: data, setItems: setData, loading, renombrarConjuro, eliminarConjuro, crearConjuro };
}
