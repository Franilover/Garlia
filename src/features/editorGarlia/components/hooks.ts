import { useState, useEffect, useCallback } from "react";

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

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
    if (!db) return;
    const table = (db as any)[tabla];
    if (!table) return;
    if (rows.length > 0) await table.bulkPut(rows);
    // Eliminar filas locales que ya no existen en remoto
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const allLocal: any[] = await table.toArray();
    const toDelete = allLocal.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await table.bulkDelete(toDelete);
  } catch (e) {
    console.warn(`[Dexie hooks] write failed on '${tabla}':`, e);
  }
}

async function dexieWriteOne(tabla: string, row: any): Promise<void> {
  try {
    if (!db) return;
    const table = (db as any)[tabla];
    if (!table) return;
    await table.put(row);
  } catch (e) {
    console.warn(`[Dexie hooks] put failed on '${tabla}':`, e);
  }
}

async function dexieDeleteOne(tabla: string, id: string): Promise<void> {
  try {
    if (!db) return;
    const table = (db as any)[tabla];
    if (!table) return;
    await table.delete(id);
  } catch (e) {
    console.warn(`[Dexie hooks] delete failed on '${tabla}':`, e);
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

    // 1. Mostrar datos locales de inmediato
    let teniaCacheLocal = false;
    try {
      if (db) {
        const local = await (db as any).criatura_variantes
          ?.where("criatura_id")
          .equals(id)
          .toArray();
        if (local?.length) {
          setVariantes(local);
          setLoading(false);
          teniaCacheLocal = true;
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) { setLoading(false); return; }

    // 2. Refrescar desde Supabase en background (sin bloquear si ya hay caché)
    try {
      const { data } = await supabase
        .from("criatura_variantes")
        .select("*")
        .eq("criatura_id", id)
        .order("tipo");
      const result = data || [];
      setVariantes(result);
      if (!teniaCacheLocal) setLoading(false);

      // Persistir en Dexie
      try {
        if (db && result.length > 0) {
          await (db as any).criatura_variantes?.bulkPut(result);
        }
      } catch {}
    } catch {
      if (!teniaCacheLocal) setLoading(false);
    } finally {
      setLoading(false);
    }
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

// ─── useGruposComoOpciones ────────────────────────────────────────────────────
// Devuelve los nombres de grupos de un tipo dado (ej: "criaturas") para usar
// como opciones adicionales en los SelectorTexto del EditorCriatura.

export type GrupoTipo = "personajes" | "criaturas" | "items" | "hechizos" | "dones" | "runas";

export function useGruposComoOpciones(tipo: GrupoTipo): string[] {
  const [nombres, setNombres] = useState<string[]>([]);
  const cacheKey = `grupos_nombres:${tipo}`;

  const refresh = useCallback(async () => {
    // 1. session_cache rápido
    try {
      if (db) {
        const cached = await (db as any).session_cache?.get(cacheKey);
        if (cached && Date.now() - cached.updated_at < SESSION_CACHE_TTL_MS) {
          setNombres(cached.value as string[]);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    // 2. Dexie directo si la tabla grupos_mundo existe
    try {
      if (db && (db as any).grupos_mundo) {
        const all = await (db as any).grupos_mundo.toArray() as any[];
        const local = all
          .filter((g: any) => !g.deleted && g.tipo === tipo)
          .map((g: any) => g.nombre as string)
          .filter(Boolean)
          .sort();
        if (local.length) {
          setNombres(local);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) return;

    // 3. Supabase
    try {
      const { data } = await supabase
        .from("grupos_mundo")
        .select("nombre")
        .eq("tipo", tipo)
        .order("nombre");
      if (!data) return;
      const result = data.map((r: any) => r.nombre as string).filter(Boolean);
      setNombres(result);
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
  }, [tipo, cacheKey]);

  useEffect(() => {
    let cancelled = false;
    refresh();
    return () => { cancelled = true; };
  }, [refresh]);

  return nombres;
}

// ─── useGruposDeCriatura ──────────────────────────────────────────────────────
// Dado el ID de una criatura, devuelve todos los grupos (tipo "criaturas")
// que la tienen como miembro, y permite añadirla/quitarla de un grupo por nombre.

export type GrupoMin = {
  id: string;
  nombre: string;
  tipo: GrupoTipo;
  subtipo?: string | null;
  miembro_ids: string[];
};

export function useGruposDeCriatura(criaturaId: string) {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [todosGrupos, setTodosGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!criaturaId) return;
    setLoading(true);

    if (!navigator.onLine) {
      try {
        if (db && (db as any).grupos_mundo) {
          const all = await (db as any).grupos_mundo.toArray() as GrupoMin[];
          const deCriaturas = all.filter(g => g.tipo === "criaturas");
          setTodosGrupos(deCriaturas);
          setGrupos(deCriaturas.filter(g => (g.miembro_ids ?? []).includes(criaturaId)));
        }
      } catch {}
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("grupos_mundo")
        .select("id, nombre, tipo, subtipo, miembro_ids")
        .eq("tipo", "criaturas")
        .order("nombre");
      const todos = (data ?? []) as GrupoMin[];
      setTodosGrupos(todos);
      setGrupos(todos.filter(g => (g.miembro_ids ?? []).includes(criaturaId)));
    } catch {}
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => { load(); }, [load]);

  // Añadir la criatura a un grupo por ID de grupo
  const addToGrupo = useCallback(async (grupoId: string) => {
    const grupo = todosGrupos.find(g => g.id === grupoId);
    if (!grupo) return;
    if ((grupo.miembro_ids ?? []).includes(criaturaId)) return;

    const nuevosIds = [...(grupo.miembro_ids ?? []), criaturaId];

    // Optimista
    const actualizado = { ...grupo, miembro_ids: nuevosIds };
    setGrupos(prev => [...prev, actualizado]);
    setTodosGrupos(prev => prev.map(g => g.id === grupoId ? actualizado : g));

    await supabase
      .from("grupos_mundo")
      .update({ miembro_ids: nuevosIds })
      .eq("id", grupoId);

    try {
      if (db) await (db as any).grupos_mundo?.put(actualizado);
    } catch {}
  }, [criaturaId, todosGrupos]);

  // Quitar la criatura de un grupo
  const removeFromGrupo = useCallback(async (grupoId: string) => {
    const grupo = todosGrupos.find(g => g.id === grupoId);
    if (!grupo) return;

    const nuevosIds = (grupo.miembro_ids ?? []).filter(id => id !== criaturaId);

    // Optimista
    const actualizado = { ...grupo, miembro_ids: nuevosIds };
    setGrupos(prev => prev.filter(g => g.id !== grupoId));
    setTodosGrupos(prev => prev.map(g => g.id === grupoId ? actualizado : g));

    await supabase
      .from("grupos_mundo")
      .update({ miembro_ids: nuevosIds })
      .eq("id", grupoId);

    try {
      if (db) await (db as any).grupos_mundo?.put(actualizado);
    } catch {}
  }, [criaturaId, todosGrupos]);

  return { grupos, todosGrupos, loading, addToGrupo, removeFromGrupo, reload: load };
}
// ─── useReinos ────────────────────────────────────────────────────────────────
// Trae TODOS los reinos (sin filtrar por oculto) para uso interno del editor.

export function useReinos() {
  const [reinos,  setReinos]  = useState<{ id: string; nombre: string; oculto?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // 1. Caché local Dexie primero
      const local = await dexieRead<{ id: string; nombre: string; oculto?: boolean }>("reinos");
      if (local.length && !cancelled) { setReinos(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length) setLoading(false); return; }

      // 2. Fetch remoto — SIN filtrar por oculto para ver todos los reinos
      try {
        const { data } = await supabase
          .from("reinos")
          .select("id, nombre, oculto")
          .order("nombre");
        if (!data || cancelled) return;
        setReinos(data);
        setLoading(false);
      } catch { if (!cancelled) setLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return { reinos, loading };
}