"use client";
import { useCallback, useEffect, useState } from "react";

export interface Categoria {
  id: string;
  nombre: string;
  icon: string;
  color: number;
  orden: number;
}

export interface Item {
  id: string;
  categoria_id: string;
  titulo: string;
  url?: string;
  nota?: string;
  hecho: boolean;
  orden: number;
  created_at: string;
}

async function getSupabase() {
  const { supabase } = await import("@/lib/api/client/supabase");
  return supabase;
}

const categoriasQueries = {
  async getAll(): Promise<Categoria[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("pendientes_categorias").select("*").order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async add(cat: Omit<Categoria, "id">): Promise<Categoria> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("pendientes_categorias").insert({ ...cat, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, datos: Partial<Omit<Categoria, "id">>): Promise<Categoria> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("pendientes_categorias").update(datos).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("pendientes_categorias").delete().eq("id", id);
    if (error) throw error;
  },
};

const itemsQueries = {
  async getAll(): Promise<Item[]> {
    const sb = await getSupabase();
    const { data, error } = await sb.from("pendientes_items").select("*").order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async add(item: Omit<Item, "id" | "created_at">): Promise<Item> {
    const sb = await getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { data, error } = await sb.from("pendientes_items").insert({ ...item, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },
  async toggleHecho(id: string, hecho: boolean): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("pendientes_items").update({ hecho }).eq("id", id);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const sb = await getSupabase();
    const { error } = await sb.from("pendientes_items").delete().eq("id", id);
    if (error) throw error;
  },
};

/** Carga y CRUD de categorías + items de pendientes (tablas `pendientes_categorias`, `pendientes_items`). */
export function usePendientes() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [items, setItems]           = useState<Item[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [guardandoCat, setGuardandoCat] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [cats, its] = await Promise.all([categoriasQueries.getAll(), itemsQueries.getAll()]);
      setCategorias(cats);
      setItems(its);
    } catch (err) {
      console.error("[usePendientes] cargar:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const crearCategoria = useCallback(async (datos: Omit<Categoria, "id">) => {
    setGuardandoCat(true);
    try {
      const nueva = await categoriasQueries.add(datos);
      setCategorias(prev => [...prev, nueva]);
      return true;
    } catch (err) {
      console.error("[usePendientes] guardar cat:", err);
      return false;
    } finally {
      setGuardandoCat(false);
    }
  }, []);

  const editarCategoria = useCallback(async (id: string, datos: Partial<Omit<Categoria, "id">>) => {
    try {
      const updated = await categoriasQueries.update(id, datos);
      setCategorias(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      console.error("[usePendientes] editar cat:", err);
      void cargar();
    }
  }, [cargar]);

  const eliminarCategoria = useCallback(async (id: string) => {
    setCategorias(prev => prev.filter(c => c.id !== id));
    setItems(prev => prev.filter(i => i.categoria_id !== id));
    try {
      await categoriasQueries.delete(id);
    } catch (err) {
      console.error("[usePendientes] eliminar cat:", err);
      void cargar();
    }
  }, [cargar]);

  const agregarItem = useCallback(async (datos: Omit<Item, "id" | "created_at">) => {
    try {
      const nuevo = await itemsQueries.add(datos);
      setItems(prev => [...prev, nuevo]);
    } catch (err) {
      console.error("[usePendientes] add item:", err);
    }
  }, []);

  const toggleItem = useCallback(async (id: string, hecho: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, hecho } : i));
    try {
      await itemsQueries.toggleHecho(id, hecho);
    } catch (err) {
      console.error("[usePendientes] toggle:", err);
      void cargar();
    }
  }, [cargar]);

  const eliminarItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await itemsQueries.delete(id);
    } catch (err) {
      console.error("[usePendientes] eliminar item:", err);
      void cargar();
    }
  }, [cargar]);

  return {
    categorias, items, cargando, guardandoCat,
    crearCategoria, editarCategoria, eliminarCategoria,
    agregarItem, toggleItem, eliminarItem,
  };
}
