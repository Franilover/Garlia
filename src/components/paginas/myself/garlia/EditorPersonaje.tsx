"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Maximize2, UserCircle2, BookOpen, Loader2,
  ChevronDown, X, Save, Trash2,
  Sparkles, Users, Camera, SlidersHorizontal, Music2,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Personaje, type SaveStatus } from "./components/types";
import { useNombresDeTabla } from "./components/hooks";
import { SelectorImagen, SaveIndicator } from "./components/UIComponents";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { MarkdownEditor, WikiEntity } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";
import SimpleImagePicker from "@/components/paginas/myself/garlia/editorCapitulos/snippets//forms/SimpleImagePicker";
import { BloqueDones } from "./components/BloqueDones";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { BloqueRelaciones } from "./components/BloqueRelaciones";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch { return []; }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}





// ─── Bloque capítulos en los que aparece ─────────────────────────────────────
type CapAparece = { id: string; orden: number; titulo_capitulo: string; libro_titulo?: string | null; libro_id?: string | null };

// Cache en memoria para no re-escanear Dexie si ya cargamos este personaje
const _capsCache = new Map<string, CapAparece[]>();

function mapCap(c: any, libroMap: Record<string, string>): CapAparece {
  return {
    id: c.id,
    orden: c.orden ?? 0,
    titulo_capitulo: c.titulo_capitulo ?? "Sin título",
    libro_titulo: libroMap[c.libro_id] ?? null,
    libro_id: c.libro_id ?? null,
  };
}

function useCapitulosConPersonaje(personajeId: string): { caps: CapAparece[]; loading: boolean } {
  const cached = _capsCache.get(personajeId);
  const [caps, setCaps] = useState<CapAparece[]>(cached ?? []);
  // Solo mostramos spinner si no hay nada en caché
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // ── 1. Dexie (stale-while-revalidate) ────────────────────────────────
      // Solo escaneamos si no teníamos caché (evita trabajo repetido al
      // cambiar de personaje rápidamente)
      if (!_capsCache.has(personajeId)) {
        try {
          if (db) {
            // toArray una sola vez y filtra en memoria — no hay índice en
            // personajes_ids[], así que es inevitable, pero lo hacemos sin
            // bloquear la UI gracias al estado inicial vacío + loading
            const [allCaps, allLibros]: [any[], any[]] = await Promise.all([
              (db as any).capitulos?.toArray() ?? [],
              (db as any).libros?.toArray()    ?? [],
            ]);
            if (cancelled) return;
            const libroMap = Object.fromEntries((allLibros as any[]).map((l: any) => [l.id, l.titulo]));
            const filtered = (allCaps as any[])
              .filter((c: any) => (c.personajes_ids ?? []).includes(personajeId))
              .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
              .map((c: any) => mapCap(c, libroMap));
            if (filtered.length > 0) {
              _capsCache.set(personajeId, filtered);
              setCaps(filtered);
            }
            setLoading(false);
            if (!navigator.onLine) return;
          }
        } catch { setLoading(false); }
      }

      if (!navigator.onLine) { setLoading(false); return; }

      // ── 2. Supabase en background (actualiza sin spinner) ─────────────────
      try {
        const { data } = await supabase
          .from("capitulos")
          .select("id, orden, titulo_capitulo, libro_id, libros!libro_id(titulo)")
          .contains("personajes_ids", [personajeId])
          .order("orden");
        if (cancelled) return;
        const fresh = (data ?? []).map((c: any) => ({
          id: c.id,
          orden: c.orden ?? 0,
          titulo_capitulo: c.titulo_capitulo ?? "Sin título",
          libro_titulo: (Array.isArray(c.libros) ? c.libros[0]?.titulo : c.libros?.titulo) ?? null,
          libro_id: c.libro_id ?? null,
        }));
        _capsCache.set(personajeId, fresh);
        setCaps(fresh);
      } catch {}
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [personajeId]);

  return { caps, loading };
}

