import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { TAB_CONFIG, type TabKey, type MundoSectionKey, type Personaje, type ReinoDetalle, type CriaturaVariante, type CapituloNarrado } from "./types";

// ─── useEntidades ─────────────────────────────────────────────────────────────

export function useEntidades<T extends { id: string; nombre: string }>(tab: TabKey) {
  const [items,     setItems]     = useState<T[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    if (tab === "mundo") { setLoading(false); return; }
    setLoading(true);
    if (!navigator.onLine) { setIsOffline(true); setLoading(false); return; }
    setIsOffline(false);
    try {
      const { data, error } = await supabase
        .from(TAB_CONFIG[tab as Exclude<TabKey, "mundo">].tabla).select("*").order("nombre");
      if (error) throw error;
      setItems((data ?? []) as T[]);
    } catch { setIsOffline(true); }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
    const h = () => { setIsOffline(false); load(); };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [load]);

  return { items, setItems, loading, isOffline, refetch: load };
}

// ─── useUniqueValues ──────────────────────────────────────────────────────────

export function useUniqueValues(tabla: string, columna: string) {
  const [valores, setValores] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from(tabla).select(columna).not(columna, "is", null)
      .then(({ data }) => {
        if (!data) return;
        const unique = [
          ...new Set(data.map((r: any) => r[columna]).filter(Boolean).map((v: string) => v.trim()))
        ].sort() as string[];
        setValores(unique);
      });
  }, [tabla, columna]);

  return valores;
}

// ─── useCapitulosNarrados ─────────────────────────────────────────────────────

export function useCapitulosNarrados(personajeId: string | null) {
  const [caps,    setCaps]    = useState<CapituloNarrado[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personajeId) { setCaps([]); return; }
    setLoading(true);
    supabase
      .from("capitulos")
      .select("id, titulo_capitulo, orden, libro_id, libros(titulo)")
      .eq("narrador_id", personajeId)
      .order("orden")
      .then(({ data }) => {
        setCaps((data ?? []).map((c: any) => ({
          id: c.id,
          titulo_capitulo: c.titulo_capitulo,
          orden: c.orden,
          libro_id: c.libro_id,
          libro_titulo: c.libros?.titulo ?? "",
        })));
        setLoading(false);
      });
  }, [personajeId]);

  return { caps, loading };
}

// ─── useReinoDetalles ─────────────────────────────────────────────────────────

export function useReinoDetalles(reinoId: string | null) {
  const [detalles, setDetalles] = useState<ReinoDetalle[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await supabase.from("reino_detalles").select("*").eq("reino_id", id).order("nombre");
    setDetalles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (reinoId) load(reinoId);
    else setDetalles([]);
  }, [reinoId, load]);

  return { detalles, setDetalles, loading };
}

// ─── useCriaturaVariantes ─────────────────────────────────────────────────────

export function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<CriaturaVariante[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("criatura_variantes").select("*").eq("criatura_id", id).order("tipo");
    setVariantes(data || []);
    setLoading(false);
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reinoNombre) { setPersonajes([]); return; }
    setLoading(true);
    supabase
      .from("personajes")
      .select("id, nombre, img_url, img_cuerpo_url, especie, reino, sobre")
      .ilike("reino", `%${reinoNombre}%`)
      .order("nombre")
      .then(({ data }) => { setPersonajes(data || []); setLoading(false); });
  }, [reinoNombre]);

  return { personajes, setPersonajes, loading };
}

// ─── usePersonajesDeEspecie ───────────────────────────────────────────────────

export function usePersonajesDeEspecie(especieNombre: string | null | undefined) {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!especieNombre?.trim()) { setPersonajes([]); return; }
    setLoading(true);
    supabase
      .from("personajes")
      .select("id, nombre, img_url, img_cuerpo_url, especie, reino, sobre")
      .ilike("especie", `%${especieNombre}%`)
      .order("nombre")
      .then(({ data }) => { setPersonajes(data || []); setLoading(false); });
  }, [especieNombre]);

  return { personajes, setPersonajes, loading };
}

// ─── useMundoSecciones ────────────────────────────────────────────────────────

export function useMundoSecciones() {
  const [textos,  setTextos]  = useState<Record<MundoSectionKey, string>>({
    magia: "", geografia: "", historia: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("mundo_secciones")
      .select("key, contenido")
      .then(({ data }) => {
        if (!data) return;
        const result = { magia: "", geografia: "", historia: "" } as Record<MundoSectionKey, string>;
        data.forEach((r: any) => { result[r.key as MundoSectionKey] = r.contenido ?? ""; });
        setTextos(result);
        setLoading(false);
      });
  }, []);

  const save = async (section: MundoSectionKey, value: string) => {
    await supabase
      .from("mundo_secciones")
      .update({ contenido: value, updated_at: new Date().toISOString() })
      .eq("key", section);
  };

  return { textos, setTextos, loading, save };
}