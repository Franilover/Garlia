"use client";

/**
 * useAventuras
 * ───────────────────────────────────────────────────────────────────────────
 * CRUD ligero para el sistema de "Aventuras" (aventuras + aventura_entidades).
 * No usa el motor offline-first (useSupabaseData/Dexie) a propósito: son
 * datos de sesión en vivo, pequeños, y no necesitan cola offline. Usa el
 * cliente de Supabase directo + un canal realtime propio por tabla.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/api/client/supabase";
import type { CriaturaStatsDnd } from "@/features/editorGarlia/hooks/types";

export interface Aventura {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  created_at: string;
  updated_at: string;
}

export type TablaEntidad =
  | "personajes"
  | "criaturas"
  | "items"
  | "reinos"
  | "ciudades"
  | "hechizos"
  | "dones"
  | "runas"
  | "fichas_dnd";

export const TABLA_LABEL: Record<TablaEntidad, { singular: string; plural: string }> = {
  personajes: { singular: "Personaje", plural: "Personajes" },
  criaturas: { singular: "Criatura", plural: "Criaturas" },
  items: { singular: "Objeto", plural: "Objetos" },
  reinos: { singular: "Reino", plural: "Reinos" },
  ciudades: { singular: "Ciudad", plural: "Ciudades" },
  hechizos: { singular: "Hechizo", plural: "Hechizos" },
  dones: { singular: "Don", plural: "Dones" },
  runas: { singular: "Runa", plural: "Runas" },
  fichas_dnd: { singular: "Ficha de Jugador", plural: "Fichas de Jugadores" },
};

export const TABLAS_ENTIDAD: TablaEntidad[] = [
  "personajes",
  "criaturas",
  "items",
  "reinos",
  "ciudades",
  "hechizos",
  "dones",
  "runas",
  "fichas_dnd",
];

export interface AventuraEntidadRow {
  id: string;
  aventura_id: string;
  tabla: TablaEntidad;
  entidad_id: string;
  publicado: boolean;
  publicado_at: string | null;
  created_at: string;
  pos_x: number | null;
  pos_y: number | null;
}

/** Fila resuelta: la relación + los datos legibles de la entidad original. */
export interface AventuraEntidad extends AventuraEntidadRow {
  nombre: string;
  imagen_url: string | null;
  descripcion: string | null;
  /** Solo presente cuando tabla === "criaturas": su ficha de combate D&D
   *  2024 (CA/HP/stats/acciones…) tal cual la cargó el DM en el editor.
   *  Null si la criatura todavía no tiene stat block. */
  stats_dnd?: CriaturaStatsDnd | null;
}

// ── Lista de aventuras (para el índice admin y el selector público) ────────

