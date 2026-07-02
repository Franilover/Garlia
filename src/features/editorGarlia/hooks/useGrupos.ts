/**
 * useGrupos.ts
 * ──────────────
 * Catálogo y fetching de grupos del mundo, extraído de EditorGrupo.tsx
 * (donde vivía mezclado con la UI). Incluye:
 *
 *   GrupoTipo, Grupo, EntidadMin  → tipos del dominio
 *   GRUPO_TIPO_CONFIG             → config estática por tipo (íconos, colores,
 *                                    tabla, sugerencias) — la usan tanto
 *                                    components/Grupos/* como views/EditorGrupo
 *   useEntidades                  → catálogo de entidades de una tabla dada
 *                                    (usado por SelectorMiembros)
 *   useGrupos                     → CRUD de grupos_mundo con Supabase + Dexie
 *
 * Ruta destino:
 *   src/features/editorGarlia/hooks/useGrupos.ts
 */

import {
  Users,
  Bug,
  Package,
  Sparkles,
  Star,
  ScrollText,
  Map,
  Layers,
  UserCircle2,
  Swords,
  Wand2,
  Gem,
  Feather,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import React from "react";

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
export async function dexiePut(tabla: string, row: any): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.put(row);
  } catch {}
}
export async function dexieDel(tabla: string, id: string): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.delete(id);
  } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch {
    return [];
  }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
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
  } catch {}
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type GrupoTipo =
  | "personajes"
  | "criaturas"
  | "items"
  | "reinos"
  | "hechizos"
  | "dones"
  | "runas"
  | "libros";

export type Grupo = {
  id: string;
  nombre: string;
  tipo: GrupoTipo;
  subtipo?: string | null;
  descripcion?: string | null;
  miembro_ids: string[];
  created_at?: string;
};

export type EntidadMin = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
  img_url?: string | null;
  especie?: string;
  reino?: string;
  habitat?: string;
  categoria?: string;
};

// ─── Config de tipos de grupo ─────────────────────────────────────────────────
export const GRUPO_TIPO_CONFIG: Record<
  GrupoTipo,
  {
    label: string;
    labelPlural: string;
    Icon: React.ElementType;
    IconAlt: React.ElementType;
    color: string;
    tabla: string;
    ejemplo: string;
    sugerenciasDefault: string[];
  }
