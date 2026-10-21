"use client";

/**
 * useFenomenos.ts
 * ────────────────────────
 * Catálogo de Fenómenos (tabla real "fenomenos"). Antes solo lectura desde
 * el frontend (ver comentario histórico "Fenómeno · solo lectura" en
 * FenomenosPage) — se agregan acá renombrarFenomeno/eliminarFenomeno, mismo
 * patrón que useMateriales.ts/useEstructuras.ts, para que el panel flotante
 * tenga header editable (nombre + Guardar + Eliminar) igual que
 * Elemento/Compuesto/Proceso/Reacción.
 */

import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { supabase } from "@/infra/supabase/supabase";
import { CONFIG_FENOMENOS, type Fenomeno } from "./types";

export function useFenomenos() {
  const { data, setData, loading } = useSupabaseData<Fenomeno>(CONFIG_FENOMENOS.tabla, {
    select: CONFIG_FENOMENOS.select,
    order: { campo: "created_at" },
  });

  async function renombrarFenomeno(id: string, nuevoNombre: string) {
    const { error } = await supabase
      .from(CONFIG_FENOMENOS.tabla)
      .update({ nombre: nuevoNombre })
      .eq("id", id);
    if (error) {
      console.error("[useFenomenos] error renombrando fenómeno:", error);
      return;
    }
    setData((prev) => prev.map((f) => (f.id === id ? { ...f, nombre: nuevoNombre } : f)));
  }

  async function eliminarFenomeno(id: string) {
    const { error } = await supabase.from(CONFIG_FENOMENOS.tabla).delete().eq("id", id);
    if (error) {
      console.error("[useFenomenos] error eliminando fenómeno:", error);
      return;
    }
    setData((prev) => prev.filter((f) => f.id !== id));
  }

  return { items: data, setItems: setData, loading, renombrarFenomeno, eliminarFenomeno };
}
