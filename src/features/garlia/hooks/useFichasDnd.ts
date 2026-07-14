"use client";

/**
 * useFichasDnd
 * ───────────────────────────────────────────────────────────────────────────
 * CRUD de las fichas de personaje D&D del usuario logueado ("sub-identidades"
 * de jugador, distintas de `personajes`, que es lore del mundo creado por
 * el DM). El usuario puede tener varias y marcar UNA como activa (la que
 * está usando ahora) — el trigger fichas_dnd_unica_activa en la base de
 * datos garantiza que solo una quede activa por perfil.
 */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/api/client/supabase";

export interface EspecieResumen {
  id: string;
  nombre: string;
  imagen_url: string | null;
}

export interface FichaDnd {
  id: string;
  perfil_id: string;
  nombre: string;
  especie_id: string | null;
  raza: string | null;
  clase: string | null;
  nivel: number;
  alineamiento: string | null;
  trasfondo: string | null;
  imagen_url: string | null;
  fuerza: number;
  destreza: number;
  constitucion: number;
  inteligencia: number;
  sabiduria: number;
  carisma: number;
  hp_max: number;
  hp_actual: number;
  ca: number;
  velocidad: number;
  notas: string | null;
  activa: boolean;
  /** Una vez true, nadie salvo admin puede tocar las stats de combate. */
  stats_confirmadas: boolean;
  /** Cuáles de las 6 salvaciones tienen competencia, ej. ["fuerza", "sabiduria"]. */
  salvaciones_competentes: string[];
  /** Estados/condiciones activas ahora mismo (envenenado, aturdido, etc). Las controla el DM. */
  condiciones: string[];
  /** XP y monedas viven por identidad desde la migración de misiones. */
  xp_total: number;
  monedas: number;
  created_at: string;
  updated_at: string;
  /** Resuelto en cliente a partir de especie_id, no viene de la tabla. */
  especie?: EspecieResumen | null;
}

export interface ItemResumen {
  id: string;
  nombre: string;
  imagen_url: string | null;
  descripcion: string | null;
}

export interface ItemInventarioFicha {
  id: string;
  ficha_id: string;
  item_id: string | null;
  cantidad: number;
  equipado: boolean;
  /** Resuelto en cliente a partir de item_id. */
  item?: ItemResumen | null;
}

export type NuevaFicha = Pick<FichaDnd, "nombre"> & Partial<Omit<FichaDnd, "id" | "perfil_id" | "created_at" | "updated_at" | "activa" | "nombre" | "especie">>;

export function statMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Bono de competencia estándar de D&D 5e según nivel: 1-4→+2, 5-8→+3, 9-12→+4, 13-16→+5, 17-20→+6. */
export function bonusCompetencia(nivel: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, nivel)) - 1) / 4);
}

async function resolverEspecies(fichas: FichaDnd[]): Promise<FichaDnd[]> {
  const ids = Array.from(new Set(fichas.map((f) => f.especie_id).filter(Boolean))) as string[];
  if (ids.length === 0) return fichas;
  const { data } = await supabase.from("criaturas").select("id, nombre, imagen_url").in("id", ids);
  const porId = new Map((data ?? []).map((c: any) => [c.id, c as EspecieResumen]));
  return fichas.map((f) => ({ ...f, especie: f.especie_id ? porId.get(f.especie_id) ?? null : null }));
}