> = {
  personajes: {
    label: "Personaje",
    labelPlural: "Personajes",
    Icon: Users,
    IconAlt: UserCircle2,
    color: "var(--primary)",
    tabla: "personajes",
    ejemplo: "Familia, partido político, gremio…",
    sugerenciasDefault: [
      "Familia",
      "Partido político",
      "Agrupación",
      "Secta",
      "Gremio",
      "Clan",
      "Facción",
      "Orden",
      "Hermandad",
      "Tribu",
    ],
  },
  criaturas: {
    label: "Criatura",
    labelPlural: "Criaturas",
    Icon: Bug,
    IconAlt: Feather,
    color: "color-mix(in srgb, var(--primary) 70%, #4ade80)",
    tabla: "criaturas",
    ejemplo: "Manada, especie, bandada…",
    sugerenciasDefault: [
      "Manada",
      "Especie",
      "Bandada",
      "Colonia",
      "Horda",
      "Enjambre",
      "Orden",
      "Estirpe",
      "Clan",
      "Nidada",
    ],
  },
  items: {
    label: "Objeto",
    labelPlural: "Objetos",
    Icon: Package,
    IconAlt: Swords,
    color: "color-mix(in srgb, var(--primary) 60%, #f59e0b)",
    tabla: "items",
    ejemplo: "Arsenal, colección, reliquias…",
    sugerenciasDefault: [
      "Arsenal",
      "Colección",
      "Reliquias",
      "Juego de piezas",
      "Equipamiento",
      "Tesoro",
      "Set legendario",
      "Artefactos",
    ],
  },
  reinos: {
    label: "Reino",
    labelPlural: "Reinos",
    Icon: Map,
    IconAlt: Map,
    color: "color-mix(in srgb, var(--primary) 60%, #60a5fa)",
    tabla: "reinos",
    ejemplo: "Alianza, confederación, imperio…",
    sugerenciasDefault: [
      "Alianza",
      "Confederación",
      "Imperio",
      "Liga",
      "Pacto",
      "Unión",
      "Federación",
      "Coalición",
    ],
  },
  hechizos: {
    label: "Hechizo",
    labelPlural: "Hechizos",
    Icon: Sparkles,
    IconAlt: Wand2,
    color: "var(--accent)",
    tabla: "hechizos",
    ejemplo: "Escuela, elemento, estilo…",
    sugerenciasDefault: [
      "Escuela",
      "Elemento",
      "Estilo",
      "Tradición",
      "Arte arcano",
      "Linaje mágico",
      "Especialidad",
      "Corriente",
    ],
  },
  dones: {
    label: "Don",
    labelPlural: "Dones",
    Icon: Star,
    IconAlt: Gem,
    color: "color-mix(in srgb, var(--accent) 70%, var(--primary))",
    tabla: "dones",
    ejemplo: "Linaje, maldición, don ancestral…",
    sugerenciasDefault: [
      "Linaje",
      "Maldición",
      "Don ancestral",
      "Bendición",
      "Legado",
      "Herencia divina",
      "Pacto",
      "Señal",
    ],
  },
  runas: {
    label: "Runa",
    labelPlural: "Runas",
    Icon: ScrollText,
    IconAlt: ScrollText,
    color: "var(--primary)",
    tabla: "runas",
    ejemplo: "Conjunto rúnico, tradición…",
    sugerenciasDefault: [
      "Conjunto rúnico",
      "Tradición",
      "Sistema",
      "Alfabeto",
      "Escuela rúnica",
      "Legado",
      "Ciclo",
    ],
  },
  libros: {
    label: "Libro",
    labelPlural: "Libros",
    Icon: ScrollText,
    IconAlt: Feather,
    color: "color-mix(in srgb, var(--primary) 60%, #a78bfa)",
    tabla: "libros",
    ejemplo: "Novela, poemario, antología…",
    sugerenciasDefault: [
      "Novela",
      "Poemario",
      "Antología",
      "Cuento",
      "Relato",
      "Saga",
      "Serie",
      "Extra",
      "Spin-off",
      "Precuela",
    ],
  },
};

// ─── Hook: cargar entidades de una tabla ──────────────────────────────────────
export function useEntidades(tabla: string) {
  const [entidades, setEntidades] = useState<EntidadMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tabla) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      let local = await dexieReadAll<EntidadMin>(tabla);
      // libros usa "titulo" en DB — normalizar si el caché tiene el campo crudo
      if (tabla === "libros") {
        local = local.map((r: any) =>
          r.nombre ? r : { ...r, nombre: r.titulo ?? "" },
        );
      }
      if (local.length && !cancelled) {
        setEntidades(local);
        setLoading(false);
      }
      if (!navigator.onLine) {
        if (!local.length) setLoading(false);
        return;
      }

      let result: EntidadMin[] = [];
      if (tabla === "personajes") {
        const { data } = await supabase
          .from("personajes")
          .select("id, nombre, img_url, especie, reino")
          .order("nombre");
        result = (data ?? []).map((r) => ({
          id: r.id,
          nombre: r.nombre,
          img_url: r.img_url ?? undefined,
          especie: r.especie ?? undefined,
          reino: r.reino ?? undefined,
        }));
      } else if (tabla === "criaturas") {
        const { data } = await supabase
          .from("criaturas")
          .select("id, nombre, imagen_url, habitat")
          .order("nombre");
        result = (data ?? []).map((r) => ({
          id: r.id,
          nombre: r.nombre,
          imagen_url: r.imagen_url ?? undefined,
          habitat: r.habitat ?? undefined,
        }));
      } else if (tabla === "items") {
        const { data } = await supabase
          .from("items")
          .select("id, nombre, imagen_url, categoria")
          .order("nombre");
        result = (data ?? []).map((r) => ({
          id: r.id,
          nombre: r.nombre,
          imagen_url: r.imagen_url ?? undefined,
          categoria: r.categoria ?? undefined,
        }));
      } else if (tabla === "reinos") {
        const { data } = await supabase
          .from("reinos")
          .select("id, nombre")
          .order("nombre");
        result = (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre }));
      } else if (tabla === "libros") {
        const { data } = await supabase
          .from("libros")
          .select("id, titulo, portada_url, categoria")
          .order("titulo");
        result = (data ?? []).map((r: any) => ({
          id: r.id,
          nombre: r.titulo,
          imagen_url: r.portada_url ?? undefined,
          categoria: r.categoria ?? undefined,
        }));
      } else {
        const { data } = await (supabase.from(tabla as any) as any)
          .select("id, nombre, imagen_url")
          .order("nombre");
        result = (data ?? []).map((r: any) => ({
          id: r.id,
          nombre: r.nombre,
          imagen_url: r.imagen_url ?? undefined,
        }));
      }

      if (cancelled) return;
      setEntidades(result);
      setLoading(false);
      await dexieWriteAll(tabla, result);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tabla]);

  return { entidades, loading };
}

