/**
 * criaturaCache.ts
 * ────────────────
 * Caches en memoria compartidas entre EditorPersonaje y EditorCriatura.
 * Evitan que ambos archivos llamen toArray() por separado sobre las mismas
 * tablas (O(n) × N → O(n) × 1).
 *
 * Sin React, sin JSX → va en lib/utils/.
 * Ruta destino: src/lib/utils/criaturaCache.ts
 */

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── Caché: criatura por nombre ───────────────────────────────────────────────
const _criaturaByNombre = new Map<string, any | null>();
let _criaturaTableLoaded = false;

async function _preloadCriaturas(): Promise<void> {
  if (_criaturaTableLoaded) return;
  _criaturaTableLoaded = true;
  try {
    if (!db) return;
    const todas: any[] = (await (db as any).criaturas?.toArray()) ?? [];
    for (const c of todas) {
      const key = c.nombre?.toLowerCase().trim();
      if (key) _criaturaByNombre.set(key, c);
    }
  } catch {
    _criaturaTableLoaded = false;
  }
}

/**
 * Devuelve la criatura cuyo nombre coincide (case-insensitive).
 * Primero consulta la caché en memoria, luego Dexie y por último Supabase.
 */
export async function getCriaturaByNombre(nombre: string): Promise<any | null> {
  const key = nombre.trim().toLowerCase();
  if (_criaturaByNombre.has(key)) return _criaturaByNombre.get(key) ?? null;
  await _preloadCriaturas();
  if (_criaturaByNombre.has(key)) return _criaturaByNombre.get(key) ?? null;
  if (!navigator.onLine) return null;
  try {
    const { data } = await supabase
      .from("criaturas")
      .select("id, nombre")
      .ilike("nombre", nombre.trim())
      .limit(1)
      .maybeSingle();
    _criaturaByNombre.set(key, data ?? null);
    return data ?? null;
  } catch {
    return null;
  }
}

// ─── Caché: grupos_mundo por tipo (con TTL) ───────────────────────────────────
const _gruposByTipo = new Map<string, { data: any[]; ts: number }>();
const GRUPOS_TTL_MS = 60_000;

/**
 * Devuelve todos los grupos_mundo de un tipo dado.
 * Usa el índice "tipo" de Dexie en vez de toArray() completo.
 * Resultado se cachea 60 segundos en memoria.
 */
export async function getGruposByTipo(tipo: string): Promise<any[]> {
  const cached = _gruposByTipo.get(tipo);
  if (cached && Date.now() - cached.ts < GRUPOS_TTL_MS) return cached.data;
  try {
    if (db) {
      const raw: any[] =
        (await (db as any).grupos_mundo
          ?.where("tipo")
          .equals(tipo)
          .toArray()) ?? [];
      const data = raw.map((g: any) => ({
        ...g,
        nombre: g.nombre ?? "",
        miembro_ids: g.miembro_ids ?? [],
      }));
      _gruposByTipo.set(tipo, { data, ts: Date.now() });
      return data;
    }
  } catch {}
  return [];
}

// ─── Caché: mapa id → título de libros ───────────────────────────────────────
let _libroMapCache: Record<string, string> | null = null;

/**
 * Devuelve un mapa { libro_id → titulo } construido desde Dexie.
 * Se cachea indefinidamente durante la sesión (los títulos cambian poco).
 */
export async function getLibroMap(): Promise<Record<string, string>> {
  if (_libroMapCache) return _libroMapCache;
  try {
    if (db) {
      const libros: any[] = (await (db as any).libros?.toArray()) ?? [];
      _libroMapCache = Object.fromEntries(
        libros.map((l: any) => [l.id, l.titulo ?? ""]),
      );
      return _libroMapCache!;
    }
  } catch {}
  return {};
}

/** Invalida la caché de libroMap (llamar tras crear/renombrar un libro). */
export function invalidateLibroMap(): void {
  _libroMapCache = null;
}
