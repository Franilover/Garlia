import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import {
  TAB_CONFIG,
  type TabKey,
  type MundoSectionKey,
  type Personaje,
  type ReinoDetalle,
  type CriaturaVariante,
  type CapituloNarrado,
} from "./types";

// ─── Helpers Dexie ────────────────────────────────────────────────────────────

async function dexieRead<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const table = (db as any)[tabla];
    if (!table) return [];
    const rows = (await table.toArray()) as any[];
    return rows.filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}

async function dexieWrite(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db || rows.length === 0) return;
    const table = (db as any)[tabla];
    if (!table) return;
    await table.bulkPut(rows);
  } catch (e) {
    console.warn(`[Dexie hooks] bulkPut failed on '${tabla}':`, e);
  }
}

// ─── useEntidades ─────────────────────────────────────────────────────────────

export function useEntidades<T extends { id: string; nombre: string }>(tab: TabKey) {
  const [items,     setItems]     = useState<T[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    if (tab === "mundo") { setLoading(false); return; }

    const config = TAB_CONFIG[tab as Exclude<TabKey, "mundo">];
    const tabla  = config.tabla;

    // 1. Mostrar datos locales de inmediato
    const local = await dexieRead<T>(tabla);
    if (local.length > 0) {
      setItems(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Si offline, quedarse con local
    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }

    setIsOffline(false);

    try {
      const { data, error } = await supabase
        .from(tabla)
        .select("*")
        .order("nombre");
      if (error) throw error;
      const result = (data ?? []) as T[];
      setItems(result);
      dexieWrite(tabla, result);   // ← persiste en Dexie
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
    const handleOnline = () => { setIsOffline(false); load(); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [load]);

  return { items, setItems, loading, isOffline, refetch: load };
}

// ─── useUniqueValues ──────────────────────────────────────────────────────────
// Valores únicos de una columna. Se cachean en session_cache de Dexie.

const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export function useUniqueValues(tabla: string, columna: string) {
  const [valores, setValores] = useState<string[]>([]);
  const cacheKey = `unique:${tabla}:${columna}`;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Leer caché local primero
      try {
        if (db) {
          const cached = await (db as any).session_cache?.get(cacheKey);
          if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
            if (!cancelled) setValores(cached.value as string[]);
            // Si no hay conexión, quedarse con el caché
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      if (!navigator.onLine) return;

      try {
        const { data } = await supabase
          .from(tabla)
          .select(columna)
          .not(columna, "is", null);
        if (!data || cancelled) return;
        const unique = [
          ...new Set(
            data
              .map((r: any) => r[columna])
              .filter(Boolean)
              .map((v: string) => v.trim())
          ),
        ].sort() as string[];
        setValores(unique);
        // Guardar en session_cache
        try {
          if (db) {
            await (db as any).session_cache?.put({
              key: cacheKey,
              value: unique,
              updated_at: Date.now(),
            });
          }
        } catch {}
      } catch {}
    };

    run();
    return () => { cancelled = true; };
  }, [tabla, columna, cacheKey]);

  return valores;
}

// ─── useNombresDeTabla ────────────────────────────────────────────────────────
// Lee la columna `nombre` de una tabla entera. Cachea en Dexie si la tabla
// está disponible, y en session_cache si no.

export function useNombresDeTabla(tabla: string) {
  const [nombres, setNombres] = useState<string[]>([]);
  const cacheKey = `nombres:${tabla}`;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 1. Intentar leer de la tabla Dexie directa (si existe)
      const local = await dexieRead<{ nombre: string }>(tabla);
      if (local.length > 0 && !cancelled) {
        setNombres(
          [...new Set(local.map(r => r.nombre).filter(Boolean))].sort()
        );
        if (!navigator.onLine) return;
      }

      // 2. Fallback: session_cache
      if (local.length === 0) {
        try {
          if (db) {
            const cached = await (db as any).session_cache?.get(cacheKey);
            if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
              if (!cancelled) setNombres(cached.value as string[]);
              if (!navigator.onLine) return;
            }
          }
        } catch {}
      }

      if (!navigator.onLine) return;

      // 3. Fetch remoto
      try {
        const { data } = await supabase
          .from(tabla)
          .select("nombre")
          .not("nombre", "is", null)
          .order("nombre");
        if (!data || cancelled) return;
        const result = data.map((r: any) => r.nombre as string).filter(Boolean);
        setNombres(result);
        // Persistir en Dexie si la tabla existe
        if (db && (db as any)[tabla]) {
          // Ya lo habrá guardado useEntidades; no duplicar
        } else {
          // Guardar en session_cache como fallback
          try {
            if (db) {
              await (db as any).session_cache?.put({
                key: cacheKey,
                value: result,
                updated_at: Date.now(),
              });
            }
          } catch {}
        }
      } catch {}
    };

    run();
    return () => { cancelled = true; };
  }, [tabla, cacheKey]);

  return nombres;
}

