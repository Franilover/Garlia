/**
 * dexieHelpers.ts
 * ───────────────
 * Helpers de Dexie usados en varios editores (personajes, criaturas, mundo…).
 * Sin React, sin JSX → va en lib/utils/.
 *
 * Ruta destino: src/lib/utils/dexieHelpers.ts
 */

import { db } from "@/lib/api/client/db";

/** Inserta o actualiza una fila en una tabla de Dexie. */
export async function dexiePut(tabla: string, row: unknown): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.put(row);
  } catch {}
}

/** Elimina una fila por ID de una tabla de Dexie. */
export async function dexieDelete(tabla: string, id: string): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.delete(id);
  } catch {}
}

/**
 * Lee todas las filas de una tabla de Dexie filtrando las marcadas
 * como eliminadas (campo `deleted`).
 */
export async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter(
      (r: any) => !r.deleted,
    ) as T[];
  } catch {
    return [];
  }
}

/**
 * Reemplaza el contenido local de una tabla con los datos remotos:
 * hace bulkPut de las filas nuevas y elimina las que ya no existen.
 */
export async function dexieWriteAll(
  tabla: string,
  rows: unknown[],
): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set((rows as any[]).map((r) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local
      .map((r: any) => r.id)
      .filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}
