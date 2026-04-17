// lib/api/client/perfilCache.ts
import { db } from "./db";

export interface PerfilCacheValue {
  perfil: any;
  updated_at: number;
}

export async function getPerfilCached(): Promise<PerfilCacheValue | null> {
  try {
    if (!db) return null;
    const row = await db.session_cache.get("perfil");
    if (!row) return null;
    return row.value as PerfilCacheValue;
  } catch {
    return null;
  }
}

export async function setPerfilCached(perfil: any): Promise<void> {
  try {
    if (!db) return;
    await db.session_cache.put({
      key: "perfil",
      value: { perfil, updated_at: Date.now() } satisfies PerfilCacheValue,
      updated_at: Date.now(),
    });
  } catch (e) {
    console.warn("[perfilCache] No se pudo guardar en Dexie:", e);
  }
}

export async function clearPerfilCached(): Promise<void> {
  try {
    if (!db) return;
    await db.session_cache.delete("perfil");
  } catch {}
}