export function useAventurasList() {
  const [aventuras, setAventuras] = useState<Aventura[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("aventuras")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error && data) setAventuras(data as Aventura[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("aventuras-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "aventuras" }, () => {
        fetchAll();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const crear = useCallback(async (nombre: string, descripcion?: string) => {
    const { data, error } = await supabase
      .from("aventuras")
      .insert({ nombre, descripcion: descripcion || null })
      .select()
      .single();
    if (error) throw error;
    return data as Aventura;
  }, []);

  const renombrar = useCallback(async (id: string, nombre: string) => {
    const { error } = await supabase.from("aventuras").update({ nombre }).eq("id", id);
    if (error) throw error;
  }, []);

  const eliminar = useCallback(async (id: string) => {
    const { error } = await supabase.from("aventuras").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return { aventuras, loading, crear, renombrar, eliminar, refetch: fetchAll };
}

// ── Entidades de UNA aventura, resueltas contra sus tablas de origen ──────

const NOMBRE_COL = "nombre";

// Algunas tablas no usan "imagen_url" como nombre de columna; se mapea aquí
// para no romper el select ni perder la imagen (personajes usa img_url,
// reinos usa logo_url).
const COLUMNA_IMAGEN: Partial<Record<TablaEntidad, string>> = {
  personajes: "img_url",
  reinos: "logo_url",
};

async function resolverEntidades(
  rows: AventuraEntidadRow[],
): Promise<AventuraEntidad[]> {
  if (rows.length === 0) return [];

  const porTabla = new Map<TablaEntidad, string[]>();
  for (const r of rows) {
    const list = porTabla.get(r.tabla) ?? [];
    list.push(r.entidad_id);
    porTabla.set(r.tabla, list);
  }

  const datosPorTablaId = new Map<
    string,
    { nombre: string; imagen_url: string | null; descripcion: string | null; stats_dnd: CriaturaStatsDnd | null }
  >();

  // Para fichas_dnd necesitamos resolver especie_id -> nombre de la criatura
  const fichasRows = await Promise.all(
    Array.from(porTabla.entries()).map(async ([tabla, ids]) => {
      const { data } = await supabase.from(tabla).select("*").in("id", ids);
      return { tabla, data: data ?? [] };
    }),
  );

  const especieIds = Array.from(
    new Set(
      fichasRows
        .filter((r) => r.tabla === "fichas_dnd")
        .flatMap((r) => r.data.map((row: any) => row.especie_id))
        .filter(Boolean),
    ),
  ) as string[];

  const especiesPorId = new Map<string, string>();
  if (especieIds.length > 0) {
    const { data: especiesData } = await supabase
      .from("criaturas")
      .select("id, nombre")
      .in("id", especieIds);
    (especiesData ?? []).forEach((e: any) => especiesPorId.set(e.id, e.nombre));
  }

  fichasRows.forEach(({ tabla, data }) => {
    data.forEach((row: any) => {
      const descripcionBase =
        tabla === "fichas_dnd"
          ? [
              row.especie_id ? especiesPorId.get(row.especie_id) : null,
              row.clase,
              row.nivel ? `Nivel ${row.nivel}` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : row.descripcion ?? row.explicacion ?? null;
      datosPorTablaId.set(`${tabla}:${row.id}`, {
        nombre: row[NOMBRE_COL] ?? "Sin nombre",
        imagen_url: row[COLUMNA_IMAGEN[tabla as TablaEntidad] ?? "imagen_url"] ?? null,
        descripcion: descripcionBase,
        stats_dnd: tabla === "criaturas" ? row.stats_dnd ?? null : null,
      });
    });
  });

  return rows.map((r) => {
    const info = datosPorTablaId.get(`${r.tabla}:${r.entidad_id}`);
    return {
      ...r,
      nombre: info?.nombre ?? "(entidad eliminada)",
      imagen_url: info?.imagen_url ?? null,
      descripcion: info?.descripcion ?? null,
      stats_dnd: info?.stats_dnd ?? null,
    };
  });
}

export function useAventuraEntidades(aventuraId: string | null) {
  const [entidades, setEntidades] = useState<AventuraEntidad[]>([]);
  const [loading, setLoading] = useState(true);
  const aventuraIdRef = useRef(aventuraId);
  aventuraIdRef.current = aventuraId;

  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!aventuraIdRef.current) {
      setEntidades([]);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    const { data, error } = await supabase
      .from("aventura_entidades")
      .select("*")
      .eq("aventura_id", aventuraIdRef.current)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const resueltas = await resolverEntidades(data as AventuraEntidadRow[]);
      setEntidades(resueltas);
    }
    if (!opts?.silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    if (!aventuraId) return;
    const channel = supabase
      .channel(`aventura-entidades-${aventuraId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aventura_entidades", filter: `aventura_id=eq.${aventuraId}` },
        () => fetchAll({ silent: true }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [aventuraId, fetchAll]);

  // ── Realtime de los DATOS de cada entidad (no de la relación): si el DM
  // edita una criatura/personaje/ítem ya presente en este tablero — por
  // ejemplo, carga su ficha de combate D&D 2024 — el jugador lo ve
  // reflejado sin recargar la página. Se suscribe una vez por cada tabla
  // que realmente esté en uso en este tablero (no a las 9 tablas siempre),
  // y usa un ref con los ids vigentes para no tener que resuscribirse cada
  // vez que cambia el contenido de `entidades`. ──
  const entidadesRef = useRef(entidades);
  entidadesRef.current = entidades;
  const tablasEnUso = Array.from(new Set(entidades.map((e) => e.tabla))).sort().join(",");

  useEffect(() => {
    if (!aventuraId || !tablasEnUso) return;
    const tablas = tablasEnUso.split(",") as TablaEntidad[];
    const channels = tablas.map((tabla) =>
      supabase
        .channel(`aventura-datos-${aventuraId}-${tabla}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: tabla },
          (payload) => {
            const idCambiado = (payload.new as any)?.id ?? (payload.old as any)?.id;
            if (!idCambiado) return;
            const nosImporta = entidadesRef.current.some(
              (e) => e.tabla === tabla && e.entidad_id === idCambiado,
            );
            if (nosImporta) fetchAll({ silent: true });
          },
        )
        .subscribe(),
    );
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [aventuraId, tablasEnUso, fetchAll]);

  const agregar = useCallback(
    async (tabla: TablaEntidad, entidadId: string) => {
      if (!aventuraId) return;
      // Evita el POST (y el 409 ruidoso en consola) si ya sabemos que existe.
      const yaExiste = entidades.some((e) => e.tabla === tabla && e.entidad_id === entidadId);
      if (yaExiste) return;

      const { data, error } = await supabase
        .from("aventura_entidades")
        .insert({ aventura_id: aventuraId, tabla, entidad_id: entidadId })
        .select()
        .single();

      if (error) {
        // Conflicto de unicidad (carrera): la fila ya existe, no es un error real.
        if (error.code === "23505") return;
        throw error;
      }

      // Optimista: inserta la fila resuelta al instante, sin esperar el
      // realtime ni un refetch completo.
      if (data) {
        const [resuelta] = await resolverEntidades([data as AventuraEntidadRow]);
        if (resuelta) {
          setEntidades((prev) => [resuelta, ...prev]);
        }
      }
    },
    [aventuraId, entidades],
  );

  const quitar = useCallback(async (relacionId: string) => {
    // Optimista: la quita de la lista al instante; si falla, se restaura.
    const anterior = entidades;
    setEntidades((prev) => prev.filter((e) => e.id !== relacionId));
    const { error } = await supabase.from("aventura_entidades").delete().eq("id", relacionId);
    if (error) {
      setEntidades(anterior);
      throw error;
    }
  }, [entidades]);

  /** Mueve un item en el tablero libre (pizarrón). Optimista + persistido. */
  const moverPosicion = useCallback(async (relacionId: string, posX: number, posY: number) => {
    const anterior = entidades;
    setEntidades((prev) =>
      prev.map((e) => (e.id === relacionId ? { ...e, pos_x: posX, pos_y: posY } : e)),
    );
    const { error } = await supabase
      .from("aventura_entidades")
      .update({ pos_x: posX, pos_y: posY })
      .eq("id", relacionId);
    if (error) {
      setEntidades(anterior);
      throw error;
    }
  }, [entidades]);

  const togglePublicado = useCallback(async (relacion: AventuraEntidad) => {
    const nuevoValor = !relacion.publicado;
    const nuevoPublicadoAt = nuevoValor ? new Date().toISOString() : null;

    // Optimista: refleja el toggle al instante en la UI del DM.
    setEntidades((prev) =>
      prev.map((e) =>
        e.id === relacion.id ? { ...e, publicado: nuevoValor, publicado_at: nuevoPublicadoAt } : e,
      ),
    );

    const { error } = await supabase
      .from("aventura_entidades")
      .update({ publicado: nuevoValor, publicado_at: nuevoPublicadoAt })
      .eq("id", relacion.id);

    if (error) {
      // Revierte si falló en el servidor
      setEntidades((prev) =>
        prev.map((e) =>
          e.id === relacion.id
            ? { ...e, publicado: relacion.publicado, publicado_at: relacion.publicado_at }
            : e,
        ),
      );
      throw error;
    }
  }, []);

  return { entidades, loading, agregar, quitar, togglePublicado, moverPosicion, refetch: fetchAll };
}

// ── Búsqueda de entidades (todas las tablas) para agregar a una aventura ──

export interface ResultadoBusqueda {
  tabla: TablaEntidad;
  id: string;
  nombre: string;
  imagen_url: string | null;
}

export async function buscarEntidades(query: string): Promise<ResultadoBusqueda[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const resultados = await Promise.all(
    TABLAS_ENTIDAD.map(async (tabla) => {
      const { data, error } = await supabase
        .from(tabla)
        .select("*")
        .ilike("nombre", `%${q}%`)
        .limit(8);
      if (error) {
        // eslint-disable-next-line no-console
        console.error(`buscarEntidades: error en tabla "${tabla}"`, error);
        return [];
      }
      const colImagen = COLUMNA_IMAGEN[tabla] ?? "imagen_url";
      return (data ?? []).map((row: any) => ({
        tabla,
        id: row.id,
        nombre: row.nombre,
        imagen_url: row[colImagen] ?? null,
      }));
    }),
  );

  return resultados.flat();
}