// ─── Hook: grupos con Supabase + Dexie ───────────────────────────────────────
export function useGrupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const local = await dexieReadAll<Grupo>("grupos_mundo");
    if (local.length) {
      setGrupos(local);
      setLoaded(true);
    }

    if (!navigator.onLine) {
      if (!local.length) setLoaded(true);
      return;
    }

    const { data, error } = await supabase
      .from("grupos_mundo")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (!local.length) setLoaded(true);
      return;
    }

    const result = (data ?? []).map((r: any) => ({
      ...r,
      miembro_ids: r.miembro_ids ?? [],
    })) as Grupo[];

    setGrupos(result);
    setLoaded(true);
    await dexieWriteAll("grupos_mundo", result);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const crearGrupo = useCallback(
    async (tipo: GrupoTipo): Promise<Grupo | null> => {
      const cfg = GRUPO_TIPO_CONFIG[tipo];
      const optimista: Grupo = {
        id: crypto.randomUUID(),
        nombre: `Nuevo ${cfg.label.toLowerCase()}`,
        tipo,
        subtipo: null,
        descripcion: null,
        miembro_ids: [],
        created_at: new Date().toISOString(),
      };

      setGrupos((prev) => [optimista, ...prev]);
      void dexiePut("grupos_mundo", optimista);

      const { data, error } = await supabase
        .from("grupos_mundo")
        .insert([
          {
            id: optimista.id,
            nombre: optimista.nombre,
            tipo,
            subtipo: null,
            descripcion: null,
            miembro_ids: [],
          },
        ])
        .select()
        .single();

      if (error || !data) return optimista;
      const real = { ...data, miembro_ids: data.miembro_ids ?? [] } as Grupo;
      setGrupos((prev) => prev.map((g) => (g.id === optimista.id ? real : g)));
      void dexiePut("grupos_mundo", real);
      return real;
    },
    [],
  );

  const actualizarGrupo = useCallback(async (updated: Grupo): Promise<void> => {
    setGrupos((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    void dexiePut("grupos_mundo", updated);

    await supabase
      .from("grupos_mundo")
      .update({
        nombre: updated.nombre,
        tipo: updated.tipo,
        subtipo: updated.subtipo ?? null,
        descripcion: updated.descripcion ?? null,
        miembro_ids: updated.miembro_ids,
      })
      .eq("id", updated.id);
  }, []);

  const eliminarGrupo = useCallback(async (id: string): Promise<void> => {
    setGrupos((prev) => prev.filter((g) => g.id !== id));
    void dexieDel("grupos_mundo", id);
    await supabase.from("grupos_mundo").delete().eq("id", id);
  }, []);

  return { grupos, loaded, crearGrupo, actualizarGrupo, eliminarGrupo };
}
