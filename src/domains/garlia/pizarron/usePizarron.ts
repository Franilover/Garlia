"use client";
/**
 * usePizarron
 * ─────────────────────────────────────────────────────────────────────────
 * Hook de datos del pizarrón creativo. Maneja lienzos, nodos y aristas
 * directamente contra Supabase, con guardado optimista.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import type {
  PizarronArista,
  PizarronLienzo,
  PizarronNodo,
  TipoEntidadPizarron,
} from "./types";

// ── Lienzos ───────────────────────────────────────────────────────────────

export function useLienzos() {
  const [lienzos, setLienzos] = useState<PizarronLienzo[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pizarron_lienzos")
      .select("*")
      .order("updated_at", { ascending: false });
    setLienzos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crearLienzo = useCallback(async (nombre = "Nuevo lienzo") => {
    const { data, error } = await supabase
      .from("pizarron_lienzos")
      .insert({ nombre })
      .select()
      .single();
    if (!error && data) {
      setLienzos((prev) => [data, ...prev]);
      return data as PizarronLienzo;
    }
    return null;
  }, []);

  const renombrarLienzo = useCallback(async (id: string, nombre: string) => {
    await supabase.from("pizarron_lienzos").update({ nombre }).eq("id", id);
    setLienzos((prev) => prev.map((l) => (l.id === id ? { ...l, nombre } : l)));
  }, []);

  const eliminarLienzo = useCallback(async (id: string) => {
    await supabase.from("pizarron_lienzos").delete().eq("id", id);
    setLienzos((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { lienzos, loading, crearLienzo, renombrarLienzo, eliminarLienzo, recargar: cargar };
}

// ── Canvas de un lienzo ───────────────────────────────────────────────────

export function useLienzoCanvas(lienzoId: string | null) {
  const [nodos, setNodos] = useState<PizarronNodo[]>([]);
  const [aristas, setAristas] = useState<PizarronArista[]>([]);
  const [loading, setLoading] = useState(false);
  // Debounce timer para guardar posiciones
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lienzoId) { setNodos([]); setAristas([]); return; }
    setLoading(true);
    Promise.all([
      supabase.from("pizarron_nodos").select("*").eq("lienzo_id", lienzoId),
      supabase.from("pizarron_aristas").select("*").eq("lienzo_id", lienzoId),
    ]).then(([{ data: n }, { data: a }]) => {
      setNodos(n ?? []);
      setAristas(a ?? []);
      setLoading(false);
    });
  }, [lienzoId]);

  // ── Nodos ──────────────────────────────────────────────────────────────

  const agregarNodo = useCallback(async (params: {
    tipo_entidad: TipoEntidadPizarron;
    entidad_id?: string | null;
    label?: string;
    x?: number;
    y?: number;
    color?: string;
    icono?: string;
  }) => {
    if (!lienzoId) return null;
    const nodoNew = {
      lienzo_id: lienzoId,
      tipo_entidad: params.tipo_entidad,
      entidad_id: params.entidad_id ?? null,
      label: params.label ?? null,
      x: params.x ?? 120 + Math.random() * 200,
      y: params.y ?? 120 + Math.random() * 200,
      width: params.tipo_entidad === "texto" ? 200 : 180,
      height: params.tipo_entidad === "texto" ? 80 : 60,
      color: params.color ?? null,
      icono: params.icono ?? null,
      datos_extra: null,
    };
    const { data, error } = await supabase
      .from("pizarron_nodos")
      .insert(nodoNew)
      .select()
      .single();
    if (!error && data) {
      setNodos((prev) => [...prev, data]);
      return data as PizarronNodo;
    }
    return null;
  }, [lienzoId]);

  // Mover nodo (local inmediato + debounce a DB)
  const moverNodo = useCallback((id: string, x: number, y: number) => {
    setNodos((prev) => prev.map((n) => n.id === id ? { ...n, x, y } : n));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from("pizarron_nodos").update({ x, y }).eq("id", id);
    }, 400);
  }, []);

  const redimensionarNodo = useCallback((id: string, width: number, height: number) => {
    setNodos((prev) => prev.map((n) => n.id === id ? { ...n, width, height } : n));
    supabase.from("pizarron_nodos").update({ width, height }).eq("id", id);
  }, []);

  const editarNodoLabel = useCallback(async (id: string, label: string) => {
    setNodos((prev) => prev.map((n) => n.id === id ? { ...n, label } : n));
    await supabase.from("pizarron_nodos").update({ label }).eq("id", id);
  }, []);

  const editarNodoColor = useCallback(async (id: string, color: string) => {
    setNodos((prev) => prev.map((n) => n.id === id ? { ...n, color } : n));
    await supabase.from("pizarron_nodos").update({ color }).eq("id", id);
  }, []);

  const eliminarNodo = useCallback(async (id: string) => {
    setNodos((prev) => prev.filter((n) => n.id !== id));
    setAristas((prev) => prev.filter((a) => a.origen_id !== id && a.destino_id !== id));
    await supabase.from("pizarron_nodos").delete().eq("id", id);
  }, []);

  // ── Aristas ────────────────────────────────────────────────────────────

  const agregarArista = useCallback(async (params: {
    origen_id: string;
    destino_id: string;
    label?: string;
    tipo?: string;
    color?: string;
  }) => {
    if (!lienzoId) return null;
    // Evitar duplicados
    const existe = aristas.find(
      (a) => a.origen_id === params.origen_id && a.destino_id === params.destino_id,
    );
    if (existe) return null;
    const { data, error } = await supabase
      .from("pizarron_aristas")
      .insert({ lienzo_id: lienzoId, ...params })
      .select()
      .single();
    if (!error && data) {
      setAristas((prev) => [...prev, data]);
      return data as PizarronArista;
    }
    return null;
  }, [lienzoId, aristas]);

  const editarArista = useCallback(async (id: string, patch: Partial<Pick<PizarronArista, "label" | "tipo" | "color">>) => {
    setAristas((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
    await supabase.from("pizarron_aristas").update(patch).eq("id", id);
  }, []);

  const eliminarArista = useCallback(async (id: string) => {
    setAristas((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("pizarron_aristas").delete().eq("id", id);
  }, []);

  return {
    nodos, aristas, loading,
    agregarNodo, moverNodo, redimensionarNodo, editarNodoLabel, editarNodoColor, eliminarNodo,
    agregarArista, editarArista, eliminarArista,
  };
}

// ── Búsqueda de entidades de Garlia ───────────────────────────────────────

export interface EntidadResultado {
  id: string;
  nombre: string;
  tabla: string;
}

export async function buscarEntidades(
  tabla: string,
  query: string,
): Promise<EntidadResultado[]> {
  if (!tabla || tabla === "") return [];
  const { data } = await supabase
    .from(tabla as any)
    .select("id, nombre")
    .ilike("nombre", `%${query}%`)
    .limit(12);
  return (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, tabla }));
}