function BloqueCapsAparece({ personajeId }: { personajeId: string }) {
  const { caps, loading } = useCapitulosConPersonaje(personajeId);

  const navigateToCap = (cap: CapAparece) => {
    if (!cap.libro_id) return;
    localStorage.setItem("estudio-caps-last-cap",   cap.id);
    localStorage.setItem("estudio-caps-last-libro", cap.libro_id);
    window.dispatchEvent(new Event("estudio-caps-action"));
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary/20" /></div>;
  if (!caps.length) return (
    <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-4 italic">
      Sin apariciones registradas
    </p>
  );
  return (
    <div className="space-y-1">
      {caps.map(cap => (
        <button
          key={cap.id}
          type="button"
          onClick={() => navigateToCap(cap)}
          disabled={!cap.libro_id}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 active:bg-primary/10 transition-colors text-left group disabled:opacity-40 disabled:cursor-default cursor-pointer"
        >
          <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
            {cap.orden}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-primary truncate uppercase italic group-hover:text-primary/80 transition-colors">{cap.titulo_capitulo}</p>
            {cap.libro_titulo && (
              <p className="text-[9px] text-primary/35 truncate flex items-center gap-1">
                <BookOpen size={8} /> {cap.libro_titulo}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Bloque canciones del personaje ──────────────────────────────────────────
type CancionMin = { id: string; titulo: string; cantante: string | null; portada_url: string | null };

function useCancionesPersonaje(
  personajeId: string,
  nombrePersonaje: string,
): { canciones: CancionMin[]; loading: boolean } {
  const [canciones, setCanciones] = useState<CancionMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Dexie primero
    try {
      if (db) {
        const todas: any[] = await (db as any).canciones?.toArray() ?? [];
        const nombre = nombrePersonaje?.trim().toLowerCase() ?? "";
        const filtered = todas.filter((c: any) =>
          c.personaje_id === personajeId ||
          c.id === personajeId ||
          (nombre && c.titulo?.toLowerCase().includes(nombre))
        );
        if (filtered.length > 0) {
          setCanciones(filtered.map((c: any) => ({
            id: c.id,
            titulo: c.titulo ?? "Sin título",
            cantante: c.cantante ?? null,
            portada_url: c.portada_url ?? null,
          })));
          setLoading(false);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) { setLoading(false); return; }

    // 2. Supabase: por personaje_id, por id o por título con nombre del personaje
    try {
      const nombre = nombrePersonaje?.trim() ?? "";
      let query = supabase
        .from("canciones")
        .select("id, titulo, cantante, portada_url");

      if (nombre) {
        query = query.or(
          `personaje_id.eq.${personajeId},id.eq.${personajeId},titulo.ilike.%${nombre}%`
        );
      } else {
        query = query.or(`personaje_id.eq.${personajeId},id.eq.${personajeId}`);
      }

      const { data } = await query.order("titulo");
      setCanciones((data ?? []).map((c: any) => ({
        id: c.id,
        titulo: c.titulo ?? "Sin título",
        cantante: c.cantante ?? null,
        portada_url: c.portada_url ?? null,
      })));
    } catch {}
    setLoading(false);
  }, [personajeId, nombrePersonaje]);

  useEffect(() => { load(); }, [load]);

  return { canciones, loading };
}

function BloqueCanciones({
  personajeId,
  nombrePersonaje,
  onSelect,
}: {
  personajeId: string;
  nombrePersonaje: string;
  onSelect?: (id: string) => void;
}) {
  const { canciones, loading } = useCancionesPersonaje(personajeId, nombrePersonaje);

  if (loading) return (
    <div className="flex justify-center py-4">
      <Loader2 size={16} className="animate-spin text-primary/20" />
    </div>
  );
  if (!canciones.length) return (
    <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-4 italic">
      Sin canciones
    </p>
  );
  return (
    <div className="space-y-1">
      {canciones.map(c => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect?.(c.id)}
          disabled={!onSelect}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 active:bg-primary/10 transition-colors text-left group disabled:cursor-default cursor-pointer"
        >
          {c.portada_url ? (
            <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/15">
              <img src={c.portada_url} alt={c.titulo} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-accent/10 text-accent">
              <Music2 size={10} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-primary truncate uppercase italic group-hover:text-primary/80 transition-colors">
              {c.titulo}
            </p>
            {c.cantante && (
              <p className="text-[9px] text-primary/35 truncate">{c.cantante}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Image cuerpo (mobile picker) ─────────────────────────────────────────────
function PickerCuerpo({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Maximize2 size={11} /> Imagen cuerpo</h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
            </div>
            <SimpleImagePicker onSelect={url => { onChange(url); setOpen(false); }} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      {value ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 text-[10px] font-black uppercase tracking-widest text-primary/50 hover:text-primary hover:border-primary/30 transition-all">
          <div className="w-5 h-5 rounded overflow-hidden border border-primary/15 shrink-0">
            <img src={value} alt="Cuerpo" className="w-full h-full object-cover" />
          </div>
          Cambiar cuerpo
        </button>
      ) : (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
          <Maximize2 size={11} /> + Imagen cuerpo
        </button>
      )}
    </>
  );
}

// ─── Botón flotante para cambiar imagen cara en mobile ────────────────────────
function PickerCaraBtn({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Camera size={11} /> Imagen de perfil</h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
            </div>
            <SimpleImagePicker onSelect={url => { onChange(url); setOpen(false); }} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-main/80 backdrop-blur-sm border border-primary/20 text-primary/50 hover:text-primary hover:bg-bg-main transition-all shadow-md"
        title="Cambiar imagen"
      >
        <Camera size={13} />
      </button>
    </>
  );
}

// ─── Hook: grupos de criaturas a partir del nombre de especie ────────────────
// Resuelve la criatura por nombre y luego busca en qué grupos está,
// para pasarlos directamente a BloqueHechizos / BloqueDones.
function useGruposDeCriaturaPorNombre(nombreEspecie: string | null | undefined): string[] {
  const [grupoIds, setGrupoIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) { setGrupoIds([]); return; }

    // 1. Dexie: buscar criatura y sus grupos
    let criaturaId: string | null = null;
    try {
      if (db) {
        const allCriaturas: any[] = await (db as any).criaturas?.toArray() ?? [];
        const criLocal = allCriaturas.find((c: any) =>
          c.nombre?.toLowerCase() === nombreEspecie.trim().toLowerCase()
        );
        if (criLocal) {
          criaturaId = criLocal.id;
          const allGrupos: any[] = await (db as any).grupos_mundo?.toArray() ?? [];
          const ids = allGrupos
            .filter((g: any) => g.tipo === "criaturas" && (g.miembro_ids ?? []).includes(criaturaId))
            .map((g: any) => g.id);
          if (ids.length) { setGrupoIds(ids); if (!navigator.onLine) return; }
        }
      }
    } catch {}

    if (!navigator.onLine) return;

    // 2. Supabase: resolver criatura si no se encontró en Dexie
    if (!criaturaId) {
      const { data: cri } = await supabase
        .from("criaturas")
        .select("id")
        .ilike("nombre", nombreEspecie.trim())
        .limit(1)
        .maybeSingle();
      criaturaId = cri?.id ?? null;
    }
    if (!criaturaId) { setGrupoIds([]); return; }

    // 3. Supabase: grupos de criaturas que contienen este ID
    const { data: grupos } = await supabase
      .from("grupos_mundo")
      .select("id, miembro_ids")
      .eq("tipo", "criaturas")
      .contains("miembro_ids", [criaturaId]);
    setGrupoIds((grupos ?? []).map((g: any) => g.id));
  }, [nombreEspecie]);

  useEffect(() => { load(); }, [load]);

  return grupoIds;
}

// ─── Hook: variantes de una criatura por nombre ───────────────────────────────
type VarianteMin = { id: string; tipo: string };

function useCriaturaVariantesPorNombre(nombreEspecie: string | null | undefined) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) { setVariantes([]); return; }

    // 1. Dexie primero
    try {
      if (db) {
        const allCriaturas: any[] = await (db as any).criaturas?.toArray() ?? [];
        const criLocal = allCriaturas.find((c: any) =>
          c.nombre?.toLowerCase() === nombreEspecie.trim().toLowerCase()
        );
        if (criLocal) {
          const vars: any[] = await (db as any).criatura_variantes
            ?.where("criatura_id").equals(criLocal.id).toArray() ?? [];
          if (vars.length) { setVariantes(vars); if (!navigator.onLine) return; }
        }
      }
    } catch {}

    if (!navigator.onLine) return;

    const { data: criatura } = await supabase
      .from("criaturas")
      .select("id")
      .ilike("nombre", nombreEspecie.trim())
      .limit(1)
      .maybeSingle();
    if (!criatura) { setVariantes([]); return; }
    const { data } = await supabase
      .from("criatura_variantes")
      .select("id, tipo")
      .eq("criatura_id", criatura.id)
      .order("tipo");
    const result = data ?? [];
    setVariantes(result);
    try {
      if (db && result.length > 0) await (db as any).criatura_variantes?.bulkPut(result);
    } catch {}
  }, [nombreEspecie]);

  useEffect(() => { load(); }, [load]);

  return variantes;
}


// ─── Hook: nombres de ciudades (para el selector) ─────────────────────────────
type CiudadMin = { id: string; nombre: string; reino_id: string | null };

function useCiudades(): CiudadMin[] {
  const [ciudades, setCiudades] = useState<CiudadMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).ciudades?.toArray() ?? [];
          if (local.length) {
            setCiudades(
              local
                .filter((l: any) => !l.deleted)
                .map((l: any) => ({ id: l.id, nombre: l.nombre, reino_id: l.reino_id ?? null }))
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
            );
            if (!navigator.onLine) return;
          }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase.from("ciudades").select("id, nombre, reino_id").order("nombre");
      if (data) setCiudades(data.map((l: any) => ({ id: l.id, nombre: l.nombre, reino_id: l.reino_id ?? null })));
    };
    run();
  }, []);
  return ciudades;
}



// ─── Hook: reinos con id (para filtrar ciudades) ───────────────────────────────
type ReinoMin = { id: string; nombre: string };

function useReinosMin(): ReinoMin[] {
  const [reinos, setReinos] = useState<ReinoMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).reinos?.toArray() ?? [];
          if (local.length) {
            setReinos(local.filter((r: any) => !r.deleted).map((r: any) => ({ id: r.id, nombre: r.nombre })));
            if (!navigator.onLine) return;
          }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase.from("reinos").select("id, nombre").order("nombre");
      if (data) setReinos(data);
    };
    run();
  }, []);
  return reinos;
}

