/**
 * criaturaItemsCache.ts
 * ──────────────────────
 * Singleton del catálogo de ítems — compartido entre CriaturaItemsNaturales
 * y CriaturaItemsCraftedos. Un solo fetch aunque ambos bloques estén montados
 * simultáneamente (criatura base + variantes).
 *
 * Sin React, sin JSX → va en lib/utils/.
 * Ruta destino: src/lib/utils/criaturaItemsCache.ts
 */

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

export type ItemMin = { id: string; nombre: string; imagen_url?: string | null };

let _itemsData: ItemMin[] | null = null;
let _itemsPromise: Promise<ItemMin[]> | null = null;

/**
 * Devuelve el catálogo completo de ítems.
 * - Primera llamada: Dexie → si hay datos los devuelve y refresca en background.
 * - Sin datos locales: Supabase.
 * - Múltiples llamadas simultáneas comparten la misma Promise (no hay race).
 */
export async function fetchAllItems(): Promise<ItemMin[]> {
  if (_itemsData) return _itemsData;
  if (_itemsPromise) return _itemsPromise;

  _itemsPromise = (async () => {
    try {
      if (db) {
        const local = await db.items.orderBy("nombre").toArray();
        if (local.length > 0) {
          _itemsData = local as ItemMin[];
          if (navigator.onLine) {
            supabase
              .from("items")
              .select("id, nombre, imagen_url")
              .order("nombre")
              .then(({ data }) => {
                if (data && data.length > 0) _itemsData = data as ItemMin[];
              });
          }
          return _itemsData;
        }
      }
    } catch {}

    if (!navigator.onLine) return [];
    const { data } = await supabase
      .from("items")
      .select("id, nombre, imagen_url")
      .order("nombre");
    _itemsData = (data ?? []) as ItemMin[];
    return _itemsData;
  })().finally(() => {
    _itemsPromise = null;
  });

  return _itemsPromise;
}

/** Invalida la caché (llamar tras crear/eliminar un ítem). */
export function invalidateItemsCache(): void {
  _itemsData = null;
}
