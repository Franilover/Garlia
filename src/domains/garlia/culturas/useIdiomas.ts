"use client";
/**
 * useIdiomas / useFonemas / useLexemas / useCulturasIdioma / useCulturas
 * ────────────────────────────────────────────────────────────────────────
 * v2 — usa supabase-ext para type-safety en tablas nuevas.
 *      Agrega error state en todos los hooks.
 *      Mantiene la misma API pública que v1.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { fonemas as fonemaApi, lexemas as lexemaApi, significados as sigApi } from "./supabase-ext";
import type {
  Cultura, Idioma, IdiomaFrase, IdiomaRegla,
  IdiomaFonema, IdiomaLexema, IdiomaLexemaSignificado,
  FraseCategoria, ReglaCategoria, CulturaIdioma,
} from "./types";

// ── Tipo de error compartido ──────────────────────────────────────────────

export interface HookError { message: string }

// ── Lista de idiomas ──────────────────────────────────────────────────────

export function useIdiomas() {
  const [idiomas, setIdiomas] = useState<Idioma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("idiomas")
      .select(`
        *,
        cultura_principal:culturas!idiomas_cultura_principal_id_fkey(id, nombre, color_emblema),
        idioma_padre:idiomas!idiomas_idioma_padre_id_fkey(id, nombre)
      `)
      .order("nombre");
    if (err) { setError({ message: err.message }); }
    else { setIdiomas((data as Idioma[]) ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (nombre: string): Promise<Idioma | null> => {
    const { data, error: err } = await supabase
      .from("idiomas")
      .insert({ nombre, tipo: "natural", direccion_escritura: "ltr" })
      .select()
      .single();
    if (err) { setError({ message: err.message }); return null; }
    if (data) {
      setIdiomas((prev) => [...prev, data as Idioma].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return data as Idioma;
    }
    return null;
  }, []);

  const eliminar = useCallback(async (id: string): Promise<boolean> => {
    const { error: err } = await supabase.from("idiomas").delete().eq("id", id);
    if (err) { setError({ message: err.message }); return false; }
    setIdiomas((prev) => prev.filter((i) => i.id !== id));
    return true;
  }, []);

  return { idiomas, loading, error, cargar, crear, eliminar };
}

// ── Detalle de un idioma ───────────────────────────────────────────────────

export function useIdiomaDetalle(id: string | null) {
  const [idioma, setIdioma] = useState<Idioma | null>(null);
  const [frases, setFrases] = useState<IdiomaFrase[]>([]);
  const [reglas, setReglas] = useState<IdiomaRegla[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!id) { setIdioma(null); return; }
    setLoading(true);
    setError(null);
    const [{ data: idiomaData, error: e1 }, { data: frasesData }, { data: reglasData }] =
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
    if (e1) { setError({ message: e1.message }); }
    else {
      setIdioma((idiomaData as Idioma) ?? null);
      setFrases((frasesData as IdiomaFrase[]) ?? []);
      setReglas((reglasData as IdiomaRegla[]) ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = useCallback(async (campos: Partial<Idioma>) => {
    if (!id) return;
    setSaving(true);
    const { data, error: err } = await supabase
      .from("idiomas")
      .update(campos)
      .eq("id", id)
      .select()
      .single();
    if (err) { setError({ message: err.message }); }
    else if (data) { setIdioma((prev) => prev ? { ...prev, ...(data as Idioma) } : (data as Idioma)); }
    setSaving(false);
  }, [id]);

  // ── Frases ─────────────────────────────────────────────────────────────

  const crearFrase = useCallback(async (
    frase_original: string,
    extra: Partial<Omit<IdiomaFrase, "id" | "idioma_id" | "created_at">> = {}
  ) => {
    if (!id) return;
    const { data, error: err } = await supabase
      .from("idiomas_frases")
      .insert({ idioma_id: id, frase_original, categoria: "otro", ...extra })
      .select()
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setFrases((prev) => [...prev, data as IdiomaFrase]);
  }, [id]);

  const guardarFrase = useCallback(async (fraseId: string, campos: Partial<IdiomaFrase>) => {
    const { data, error: err } = await supabase
      .from("idiomas_frases")
      .update(campos)
      .eq("id", fraseId)
      .select()
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setFrases((prev) => prev.map((f) => f.id === fraseId ? { ...f, ...(data as IdiomaFrase) } : f));
  }, []);

  const eliminarFrase = useCallback(async (fraseId: string) => {
    const { error: err } = await supabase.from("idiomas_frases").delete().eq("id", fraseId);
    if (err) { setError({ message: err.message }); return; }
    setFrases((prev) => prev.filter((f) => f.id !== fraseId));
  }, []);

  // ── Reglas ─────────────────────────────────────────────────────────────

  const crearRegla = useCallback(async (titulo: string, categoria: ReglaCategoria = "otro") => {
    if (!id) return;
    const orden = reglas.length;
    const { data, error: err } = await supabase
      .from("idiomas_reglas")
      .insert({ idioma_id: id, titulo, categoria, orden })
      .select()
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setReglas((prev) => [...prev, data as IdiomaRegla]);
  }, [id, reglas.length]);

  const guardarRegla = useCallback(async (reglaId: string, campos: Partial<IdiomaRegla>) => {
    const { data, error: err } = await supabase
      .from("idiomas_reglas")
      .update(campos)
      .eq("id", reglaId)
      .select()
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setReglas((prev) => prev.map((r) => r.id === reglaId ? { ...r, ...(data as IdiomaRegla) } : r));
  }, []);

  const eliminarRegla = useCallback(async (reglaId: string) => {
    const { error: err } = await supabase.from("idiomas_reglas").delete().eq("id", reglaId);
    if (err) { setError({ message: err.message }); return; }
    setReglas((prev) => prev.filter((r) => r.id !== reglaId));
  }, []);

  return {
    idioma, frases, reglas, loading, saving, error,
    recargar: cargar,
    guardar,
    crearFrase, guardarFrase, eliminarFrase,
    crearRegla, guardarRegla, eliminarRegla,
  };
}

// ── Fonología estructurada ────────────────────────────────────────────────

export function useFonemas(idiomaId: string | null) {
  const [fonemas, setFonemas] = useState<IdiomaFonema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setFonemas([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await fonemaApi.byIdioma(idiomaId);
    if (err) { setError({ message: err.message }); }
    else { setFonemas(data ?? []); }
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (
    campos: Omit<IdiomaFonema, "id" | "idioma_id" | "created_at">
  ): Promise<IdiomaFonema | null> => {
    if (!idiomaId) return null;
    const { data, error: err } = await fonemaApi.insert({ idioma_id: idiomaId, ...campos });
    if (err) { setError({ message: err.message }); return null; }
    if (data) { setFonemas((prev) => [...prev, data]); return data; }
    return null;
  }, [idiomaId]);

  const guardar = useCallback(async (fonemaId: string, campos: Partial<IdiomaFonema>) => {
    const { data, error: err } = await fonemaApi.update(fonemaId, campos);
    if (err) { setError({ message: err.message }); return; }
    if (data) setFonemas((prev) => prev.map((f) => f.id === fonemaId ? { ...f, ...data } : f));
  }, []);

  const eliminar = useCallback(async (fonemaId: string) => {
    const { error: err } = await fonemaApi.delete(fonemaId);
    if (err) { setError({ message: err.message }); return; }
    setFonemas((prev) => prev.filter((f) => f.id !== fonemaId));
  }, []);

  const consonantes = fonemas.filter((f) => f.tipo === "consonante");
  const vocales     = fonemas.filter((f) => f.tipo === "vocal");
  const otros       = fonemas.filter((f) => f.tipo !== "consonante" && f.tipo !== "vocal");

  return { fonemas, consonantes, vocales, otros, loading, error, recargar: cargar, crear, guardar, eliminar };
}

// ── Léxico / Diccionario ──────────────────────────────────────────────────

export function useLexemas(idiomaId: string | null) {
  const [items, setItems] = useState<IdiomaLexema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setItems([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await lexemaApi.byIdioma(idiomaId);
    if (err) { setError({ message: err.message }); }
    else { setItems(data ?? []); }
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (lema: string): Promise<IdiomaLexema | null> => {
    if (!idiomaId) return null;
    const { data, error: err } = await lexemaApi.insert({
      idioma_id: idiomaId, lema, es_prestamo: false, validado: false,
    });
    if (err) { setError({ message: err.message }); return null; }
    if (data) {
      const item = { ...data, significados: [] };
      setItems((prev) => [...prev, item].sort((a, b) => a.lema.localeCompare(b.lema)));
      return item;
    }
    return null;
  }, [idiomaId]);

  const guardar = useCallback(async (lexemaId: string, campos: Partial<IdiomaLexema>) => {
    const { data, error: err } = await lexemaApi.update(lexemaId, campos);
    if (err) { setError({ message: err.message }); return; }
    if (data) setItems((prev) => prev.map((l) => l.id === lexemaId ? { ...l, ...data } : l));
  }, []);

  const eliminar = useCallback(async (lexemaId: string) => {
    const { error: err } = await lexemaApi.delete(lexemaId);
    if (err) { setError({ message: err.message }); return; }
    setItems((prev) => prev.filter((l) => l.id !== lexemaId));
  }, []);

  // ── Significados ─────────────────────────────────────────────────────

  const crearSignificado = useCallback(async (
    lexemaId: string,
    significado: string,
    extra: Partial<Omit<IdiomaLexemaSignificado, "id" | "lexema_id" | "created_at">> = {}
  ) => {
    const orden = items.find((l) => l.id === lexemaId)?.significados?.length ?? 0;
    const { data, error: err } = await sigApi.insert({ lexema_id: lexemaId, significado, orden, ...extra });
    if (err) { setError({ message: err.message }); return; }
    if (data) {
      setItems((prev) => prev.map((l) =>
        l.id === lexemaId ? { ...l, significados: [...(l.significados ?? []), data] } : l
      ));
    }
  }, [items]);

  const guardarSignificado = useCallback(async (
    lexemaId: string, sigId: string, campos: Partial<IdiomaLexemaSignificado>
  ) => {
    const { data, error: err } = await sigApi.update(sigId, campos);
    if (err) { setError({ message: err.message }); return; }
    if (data) {
      setItems((prev) => prev.map((l) =>
        l.id === lexemaId
          ? { ...l, significados: (l.significados ?? []).map((s) => s.id === sigId ? { ...s, ...data } : s) }
          : l
      ));
    }
  }, []);

  const eliminarSignificado = useCallback(async (lexemaId: string, sigId: string) => {
    const { error: err } = await sigApi.delete(sigId);
    if (err) { setError({ message: err.message }); return; }
    setItems((prev) => prev.map((l) =>
      l.id === lexemaId
        ? { ...l, significados: (l.significados ?? []).filter((s) => s.id !== sigId) }
        : l
    ));
  }, []);

  return {
    lexemas: items, loading, error, recargar: cargar,
    crear, guardar, eliminar,
    crearSignificado, guardarSignificado, eliminarSignificado,
  };
}

// ── Culturas vinculadas a un idioma ───────────────────────────────────────

export function useCulturasIdioma(idiomaId: string | null) {
  const [relaciones, setRelaciones] = useState<CulturaIdioma[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setRelaciones([]); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("culturas_idiomas")
      .select("*, cultura:culturas(id, nombre, color_emblema)")
      .eq("idioma_id", idiomaId);
    if (err) { setError({ message: err.message }); }
    else { setRelaciones((data as CulturaIdioma[]) ?? []); }
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const vincular = useCallback(async (culturaId: string, rol: CulturaIdioma["rol"] = "nativo") => {
    if (!idiomaId) return;
    const { data, error: err } = await supabase
      .from("culturas_idiomas")
      .upsert({ cultura_id: culturaId, idioma_id: idiomaId, rol }, { onConflict: "cultura_id,idioma_id" })
      .select("*, cultura:culturas(id, nombre, color_emblema)")
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) {
      setRelaciones((prev) => {
        const exists = prev.some((r) => r.cultura_id === culturaId);
        return exists
          ? prev.map((r) => r.cultura_id === culturaId ? (data as CulturaIdioma) : r)
          : [...prev, data as CulturaIdioma];
      });
    }
  }, [idiomaId]);

  const desvincular = useCallback(async (culturaId: string) => {
    if (!idiomaId) return;
    const { error: err } = await supabase
      .from("culturas_idiomas")
      .delete()
      .eq("cultura_id", culturaId)
      .eq("idioma_id", idiomaId);
    if (err) { setError({ message: err.message }); return; }
    setRelaciones((prev) => prev.filter((r) => r.cultura_id !== culturaId));
  }, [idiomaId]);

  return { relaciones, loading, error, recargar: cargar, vincular, desvincular };
}

// ── Lista de culturas (para dropdowns) ───────────────────────────────────

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