export function useFichasDnd(perfilId: string | null) {
  const [fichas, setFichas] = useState<FichaDnd[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!perfilId) {
      setFichas([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("fichas_dnd")
      .select("*")
      .eq("perfil_id", perfilId)
      .order("updated_at", { ascending: false });
    if (!error && data) {
      const resueltas = await resolverEspecies(data as FichaDnd[]);
      setFichas(resueltas);
    }
    setLoading(false);
  }, [perfilId]);

  useEffect(() => {
    fetchAll();
    if (!perfilId) return;
    const channel = supabase
      .channel(`fichas-dnd-${perfilId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fichas_dnd", filter: `perfil_id=eq.${perfilId}` },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [perfilId, fetchAll]);

  const crear = useCallback(
    async (datos: NuevaFicha) => {
      if (!perfilId) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("fichas_dnd")
        // activa: true siempre — el trigger fichas_dnd_unica_activa se
        // encarga de desactivar cualquier otra ficha del mismo perfil, así
        // que la última creada queda como la que se usa. Evita fichas
        // "huérfanas" que nunca se seleccionaron como activas.
        .insert({ activa: true, ...datos, perfil_id: perfilId })
        .select()
        .single();
      if (error) throw error;
      const nueva = data as FichaDnd;
      // Optimista: la agrega al instante, no espera al roundtrip de realtime.
      setFichas((prev) => [nueva, ...prev]);
      return nueva;
    },
    [perfilId],
  );

  const actualizar = useCallback(
    async (id: string, cambios: Partial<FichaDnd>) => {
      // Optimista: refleja los cambios al instante en este componente y en
      // cualquier otro que use el mismo hook, sin esperar el roundtrip de
      // red ni la latencia (o ausencia) del canal realtime.
      setFichas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
      const { error } = await supabase.from("fichas_dnd").update(cambios).eq("id", id);
      if (error) {
        // Revierte al estado real si falló en el servidor.
        await fetchAll();
        throw error;
      }
    },
    [fetchAll],
  );

  const eliminar = useCallback(
    async (id: string) => {
      // Optimista: la saca de la lista al instante.
      setFichas((prev) => prev.filter((f) => f.id !== id));
      const { error } = await supabase.from("fichas_dnd").delete().eq("id", id);
      if (error) {
        await fetchAll();
        throw error;
      }
    },
    [fetchAll],
  );

  const elegirActiva = useCallback(async (id: string) => {
    // Optimista: refleja el cambio al instante en este componente y en
    // cualquier otro que use el mismo hook, sin esperar el roundtrip de
    // red ni la latencia del canal realtime.
    setFichas((prev) => prev.map((f) => ({ ...f, activa: f.id === id })));
    const { error } = await supabase.from("fichas_dnd").update({ activa: true }).eq("id", id);
    if (error) {
      // Revierte si falló en el servidor
      await fetchAll();
      throw error;
    }
  }, [fetchAll]);

  const activa = fichas.find((f) => f.activa) ?? null;

  return { fichas, activa, loading, crear, actualizar, eliminar, elegirActiva, refetch: fetchAll };
}

async function resolverItems(rows: ItemInventarioFicha[]): Promise<ItemInventarioFicha[]> {
  const ids = Array.from(new Set(rows.map((r) => r.item_id).filter(Boolean))) as string[];
  if (ids.length === 0) return rows;
  const { data } = await supabase
    .from("items")
    .select("id, nombre, imagen_url, descripcion")
    .in("id", ids);
  const porId = new Map((data ?? []).map((i: any) => [i.id, i as ItemResumen]));
  return rows.map((r) => ({ ...r, item: r.item_id ? porId.get(r.item_id) ?? null : null }));
}

export function useInventarioFicha(fichaId: string | null) {
  const [items, setItems] = useState<ItemInventarioFicha[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!fichaId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("fichas_dnd_inventario")
      .select("*")
      .eq("ficha_id", fichaId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      const resueltos = await resolverItems(data as ItemInventarioFicha[]);
      setItems(resueltos);
    }
    setLoading(false);
  }, [fichaId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const agregar = useCallback(
    async (itemId: string, cantidad = 1) => {
      if (!fichaId) return;
      const { error } = await supabase
        .from("fichas_dnd_inventario")
        .insert({ ficha_id: fichaId, item_id: itemId, cantidad });
      if (error) throw error;
      fetchAll();
    },
    [fichaId, fetchAll],
  );

  const quitar = useCallback(
    async (filaId: string) => {
      const { error } = await supabase.from("fichas_dnd_inventario").delete().eq("id", filaId);
      if (error) throw error;
      fetchAll();
    },
    [fetchAll],
  );

  const toggleEquipado = useCallback(
    async (item: ItemInventarioFicha) => {
      const { error } = await supabase
        .from("fichas_dnd_inventario")
        .update({ equipado: !item.equipado })
        .eq("id", item.id);
      if (error) throw error;
      fetchAll();
    },
    [fetchAll],
  );

  return { items, loading, agregar, quitar, toggleEquipado, refetch: fetchAll };
}

// ── Búsqueda para los selectores (especie / item) ──────────────────────

export async function buscarCriaturas(query: string): Promise<EspecieResumen[]> {
  const q = query.trim();
  let req = supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre").limit(40);
  if (q.length >= 1) req = req.ilike("nombre", `%${q}%`);
  const { data } = await req;
  return (data ?? []) as EspecieResumen[];
}

export async function buscarItems(query: string): Promise<ItemResumen[]> {
  const q = query.trim();
  let req = supabase
    .from("items")
    .select("id, nombre, imagen_url, descripcion")
    .order("nombre")
    .limit(40);
  if (q.length >= 1) req = req.ilike("nombre", `%${q}%`);
  const { data } = await req;
  return (data ?? []) as ItemResumen[];
}