// ─── Hook: grupos a los que pertenece el personaje ───────────────────────────
type GrupoMin = { id: string; nombre: string; tipo: string };

function useGruposDelPersonaje(personajeId: string): { grupos: GrupoMin[]; loading: boolean } {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Dexie primero
      if (db) {
        const todos: any[] = await (db as any).grupos_mundo?.toArray() ?? [];
        const local = todos.filter((g: any) =>
          g.tipo === "personajes" && (g.miembro_ids ?? []).includes(personajeId)
        );
        if (local.length) {
          setGrupos(local.map((g: any) => ({ id: g.id, nombre: g.nombre, tipo: g.tipo })));
          setLoading(false);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) { setLoading(false); return; }

    // 2. Supabase
    try {
      const { data } = await supabase
        .from("grupos_mundo")
        .select("id, nombre, tipo")
        .eq("tipo", "personajes")
        .contains("miembro_ids", [personajeId]);
      setGrupos((data ?? []).map((g: any) => ({ id: g.id, nombre: g.nombre, tipo: g.tipo })));
    } catch {}
    setLoading(false);
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  return { grupos, loading };
}

// ─── Bloque grupos del personaje ─────────────────────────────────────────────
function BloqueGruposPersonaje({
  personajeId,
  onOpenGrupo,
}: {
  personajeId: string;
  onOpenGrupo?: (id: string) => void;
}) {
  const { grupos, loading } = useGruposDelPersonaje(personajeId);

  if (loading) return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
        <Users size={10} className="text-primary/40" />
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Grupos</span>
      </div>
      <div className="flex justify-center py-4">
        <Loader2 size={14} className="animate-spin text-primary/20" />
      </div>
    </div>
  );

  if (!grupos.length) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
        <Users size={10} className="text-primary/40" />
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Grupos</span>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2.5">
        {grupos.map(g => (
          <button
            key={g.id}
            onClick={() => onOpenGrupo?.(g.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.07] hover:border-primary/30 transition-all group"
          >
            <Users size={9} className="text-primary/35 group-hover:text-primary/60 transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 group-hover:text-primary/80 transition-colors">
              {g.nombre}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Hook: hechizos disponibles (por grupoIds) + seleccionados del personaje ──
type HechizMin = { id: string; nombre: string; imagen_url?: string | null };

function useHechizosPersonaje(personajeId: string, grupoIds: string[]) {
  const [disponibles, setDisponibles] = useState<HechizMin[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving,  setSaving]          = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Hechizos disponibles (filtrados por grupoIds si los hay)
      let hechizosData: HechizMin[] = [];
      try {
        if (db) {
          const todos: any[] = await (db as any).hechizos?.toArray() ?? [];
          hechizosData = todos.filter((h: any) => {
            if (!grupoIds.length) return true;
            return (h.grupo_ids ?? []).some((gid: string) => grupoIds.includes(gid));
          }).map((h: any) => ({ id: h.id, nombre: h.nombre, imagen_url: null }));
        }
      } catch {}

      if (!hechizosData.length && navigator.onLine) {
        let query = supabase.from("hechizos").select("id, nombre").order("nombre");
        if (grupoIds.length) {
          query = (query as any).overlaps("grupo_ids", grupoIds);
        }
        const { data } = await query;
        hechizosData = (data ?? []).map((h: any) => ({ id: h.id, nombre: h.nombre, imagen_url: null }));
      }
      setDisponibles(hechizosData);

      // 2. Hechizos seleccionados del personaje
      let selIds: string[] = [];
      try {
        if (db) {
          const local: any[] = await (db as any).personaje_hechizos?.where("personaje_id").equals(personajeId).toArray() ?? [];
          selIds = local.map((r: any) => r.hechizo_id);
        }
      } catch {}

      if (!selIds.length && navigator.onLine) {
        const { data } = await supabase
          .from("personaje_hechizos")
          .select("hechizo_id")
          .eq("personaje_id", personajeId);
        selIds = (data ?? []).map((r: any) => r.hechizo_id);
      }
      setSelectedIds(selIds);
    } catch {}
    setLoading(false);
  }, [personajeId, grupoIds.join(",")]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (hechizId: string, add: boolean) => {
    setSelectedIds(prev => add ? [...prev, hechizId] : prev.filter(id => id !== hechizId));
    setSaving(true);
    try {
      if (add) {
        await supabase.from("personaje_hechizos").insert({ personaje_id: personajeId, hechizo_id: hechizId });
        try { if (db) await (db as any).personaje_hechizos?.put({ id: `${personajeId}_${hechizId}`, personaje_id: personajeId, hechizo_id: hechizId }); } catch {}
      } else {
        await supabase.from("personaje_hechizos").delete().eq("personaje_id", personajeId).eq("hechizo_id", hechizId);
        try { if (db) await (db as any).personaje_hechizos?.delete(`${personajeId}_${hechizId}`); } catch {}
      }
    } catch {
      setSelectedIds(prev => add ? prev.filter(id => id !== hechizId) : [...prev, hechizId]);
    }
    setSaving(false);
  }, [personajeId]);

  return { disponibles, selectedIds, loading, saving, toggle };
}

function SeccionHechizos({ personajeId, grupoIds }: { personajeId: string; grupoIds: string[] }) {
  const { disponibles, selectedIds, loading, saving, toggle } = useHechizosPersonaje(personajeId, grupoIds);
  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <SeccionEntidad
        label="Hechizos"
        icon={<Sparkles size={10} />}
        fallbackIcon={<Sparkles size={10} />}
        emptyLabel="Sin hechizos"
        allEntities={disponibles}
        selectedIds={selectedIds}
        loading={loading}
        saving={saving}
        onToggle={toggle}
      />
    </div>
  );
}

// ─── FormularioPersonaje ──────────────────────────────────────────────────────
export function FormularioPersonaje({
  form, setForm, status, onSave, onDelete, compacto = false, entities = [], onNavigate, onSelectPersonaje, onOpenGrupo, onNavigateCiudad, onSelectCancion,
}: {
  form: Personaje;
  setForm: React.Dispatch<React.SetStateAction<Personaje>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  compacto?: boolean;
  entities?: WikiEntity[];
  onNavigate?: (tab: "criaturas" | "reinos", nombre: string) => void;
  onSelectPersonaje?: (id: string) => void;
  onOpenGrupo?: (id: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onSelectCancion?: (id: string) => void;
}) {
  const especies   = useNombresDeTabla("criaturas");
  const reinos     = useNombresDeTabla("reinos");
  const ciudades    = useCiudades();
  const reinosMin  = useReinosMin();
  const variantes  = useCriaturaVariantesPorNombre(form.especie);
  const grupoIds   = useGruposDeCriaturaPorNombre(form.especie);

  // ID del reino actualmente seleccionado
  const reinoSeleccionadoId = reinosMin.find(r => r.nombre === form.reino)?.id ?? null;

  // ── Combo 1: "Territorio" — solo reinos ──────────────────────────────────
  const itemsTerritorioSinReino: import("@/components/ui/ComboSelector").ComboItem[] =
    reinosMin.map(r => ({ id: `reino:${r.id}`, label: r.nombre }));
  const gruposTerritorio: import("@/components/ui/ComboSelector").ComboGroup[] = [];

  // Valor actual del combo territorio (prefijado)
  const territorioValue: string | null = (() => {
    if (form.reino) {
      const r = reinosMin.find(x => x.nombre === form.reino);
      if (r) return `reino:${r.id}`;
    }
    return null;
  })();

  const onTerritorioChange = (val: string | null) => {
    if (!val) {
      setForm(f => ({ ...f, reino: "", ciudad_id: null } as any));
      return;
    }
    if (val.startsWith("reino:")) {
      const reinoId = val.replace("reino:", "");
      const r = reinosMin.find(x => x.id === reinoId);
      setForm(f => ({ ...f, reino: r?.nombre ?? "", ciudad_id: null } as any));
    }
  };

  // ── Combo 2: "Ubicación" — ciudades del reino ─────────────────────────────
  const ciudadesFiltradas = ciudades.filter(l =>
    reinoSeleccionadoId ? l.reino_id === reinoSeleccionadoId : !l.reino_id
  );

  const itemsUbicacion: import("@/components/ui/ComboSelector").ComboItem[] =
    ciudadesFiltradas.map(l => ({ id: `ciudad:${l.id}`, label: l.nombre }));
  const gruposUbicacion: import("@/components/ui/ComboSelector").ComboGroup[] = [];

  // Valor actual del combo ubicación (prefijado)
  const ubicacionValue: string | null = (() => {
    if ((form as any).ciudad_id) return `ciudad:${(form as any).ciudad_id}`;
    return null;
  })();

  const onUbicacionChange = (val: string | null) => {
    if (!val) {
      setForm(f => ({ ...f, ciudad_id: null } as any));
      return;
    }
    if (val.startsWith("ciudad:")) {
      setForm(f => ({ ...f, ciudad_id: val.replace("ciudad:", "") } as any));
    }
  };
  const { onSnippetAction } = useWikilink();
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Fixed header ───────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/[0.03]"
      >
        <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.img_url
            ? <img src={form.img_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <UserCircle2 size={16} className="text-primary/25" />}
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre del personaje"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          style={{ letterSpacing: "0.02em" }}
        />

        <div className="shrink-0 flex items-center gap-1.5">
          <SaveIndicator status={status} />
          {!compacto && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            >
              <Trash2 size={10} />
            </button>
          )}
          <button
            onClick={onSave}
            disabled={status === "saving"}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save size={10} /> Guardar
          </button>
          <button
            onClick={() => setMobileAsideOpen(true)}
            className="sm:hidden flex items-center justify-center p-2 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all border border-primary/10"
            title="Entidades"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">

          {/* IDENTIDAD */}
          <div className="p-3">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Columna izquierda: imagen cara + cuerpo apilados */}
                <div className="shrink-0 w-full sm:w-52 flex sm:flex-col gap-3 sm:gap-2">

                  {/* Mobile: imagen grande con botón flotante */}
                  <div className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                    {form.img_url
                      ? <img src={form.img_url} alt={form.nombre} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><UserCircle2 size={48} className="text-primary/15" /></div>
                    }
                    <div className="absolute top-2 right-2 z-10">
                      <PickerCaraBtn
                        value={form.img_url ?? ""}
                        onChange={url => setForm(f => ({ ...f, img_url: url }))}
                      />
                    </div>
                  </div>

                  {/* Desktop: selector normal con label */}
                  <div className="hidden sm:block w-full">
                    <SelectorImagen
                      label="Cara"
                      value={form.img_url ?? ""}
                      onChange={url => setForm(f => ({ ...f, img_url: url }))}
                      aspect="square"
                      placeholder={<UserCircle2 size={20} className="opacity-25" />}
                    />
                  </div>

                  {!compacto && (
                    <div
                      className="hidden sm:block rounded-xl overflow-hidden border border-primary/10"
                    >
                      <div className="px-2 py-1 border-b border-primary/10 bg-primary/[0.02]">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25">Cuerpo</span>
                      </div>
                      <div className="relative w-full group bg-primary/2" style={{ aspectRatio: "1 / 2" }}>
                        {form.img_cuerpo_url ? (
                          <img
                            src={form.img_cuerpo_url}
                            alt="Cuerpo completo"
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ objectPosition: "top center" }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Maximize2 size={20} className="opacity-15" />
                          </div>
                        )}
                        <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-bg-main/70 backdrop-blur-sm">
                          <Maximize2 size={14} className="text-primary/50" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Cambiar</span>
                          <SelectorImagen
                            label=""
                            value={form.img_cuerpo_url ?? ""}
                            onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
                            aspect="full"
                            placeholder={null}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna derecha: selectores + descripción + resto */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Mobile: grid 2×2 (Especie/Reino · Ciudad/Don) */}
                  <div className="sm:hidden grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <ComboSelector
                        mode="single"
                        items={especies.map(e => ({ id: e, label: e }))}
                        value={form.especie ?? null}
                        onChange={v => setForm(f => ({ ...f, especie: v ?? "", variante_id: null }))}
                        label="Especie"
                        placeholder="Humano, elfo…"
                        allowNone
                        noneLabel="Sin especie"
                        onNavigate={onNavigate ? (_id, nombre) => onNavigate("criaturas", nombre) : undefined}
                      />
                      {variantes.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5">Variante</span>
                          <button type="button" onClick={() => setForm(f => ({ ...f, variante_id: null }))}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${!form.variante_id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}>
                            Todas
                          </button>
                          {variantes.map(v => (
                            <button key={v.id} type="button" onClick={() => setForm(f => ({ ...f, variante_id: v.id }))}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${form.variante_id === v.id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}>
                              {v.tipo}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <ComboSelector
                      mode="single"
                      items={itemsTerritorioSinReino}
                      groups={gruposTerritorio}
                      value={territorioValue}
                      onChange={onTerritorioChange}
                      label="Territorio"
                      placeholder="Reino…"
                      allowNone
                      noneLabel="Sin territorio"
                      onNavigate={onNavigate ? (id) => {
                        if (id.startsWith("reino:")) {
                          const r = reinosMin.find(x => x.id === id.replace("reino:", ""));
                          if (r) onNavigate("reinos", r.nombre);
                        }
                      } : undefined}
                    />
                    {(() => {
                      return (
                        <ComboSelector
                          mode="single"
                          items={itemsUbicacion}
                          groups={gruposUbicacion}
                          value={ubicacionValue}
                          onChange={onUbicacionChange}
                          label="Ubicación"
                          placeholder="Ciudad…"
                          allowNone
                          noneLabel="Sin ubicación"
                          onNavigate={onNavigateCiudad ? (id) => {
                            if (id.startsWith("ciudad:")) onNavigateCiudad(id.replace("ciudad:", ""));
                          } : undefined}
                        />
                      );
                    })()}
                    <div className="space-y-1.5">
                      <BloqueDones personajeId={form.id} grupoIds={grupoIds} />
                    </div>
                  </div>

                  {/* Desktop: layout original (fila de 3 + Don al lado) */}
                  <div className="hidden sm:flex flex-col sm:flex-row gap-2 items-start">
                    <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                      <div className="space-y-1 col-span-1">
                        <ComboSelector
                          mode="single"
                          items={especies.map(e => ({ id: e, label: e }))}
                          value={form.especie ?? null}
                          onChange={v => setForm(f => ({ ...f, especie: v ?? "", variante_id: null }))}
                          label="Especie"
                          placeholder="Humano, elfo…"
                          allowNone
                          noneLabel="Sin especie"
                          onNavigate={onNavigate ? (_id, nombre) => onNavigate("criaturas", nombre) : undefined}
                        />
                        {variantes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5">Variante</span>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, variante_id: null }))}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${!form.variante_id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                            >
                              Todas
                            </button>
                            {variantes.map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, variante_id: v.id }))}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${form.variante_id === v.id ? "bg-primary/10 border-primary/25 text-primary" : "border-primary/10 text-primary/25"}`}
                              >
                                {v.tipo}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <ComboSelector
                        mode="single"
                        items={itemsTerritorioSinReino}
                        groups={gruposTerritorio}
                        value={territorioValue}
                        onChange={onTerritorioChange}
                        label="Territorio"
                        placeholder="Reino…"
                        allowNone
                        noneLabel="Sin territorio"
                        onNavigate={onNavigate ? (id) => {
                          if (id.startsWith("reino:")) {
                            const r = reinosMin.find(x => x.id === id.replace("reino:", ""));
                            if (r) onNavigate("reinos", r.nombre);
                          }
                        } : undefined}
                      />
                      {(() => {
                        return (
                          <ComboSelector
                            mode="single"
                            items={itemsUbicacion}
                            groups={gruposUbicacion}
                            value={ubicacionValue}
                            onChange={onUbicacionChange}
                            label="Ubicación"
                            placeholder="Ciudad…"
                            allowNone
                            noneLabel="Sin ubicación"
                            onNavigate={onNavigateCiudad ? (id) => {
                              if (id.startsWith("ciudad:")) onNavigateCiudad(id.replace("ciudad:", ""));
                            } : undefined}
                          />
                        );
                      })()}
                    </div>

                    {/* Don — mismo estilo que Especie / Reino */}
                    <div className="w-full sm:w-44 sm:shrink-0 space-y-1.5">
                      <BloqueDones personajeId={form.id} grupoIds={grupoIds} />
                    </div>
                  </div>

                  {/* Descripción + Características en fila */}
                  {!compacto ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Sobre el personaje</label>
                        <MarkdownEditor
                          value={form.sobre ?? ""}
                          onChange={v => setForm(f => ({ ...f, sobre: v }))}
                          placeholder="Biografía, personalidad…"
                          rows={8}
                          toolbar
                          defaultMode="edit"
                        onSnippetAction={onSnippetAction}
                        entities={entities}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Características</label>
                        <MarkdownEditor
                          value={form.caracteristicas ?? ""}
                          onChange={v => setForm(f => ({ ...f, caracteristicas: v }))}
                          placeholder="Rasgos físicos, personalidad, habilidades…"
                          rows={8}
                          toolbar
                          defaultMode="edit"
                        onSnippetAction={onSnippetAction}
                        entities={entities}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Sobre el personaje</label>
                      <MarkdownEditor
                        value={form.sobre ?? ""}
                        onChange={v => setForm(f => ({ ...f, sobre: v }))}
                        placeholder="Biografía, personalidad…"
                        rows={5}
                        toolbar
                        defaultMode="edit"
                      onSnippetAction={onSnippetAction}
                      entities={entities}
                      />
                    </div>
                  )}

                  {/* ── Bloques laterales — solo desktop, inline ───────────────── */}
                  <div className="hidden sm:block mt-4 space-y-3">
                    <BloqueGruposPersonaje personajeId={form.id} onOpenGrupo={onOpenGrupo} />

                    <BloqueRelaciones personajeId={form.id} onSelectPersonaje={onSelectPersonaje} />

                    <div className="rounded-xl overflow-hidden border border-primary/10">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
                        <BookOpen size={10} className="text-primary/40" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Capítulos</span>
                      </div>
                      <BloqueCapsAparece personajeId={form.id} />
                    </div>

                    <SeccionHechizos personajeId={form.id} grupoIds={grupoIds} />

                    <div className="rounded-xl overflow-hidden border border-primary/10">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
                        <Music2 size={10} className="text-primary/40" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Canciones</span>
                      </div>
                      <BloqueCanciones personajeId={form.id} nombrePersonaje={form.nombre ?? ""} onSelect={onSelectCancion} />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

      {mobileAsideOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0"
            style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            onClick={() => setMobileAsideOpen(false)}
          />
          <div
            className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
            style={{
              width: "240px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              scrollbarWidth: "none",
            }}
          >
            {/* Header del drawer */}
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
            >
              <span className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button onClick={() => setMobileAsideOpen(false)} className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all">
                <X size={14} />
              </button>
            </div>

            <div className="p-2">
              <BloqueGruposPersonaje personajeId={form.id} onOpenGrupo={onOpenGrupo} />
            </div>
            <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
            <div className="p-2">
              <BloqueRelaciones personajeId={form.id} onSelectPersonaje={onSelectPersonaje} />
            </div>
            <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
            <div>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
                <BookOpen size={10} className="text-primary/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Capítulos</span>
              </div>
              <BloqueCapsAparece personajeId={form.id} />
            </div>
            <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
            <SeccionHechizos personajeId={form.id} grupoIds={grupoIds} />
            <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
            <div>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06] bg-primary/[0.03]">
                <Music2 size={10} className="text-primary/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Canciones</span>
              </div>
              <BloqueCanciones personajeId={form.id} nombrePersonaje={form.nombre ?? ""} onSelect={onSelectCancion} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
// ─── EditorPersonaje ──────────────────────────────────────────────────────────
export function EditorPersonaje({
  item, onSaved, onDeleted, entities = [], onNavigate, onSelectPersonaje, onOpenGrupo, onNavigateCiudad, onSelectCancion,
}: {
  item: Personaje; onSaved: (p: Personaje) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onNavigate?: (tab: "criaturas" | "reinos", nombre: string) => void;
  onSelectPersonaje?: (id: string) => void;
  onOpenGrupo?: (id: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onSelectCancion?: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Personaje>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre:          form.nombre,
        img_url:         form.img_url        || null,
        img_cuerpo_url:  form.img_cuerpo_url || null,
        sobre:           form.sobre,
        reino:           form.reino,
        especie:         form.especie,
        caracteristicas: form.caracteristicas || null,
        variante_id:     (form as any).variante_id    || null,
        ciudad_id:        (form as any).ciudad_id        || null,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("personajes", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar a "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("personajes").delete().eq("id", form.id);
    void dexieDel("personajes", form.id);
    onDeleted(form.id);
  };

return (
    <>
      <ConfirmModal />
      <FormularioPersonaje form={form} setForm={setForm} status={status} onSave={save} onDelete={del} entities={entities} onNavigate={onNavigate} onSelectPersonaje={onSelectPersonaje} onOpenGrupo={onOpenGrupo} onNavigateCiudad={onNavigateCiudad} onSelectCancion={onSelectCancion} />
    </>
  );
}