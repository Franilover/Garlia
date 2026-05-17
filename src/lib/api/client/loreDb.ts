/**
 * loreDb.ts
 * Helpers Dexie compartidos para los módulos de lore (dones, hechizos, notas).
 * Reemplaza las 4 copias duplicadas que existían en BloqueDones, BloqueHechizos y useNotas.
 */

import { db } from "@/lib/api/client/db";

const CATALOG_TTL_MS = 10 * 60 * 1000; // 10 minutos

// ─── Helpers básicos ──────────────────────────────────────────────────────────

export async function loreReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}

export async function lorePut(tabla: string, row: any): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.put(row);
  } catch (e) {
    console.warn(`[loreDb] put failed on '${tabla}':`, e);
  }
}

export async function loreDel(tabla: string, id: string): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.delete(id);
  } catch (e) {
    console.warn(`[loreDb] delete failed on '${tabla}':`, e);
  }
}

export async function loreWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local
      .map((r: any) => r.id)
      .filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch (e) {
    console.warn(`[loreDb] writeAll failed on '${tabla}':`, e);
  }
}

// ─── Caché de catálogos con TTL (session_cache) ───────────────────────────────
// Evita fetches paralelos cuando varios componentes montan al mismo tiempo.

export async function getCatalogCache<T>(cacheKey: string): Promise<T[] | null> {
  try {
    if (!db) return null;
    const cached = await db.session_cache.get(cacheKey);
    if (cached && Date.now() - cached.updated_at < CATALOG_TTL_MS) {
      return cached.value as T[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCatalogCache(cacheKey: string, value: any[]): Promise<void> {
  try {
    if (!db) return;
    await db.session_cache.put({ key: cacheKey, value, updated_at: Date.now() });
  } catch (e) {
    console.warn(`[loreDb] session_cache put failed for '${cacheKey}':`, e);
  }
}

// ─── Cache de relaciones personaje ───────────────────────────────────────────
// Lee relaciones (personaje_hechizos / personaje_dones) desde Dexie.

export async function loreReadRelaciones(
  tabla: string,
  personajeId: string,
  foreignKey: string, // "hechizo_id" | "don_id"
): Promise<string[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    const rows: any[] = await t.where("personaje_id").equals(personajeId).toArray();
    return rows.map((r: any) => r[foreignKey]);
  } catch {
    return [];
  }
}

export async function loreSyncRelaciones(
  tabla: string,
  personajeId: string,
  foreignKey: string,
  remoteIds: string[],
): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    await t.where("personaje_id").equals(personajeId).delete();
    if (remoteIds.length > 0) {
      await t.bulkPut(
        remoteIds.map((id) => ({
          id: `${personajeId}_${id}`,
          personaje_id: personajeId,
          [foreignKey]: id,
        })),
      );
    }
  } catch (e) {
    console.warn(`[loreDb] syncRelaciones failed on '${tabla}':`, e);
  }
}
