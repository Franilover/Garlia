"use client";

/**
 * useItemCatalogosUbicacion.ts
 * ─────────────────────────────
 * Carga los catálogos globales de reinos y ciudades.
 * Antes vivían como dos useEffect sueltos dentro de PanelTerritorio
 * y PanelCiudades respectivamente — un componente no debe fetchear.
 *
 * Ruta destino:
 *   src/features/editorGarlia/hooks/useItemCatalogosUbicacion.ts
 */

import { useEffect, useState } from "react";

import { supabase } from "@/lib/api/client/supabase";

export type ReinoMin = { id: string; nombre: string };
export type CiudadMin = { id: string; nombre: string; reino_id?: string | null };

export function useItemCatalogosUbicacion() {
  const [allReinos, setAllReinos] = useState<ReinoMin[]>([]);
  const [allCiudades, setAllCiudades] = useState<CiudadMin[]>([]);
  const [loadingReinos, setLoadingReinos] = useState(true);

  useEffect(() => {
    supabase
      .from("reinos")
      .select("id, nombre")
      .order("nombre")
      .then(({ data }) => {
        setAllReinos(data ?? []);
        setLoadingReinos(false);
      });

    supabase
      .from("ciudades")
      .select("id, nombre, reino_id")
      .order("nombre")
      .then(({ data }) => setAllCiudades(data ?? []));
  }, []);

  return { allReinos, allCiudades, loadingReinos };
}
