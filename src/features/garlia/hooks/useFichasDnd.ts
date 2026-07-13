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

export interface FichaDnd {
  id: string;
  perfil_id: string;
  nombre: string;
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
  created_at: string;
  updated_at: string;
}

export interface ItemInventarioFicha {
  id: string;
  ficha_id: string;
  nombre: string;
  cantidad: number;
  descripcion: string | null;
  equipado: boolean;
}

export type NuevaFicha = Pick<FichaDnd, "nombre"> & Partial<Omit<FichaDnd, "id" | "perfil_id" | "created_at" | "updated_at" | "activa" | "nombre">>;

export function statMod(score: number): number {
  return Math.floor((score - 10) / 2);
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
    if (!error && data) setFichas(data as FichaDnd[]);
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
        .insert({ ...datos, perfil_id: perfilId })
        .select()
        .single();
      if (error) throw error;
      return data as FichaDnd;
    },
    [perfilId],
  );

  const actualizar = useCallback(async (id: string, cambios: Partial<FichaDnd>) => {
    const { error } = await supabase.from("fichas_dnd").update(cambios).eq("id", id);
    if (error) throw error;
  }, []);

  const eliminar = useCallback(async (id: string) => {
    const { error } = await supabase.from("fichas_dnd").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const elegirActiva = useCallback(async (id: string) => {
    const { error } = await supabase.from("fichas_dnd").update({ activa: true }).eq("id", id);
    if (error) throw error;
  }, []);

  const activa = fichas.find((f) => f.activa) ?? null;

  return { fichas, activa, loading, crear, actualizar, eliminar, elegirActiva, refetch: fetchAll };
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
    if (!error && data) setItems(data as ItemInventarioFicha[]);
    setLoading(false);
  }, [fichaId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const agregar = useCallback(
    async (nombre: string, cantidad = 1, descripcion?: string) => {
      if (!fichaId) return;
      const { error } = await supabase
        .from("fichas_dnd_inventario")
        .insert({ ficha_id: fichaId, nombre, cantidad, descripcion: descripcion || null });
      if (error) throw error;
      fetchAll();
    },
    [fichaId, fetchAll],
  );

  const quitar = useCallback(
    async (itemId: string) => {
      const { error } = await supabase.from("fichas_dnd_inventario").delete().eq("id", itemId);
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
