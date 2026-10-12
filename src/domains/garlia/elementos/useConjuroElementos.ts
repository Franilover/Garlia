"use client";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { CONFIG_CONJURO_ELEMENTOS, type ConjuroElemento } from "./types";

export function useConjuroElementos(conjuroId: string) {
  const { data, loading } = useSupabaseData<ConjuroElemento>(
    CONFIG_CONJURO_ELEMENTOS.tabla,
    {
      select: CONFIG_CONJURO_ELEMENTOS.select,
      filter: { campo: "conjuro_id", valor: conjuroId },
    },
  );
  return { items: data, loading };
}
