"use client";
/**
 * useIdiomas / useCulturas / useIdiomaDetalle
 * ─────────────────────────────────────────────────────────────────────────
 * Hooks de datos para la sección Culturas & Idiomas.
 * Sigue el mismo patrón que usePizarron: supabase directo, sin React Query.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import type {
  Cultura, Idioma, IdiomaFrase, IdiomaRegla, IdiomaTipo,
  DireccionEscritura, FraseCategoria, ReglaCategoria,
} from "./types";

// ── Lista de idiomas ──────────────────────────────────────────────────────

export function useIdiomas() {
  const [idiomas, setIdiomas] = useState<Idioma[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("idiomas")
      .select(`
        *,
        cultura_principal:culturas!idiomas_cultura_principal_id_fkey(id, nombre, color_emblema),
        idioma_padre:idiomas!idiomas_idioma_padre_id_fkey(id, nombre)
      `)
      .order("nombre");
    setIdiomas((data as Idioma[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (nombre: string): Promise<Idioma | null> => {
    const { data, error } = await supabase
      .from("idiomas")
      .insert({ nombre, tipo: "natural", direccion_escritura: "ltr" })
      .select()
      .single();
    if (!error && data) {
      setIdiomas((prev) => [...prev, data as Idioma].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return data as Idioma;
    }
    return null;
  }, []);

  const eliminar = useCallback(async (id: string) => {
    await supabase.from("idiomas").delete().eq("id", id);
    setIdiomas((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { idiomas, loading, cargar, crear, eliminar };
}

// ── Detalle de un idioma (campos + frases + reglas) ───────────────────────

export function useIdiomaDetalle(id: string | null) {
  const [idioma, setIdioma] = useState<Idioma | null>(null);
  const [frases, setFrases] = useState<IdiomaFrase[]>([]);
  const [reglas, setReglas] = useState<IdiomaRegla[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (!id) { setIdioma(null); return; }
    setLoading(true);
    const [{ data: idiomaData }, { data: frasesData }, { data: reglasData }] =
      await Promise.all([
        supabase
          .from("idiomas")
          .select(`
            *,
            cultura_principal:culturas!idiomas_cultura_principal_id_fkey(id, nombre, color_emblema),
            idioma_padre:idiomas!idiomas_idioma_padre_id_fkey(id, nombre)
          `)
          .eq("id", id)
          .single(),
        supabase.from("idiomas_frases").select("*").eq("idioma_id", id).order("categoria"),
        supabase.from("idiomas_reglas").select("*").eq("idioma_id", id).order("orden"),
      ]);
    setIdioma(idiomaData as Idioma ?? null);
    setFrases((frasesData as IdiomaFrase[]) ?? []);
    setReglas((reglasData as IdiomaRegla[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Guardar campos del idioma ──────────────────────────────
  const guardar = useCallback(async (campos: Partial<Idioma>) => {
    if (!id) return;
    setSaving(true);
    const { data } = await supabase
      .from("idiomas")
      .update(campos)
      .eq("id", id)
      .select()
      .single();
    if (data) setIdioma((prev) => prev ? { ...prev, ...(data as Idioma) } : (data as Idioma));
    setSaving(false);
  }, [id]);

  // ── Frases ─────────────────────────────────────────────────
  const crearFrase = useCallback(async (
    frase_original: string,
    extra: Partial<Omit<IdiomaFrase, "id" | "idioma_id" | "created_at">> = {}
  ) => {
    if (!id) return;
    const { data } = await supabase
      .from("idiomas_frases")
      .insert({ idioma_id: id, frase_original, categoria: "otro", ...extra })
      .select()
      .single();
    if (data) setFrases((prev) => [...prev, data as IdiomaFrase]);
  }, [id]);

  const guardarFrase = useCallback(async (fraseId: string, campos: Partial<IdiomaFrase>) => {
    const { data } = await supabase
      .from("idiomas_frases")
      .update(campos)
      .eq("id", fraseId)
      .select()
      .single();
    if (data) setFrases((prev) => prev.map((f) => f.id === fraseId ? { ...f, ...(data as IdiomaFrase) } : f));
  }, []);

  const eliminarFrase = useCallback(async (fraseId: string) => {
    await supabase.from("idiomas_frases").delete().eq("id", fraseId);
    setFrases((prev) => prev.filter((f) => f.id !== fraseId));
  }, []);

  // ── Reglas ─────────────────────────────────────────────────
  const crearRegla = useCallback(async (titulo: string) => {
    if (!id) return;
    const orden = reglas.length;
    const { data } = await supabase
      .from("idiomas_reglas")
      .insert({ idioma_id: id, titulo, categoria: "otro", orden })
      .select()
      .single();
    if (data) setReglas((prev) => [...prev, data as IdiomaRegla]);
  }, [id, reglas.length]);

  const guardarRegla = useCallback(async (reglaId: string, campos: Partial<IdiomaRegla>) => {
    const { data } = await supabase
      .from("idiomas_reglas")
      .update(campos)
      .eq("id", reglaId)
      .select()
      .single();
    if (data) setReglas((prev) => prev.map((r) => r.id === reglaId ? { ...r, ...(data as IdiomaRegla) } : r));
  }, []);

  const eliminarRegla = useCallback(async (reglaId: string) => {
    await supabase.from("idiomas_reglas").delete().eq("id", reglaId);
    setReglas((prev) => prev.filter((r) => r.id !== reglaId));
  }, []);

  return {
    idioma, frases, reglas, loading, saving,
    recargar: cargar,
    guardar,
    crearFrase, guardarFrase, eliminarFrase,
    crearRegla, guardarRegla, eliminarRegla,
  };
}

// ── Lista de culturas (solo para dropdowns) ───────────────────────────────

export function useCulturas() {
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("culturas")
      .select("id, nombre, color_emblema, emblema_icono, es_extinta")
      .order("nombre")
      .then(({ data }) => {
        setCulturas((data as Cultura[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { culturas, loading };
}
