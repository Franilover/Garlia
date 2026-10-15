"use client";
/**
 * useIdiomas.ts — v4
 * Hooks para el editor de idiomas de Garlia.
 * Mapeados 1:1 contra el schema real de Supabase (proyecto Franiloverart).
 *
 * Hooks exportados:
 *   useIdiomas            — lista de idiomas (con familia y perfil gramatical)
 *   useIdiomaDetalle      — detalle de un idioma: fonemas, lexemas, morfemas,
 *                           sistemas de escritura, perfiles, variedades,
 *                           comunidades, relaciones, períodos
 *   useFonemas            — inventario fonémico de un idioma
 *   useLexemas            — diccionario/léxico de un idioma
 *   useMorfemas           — morfemas de un idioma
 *   useVariedades         — variedades lingüísticas de un idioma
 *   useSistemasEscritura  — sistemas de escritura vinculados al idioma
 *   usePerfilGramatical   — perfil gramatical (1:1 con idioma)
 *   usePeriodos           — períodos lingüísticos de un idioma
 *   useFamilias           — lista de familias (para dropdowns)
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import type {
  Idioma, FamiliaLinguistica, IdiomaFamilia, RelacionIdioma,
  VariedadLinguistica, ComunidadLinguistica, ComunidadIdioma,
  FonemaIdioma, PatronSilabico, ReglaFonologica, ProsodiaIdioma,
  SistemaEscritura, IdiomaEscritura,
  Lexema, SentidoLexico, FormaLexica,
  Morfema, ReglaMorfologica, ConstruccionSintactica,
  PerfilGramatical, PeriodoLinguistico, CambioLinguistico,
  PrestamoLexico, EstadoCanon, CategoriaGramatical,
  ClaseFonema, TipoVariedad,
} from "./types";

export interface HookError { message: string }

// ─────────────────────────────────────────────────────────────────────────
// IDIOMAS — lista
// ─────────────────────────────────────────────────────────────────────────

export function useIdiomas() {
  const [idiomas, setIdiomas] = useState<Idioma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("idiomas")
      .select("*")
      .order("nombre");
    if (err) setError({ message: err.message });
    else setIdiomas((data as Idioma[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (nombre: string): Promise<Idioma | null> => {
    const { data, error: err } = await supabase
      .from("idiomas")
      .insert({ nombre, es_protolengua: false, estado: "borrador" })
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

// ─────────────────────────────────────────────────────────────────────────
// IDIOMA — detalle completo
// ─────────────────────────────────────────────────────────────────────────

export function useIdiomaDetalle(id: string | null) {
  const [idioma, setIdioma] = useState<Idioma | null>(null);
  const [familias, setFamilias] = useState<IdiomaFamilia[]>([]);
  const [relaciones, setRelaciones] = useState<RelacionIdioma[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!id) { setIdioma(null); return; }
    setLoading(true);
    setError(null);
    const [
      { data: idiomaData, error: e1 },
      { data: familiasData },
      { data: relacionesData },
    ] = await Promise.all([
      supabase.from("idiomas").select("*").eq("id", id).single(),
      supabase
        .from("idioma_familia")
        .select("*, familia:familias_linguisticas(id, nombre)")
        .eq("idioma_id", id),
      supabase
        .from("relaciones_idiomas")
        .select(`
          *,
          idioma_origen:idiomas!relaciones_idiomas_idioma_origen_id_fkey(id, nombre),
          idioma_destino:idiomas!relaciones_idiomas_idioma_destino_id_fkey(id, nombre)
        `)
        .or(`idioma_origen_id.eq.${id},idioma_destino_id.eq.${id}`),
    ]);
    if (e1) setError({ message: e1.message });
    else {
      setIdioma((idiomaData as Idioma) ?? null);
      setFamilias((familiasData as IdiomaFamilia[]) ?? []);
      setRelaciones((relacionesData as RelacionIdioma[]) ?? []);
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
    if (err) setError({ message: err.message });
    else if (data) setIdioma((prev) => prev ? { ...prev, ...(data as Idioma) } : (data as Idioma));
    setSaving(false);
  }, [id]);

  // ── Familias lingüísticas ────────────────────────────────────────────
  const vincularFamilia = useCallback(async (familiaId: string, tipo: IdiomaFamilia["tipo_clasificacion"] = "principal") => {
    if (!id) return;
    const { data, error: err } = await supabase
      .from("idioma_familia")
      .insert({ idioma_id: id, familia_id: familiaId, tipo_clasificacion: tipo, estado: "borrador" })
      .select("*, familia:familias_linguisticas(id, nombre)")
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setFamilias((prev) => [...prev, data as IdiomaFamilia]);
  }, [id]);

  const desvincularFamilia = useCallback(async (idiomaFamiliaId: string) => {
    const { error: err } = await supabase.from("idioma_familia").delete().eq("id", idiomaFamiliaId);
    if (err) { setError({ message: err.message }); return; }
    setFamilias((prev) => prev.filter((f) => f.id !== idiomaFamiliaId));
  }, []);

  // ── Relaciones entre idiomas ─────────────────────────────────────────
  const crearRelacion = useCallback(async (
    destinoId: string,
    tipo: RelacionIdioma["tipo"],
    descripcion?: string
  ) => {
    if (!id) return;
    const { data, error: err } = await supabase
      .from("relaciones_idiomas")
      .insert({
        idioma_origen_id: id, idioma_destino_id: destinoId,
        tipo, descripcion, estado: "borrador",
      })
      .select(`
        *,
        idioma_origen:idiomas!relaciones_idiomas_idioma_origen_id_fkey(id, nombre),
        idioma_destino:idiomas!relaciones_idiomas_idioma_destino_id_fkey(id, nombre)
      `)
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setRelaciones((prev) => [...prev, data as RelacionIdioma]);
  }, [id]);

  const eliminarRelacion = useCallback(async (relacionId: string) => {
    const { error: err } = await supabase.from("relaciones_idiomas").delete().eq("id", relacionId);
    if (err) { setError({ message: err.message }); return; }
    setRelaciones((prev) => prev.filter((r) => r.id !== relacionId));
  }, []);

  return {
    idioma, familias, relaciones, loading, saving, error,
    recargar: cargar, guardar,
    vincularFamilia, desvincularFamilia,
    crearRelacion, eliminarRelacion,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// FONEMAS
// ─────────────────────────────────────────────────────────────────────────

export function useFonemas(idiomaId: string | null) {
  const [fonemas, setFonemas] = useState<FonemaIdioma[]>([]);
  const [patrones, setPatrones] = useState<PatronSilabico[]>([]);
  const [reglas, setReglas] = useState<ReglaFonologica[]>([]);
  const [prosodia, setProsodia] = useState<ProsodiaIdioma | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setFonemas([]); setPatrones([]); setReglas([]); setProsodia(null); return; }
    setLoading(true);
    setError(null);
    const [
      { data: fData, error: e1 },
      { data: pData },
      { data: rData },
      { data: prData },
    ] = await Promise.all([
      supabase.from("fonemas_idioma").select("*").eq("idioma_id", idiomaId)
        .order("clase").order("punto_articulacion"),
      supabase.from("patrones_silabicos").select("*").eq("idioma_id", idiomaId),
      supabase.from("reglas_fonologicas").select("*").eq("idioma_id", idiomaId)
        .order("orden_aplicacion"),
      supabase.from("prosodia_idioma").select("*").eq("idioma_id", idiomaId).maybeSingle(),
    ]);
    if (e1) setError({ message: e1.message });
    else {
      setFonemas((fData as FonemaIdioma[]) ?? []);
      setPatrones((pData as PatronSilabico[]) ?? []);
      setReglas((rData as ReglaFonologica[]) ?? []);
      setProsodia((prData as ProsodiaIdioma) ?? null);
    }
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── CRUD fonemas ─────────────────────────────────────────────────────
  const crearFonema = useCallback(async (
    campos: Omit<FonemaIdioma, "id" | "idioma_id" | "created_at" | "updated_at">
  ): Promise<FonemaIdioma | null> => {
    if (!idiomaId) return null;
    const { data, error: err } = await supabase
      .from("fonemas_idioma")
      .insert({ estado: "borrador", es_fonema_distintivo: true, ...campos, idioma_id: idiomaId })
      .select().single();
    if (err) { setError({ message: err.message }); return null; }
    if (data) { setFonemas((prev) => [...prev, data as FonemaIdioma]); return data as FonemaIdioma; }
    return null;
  }, [idiomaId]);

  const guardarFonema = useCallback(async (fonemaId: string, campos: Partial<FonemaIdioma>) => {
    const { data, error: err } = await supabase
      .from("fonemas_idioma").update(campos).eq("id", fonemaId).select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setFonemas((prev) => prev.map((f) => f.id === fonemaId ? { ...f, ...(data as FonemaIdioma) } : f));
  }, []);

  const eliminarFonema = useCallback(async (fonemaId: string) => {
    const { error: err } = await supabase.from("fonemas_idioma").delete().eq("id", fonemaId);
    if (err) { setError({ message: err.message }); return; }
    setFonemas((prev) => prev.filter((f) => f.id !== fonemaId));
  }, []);

  // ── CRUD prosodia ────────────────────────────────────────────────────
  const guardarProsodia = useCallback(async (campos: Partial<ProsodiaIdioma>) => {
    if (!idiomaId) return;
    if (prosodia?.id) {
      const { data, error: err } = await supabase
        .from("prosodia_idioma").update(campos).eq("id", prosodia.id).select().single();
      if (err) { setError({ message: err.message }); return; }
      if (data) setProsodia(data as ProsodiaIdioma);
    } else {
      const { data, error: err } = await supabase
        .from("prosodia_idioma")
        .insert({ idioma_id: idiomaId, sistema_prosodico: "acento", tono_distintivo: false, duracion_distintiva: false, estado: "borrador", ...campos })
        .select().single();
      if (err) { setError({ message: err.message }); return; }
      if (data) setProsodia(data as ProsodiaIdioma);
    }
  }, [idiomaId, prosodia]);

  const consonantes = fonemas.filter((f) => f.clase === "consonante");
  const vocales = fonemas.filter((f) => f.clase === "vocal");
  const otros = fonemas.filter((f) => f.clase !== "consonante" && f.clase !== "vocal");

  return {
    fonemas, consonantes, vocales, otros,
    patrones, reglas, prosodia,
    loading, error, recargar: cargar,
    crearFonema, guardarFonema, eliminarFonema,
    guardarProsodia,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// LÉXICO — lexemas + sentidos + formas
// ─────────────────────────────────────────────────────────────────────────

export function useLexemas(idiomaId: string | null) {
  const [lexemas, setLexemas] = useState<Lexema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setLexemas([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("lexemas")
      .select("*, sentidos:sentidos_lexicos(*), formas:formas_lexicas(*)")
      .eq("idioma_id", idiomaId)
      .order("lema");
    if (err) setError({ message: err.message });
    else setLexemas((data as Lexema[]) ?? []);
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (
    lema: string,
    categoria_gramatical: CategoriaGramatical = "otro"
  ): Promise<Lexema | null> => {
    if (!idiomaId) return null;
    const { data, error: err } = await supabase
      .from("lexemas")
      .insert({ idioma_id: idiomaId, lema, categoria_gramatical, estado: "borrador" })
      .select().single();
    if (err) { setError({ message: err.message }); return null; }
    if (data) {
      const item = { ...(data as Lexema), sentidos: [], formas: [] };
      setLexemas((prev) => [...prev, item].sort((a, b) => a.lema.localeCompare(b.lema)));
      return item;
    }
    return null;
  }, [idiomaId]);

  const guardar = useCallback(async (lexemaId: string, campos: Partial<Lexema>) => {
    const { data, error: err } = await supabase
      .from("lexemas").update(campos).eq("id", lexemaId).select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setLexemas((prev) => prev.map((l) => l.id === lexemaId ? { ...l, ...(data as Lexema) } : l));
  }, []);

  const eliminar = useCallback(async (lexemaId: string) => {
    const { error: err } = await supabase.from("lexemas").delete().eq("id", lexemaId);
    if (err) { setError({ message: err.message }); return; }
    setLexemas((prev) => prev.filter((l) => l.id !== lexemaId));
  }, []);

  // ── Sentidos léxicos ──────────────────────────────────────────────────
  const crearSentido = useCallback(async (
    lexemaId: string,
    definicion: string,
    conceptoId: string,
    extra: Partial<Omit<SentidoLexico, "id" | "lexema_id" | "concepto_id" | "created_at" | "updated_at">> = {}
  ) => {
    const orden = lexemas.find((l) => l.id === lexemaId)?.sentidos?.length ?? 0;
    const { data, error: err } = await supabase
      .from("sentidos_lexicos")
      .insert({
        lexema_id: lexemaId, concepto_id: conceptoId,
        definicion, numero_acepcion: orden + 1, estado: "borrador", ...extra,
      })
      .select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) {
      setLexemas((prev) => prev.map((l) =>
        l.id === lexemaId ? { ...l, sentidos: [...(l.sentidos ?? []), data as SentidoLexico] } : l
      ));
    }
  }, [lexemas]);

  const guardarSentido = useCallback(async (
    lexemaId: string, sentidoId: string, campos: Partial<SentidoLexico>
  ) => {
    const { data, error: err } = await supabase
      .from("sentidos_lexicos").update(campos).eq("id", sentidoId).select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) {
      setLexemas((prev) => prev.map((l) =>
        l.id === lexemaId
          ? { ...l, sentidos: (l.sentidos ?? []).map((s) => s.id === sentidoId ? { ...s, ...(data as SentidoLexico) } : s) }
          : l
      ));
    }
  }, []);

  const eliminarSentido = useCallback(async (lexemaId: string, sentidoId: string) => {
    const { error: err } = await supabase.from("sentidos_lexicos").delete().eq("id", sentidoId);
    if (err) { setError({ message: err.message }); return; }
    setLexemas((prev) => prev.map((l) =>
      l.id === lexemaId ? { ...l, sentidos: (l.sentidos ?? []).filter((s) => s.id !== sentidoId) } : l
    ));
  }, []);

  // ── Formas léxicas ────────────────────────────────────────────────────
  const crearForma = useCallback(async (
    lexemaId: string, forma: string, tipo_forma: string,
    extra: Partial<Omit<FormaLexica, "id" | "lexema_id" | "created_at" | "updated_at">> = {}
  ) => {
    const { data, error: err } = await supabase
      .from("formas_lexicas")
      .insert({ lexema_id: lexemaId, forma, tipo_forma, rasgos_gramaticales: {}, estado: "borrador", ...extra })
      .select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) {
      setLexemas((prev) => prev.map((l) =>
        l.id === lexemaId ? { ...l, formas: [...(l.formas ?? []), data as FormaLexica] } : l
      ));
    }
  }, []);

  const eliminarForma = useCallback(async (lexemaId: string, formaId: string) => {
    const { error: err } = await supabase.from("formas_lexicas").delete().eq("id", formaId);
    if (err) { setError({ message: err.message }); return; }
    setLexemas((prev) => prev.map((l) =>
      l.id === lexemaId ? { ...l, formas: (l.formas ?? []).filter((f) => f.id !== formaId) } : l
    ));
  }, []);

  return {
    lexemas, loading, error, recargar: cargar,
    crear, guardar, eliminar,
    crearSentido, guardarSentido, eliminarSentido,
    crearForma, eliminarForma,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// MORFEMAS
// ─────────────────────────────────────────────────────────────────────────

export function useMorfemas(idiomaId: string | null) {
  const [morfemas, setMorfemas] = useState<Morfema[]>([]);
  const [reglas, setReglas] = useState<ReglaMorfologica[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setMorfemas([]); setReglas([]); return; }
    setLoading(true);
    setError(null);
    const [{ data: mData, error: e1 }, { data: rData }] = await Promise.all([
      supabase.from("morfemas").select("*").eq("idioma_id", idiomaId).order("tipo").order("forma"),
      supabase.from("reglas_morfologicas").select("*").eq("idioma_id", idiomaId).order("orden_aplicacion"),
    ]);
    if (e1) setError({ message: e1.message });
    else {
      setMorfemas((mData as Morfema[]) ?? []);
      setReglas((rData as ReglaMorfologica[]) ?? []);
    }
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crearMorfema = useCallback(async (
    forma: string, tipo: Morfema["tipo"]
  ): Promise<Morfema | null> => {
    if (!idiomaId) return null;
    const { data, error: err } = await supabase
      .from("morfemas")
      .insert({ idioma_id: idiomaId, forma, tipo, estado: "borrador" })
      .select().single();
    if (err) { setError({ message: err.message }); return null; }
    if (data) { setMorfemas((prev) => [...prev, data as Morfema]); return data as Morfema; }
    return null;
  }, [idiomaId]);

  const guardarMorfema = useCallback(async (morfemaId: string, campos: Partial<Morfema>) => {
    const { data, error: err } = await supabase
      .from("morfemas").update(campos).eq("id", morfemaId).select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setMorfemas((prev) => prev.map((m) => m.id === morfemaId ? { ...m, ...(data as Morfema) } : m));
  }, []);

  const eliminarMorfema = useCallback(async (morfemaId: string) => {
    const { error: err } = await supabase.from("morfemas").delete().eq("id", morfemaId);
    if (err) { setError({ message: err.message }); return; }
    setMorfemas((prev) => prev.filter((m) => m.id !== morfemaId));
  }, []);

  return {
    morfemas, reglas, loading, error, recargar: cargar,
    crearMorfema, guardarMorfema, eliminarMorfema,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// VARIEDADES LINGÜÍSTICAS
// ─────────────────────────────────────────────────────────────────────────

export function useVariedades(idiomaId: string | null) {
  const [variedades, setVariedades] = useState<VariedadLinguistica[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setVariedades([]); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("variedades_linguisticas").select("*").eq("idioma_id", idiomaId).order("nombre");
    if (err) setError({ message: err.message });
    else setVariedades((data as VariedadLinguistica[]) ?? []);
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = useCallback(async (nombre: string, tipo: TipoVariedad = "dialectal"): Promise<VariedadLinguistica | null> => {
    if (!idiomaId) return null;
    const { data, error: err } = await supabase
      .from("variedades_linguisticas")
      .insert({ idioma_id: idiomaId, nombre, tipo, estado: "borrador" })
      .select().single();
    if (err) { setError({ message: err.message }); return null; }
    if (data) { setVariedades((prev) => [...prev, data as VariedadLinguistica]); return data as VariedadLinguistica; }
    return null;
  }, [idiomaId]);

  const guardar = useCallback(async (varId: string, campos: Partial<VariedadLinguistica>) => {
    const { data, error: err } = await supabase
      .from("variedades_linguisticas").update(campos).eq("id", varId).select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setVariedades((prev) => prev.map((v) => v.id === varId ? { ...v, ...(data as VariedadLinguistica) } : v));
  }, []);

  const eliminar = useCallback(async (varId: string) => {
    const { error: err } = await supabase.from("variedades_linguisticas").delete().eq("id", varId);
    if (err) { setError({ message: err.message }); return; }
    setVariedades((prev) => prev.filter((v) => v.id !== varId));
  }, []);

  return { variedades, loading, error, recargar: cargar, crear, guardar, eliminar };
}

// ─────────────────────────────────────────────────────────────────────────
// SISTEMAS DE ESCRITURA vinculados al idioma
// ─────────────────────────────────────────────────────────────────────────

export function useSistemasEscritura(idiomaId: string | null) {
  const [vinculaciones, setVinculaciones] = useState<IdiomaEscritura[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setVinculaciones([]); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("idioma_escritura")
      .select("*, sistema:sistemas_escritura(id, nombre, tipo, direccion)")
      .eq("idioma_id", idiomaId);
    if (err) setError({ message: err.message });
    else setVinculaciones((data as IdiomaEscritura[]) ?? []);
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const vincular = useCallback(async (sistemaId: string, funcion: IdiomaEscritura["funcion"] = "principal") => {
    if (!idiomaId) return;
    const { data, error: err } = await supabase
      .from("idioma_escritura")
      .insert({ idioma_id: idiomaId, sistema_escritura_id: sistemaId, funcion, estado: "borrador" })
      .select("*, sistema:sistemas_escritura(id, nombre, tipo, direccion)")
      .single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setVinculaciones((prev) => [...prev, data as IdiomaEscritura]);
  }, [idiomaId]);

  const desvincular = useCallback(async (vinculacionId: string) => {
    const { error: err } = await supabase.from("idioma_escritura").delete().eq("id", vinculacionId);
    if (err) { setError({ message: err.message }); return; }
    setVinculaciones((prev) => prev.filter((v) => v.id !== vinculacionId));
  }, []);

  return { vinculaciones, loading, error, recargar: cargar, vincular, desvincular };
}

// ─────────────────────────────────────────────────────────────────────────
// PERFIL GRAMATICAL (1:1 con idioma)
// ─────────────────────────────────────────────────────────────────────────

export function usePerfilGramatical(idiomaId: string | null) {
  const [perfil, setPerfil] = useState<PerfilGramatical | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setPerfil(null); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("perfiles_gramaticales").select("*").eq("idioma_id", idiomaId).maybeSingle();
    if (err) setError({ message: err.message });
    else setPerfil((data as PerfilGramatical) ?? null);
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = useCallback(async (campos: Partial<PerfilGramatical>) => {
    if (!idiomaId) return;
    if (perfil?.id) {
      const { data, error: err } = await supabase
        .from("perfiles_gramaticales").update(campos).eq("id", perfil.id).select().single();
      if (err) { setError({ message: err.message }); return; }
      if (data) setPerfil(data as PerfilGramatical);
    } else {
      const { data, error: err } = await supabase
        .from("perfiles_gramaticales")
        .insert({ idioma_id: idiomaId, estado: "borrador", ...campos })
        .select().single();
      if (err) { setError({ message: err.message }); return; }
      if (data) setPerfil(data as PerfilGramatical);
    }
  }, [idiomaId, perfil]);

  return { perfil, loading, error, recargar: cargar, guardar };
}

// ─────────────────────────────────────────────────────────────────────────
// PERÍODOS LINGÜÍSTICOS
// ─────────────────────────────────────────────────────────────────────────

export function usePeriodos(idiomaId: string | null) {
  const [periodos, setPeriodos] = useState<PeriodoLinguistico[]>([]);
  const [cambios, setCambios] = useState<CambioLinguistico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<HookError | null>(null);

  const cargar = useCallback(async () => {
    if (!idiomaId) { setPeriodos([]); setCambios([]); return; }
    setLoading(true);
    const [{ data: pData, error: e1 }, { data: cData }] = await Promise.all([
      supabase.from("periodos_linguisticos").select("*").eq("idioma_id", idiomaId).order("orden_cronologico"),
      supabase.from("cambios_linguisticos").select("*").eq("idioma_id", idiomaId).order("orden_aplicacion"),
    ]);
    if (e1) setError({ message: e1.message });
    else {
      setPeriodos((pData as PeriodoLinguistico[]) ?? []);
      setCambios((cData as CambioLinguistico[]) ?? []);
    }
    setLoading(false);
  }, [idiomaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const crearPeriodo = useCallback(async (nombre: string): Promise<PeriodoLinguistico | null> => {
    if (!idiomaId) return null;
    const orden = periodos.length + 1;
    const { data, error: err } = await supabase
      .from("periodos_linguisticos")
      .insert({ idioma_id: idiomaId, nombre, orden_cronologico: orden, unidad_temporal: "sin_definir", estado: "borrador" })
      .select().single();
    if (err) { setError({ message: err.message }); return null; }
    if (data) { setPeriodos((prev) => [...prev, data as PeriodoLinguistico]); return data as PeriodoLinguistico; }
    return null;
  }, [idiomaId, periodos.length]);

  const guardarPeriodo = useCallback(async (periodoId: string, campos: Partial<PeriodoLinguistico>) => {
    const { data, error: err } = await supabase
      .from("periodos_linguisticos").update(campos).eq("id", periodoId).select().single();
    if (err) { setError({ message: err.message }); return; }
    if (data) setPeriodos((prev) => prev.map((p) => p.id === periodoId ? { ...p, ...(data as PeriodoLinguistico) } : p));
  }, []);

  const eliminarPeriodo = useCallback(async (periodoId: string) => {
    const { error: err } = await supabase.from("periodos_linguisticos").delete().eq("id", periodoId);
    if (err) { setError({ message: err.message }); return; }
    setPeriodos((prev) => prev.filter((p) => p.id !== periodoId));
  }, []);

  return {
    periodos, cambios, loading, error, recargar: cargar,
    crearPeriodo, guardarPeriodo, eliminarPeriodo,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// FAMILIAS — dropdown helper
// ─────────────────────────────────────────────────────────────────────────

export function useFamilias() {
  const [familias, setFamilias] = useState<FamiliaLinguistica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("familias_linguisticas").select("id, nombre, estado").order("nombre")
      .then(({ data }) => {
        setFamilias((data as FamiliaLinguistica[]) ?? []);
        setLoading(false);
      });
  }, []);

  const crear = useCallback(async (nombre: string): Promise<FamiliaLinguistica | null> => {
    const { data, error: err } = await supabase
      .from("familias_linguisticas")
      .insert({ nombre, estado: "borrador" })
      .select().single();
    if (err) return null;
    if (data) {
      setFamilias((prev) => [...prev, data as FamiliaLinguistica].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return data as FamiliaLinguistica;
    }
    return null;
  }, []);

  return { familias, loading, crear };
}

// ─────────────────────────────────────────────────────────────────────────
// SISTEMAS DE ESCRITURA — lista global (para dropdowns / vincular)
// ─────────────────────────────────────────────────────────────────────────

export function useSistemasEscrituraGlobal() {
  const [sistemas, setSistemas] = useState<SistemaEscritura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("sistemas_escritura").select("*").order("nombre")
      .then(({ data }) => {
        setSistemas((data as SistemaEscritura[]) ?? []);
        setLoading(false);
      });
  }, []);

  const crear = useCallback(async (
    nombre: string,
    tipo: SistemaEscritura["tipo"],
    direccion: SistemaEscritura["direccion"] = "izquierda_derecha"
  ): Promise<SistemaEscritura | null> => {
    const { data, error: err } = await supabase
      .from("sistemas_escritura")
      .insert({ nombre, tipo, direccion, estado: "borrador" })
      .select().single();
    if (err) return null;
    if (data) {
      setSistemas((prev) => [...prev, data as SistemaEscritura].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return data as SistemaEscritura;
    }
    return null;
  }, []);

  return { sistemas, loading, crear };
}