// ─── useCapitulosNarrados ─────────────────────────────────────────────────────

export function useCapitulosNarrados(personajeId: string | null) {
  const [caps,    setCaps]    = useState<CapituloNarrado[]>([]);
  const [loading, setLoading] = useState(false);
  const cacheKey = `caps_narrados:${personajeId}`;

  useEffect(() => {
    if (!personajeId) { setCaps([]); return; }
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      // Cache local rápido
      try {
        if (db) {
          const cached = await (db as any).session_cache?.get(cacheKey);
          if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
            if (!cancelled) { setCaps(cached.value); setLoading(false); }
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      if (!navigator.onLine) { setLoading(false); return; }

      try {
        const { data } = await supabase
          .from("capitulos")
          .select("id, titulo_capitulo, orden, libro_id, libros(titulo)")
          .eq("narrador_id", personajeId)
          .order("orden");
        if (cancelled) return;
        const result = (data ?? []).map((c: any) => ({
          id:              c.id,
          titulo_capitulo: c.titulo_capitulo,
          orden:           c.orden,
          libro_id:        c.libro_id,
          libro_titulo:    c.libros?.titulo ?? "",
        }));
        setCaps(result);
        try {
          if (db) {
            await (db as any).session_cache?.put({
              key: cacheKey,
              value: result,
              updated_at: Date.now(),
            });
          }
        } catch {}
      } catch {}

      if (!cancelled) setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [personajeId, cacheKey]);

  return { caps, loading };
}

// ─── useReinoDetalles ─────────────────────────────────────────────────────────

export function useReinoDetalles(reinoId: string | null) {
  const [detalles, setDetalles] = useState<ReinoDetalle[]>([]);
  const [loading,  setLoading]  = useState(false);
  const cacheKey = `reino_detalles:${reinoId}`;

  const load = useCallback(async (id: string) => {
    setLoading(true);

    // Cache
    try {
      if (db) {
        const cached = await (db as any).session_cache?.get(cacheKey);
        if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
          setDetalles(cached.value);
          setLoading(false);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) { setLoading(false); return; }

    const { data } = await supabase
      .from("reino_detalles")
      .select("*")
      .eq("reino_id", id)
      .order("nombre");
    const result = data || [];
    setDetalles(result);
    setLoading(false);

    try {
      if (db) {
        await (db as any).session_cache?.put({
          key: cacheKey,
          value: result,
          updated_at: Date.now(),
        });
      }
    } catch {}
  }, [cacheKey]);

  useEffect(() => {
    if (reinoId) load(reinoId);
    else setDetalles([]);
  }, [reinoId, load]);

  return { detalles, setDetalles, loading };
}

// ─── useCriaturaVariantes ─────────────────────────────────────────────────────

export function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<CriaturaVariante[]>([]);
  const [loading,   setLoading]   = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);

    // 1. Leer de Dexie (criatura_variantes sí está en DEXIE_TABLES)
    try {
      if (db) {
        const local = await (db as any).criatura_variantes
          ?.where("criatura_id")
          .equals(id)
          .toArray();
        if (local?.length) {
          setVariantes(local);
          setLoading(false);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) { setLoading(false); return; }

    const { data } = await supabase
      .from("criatura_variantes")
      .select("*")
      .eq("criatura_id", id)
      .order("tipo");
    const result = data || [];
    setVariantes(result);
    setLoading(false);

    // Persistir en Dexie
    try {
      if (db && result.length > 0) {
        await (db as any).criatura_variantes?.bulkPut(result);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (criaturaId) load(criaturaId);
    else setVariantes([]);
  }, [criaturaId, load]);

  return { variantes, setVariantes, loading };
}

// ─── usePersonajesDelReino ────────────────────────────────────────────────────

export function usePersonajesDelReino(reinoNombre: string | null | undefined) {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading,    setLoading]    = useState(false);
  const cacheKey = `personajes_reino:${reinoNombre}`;

  useEffect(() => {
    if (!reinoNombre) { setPersonajes([]); return; }
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      // Cache local
      try {
        if (db) {
          const cached = await (db as any).session_cache?.get(cacheKey);
          if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
            if (!cancelled) { setPersonajes(cached.value); setLoading(false); }
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      // Intentar desde Dexie directo (personajes ya está en Dexie)
      try {
        if (db) {
          const all = await (db as any).personajes?.toArray() as Personaje[] | undefined;
          if (all?.length) {
            const q = reinoNombre.toLowerCase();
            const local = all.filter(p => p.reino?.toLowerCase().includes(q));
            if (local.length && !cancelled) {
              setPersonajes(local);
              setLoading(false);
              if (!navigator.onLine) return;
            }
          }
        }
      } catch {}

      if (!navigator.onLine) { setLoading(false); return; }

      const { data } = await supabase
        .from("personajes")
        .select("id, nombre, img_url, img_cuerpo_url, especie, reino, sobre")
        .ilike("reino", `%${reinoNombre}%`)
        .order("nombre");
      if (cancelled) return;
      const result = data || [];
      setPersonajes(result);
      setLoading(false);

      try {
        if (db) {
          await (db as any).session_cache?.put({
            key: cacheKey,
            value: result,
            updated_at: Date.now(),
          });
        }
      } catch {}
    };

    run();
    return () => { cancelled = true; };
  }, [reinoNombre, cacheKey]);

  return { personajes, setPersonajes, loading };
}

// ─── usePersonajesDeEspecie ───────────────────────────────────────────────────

export function usePersonajesDeEspecie(especieNombre: string | null | undefined) {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading,    setLoading]    = useState(false);
  const cacheKey = `personajes_especie:${especieNombre}`;

  useEffect(() => {
    if (!especieNombre?.trim()) { setPersonajes([]); return; }
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      // Cache
      try {
        if (db) {
          const cached = await (db as any).session_cache?.get(cacheKey);
          if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
            if (!cancelled) { setPersonajes(cached.value); setLoading(false); }
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      // Dexie directo
      try {
        if (db) {
          const all = await (db as any).personajes?.toArray() as Personaje[] | undefined;
          if (all?.length) {
            const q = especieNombre.toLowerCase().trim();
            const local = all.filter(p => p.especie?.toLowerCase().includes(q));
            if (local.length && !cancelled) {
              setPersonajes(local);
              setLoading(false);
              if (!navigator.onLine) return;
            }
          }
        }
      } catch {}

      if (!navigator.onLine) { setLoading(false); return; }

      const { data } = await supabase
        .from("personajes")
        .select("id, nombre, img_url, img_cuerpo_url, especie, reino, sobre")
        .ilike("especie", `%${especieNombre}%`)
        .order("nombre");
      if (cancelled) return;
      const result = data || [];
      setPersonajes(result);
      setLoading(false);

      try {
        if (db) {
          await (db as any).session_cache?.put({
            key: cacheKey,
            value: result,
            updated_at: Date.now(),
          });
        }
      } catch {}
    };

    run();
    return () => { cancelled = true; };
  }, [especieNombre, cacheKey]);

  return { personajes, setPersonajes, loading };
}

// ─── useMundoSecciones ────────────────────────────────────────────────────────

export function useMundoSecciones() {
  const [textos,  setTextos]  = useState<Record<MundoSectionKey, string>>({
    magia: "", geografia: "", historia: "",
  });
  const [loading, setLoading] = useState(true);
  const cacheKey = "mundo_secciones";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Cache
      try {
        if (db) {
          const cached = await (db as any).session_cache?.get(cacheKey);
          if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
            if (!cancelled) { setTextos(cached.value); setLoading(false); }
            if (!navigator.onLine) return;
          }
        }
      } catch {}

      if (!navigator.onLine) { setLoading(false); return; }

      const { data } = await supabase
        .from("mundo_secciones")
        .select("key, contenido");
      if (!data || cancelled) return;

      const result = { magia: "", geografia: "", historia: "" } as Record<MundoSectionKey, string>;
      data.forEach((r: any) => { result[r.key as MundoSectionKey] = r.contenido ?? ""; });
      setTextos(result);
      setLoading(false);

      try {
        if (db) {
          await (db as any).session_cache?.put({
            key: cacheKey,
            value: result,
            updated_at: Date.now(),
          });
        }
      } catch {}
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const save = async (section: MundoSectionKey, value: string) => {
    await supabase
      .from("mundo_secciones")
      .update({ contenido: value, updated_at: new Date().toISOString() })
      .eq("key", section);

    // Invalidar caché tras guardar
    try {
      if (db) {
        const cached = await (db as any).session_cache?.get(cacheKey);
        if (cached) {
          await (db as any).session_cache?.put({
            key: cacheKey,
            value: { ...cached.value, [section]: value },
            updated_at: Date.now(),
          });
        }
      }
    } catch {}
  };

  return { textos, setTextos, loading, save };
}