"use client";

/**
 * useObjetosDeMaterial.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Camino inverso de useItemMateriales: dado un Material, resuelve qué
 * Objeto(s) (items) lo usan como parte de su composición física
 * (item_materiales.material_id = material.id) — para el nivel "Objeto" del
 * breadcrumb Elemento > Compuesto > Material > Objeto.
 *
 * Mismo patrón exacto que useMaterialesDeCompuesto.ts (inverso de
 * useMaterialComponentes): la relación vive en una tabla puente ya
 * consumida por useSupabaseData (item_materiales, ver useItemMateriales.ts
 * y CONFIG_ITEM_MATERIALES en domains/garlia/items/types.ts), acá solo se
 * lee esa misma tabla completa y se filtra por material_id en vez de por
 * item_id.
 *
 * No trae el catálogo completo de Items (no existe un useItems() propio en
 * este paquete todavía) — solo id + nombre, que es lo único que el
 * breadcrumb necesita para listar en el popover. Si en el futuro se
 * necesita más que id/nombre acá, conviene resolverlo contra itemFullQuery
 * (domains/garlia/items/queries.ts) en vez de duplicar columnas sueltas.
 */

import { useEffect, useMemo, useState } from "react";

import { CONFIG_ITEM_MATERIALES, type ItemMaterial } from "@/domains/garlia/items/types";
import { supabase } from "@/infra/supabase/supabase";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

type ObjetoLite = { id: string; nombre: string };

export function useObjetosDeMaterial(materialId: string | null) {
  const { data: vinculos, loading: loadingVinculos } = useSupabaseData<ItemMaterial>(
    CONFIG_ITEM_MATERIALES.tabla,
    { select: CONFIG_ITEM_MATERIALES.select },
  );

  const itemIds = useMemo(() => {
    if (!materialId) return [] as string[];
    return Array.from(
      new Set(
        vinculos.filter((v) => v.material_id === materialId).map((v) => v.item_id),
      ),
    );
  }, [vinculos, materialId]);

  const [objetos, setObjetos] = useState<ObjetoLite[]>([]);
  const [loadingObjetos, setLoadingObjetos] = useState(false);

  // itemIds no trae id+nombre por sí solo (item_materiales solo guarda el
  // vínculo) — hace falta un fetch puntual contra items, igual que
  // useMaterialesDeCompuesto resuelve sus ids contra useMateriales(). Acá
  // se hace directo contra supabase en vez de un catálogo cacheado
  // (useItems no existe todavía) para no traer objetos enteros de más.
  useEffect(() => {
    let cancelado = false;
    if (itemIds.length === 0) {
      setObjetos([]);
      return;
    }
    setLoadingObjetos(true);
    supabase
      .from("items")
      .select("id, nombre")
      .in("id", itemIds)
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          console.error("[useObjetosDeMaterial] error cargando objetos:", error);
          setObjetos([]);
        } else {
          setObjetos((data as ObjetoLite[] | null) ?? []);
        }
        setLoadingObjetos(false);
      });
    return () => {
      cancelado = true;
    };
  }, [itemIds]);

  return { items: objetos, loading: loadingVinculos || loadingObjetos };
}
