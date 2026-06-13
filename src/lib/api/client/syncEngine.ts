/**
 * syncEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de caché offline-first para lecturas (pull Supabase → Dexie).
 *
 * Complementa useOfflineSync (que maneja escrituras pendientes, push).
 * Reutiliza isReallyOnline y dexiePut de ese módulo para no duplicar lógica.
 *
 * Patrón para cada tabla:
 *   1. Memoria (Map en módulo)  → 0ms, sobrevive SPA nav
 *   2. Dexie                    → ~5ms, offline-ready
 *   3. Supabase en background   → refresca y llama onUpdate() si hay conexión
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { isReallyOnline, dexiePut as dexiePutTable } from "@/hooks/data/useOfflineSync";

// ─── TTL por tabla (ms) ───────────────────────────────────────────────────────
const TTL: Record<string, number> = {
  personajes: 10 * 60_000,  // 10 min
  reinos:     30 * 60_000,  // 30 min — muy estables
  ciudades:   30 * 60_000,  // 30 min — muy estables
  capitulos:   5 * 60_000,  //  5 min — pueden publicarse nuevos
  libros:      5 * 60_000,
};
const DEFAULT_TTL = 5 * 60_000;

// ─── Caché en memoria ─────────────────────────────────────────────────────────
const _memCache = new Map<string, { data: any[]; ts: number }>();

function memGet<T>(key: string): T[] | null {
  const entry = _memCache.get(key);
  if (!entry) return null;
  const ttl = TTL[key.split(":")[0]] ?? DEFAULT_TTL;
  return Date.now() - entry.ts < ttl ? (entry.data as T[]) : null;
}

function memSet<T>(key: string, data: T[]): void {
  _memCache.set(key, { data, ts: Date.now() });
}

/** Invalida la caché en memoria de una tabla (fuerza refetch la próxima vez). */
export function invalidateCache(tablePrefix: string): void {
  for (const key of _memCache.keys()) {
    if (key.startsWith(tablePrefix)) _memCache.delete(key);
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function dexieAll<T>(table: any): Promise<T[]> {
  try { return ((await table?.toArray()) as T[]) ?? []; }
  catch { return []; }
}

async function dexieWhere<T>(table: any, field: string, value: any): Promise<T[]> {
  try { return ((await table?.where(field).equals(value).toArray()) as T[]) ?? []; }
  catch { return []; }
}

/** Persiste en Dexie reutilizando dexiePut de useOfflineSync (tabla por nombre). */
async function persist(tableName: string, rows: any[]): Promise<void> {
  // dexiePut de useOfflineSync recibe (tableName: string, data: any)
  // y hace put de un solo registro. Para bulk usamos bulkPut directo.
  try { await (db as any)[tableName]?.bulkPut(rows); } catch {}
}

// ─── Función genérica de carga con patrón Dexie-first ────────────────────────

interface LoadConfig<T> {
  cacheKey: string;
  dexieSource: () => Promise<T[]>;
  supabaseFetch: () => Promise<T[] | null>;
  persist: (rows: T[]) => Promise<void>;
}

async function loadWithCache<T>(
  config: LoadConfig<T>,
  onUpdate?: (data: T[]) => void,
): Promise<T[]> {
  // 1. Memoria
  const mem = memGet<T>(config.cacheKey);
  if (mem) return mem;

  // 2. Dexie
  const local = await config.dexieSource();
  if (local.length > 0) {
    memSet(config.cacheKey, local);
    // Refrescar en background solo si hay conexión
    refreshInBackground(config, onUpdate);
    return local;
  }

  // Sin caché local → esperar Supabase directamente
  return await fetchAndStore(config, onUpdate) ?? [];
}

async function refreshInBackground<T>(
  config: LoadConfig<T>,
  onUpdate?: (data: T[]) => void,
): Promise<void> {
  const online = await isReallyOnline();
  if (!online) return;
  await fetchAndStore(config, onUpdate);
}

async function fetchAndStore<T>(
  config: LoadConfig<T>,
  onUpdate?: (data: T[]) => void,
): Promise<T[]> {
  try {
    const data = await config.supabaseFetch();
    if (!data) return [];
    memSet(config.cacheKey, data);
    await config.persist(data);
    onUpdate?.(data);
    return data;
  } catch {
    return [];
  }
}

// ─── Personajes ───────────────────────────────────────────────────────────────

export async function loadPersonajes(onUpdate?: (data: any[]) => void): Promise<any[]> {
  return loadWithCache({
    cacheKey: "personajes:all",
    dexieSource: () => dexieAll(db?.personajes),
    supabaseFetch: async () => {
      const { data } = await supabase.from("personajes").select("*").eq("visible", true);
      return data ?? null;
    },
    persist: (rows) => persist("personajes", rows),
  }, onUpdate);
}

/**
 * Devuelve map id→personaje para los IDs dados.
 * Solo va a Supabase por los que no están en Dexie.
 */
export async function loadPersonajesMap(
  ids: string[],
  onUpdate?: (map: Record<string, any>) => void,
): Promise<Record<string, any>> {
  if (ids.length === 0) return {};
  const map: Record<string, any> = {};
  const missing: string[] = [];

  for (const id of ids) {
    const mem = memGet<any>(`personajes:${id}`);
    if (mem?.[0]) { map[id] = mem[0]; continue; }
    try {
      const local = await db?.personajes?.get(id);
      if (local) { map[id] = local; memSet(`personajes:${id}`, [local]); }
      else missing.push(id);
    } catch { missing.push(id); }
  }

  if (missing.length > 0 && await isReallyOnline()) {
    try {
      const { data } = await supabase.from("personajes").select("id, nombre, img_url").in("id", missing);
      if (data) {
        for (const p of data) { map[p.id] = p; memSet(`personajes:${p.id}`, [p]); }
        await persist("personajes", data);
        onUpdate?.(map);
      }
    } catch {}
  }

  return map;
}

// ─── Reinos ───────────────────────────────────────────────────────────────────

export async function loadReinos(onUpdate?: (data: any[]) => void): Promise<any[]> {
  return loadWithCache({
    cacheKey: "reinos:all",
    dexieSource: () => dexieAll(db?.reinos),
    supabaseFetch: async () => {
      const { data } = await supabase.from("reinos").select("*").order("orden");
      return data ?? null;
    },
    persist: (rows) => persist("reinos", rows),
  }, onUpdate);
}

export async function loadReinosMap(
  ids: string[],
  onUpdate?: (map: Record<string, any>) => void,
): Promise<Record<string, any>> {
  if (ids.length === 0) return {};
  const map: Record<string, any> = {};
  const missing: string[] = [];

  for (const id of ids) {
    try {
      const local = await db?.reinos?.get(id);
      if (local) map[id] = local;
      else missing.push(id);
    } catch { missing.push(id); }
  }

  if (missing.length > 0 && await isReallyOnline()) {
    try {
      const { data } = await supabase.from("reinos").select("*").in("id", missing);
      if (data) {
        for (const r of data) map[r.id] = r;
        await persist("reinos", data);
        onUpdate?.(map);
      }
    } catch {}
  }

  return map;
}

// ─── Ciudades ─────────────────────────────────────────────────────────────────

export async function loadCiudades(onUpdate?: (data: any[]) => void): Promise<any[]> {
  return loadWithCache({
    cacheKey: "ciudades:all",
    dexieSource: () => dexieAll(db?.ciudades),
    supabaseFetch: async () => {
      const { data } = await supabase.from("ciudades").select("*");
      return data ?? null;
    },
    persist: (rows) => persist("ciudades", rows),
  }, onUpdate);
}

export async function loadCiudadesMap(
  ids: string[],
  onUpdate?: (map: Record<string, any>) => void,
): Promise<Record<string, any>> {
  if (ids.length === 0) return {};
  const map: Record<string, any> = {};
  const missing: string[] = [];

  for (const id of ids) {
    try {
      const local = await db?.ciudades?.get(id);
      if (local) map[id] = local;
      else missing.push(id);
    } catch { missing.push(id); }
  }

  if (missing.length > 0 && await isReallyOnline()) {
    try {
      const { data } = await supabase
        .from("ciudades")
        .select("id, nombre, tipo, reino_id, imagen_url")
        .in("id", missing);
      if (data) {
        for (const c of data) map[c.id] = c;
        await persist("ciudades", data);
        onUpdate?.(map);
      }
    } catch {}
  }

  return map;
}

// ─── Capítulos de un libro ────────────────────────────────────────────────────

const _capsMemCache: Record<string, { data: any[]; ts: number }> = {};

export function capsCacheados(libroId: string): any[] | null {
  const c = _capsMemCache[libroId];
  return c && Date.now() - c.ts < TTL["capitulos"] ? c.data : null;
}

export async function loadCapitulos(
  libroId: string,
  onUpdate?: (caps: any[]) => void,
): Promise<any[]> {
  const mem = capsCacheados(libroId);
  if (mem) return mem;

  const local = (await dexieWhere<any>(db?.capitulos, "libro_id", libroId))
    .filter((c: any) => c.visibilidad === "publico")
    .sort((a: any, b: any) => a.orden - b.orden);

  if (local.length > 0) {
    _capsMemCache[libroId] = { data: local, ts: Date.now() };
    // Refrescar en background
    isReallyOnline().then((online) => { if (online) refreshCapitulos(libroId, onUpdate); });
    return local;
  }

  return await refreshCapitulos(libroId, onUpdate) ?? [];
}

async function refreshCapitulos(libroId: string, onUpdate?: (caps: any[]) => void): Promise<any[]> {
  try {
    const { data } = await supabase
      .from("capitulos")
      .select("id, titulo_capitulo, orden, fecha_publicacion, libro_id, narrador_id, personajes_ids, reinos_ids, ciudades_ids, visibilidad, orden_linea_tiempo, dia_absoluto")
      .eq("libro_id", libroId)
      .eq("visibilidad", "publico")
      .not("titulo_capitulo", "like", "[Ruta]%")
      .order("orden", { ascending: true });
    if (!data) return [];
    _capsMemCache[libroId] = { data, ts: Date.now() };
    await persist("capitulos", data);
    onUpdate?.(data);
    return data;
  } catch { return []; }
}

// ─── Capítulo próximo (siempre Supabase, tiempo-sensitivo) ───────────────────

export async function loadCapituloProximo(
  libroId: string,
): Promise<{ titulo_capitulo: string; fecha_publicacion: string } | null> {
  try {
    const { data } = await supabase
      .from("capitulos")
      .select("titulo_capitulo, fecha_publicacion")
      .eq("libro_id", libroId)
      .eq("visibilidad", "programado")
      .gt("fecha_publicacion", new Date().toISOString())
      .order("fecha_publicacion", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch { return null; }
}

// ─── Libros ───────────────────────────────────────────────────────────────────

export async function loadLibros(onUpdate?: (data: any[]) => void): Promise<any[]> {
  return loadWithCache({
    cacheKey: "libros:all",
    dexieSource: () => dexieAll(db?.libros),
    supabaseFetch: async () => {
      const { data } = await supabase
        .from("libros")
        .select("id, titulo, sinopsis, portada_url, categoria")
        .eq("visibilidad", "publico");
      return data ?? null;
    },
    persist: (rows) => persist("libros", rows),
  }, onUpdate);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

export function toMap<T extends { id: string }>(arr: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of arr) map[item.id] = item;
  return map;
}

export function collectIds(caps: any[], field: string): string[] {
  const set = new Set<string>();
  for (const c of caps) {
    const val = c[field];
    if (Array.isArray(val)) val.forEach((id: string) => set.add(id));
    else if (val) set.add(val);
  }
  return [...set];
}