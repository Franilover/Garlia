"use client";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { CONFIG_CONJURO_FENOMENOS, type ConjuroFenomeno } from "./types";

export function useConjuroFenomenos(conjuroId: string) {
  const { data, loading } = useSupabaseData<ConjuroFenomeno>(
    CONFIG_CONJURO_FENOMENOS.tabla,
    {
      select: CONFIG_CONJURO_FENOMENOS.select,
      filter: { campo: "conjuro_id", valor: conjuroId },
    },
  );
  return { items: data, loading };
}
