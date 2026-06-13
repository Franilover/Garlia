"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Globe, Save, Loader2, Bug,
  ScrollText, Map, FileText, Users, UserCircle2, Package,
  Crown, Clock, Filter, Layers, BookOpen, Music, MapPin,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { isReallyOnline, onSyncDone } from "@/hooks/data/useOfflineSync";
import { MUNDO_SECTIONS, type MundoSectionKey, type SaveStatus, type Reino, type Personaje, type Nota } from "../components/types";
import { SaveIndicator } from "../components/UIComponents";
import { MarkdownEditor } from "@/components/forms/Markdown/MarkdownEditor";
import { useWikilink } from "../components/WikilinkContext";
import { EditorReino } from "./EditorReino";
import { EditorPersonaje } from "./EditorPersonaje";
import { EditorCriatura } from "./EditorCriatura";
import { EditorItem } from "./EditorItem";
import { EditorCiudad, type Ciudad } from "./EditorCiudad";
import { EditorHechizos } from "./EditorHechizos";
import { type WikiEntity } from "@/components/forms/Markdown/MarkdownEditor";
import { type TimelineEvent } from "../components/LoreTab";
import { SelectorFechaMundo, useCalendario } from "../components/EditorLineaTiempo";
import { diaAbsolutoAFecha, eraEnAnio } from "@/lib/utils/calendario";
import { useNotas } from "../components/useNotas";
import { EditorNota, ListaNotas } from "./EditorNota";
import { EditorGrupo, useGrupos, type Grupo, GRUPO_TIPO_CONFIG } from "./EditorGrupo";
import EstudioCapitulos from "@/features/editorGarlia/views/EditorCapitulos";
import AdminDescubrimientos from "@/features/editorGarlia/views/editorRelaciones";
import { PanelEditor } from "@/features/editorGarlia/components/editorLetras/components/editor/PanelEditor";
import { ModalNuevaCancion } from "@/features/editorGarlia/components/editorLetras/components/modals/ModalNuevaCancion";
import type { Cancion } from "@/features/editorGarlia/components/editorLetras/types";


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



// ─── Tipos locales de entidades mínimas ──────────────────────────────────────
type CriaturaMin     = { id: string; nombre: string; imagen_url?: string; habitat?: string };
type VarianteMin     = { id: string; tipo: string };
type ObjetoMin       = { id: string; nombre: string; imagen_url?: string; categoria?: string };
type CiudadMin        = { id: string; nombre: string; imagen_url?: string; tipo?: string; reino_id?: string };
type EntidadMagicaMin = { id: string; nombre: string };
type RunaMin         = { id: string; nombre: string; imagen_url?: string | null };

// ─── Caché de timestamps de última sincronización remota ─────────────────────
// Evita re-fetchear Supabase en cada mount cuando Dexie ya tiene datos frescos.
const _entityLastFetch: Record<string, number> = {};
const ENTITY_TTL_MS = 60_000; // 1 minuto

// ─── Hook genérico de carga: local (Dexie) → remoto (Supabase) ───────────────
// Reemplaza useReinos, useCriaturas, useObjetos, useCiudades, usePersonajesList,
// useEntidadesMagicas y useRunas, que eran idénticos salvo la tabla y el select.
function useEntityList<T>(
  tablaLocal: string,
  buildQuery: () => any,
  mapResult: (row: any) => T = (r) => r as T,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchRemote = useCallback(async (ctrl: AbortController) => {
    try {
      const { data } = await buildQuery().abortSignal(ctrl.signal);
      if (ctrl.signal.aborted || !isMounted.current) return;
      const result = (data ?? []).map(mapResult) as T[];
      setItems(result);
      setLoading(false);
      _entityLastFetch[tablaLocal] = Date.now();
      // Solo escribe en Dexie si hay datos para no borrar la caché con array vacío
      if (result.length) await dexieWriteAll(tablaLocal, result);
    } catch (e: any) {
      if (ctrl.signal.aborted || e?.name === "AbortError") return;
      if (isMounted.current) setLoading(false);
    }
  // tablaLocal is stable; buildQuery/mapResult are inline — intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablaLocal]);

  useEffect(() => {
    isMounted.current = true;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      try {
        const local = await dexieReadAll<T>(tablaLocal);
        if (ctrl.signal.aborted || !isMounted.current) return;
        if (local.length) { setItems(local); setLoading(false); }
        if (!navigator.onLine) { if (!local.length) setLoading(false); return; }

        // Si tenemos datos locales y el fetch fue reciente, no volvemos a pedir
        const lastFetch = _entityLastFetch[tablaLocal] ?? 0;
        const isFresh = local.length > 0 && (Date.now() - lastFetch) < ENTITY_TTL_MS;
        if (isFresh) return;

        await fetchRemote(ctrl);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
    };

    run();

    // Al recuperar conexión siempre forzamos fetch remoto (ignora TTL)
    const handleOnline = () => {
      if (!isMounted.current) return;
      const freshCtrl = new AbortController();
      abortRef.current = freshCtrl;
      fetchRemote(freshCtrl);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted.current = false;
      ctrl.abort();
      window.removeEventListener("online", handleOnline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablaLocal, fetchRemote]);

  return { items, setItems, loading };
}

// Wrappers tipados que conservan los nombres originales usados en PanelListas
function useReinos() {
  const { items, setItems, loading } = useEntityList<Reino>(
    "reinos",
    () => supabase.from("reinos").select("*").order("nombre"),
  );
  return { reinos: items, setReinos: setItems, loading };
}

function useCriaturas() {
  const { items, setItems, loading } = useEntityList<CriaturaMin>(
    "criaturas",
    () => supabase.from("criaturas").select("id, nombre, imagen_url, habitat").order("nombre"),
  );
  return { criaturas: items, setCriaturas: setItems, loading };
}

function useObjetos() {
  const { items, setItems, loading } = useEntityList<ObjetoMin>(
    "items",
    () => supabase.from("items").select("id, nombre, imagen_url, categoria").order("nombre"),
  );
  return { objetos: items, setObjetos: setItems, loading };
}

function useCiudades() {
  const { items, setItems, loading } = useEntityList<CiudadMin>(
    "ciudades",
    () => supabase.from("ciudades").select("id, nombre, imagen_url, tipo, reino_id").order("nombre"),
  );
  return { ciudades: items, setCiudades: setItems, loading };
}


function usePersonajesList() {
  const { items, setItems, loading } = useEntityList<Personaje>(
    "personajes",
    () => supabase.from("personajes").select("id, nombre, img_url, especie, sobre, reino").order("nombre"),
  );
  return { personajes: items, setPersonajes: setItems, loading };
}


function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchRemote = useCallback(async (ctrl: AbortController, id: string) => {
    try {
      const { data } = await (supabase.from("criatura_variantes").select("id, tipo").eq("criatura_id", id).order("tipo") as any).abortSignal(ctrl.signal);
      if (ctrl.signal.aborted || !isMounted.current) return;
      const result = (data ?? []) as VarianteMin[];
      setVariantes(result);
      setLoading(false);
      try { if (db && result.length) await (db as any).criatura_variantes?.bulkPut(result); } catch {}
    } catch (e: any) {
      if (ctrl.signal.aborted || e?.name === "AbortError") return;
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (!criaturaId) { setVariantes([]); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      setLoading(true);
      try {
        if (db) {
          const local: any[] = await (db as any).criatura_variantes?.where("criatura_id").equals(criaturaId).toArray() ?? [];
          if (ctrl.signal.aborted || !isMounted.current) return;
          if (local.length) { setVariantes(local); setLoading(false); if (!navigator.onLine) return; }
        }
        if (!navigator.onLine) { setLoading(false); return; }
        await fetchRemote(ctrl, criaturaId);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
    };

    run();

    const handleOnline = () => {
      if (!isMounted.current) return;
      const freshCtrl = new AbortController();
      abortRef.current = freshCtrl;
      fetchRemote(freshCtrl, criaturaId);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted.current = false;
      ctrl.abort();
      window.removeEventListener("online", handleOnline);
    };
  }, [criaturaId, fetchRemote]);

  return { variantes, loading };
}

// ─── Hook: grupos del mundo (filtrable por tipo) ──────────────────────────────
type GrupoTodo = { id: string; nombre: string; tipo: string; miembro_ids: string[] };

function useGruposMundo(filtroTipo?: string) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  const fetchRemote = useCallback(async (ctrl: AbortController) => {
    try {
      let query = supabase.from("grupos_mundo").select("id, nombre, tipo, miembro_ids, descripcion, created_at, updated_at").order("nombre");
      if (filtroTipo) query = (query as any).eq("tipo", filtroTipo);
      const { data } = await (query as any).abortSignal(ctrl.signal);
      if (ctrl.signal.aborted || !isMounted.current) return;
      const result = (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo ?? "", miembro_ids: r.miembro_ids ?? [] }));
      setGrupos(result);
      setLoading(false);
      // Persistir en Dexie para uso offline
      try {
        if (db && (db as any).grupos_mundo && data?.length) {
          await (db as any).grupos_mundo.bulkPut(data);
        }
      } catch {}
    } catch (e: any) {
      if (ctrl.signal.aborted || e?.name === "AbortError") return;
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo]);

  useEffect(() => {
    isMounted.current = true;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      try {
        if (db && (db as any).grupos_mundo) {
          const all = await (db as any).grupos_mundo.toArray() as any[];
          if (ctrl.signal.aborted || !isMounted.current) return;
          const local = all
            .filter((g: any) => !g.deleted && (!filtroTipo || g.tipo === filtroTipo))
            .map((g: any) => ({ id: g.id, nombre: g.nombre, tipo: g.tipo ?? "", miembro_ids: g.miembro_ids ?? [] }));
          if (local.length) { setGrupos(local); setLoading(false); }
        }
        if (!navigator.onLine) { setLoading(false); return; }
        await fetchRemote(ctrl);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        if (isMounted.current) setLoading(false);
      }
    };

    run();

    // Recargar al recuperar conexión
    const handleOnline = () => {
      if (!isMounted.current) return;
      const freshCtrl = new AbortController();
      abortRef.current = freshCtrl;
      fetchRemote(freshCtrl);
    };
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted.current = false;
      ctrl.abort();
      window.removeEventListener("online", handleOnline);
    };
  }, [filtroTipo, fetchRemote]);

  return { grupos, loading };
}


function useGruposTodos() {
  const { grupos, loading } = useGruposMundo();
  return { grupos: grupos as GrupoTodo[], loading };
}








// ─── Panel de lista + editor para hechizos o dones ───────────────────────────

type MundoTimelineEvent = TimelineEvent & {
  source: "mundo" | "reino" | "capitulo" | "cancion";
  reinoNombre?: string;
  reinoId?: string;
  yearNum: number;        // dia_absoluto — para ordenar
  dia_absoluto?: number;  // el valor real del calendario
  capData?: CapTimeline;
  cancionData?: { id: string; titulo: string; cantante?: string | null; reinoNombre?: string | null; dia_absoluto?: number };
};

// (Eliminados: parseYear, decodeTimeline, encodeTimeline, newEvent — sistema antiguo)

// ── Tarjeta de capítulo en la línea de tiempo ────────────────────────────────
function CapituloEventoRow({
  cap,
  reinos = [],
  onNavigate,
  onDiaChange,
}: {
  cap: CapTimeline;
  reinos?: { id: string; nombre: string }[];
  onNavigate: () => void;
  onDiaChange?: (id: string, dia: number) => void;
}) {
  const [saving, setSaving] = useState(false);

  const commitDia = async (dia: number | null) => {
    if (dia == null) return;
    setSaving(true);
    await supabase.from("capitulos").update({ dia_absoluto: dia } as any).eq("id", cap.id);
    onDiaChange?.(cap.id, dia);
    setSaving(false);
  };

  const reinosDelCap = (cap.reinos_ids ?? [])
    .map(id => reinos.find(r => r.id === id)?.nombre)
    .filter(Boolean) as string[];

  const diaActual = cap.dia_absoluto ?? null;

  return (
    <div className="group/card" style={{ width: 220 }}>
      <div className="mx-1.5 rounded-xl transition-all"
        style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
        <div className="flex flex-col gap-1.5 p-2">
          {/* Libro */}
          {cap.libroTitulo && (
            <span className="text-[7px] font-black uppercase tracking-widest truncate"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              {cap.libroTitulo}
            </span>
          )}

          {/* Selector de fecha */}
          <div className="relative">
            {saving && <Loader2 size={8} className="animate-spin absolute right-2 top-2 z-10 text-primary/30" />}
            <SelectorFechaMundo value={diaActual} onChange={commitDia} placeholder="Sin fecha…" />
          </div>

          {/* Título navegable */}
          <button type="button" onClick={onNavigate}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg border w-full text-left transition-all"
            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "color-mix(in srgb, var(--primary) 9%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 22%, transparent)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
            title={`Abrir: ${cap.titulo_capitulo}`}>
            <BookOpen size={8} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
            <span className="text-[8px] font-bold truncate" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
              {cap.titulo_capitulo}
            </span>
          </button>

          {/* Reinos */}
          {reinosDelCap.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {reinosDelCap.map(nombre => (
                <span key={nombre} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest"
                  style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                  <Crown size={6} /> {nombre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta horizontal de canción en la línea de tiempo ─────────────────────
function CancionMundoRow({
  cancion,
  onDiaChange,
}: {
  cancion: { id: string; titulo: string; cantante?: string | null; reinoNombre?: string | null; dia_absoluto?: number };
  onDiaChange?: (id: string, dia: number) => void;
}) {
  const [saving, setSaving] = useState(false);

  const commitDia = async (dia: number | null) => {
    if (dia == null) return;
    setSaving(true);
    await supabase.from("canciones").update({ dia_absoluto: dia } as any).eq("id", cancion.id);
    onDiaChange?.(cancion.id, dia);
    setSaving(false);
  };

  const navigate = () => {
    window.dispatchEvent(new CustomEvent("garlia-open-entity", { detail: { tabla: "canciones", id: cancion.id } }));
  };
  return (
    <div className="group/card" style={{ width: 220 }}>
      <div className="mx-1.5 rounded-xl transition-all"
        style={{ border: "1px solid color-mix(in srgb, var(--accent) 14%, transparent)", background: "color-mix(in srgb, var(--accent) 2%, transparent)" }}>
        <div className="flex flex-col gap-1.5 p-2">
          {/* Reino */}
          {cancion.reinoNombre && (
            <span className="text-[7px] font-black uppercase tracking-widest truncate"
              style={{ color: "color-mix(in srgb, var(--accent) 35%, transparent)" }}>
              {cancion.reinoNombre}
            </span>
          )}
          {/* Selector de fecha */}
          <div className="relative">
            {saving && <Loader2 size={8} className="animate-spin absolute right-2 top-2 z-10 text-accent/40" />}
            <SelectorFechaMundo value={cancion.dia_absoluto ?? null} onChange={commitDia} placeholder="Sin fecha…" />
          </div>
          {/* Título */}
          <button type="button" onClick={navigate}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg border w-full text-left transition-all"
            style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "color-mix(in srgb, var(--accent) 9%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--accent) 22%, transparent)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "color-mix(in srgb, var(--accent) 4%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
            title={`Abrir: ${cancion.titulo}`}>
            <Music size={8} style={{ color: "color-mix(in srgb, var(--accent) 40%, transparent)", flexShrink: 0 }} />
            <span className="text-[8px] font-bold truncate" style={{ color: "color-mix(in srgb, var(--accent) 65%, var(--primary))" }}>
              {cancion.titulo}
            </span>
          </button>
          {cancion.cantante && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest truncate self-start"
              style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", color: "color-mix(in srgb, var(--accent) 50%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", maxWidth: "100%" }}>
              <Music size={6} /> {cancion.cantante}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de evento de mundo/reino (tabla eventos_mundo, editable) ────────
function EventoMundoRow({
  evt,
  onDiaChange,
}: {
  evt: MundoTimelineEvent;
  onDiaChange?: (id: string, dia: number) => void;
}) {
  const [saving, setSaving] = useState(false);

  const commitDia = async (dia: number | null) => {
    if (dia == null) return;
    setSaving(true);
    await onDiaChange?.(evt.id, dia);
    setSaving(false);
  };

  return (
    <div className="group/card" style={{ width: 188 }}>
      <div className="mx-1.5 rounded-xl p-2 flex flex-col gap-1.5"
        style={{
          border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2.5%, transparent)",
        }}>
        {/* Selector de fecha (editable) */}
        <div className="relative">
          {saving && <Loader2 size={8} className="animate-spin absolute right-2 top-2 z-10 text-primary/30" />}
          <SelectorFechaMundo value={evt.dia_absoluto ?? null} onChange={commitDia} placeholder="Sin fecha…" />
        </div>
        <div className="px-1 text-[10px] font-bold truncate" style={{ color: "var(--primary)" }}>
          {evt.title}
        </div>
        {evt.reinoNombre && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest truncate self-start"
            style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", maxWidth: "150px" }}>
            <Crown size={6} /> {evt.reinoNombre}
          </span>
        )}
        {evt.description && (
          <p className="px-1 text-[8px] leading-snug line-clamp-3 opacity-70" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
            {evt.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tarjeta horizontal de evento (mundo O reino) — solo visualización ────────
// ─── Tipo para capítulos con posición en línea de tiempo ─────────────────────
type CapTimeline = {
  id: string;
  libro_id: string;
  titulo_capitulo: string;
  orden_linea_tiempo?: number;  // legacy — opcional, se mantiene por compatibilidad
  dia_absoluto?: number;        // nuevo campo del calendario
  libroTitulo?: string;
  reinos_ids?: string[];
};

// ── Carga reinos con historia completa (query dedicada, no el hook genérico) ──
let _reinosLastFetch = 0;
const REINOS_TTL_MS = 60_000; // 1 minuto

function useReinosConHistoria() {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const cargar = useCallback(async (force = false) => {
    if (!isMounted.current) return;
    if (!force) setLoading(true);

    // 1. Dexie primero — respuesta inmediata aunque estemos offline
    try {
      const local: any[] = db ? await (db as any).reinos?.toArray() ?? [] : [];
      const filtered = local.filter((r: any) => !r.deleted);
      if (filtered.length && isMounted.current) {
        setReinos(filtered as Reino[]);
        setLoading(false);
      }
    } catch {}

    // 2. Supabase — solo si hay conexión real
    if (!navigator.onLine || !isMounted.current) { setLoading(false); return; }

    // Si no es un force-reload y el fetch fue reciente, nos quedamos con Dexie
    if (!force && (Date.now() - _reinosLastFetch) < REINOS_TTL_MS) { return; }

    try {
      const { data } = await supabase
        .from("reinos")
        .select("*") // necesitamos historia completa
        .order("nombre");
      if (!isMounted.current) return;
      if (data?.length) {
        setReinos(data as Reino[]);
        _reinosLastFetch = Date.now();
        // Persistir en Dexie con historia incluida
        try {
          if (db) await (db as any).reinos?.bulkPut(data);
        } catch {}
      }
    } catch {}

    if (isMounted.current) setLoading(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    cargar();

    // Recargar al recuperar conexión
    const handleOnline = () => { cargar(true); };
    window.addEventListener("online", handleOnline);

    // Recargar cuando el sync offline termina de subir cambios
    const unsubSync = onSyncDone(() => { if (isMounted.current) cargar(true); });

    return () => {
      isMounted.current = false;
      window.removeEventListener("online", handleOnline);
      unsubSync();
    };
  }, [cargar]);

  return { reinos, setReinos, loading, recargar: () => cargar(true) };
}

// ── Panel principal — vista y edición unificadas, ambas pistas editables ──────
function PanelHistoriaMundo({
  texto,
  onChange,
  onSave,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
}) {
  // Sistema antiguo de eventos "mundo"/"reino" (basado en columna historia JSON) eliminado.

  const { reinos, setReinos, loading: loadingReinos, recargar } = useReinosConHistoria();

  // ── Capítulos con posición en línea de tiempo ─────────────────────────────
  const [capsTimeline, setCapsTimeline] = useState<CapTimeline[]>([]);
  // Mapa de todos los capítulos con reinos_ids (para los botones de filtro,
  // independientemente de si tienen orden_linea_tiempo)
  const [capsReinosIds, setCapsReinosIds] = useState<Record<string, string[]>>({});

  // ── Canciones con posición en línea de tiempo ─────────────────────────────
  const [cancionesTimeline, setCancionesTimeline] = useState<{ id: string; titulo: string; cantante?: string | null; reinoNombre?: string | null; dia_absoluto?: number; orden_linea_tiempo?: number }[]>([]);

  // ── Eventos de mundo/reino (tabla eventos_mundo, sistema nuevo) ───────────
  const [eventosMundo, setEventosMundo] = useState<{ id: string; titulo: string; descripcion: string; dia_absoluto: number; reinoId?: string | null; reinoNombre?: string | null; source: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cargarEventosMundo = async () => {
      // 1. Dexie primero
      try {
        if (db && (db as any).eventos_mundo) {
          const local: any[] = await (db as any).eventos_mundo.toArray();
          if (local.length && !cancelled) {
            let reinoMap: Record<string, string> = {};
            try {
              if (db && (db as any).reinos) {
                const rs: any[] = await (db as any).reinos.toArray();
                rs.forEach((r: any) => { reinoMap[r.id] = r.nombre; });
              }
            } catch {}
            setEventosMundo(local.map((e: any) => ({
              id: e.id, titulo: e.titulo ?? "Sin título",
              descripcion: e.descripcion ?? "",
              dia_absoluto: e.dia_absoluto,
              reinoId: e.reino_id ?? null,
              reinoNombre: e.reino_id ? (reinoMap[e.reino_id] ?? null) : null,
              source: e.source ?? "mundo",
            })));
          }
        }
      } catch {}
      if (!navigator.onLine || cancelled) return;
      // 2. Remoto
      try {
        const { data } = await supabase
          .from("eventos_mundo")
          .select("id, titulo, descripcion, dia_absoluto, reino_id, source, reinos!reino_id(nombre)");
        if (!data || cancelled) return;
        setEventosMundo(data.map((e: any) => {
          const reino = Array.isArray(e.reinos) ? e.reinos[0] : e.reinos;
          return {
            id: e.id, titulo: e.titulo ?? "Sin título",
            descripcion: e.descripcion ?? "",
            dia_absoluto: e.dia_absoluto,
            reinoId: e.reino_id ?? null,
            reinoNombre: reino?.nombre ?? null,
            source: e.source ?? "mundo",
          };
        }));
        const flat = data.map((e: any) => ({ ...e, reinos: undefined }));
        try { if (db && (db as any).eventos_mundo) await (db as any).eventos_mundo.bulkPut(flat); } catch {}
      } catch {}
    };
    cargarEventosMundo();
    const handleOnline = () => { if (!cancelled) cargarEventosMundo(); };
    window.addEventListener("online", handleOnline);
    return () => { cancelled = true; window.removeEventListener("online", handleOnline); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cargarCanciones = async () => {
      // 1. Dexie primero
      try {
        if (db && (db as any).canciones) {
          const local: any[] = await (db as any).canciones.toArray();
          const conDia = local.filter(c => c.dia_absoluto != null && !c.deleted);
          if (conDia.length && !cancelled) {
            let reinoMap: Record<string, string> = {};
            try {
              if (db && (db as any).reinos) {
                const rs: any[] = await (db as any).reinos.toArray();
                rs.forEach((r: any) => { reinoMap[r.id] = r.nombre; });
              }
            } catch {}
            setCancionesTimeline(conDia.map(c => ({
              id: c.id, titulo: c.titulo ?? "Sin título",
              cantante: c.cantante ?? null,
              reinoNombre: c.reino_id ? (reinoMap[c.reino_id] ?? null) : null,
              dia_absoluto: c.dia_absoluto,
            })));
          }
        }
      } catch {}
      if (!navigator.onLine || cancelled) return;
      // 2. Remoto
      try {
        const { data } = await supabase
          .from("canciones")
          .select("id, titulo, cantante, dia_absoluto, reino_id, reinos!reino_id(nombre)")
          .not("dia_absoluto", "is", null);
        if (!data?.length || cancelled) return;
        setCancionesTimeline(data.map((c: any) => {
          const reino = Array.isArray(c.reinos) ? c.reinos[0] : c.reinos;
          return {
            id: c.id, titulo: c.titulo ?? "Sin título",
            cantante: c.cantante ?? null,
            reinoNombre: reino?.nombre ?? null,
            dia_absoluto: c.dia_absoluto ?? undefined,
            orden_linea_tiempo: c.orden_linea_tiempo ?? undefined,
          };
        }));
        const flat = data.map((c: any) => ({ ...c, reinos: undefined }));
        if (db && (db as any).canciones) await (db as any).canciones.bulkPut(flat);
      } catch {}
    };
    cargarCanciones();
    const handleOnline = () => { if (!cancelled) cargarCanciones(); };
    window.addEventListener("online", handleOnline);
    return () => { cancelled = true; window.removeEventListener("online", handleOnline); };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cargarCaps = async () => {
      // 1. Leer de Dexie primero — respuesta instantánea sin red
      try {
        if (db) {
          const [localCaps, localLibros]: [any[], any[]] = await Promise.all([
            (db as any).capitulos?.toArray() ?? [],
            (db as any).libros?.toArray() ?? [],
          ]);
          const libroMapLocal: Record<string, string> = {};
          localLibros.forEach((l: any) => { libroMapLocal[l.id] = l.titulo ?? ""; });

          const conDia = localCaps.filter((c: any) => c.dia_absoluto != null);
          if (conDia.length && !cancelled) {
            setCapsTimeline(conDia.map((c: any) => ({
              id: c.id,
              libro_id: c.libro_id,
              titulo_capitulo: c.titulo_capitulo,
              dia_absoluto: c.dia_absoluto,
              libroTitulo: libroMapLocal[c.libro_id] ?? "",
              reinos_ids: c.reinos_ids ?? [],
            })));
          }

          const mapLocal: Record<string, string[]> = {};
          localCaps.forEach((c: any) => { if (c.reinos_ids?.length) mapLocal[c.id] = c.reinos_ids; });
          if (Object.keys(mapLocal).length && !cancelled) setCapsReinosIds(mapLocal);
        }
      } catch {}

      // 2. Fetch remoto en paralelo si hay conexión
      if (!navigator.onLine || cancelled) return;

      try {
        // Lanzar ambas queries al mismo tiempo en lugar de secuencialmente
        const [capsRes, capsReinosRes] = await Promise.all([
          supabase
            .from("capitulos")
            .select("id, libro_id, titulo_capitulo, dia_absoluto, reinos_ids")
            .not("dia_absoluto", "is", null),
          supabase
            .from("capitulos")
            .select("id, reinos_ids")
            .not("reinos_ids", "is", null),
        ]);
        if (cancelled) return;

        // Actualizar mapa de reinos_ids para los filtros
        const capsConReinos = capsReinosRes.data ?? [];
        if (capsConReinos.length) {
          const map: Record<string, string[]> = {};
          for (const c of capsConReinos as any[]) {
            if (c.reinos_ids?.length) map[c.id] = c.reinos_ids;
          }
          if (!cancelled) setCapsReinosIds(map);
        }

        // Actualizar pista de línea de tiempo
        const capsData = capsRes.data ?? [];
        if (capsData.length) {
          // Resolver títulos de libros desde Dexie primero, solo pedir los que faltan
          const libroIds = [...new Set((capsData as any[]).map((c: any) => c.libro_id).filter(Boolean))];
          let libroMap: Record<string, string> = {};
          try {
            if (db && libroIds.length) {
              const localLibros: any[] = await (db as any).libros?.toArray() ?? [];
              localLibros.forEach((l: any) => { libroMap[l.id] = l.titulo ?? ""; });
            }
          } catch {}

          const missingIds = libroIds.filter(id => !libroMap[id]);
          if (missingIds.length) {
            try {
              const { data: libros } = await supabase
                .from("libros")
                .select("id, titulo")
                .in("id", missingIds);
              if (!cancelled) {
                (libros ?? []).forEach((l: any) => { libroMap[l.id] = l.titulo ?? ""; });
                // Persistir libros nuevos en Dexie
                if (db && libros?.length) await (db as any).libros?.bulkPut(libros).catch(() => {});
              }
            } catch {}
          }

          if (!cancelled) {
            setCapsTimeline((capsData as any[]).map(c => ({
              id: c.id,
              libro_id: c.libro_id,
              titulo_capitulo: c.titulo_capitulo,
              orden_linea_tiempo: c.orden_linea_tiempo,
              libroTitulo: libroMap[c.libro_id] ?? "",
              reinos_ids: c.reinos_ids ?? [],
            })));
            // Persistir capítulos en Dexie para la próxima carga offline
            try {
              if (db) await (db as any).capitulos?.bulkPut(capsData).catch(() => {});
            } catch {}
          }
        }
      } catch {}
    };

    cargarCaps();

    // Recargar al volver online
    const handleOnline = () => { if (!cancelled) cargarCaps(); };
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // (Eliminado: inicialización de reinoEvents desde reino.historia)

  // (Eliminados: handleMundoChange, updateReinoEvent, removeReinoEvent, saveReinoHistory)

  const { cal } = useCalendario();
  const [filterReino, setFilterReino] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [diaOverrides, setDiaOverrides] = useState<Record<string, number>>({});

  const handleDiaChange = (id: string, dia: number) => {
    setDiaOverrides(prev => ({ ...prev, [id]: dia }));
  };

  const handleEventoMundoDiaChange = useCallback(async (id: string, dia: number) => {
    setEventosMundo(prev => prev.map(e => e.id === id ? { ...e, dia_absoluto: dia } : e));
    try {
      await supabase.from("eventos_mundo").update({ dia_absoluto: dia } as any).eq("id", id);
    } catch {}
    try {
      if (db && (db as any).eventos_mundo) {
        const existing = await (db as any).eventos_mundo.get(id);
        await (db as any).eventos_mundo.put({ ...(existing ?? { id }), dia_absoluto: dia });
      }
    } catch {}
  }, []);
  const { onSnippetAction } = useWikilink();
  const debounceHistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try { await onSave(); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }
    catch { setSaveStatus("error"); }
  }, [onSave]);

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (debounceHistRef.current) { clearTimeout(debounceHistRef.current); debounceHistRef.current = null; }
        void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // (Eliminados: add, update, remove, handleSaveReinoEvent — eventos "mundo"/"reino")

  const allEvents = useMemo<MundoTimelineEvent[]>(() => {
    const list: MundoTimelineEvent[] = [];
    // Sistema antiguo (mundoEvents / reinoEvents basados en "historia" JSON) eliminado.
    // Solo se usa el sistema nuevo: capítulos y canciones con dia_absoluto.
    // Capítulos — solo los que tienen dia_absoluto
    for (const cap of capsTimeline) {
      const dia = diaOverrides[cap.id] ?? cap.dia_absoluto;
      if (dia == null) continue; // sin fecha del calendario → no aparece
      list.push({
        id: `cap:${cap.id}`,
        year: String(dia),
        title: cap.titulo_capitulo,
        description: "",
        source: "capitulo",
        yearNum: dia,
        dia_absoluto: dia,
        capData: cap,
      });
    }
    // Eventos de mundo/reino — tabla eventos_mundo (sistema nuevo)
    for (const e of eventosMundo) {
      if (filterReino && e.reinoId !== filterReino) continue;
      const dia = e.dia_absoluto;
      if (dia == null) continue;
      list.push({
        id: e.id,
        year: String(dia),
        title: e.titulo,
        description: e.descripcion,
        source: e.reinoId ? "reino" : "mundo",
        reinoId: e.reinoId ?? undefined,
        reinoNombre: e.reinoNombre ?? undefined,
        yearNum: dia,
        dia_absoluto: dia,
      });
    }
    // Canciones — solo las que tienen dia_absoluto
    for (const c of cancionesTimeline) {
      const dia = diaOverrides[c.id] ?? c.dia_absoluto;
      if (dia == null) continue; // sin fecha del calendario → no aparece
      list.push({
        id: `cancion:${c.id}`,
        year: String(dia),
        title: c.titulo,
        description: "",
        source: "cancion",
        yearNum: dia,
        dia_absoluto: dia,
        cancionData: { id: c.id, titulo: c.titulo, cantante: c.cantante, reinoNombre: c.reinoNombre ?? null, dia_absoluto: dia },
      });
    }
    return list.sort((a, b) => {
      const diff = a.yearNum - b.yearNum;
      if (diff !== 0) return diff;
      const order = { mundo: 0, reino: 1, cancion: 2, capitulo: 3 };
      return (order[a.source] ?? 1) - (order[b.source] ?? 1);
    });
  }, [filterReino, capsTimeline, cancionesTimeline, eventosMundo, diaOverrides]);

  const reinosConEventos = useMemo(
    () => reinos.filter(r => {
      // Solo sistema nuevo: reinos que tienen capítulos asociados
      const tieneCaps = Object.values(capsReinosIds).some(ids => ids.includes(r.id));
      return tieneCaps;
    }),
    [reinos, capsReinosIds]
  );

  // (Eliminados: selectedEvt, handleUpdateSelected — panel de edición de eventos "mundo"/"reino")

  return (
    <div className="flex flex-col">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b flex-wrap"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>

        {/* Filtro por reino */}
        {reinosConEventos.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={8} style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }} />
            <button onClick={() => setFilterReino(null)}
              className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
              style={filterReino === null ? {
                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 22%, transparent)",
                color: "var(--primary)",
              } : { borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
              Todos
            </button>
            {reinosConEventos.map(r => (
              <button key={r.id} onClick={() => setFilterReino(prev => prev === r.id ? null : r.id)}
                className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
                style={filterReino === r.id ? {
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--primary) 22%, transparent)",
                  color: "var(--primary)",
                } : { borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                {r.nombre}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <SaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={() => {
              recargar();
            }}
            title="Recargar línea de tiempo"
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--primary)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 28%, transparent)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "color-mix(in srgb, var(--primary) 35%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 12%, transparent)"; }}
          >
            {loadingReinos
              ? <Loader2 size={9} className="animate-spin" />
              : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            }
          </button>
        </div>
      </div>

      {/* ── Pista única: acontecimientos + capítulos en un solo scroll ──────── */}
      <div className="px-3 py-3">
        {loadingReinos ? (
          <div className="flex justify-center py-4">
            <Loader2 size={14} className="animate-spin text-primary/20" />
          </div>
        ) : (
          <div className="overflow-x-auto pb-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "color-mix(in srgb, var(--primary) 15%, transparent) transparent" }}>
            <div className="relative flex items-start" style={{ minWidth: "max-content", paddingLeft: 8, paddingRight: 8 }}>

              {/* ── Franjas de eras del mundo ─────────────────────────── */}
              {cal && cal.eras.length > 0 && allEvents.length > 0 && (() => {
                const CARD_W = 222;
                const minDia = allEvents[0]?.yearNum ?? 0;
                const maxDia = allEvents[allEvents.length - 1]?.yearNum ?? 0;
                const totalDias = maxDia - minDia || 1;
                const totalPx = allEvents.length * CARD_W;
                return cal.eras.map(era => {
                  const eraInicio = Math.max(era.anio_inicio * 500, minDia);
                  const eraFin = era.anio_fin != null ? Math.min(era.anio_fin * 500 + 499, maxDia) : maxDia;
                  if (eraFin < minDia || eraInicio > maxDia) return null;
                  const left = ((eraInicio - minDia) / totalDias) * totalPx;
                  const width = ((eraFin - eraInicio) / totalDias) * totalPx;
                  return (
                    <div key={era.id} className="absolute top-0 bottom-0 pointer-events-none"
                      style={{ left, width, background: era.color ? `${era.color}10` : "transparent", borderLeft: era.color ? `1px solid ${era.color}30` : "none" }}>
                      <span className="absolute top-1 left-1.5 text-[7px] font-black uppercase tracking-widest whitespace-nowrap"
                        style={{ color: era.color ?? "var(--primary)", opacity: 0.5 }}>
                        {era.nombre}
                      </span>
                    </div>
                  );
                });
              })()}

              {allEvents.map((evt, idx) => {
                const isCapitulo = evt.source === "capitulo";
                const isCancion = evt.source === "cancion";
                const isEventoMundo = evt.source === "mundo" || evt.source === "reino";
                const totalLen = allEvents.length;
                const key = evt.id;
                return (
                  <div key={key} className="flex flex-col shrink-0" style={{ width: 190 }}>
                    {/* Nodo en la línea */}
                    <div className="flex items-center" style={{ height: 26 }}>
                      <div className="flex-1 h-px" style={{ background: idx === 0 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                      <div className="shrink-0 rounded-full transition-all"
                        style={isCapitulo ? {
                          width: 8, height: 8,
                          background: "color-mix(in srgb, var(--accent) 70%, var(--primary))",
                          boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent)",
                        } : isCancion ? {
                          width: 8, height: 8,
                          background: "var(--accent)",
                          boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)",
                        } : {
                          width: 10, height: 10,
                          background: "var(--primary)",
                          boxShadow: "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)",
                        }} />
                      <div className="flex-1 h-px" style={{ background: idx === totalLen - 1 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                    </div>
                    {/* Tarjeta */}
                    {isCancion && evt.cancionData ? (
                      <CancionMundoRow cancion={evt.cancionData} onDiaChange={handleDiaChange} />
                    ) : isCapitulo && evt.capData ? (
                      <CapituloEventoRow
                        cap={evt.capData}
                        reinos={reinos}
                        onDiaChange={handleDiaChange}
                        onNavigate={() => {
                          localStorage.setItem("estudio-caps-last-cap", evt.capData!.id);
                          localStorage.setItem("estudio-caps-last-libro", evt.capData!.libro_id);
                          window.dispatchEvent(new Event("estudio-caps-action"));
                        }}
                      />
                    ) : isEventoMundo ? (
                      <EventoMundoRow evt={evt} onDiaChange={handleEventoMundoDiaChange} />
                    ) : null}
                  </div>
                );
              })}

              {/* Estado vacío */}
              {allEvents.length === 0 && filterReino && (
                <p className="text-[9px] text-primary/20 italic px-4 py-2 self-center">Sin eventos para este reino.</p>
              )}
              {allEvents.length === 0 && !filterReino && (
                <p className="text-[9px] text-primary/20 italic px-2 py-2 self-center">Sin capítulos o canciones con fecha asignada.</p>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tipos de labels externalizados ──────────────────────────────────────────
export type SectionLabels = {
  historia?: string;
  capitulos?: string;
  entidades?: string;
};

export type EntityLabels = {
  reinos?: string;
  criaturas?: string;
  personajes?: string;
  objetos?: string;
  ciudades?: string;
  hechizos?: string;
  dones?: string;
  runas?: string;
  notas?: string;
  grupos?: string;
  canciones?: string;
};

const DEFAULT_SECTION_LABELS: Required<SectionLabels> = {
  historia: "Historia",
  capitulos: "Capítulos",
  entidades: "Entidades",
};

const DEFAULT_ENTITY_LABELS: Required<EntityLabels> = {
  reinos: "Reinos",
  criaturas: "Criaturas",
  personajes: "Personajes",
  objetos: "Objetos",
  ciudades: "Ciudades",
  hechizos: "Hechizos",
  dones: "Dones",
  runas: "Runas",
  notas: "Notas",
  grupos: "Grupos",
  canciones: "Canciones",
};

// ─── EditorMundo unificado ────────────────────────────────────────────────────
export function EditorMundo({
  textos,
  onTextoChange,
  onSave,
  initialItemId,
  openItem,
  onOverlayChange,
  onItemCreated,
  sectionLabels,
  entityLabels,
}: {
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
  initialItemId?: string;
  openItem?: { tabla: string; id: string; key?: number } | null;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  onItemCreated?: { tabla: string; item: any } | null;
  sectionLabels?: SectionLabels;
  entityLabels?: EntityLabels;
}) {
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <PanelListas
        initialItemId={initialItemId}
        openItem={openItem}
        textos={textos}
        onTextoChange={onTextoChange}
        onSave={onSave}
        onOverlayChange={onOverlayChange}
        onItemCreated={onItemCreated}
        sectionLabels={sectionLabels}
        entityLabels={entityLabels}
      />
    </div>
  );
}

// ─── Constante de localStorage ────────────────────────────────────────────────
const LS_ITEM_KEY = "garlia-panel-item";
const LS_SCROLL_KEY = "garlia-scroll-pos";

// ─── PanelListas: scroll vertical único ───────────────────────────────────────
function PanelListas({
  initialItemId, openItem,
  textos, onTextoChange, onSave, onOverlayChange, onItemCreated,
  sectionLabels: sectionLabelsProp,
  entityLabels: entityLabelsProp,
}: {
  initialItemId?: string;
  openItem?: { tabla: string; id: string; key?: number } | null;
  textos?: Record<MundoSectionKey, string>;
  onTextoChange?: (section: MundoSectionKey, value: string) => void;
  onSave?: (section: MundoSectionKey) => Promise<void>;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  onItemCreated?: { tabla: string; item: any } | null;
  sectionLabels?: SectionLabels;
  entityLabels?: EntityLabels;
}) {
  // ── Labels resueltos (prop > default) ────────────────────────────────────
  const sl = { ...DEFAULT_SECTION_LABELS, ...sectionLabelsProp };
  const el = { ...DEFAULT_ENTITY_LABELS,  ...entityLabelsProp  };

  // ── Datos — todos cargan al montar ───────────────────────────────────────
  const { reinos,    setReinos,    loading: loadingReinos    } = useReinos();
  const { criaturas, setCriaturas, loading: loadingCriaturas } = useCriaturas();
  const { objetos,   setObjetos,   loading: loadingObjetos   } = useObjetos();
  const { ciudades,   setCiudades,   loading: loadingCiudades   } = useCiudades();
  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesList();
  const { items: hechizos, setItems: setHechizos, loading: loadingHechizos } = useEntityList<EntidadMagicaMin>(
    "hechizos",
    () => supabase.from("hechizos").select("id, nombre").order("nombre"),
  );
  const { items: dones,    setItems: setDones,    loading: loadingDones    } = useEntityList<EntidadMagicaMin>(
    "dones",
    () => supabase.from("dones").select("id, nombre").order("nombre"),
  );
  const { items: runas,    setItems: setRunas,    loading: loadingRunas    } = useEntityList<RunaMin>(
    "runas",
    () => supabase.from("runas").select("id, nombre, imagen_url").order("nombre"),
  );
  // Canciones: carga paginada directa desde Supabase (evita el límite de 1000 filas)
  // Dexie se usa solo como caché de lectura rápida; nunca se borran filas locales
  // que no lleguen en el fetch (bulkPut en lugar de dexieWriteAll).
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [loadingCanciones, setLoadingCanciones] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const cargarCanciones = async () => {
      // 1. Dexie primero — respuesta instantánea aunque haya 100+ canciones
      try {
        const local = await dexieReadAll<Cancion>("canciones");
        if (local.length && !cancelled) {
          setCanciones(local);
          setLoadingCanciones(false);
        }
      } catch {}

      if (!navigator.onLine || cancelled) {
        setLoadingCanciones(false);
        return;
      }

      // 2. Supabase con paginación completa (PAGE_SIZE páginas hasta agotar)
      try {
        const PAGE_SIZE = 1000;
        let page = 0;
        const todas: Cancion[] = [];
        while (true) {
          const { data, error } = await supabase
            .from("canciones")
            .select("id, titulo, cantante, compositor, idioma, estado, portada_url, links, visible, created_at, updated_at, personaje_id")
            .order("titulo")
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
          if (cancelled) return;
          if (error || !data) break;
          todas.push(...(data as unknown as Cancion[]));
          if (data.length < PAGE_SIZE) break; // última página
          page++;
        }
        if (!cancelled && todas.length) {
          setCanciones(todas);
          setLoadingCanciones(false);
          // Persistir en Dexie sin borrar filas que no llegaron (bulkPut conserva todo)
          try {
            if (db && (db as any).canciones) await (db as any).canciones.bulkPut(todas);
          } catch {}
        } else if (!cancelled) {
          setLoadingCanciones(false);
        }
      } catch {
        if (!cancelled) setLoadingCanciones(false);
      }
    };

    cargarCanciones();
    const handleOnline = () => { if (!cancelled) cargarCanciones(); };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);
  const { grupos, loaded: loadedGrupos, actualizarGrupo, eliminarGrupo } = useGrupos();
  const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } = useNotas();

  // ── Estado de selección (overlay) ────────────────────────────────────────
  const [selectedReino,     setSelectedReino]     = useState<Reino | null>(null);
  const [selectedCriatura,  setSelectedCriatura]  = useState<{ id: string; nombre: string; imagen_url?: string; habitat?: string } | null>(null);
  const [selectedObjeto,    setSelectedObjeto]    = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string } | null>(null);
  const [selectedCiudad,     setSelectedCiudad]     = useState<Ciudad | null>(null);
  const [selectedPersonaje, setSelectedPersonaje] = useState<Personaje | null>(null);
  const [selectedHechizo,   setSelectedHechizo]   = useState<EntidadMagicaMin | null>(null);
  const [selectedDon,       setSelectedDon]       = useState<EntidadMagicaMin | null>(null);
  const [selectedRuna,      setSelectedRuna]      = useState<RunaMin | null>(null);
  const [selectedNota,      setSelectedNota]      = useState<Nota | null>(null);
  const [selectedGrupo,     setSelectedGrupo]     = useState<Grupo | null>(null);
  const [selectedCancion,   setSelectedCancion]   = useState<Cancion | null>(null);
  const [showModalCancion,  setShowModalCancion]  = useState(false);

  // ── Scroll position ───────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capitulosRef = useRef<HTMLDivElement>(null);

  // Restaurar posición de scroll al montar
  useEffect(() => {
    const saved = (() => { try { return parseFloat(localStorage.getItem(LS_SCROLL_KEY) ?? ""); } catch { return NaN; } })();
    if (!isNaN(saved) && scrollRef.current) {
      scrollRef.current.scrollTop = saved;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
    scrollSaveTimer.current = setTimeout(() => {
      try { localStorage.setItem(LS_SCROLL_KEY, String(scrollRef.current?.scrollTop ?? 0)); } catch {}
    }, 200);
  }, []);

  // ── Persistencia del item abierto ─────────────────────────────────────────
  const persistOpenItem = useCallback((tabla: string, id: string) => {
    try { localStorage.setItem(LS_ITEM_KEY, JSON.stringify({ tabla, id })); } catch {}
  }, []);
  const clearPersistedItem = useCallback(() => {
    try { localStorage.removeItem(LS_ITEM_KEY); } catch {}
  }, []);

  // ── Wrappers que persisten el item ────────────────────────────────────────
  const selectReino     = useCallback((r: Reino | null)         => { setSelectedReino(r);     r ? persistOpenItem("reinos",     r.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectCriatura  = useCallback((c: any | null)           => { setSelectedCriatura(c);  c ? persistOpenItem("criaturas",  c.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectObjeto    = useCallback((o: any | null)           => { setSelectedObjeto(o);    o ? persistOpenItem("items",      o.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectCiudad     = useCallback((l: Ciudad | null)         => { setSelectedCiudad(l);     l ? persistOpenItem("ciudades",    l.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectPersonaje = useCallback((p: Personaje | null)     => { setSelectedPersonaje(p); p ? persistOpenItem("personajes", p.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectHechizo   = useCallback((h: EntidadMagicaMin | null) => { setSelectedHechizo(h);   h ? persistOpenItem("hechizos",   h.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectDon       = useCallback((d: EntidadMagicaMin | null) => { setSelectedDon(d);       d ? persistOpenItem("dones",      d.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectRuna      = useCallback((r: RunaMin | null)          => { setSelectedRuna(r);      r ? persistOpenItem("runas",      r.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectGrupo     = useCallback((g: Grupo | null)         => { setSelectedGrupo(g);     g ? persistOpenItem("grupos_mundo", g.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectCancion   = useCallback((c: Cancion | null)       => { setSelectedCancion(c);   c ? persistOpenItem("canciones",   c.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  // ── Overlay activo ────────────────────────────────────────────────────────
  const overlay: "reino" | "criatura" | "objeto" | "personaje" | "hechizo" | "don" | "runa" | "nota" | "ciudad" | "grupo" | "cancion" | null =
    selectedReino     ? "reino"     :
    selectedCriatura  ? "criatura"  :
    selectedObjeto    ? "objeto"    :
    selectedCiudad     ? "ciudad"     :
    selectedPersonaje ? "personaje" :
    selectedHechizo   ? "hechizo"   :
    selectedDon       ? "don"       :
    selectedRuna      ? "runa"      :
    selectedNota      ? "nota"      :
    selectedGrupo     ? "grupo"     :
    selectedCancion   ? "cancion"   : null;

  const clearAllOverlays = useCallback(() => {
    setSelectedReino(null); setSelectedCriatura(null);
    setSelectedObjeto(null); setSelectedPersonaje(null);
    setSelectedHechizo(null); setSelectedDon(null); setSelectedRuna(null);
    setSelectedNota(null); setSelectedCiudad(null); setSelectedGrupo(null);
    setSelectedCancion(null);
    clearPersistedItem();
  }, [clearPersistedItem]);

  useEffect(() => {
    onOverlayChange?.(!!overlay, clearAllOverlays);
  }, [!!overlay, clearAllOverlays, onOverlayChange]);

  // ── WikiEntity list ────────────────────────────────────────────────────────
  const allEntityNames = useMemo((): WikiEntity[] => [
    ...personajes.map(e => ({ name: e.nombre, type: "personaje" })),
    ...criaturas .map(e => ({ name: e.nombre, type: "criatura"  })),
    ...objetos   .map(e => ({ name: e.nombre, type: "ítem"      })),
    ...reinos    .map(e => ({ name: e.nombre, type: "reino"     })),
    ...ciudades   .map(e => ({ name: e.nombre, type: "ciudad"     })),
    ...hechizos  .map(e => ({ name: e.nombre, type: "hechizo"   })),
    ...dones     .map(e => ({ name: e.nombre, type: "don"       })),
    ...runas     .map(e => ({ name: e.nombre, type: "runa"      })),
  ], [personajes, criaturas, objetos, reinos, ciudades, hechizos, dones, runas]);

  // ── Restaurar item al montar ───────────────────────────────────────────────
  // Estrategia: Dexie primero (instantáneo) → Supabase si no hay datos locales
  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem(LS_ITEM_KEY);
        if (!raw) return;
        const { tabla, id } = JSON.parse(raw) as { tabla: string; id: string };

        // 1. Intentar desde Dexie primero (sin latencia de red)
        let data: any = null;
        try {
          if (db) {
            const tablaLocal = tabla === "grupos_mundo" ? "grupos_mundo" : tabla;
            data = await (db as any)[tablaLocal]?.get(id) ?? null;
            if (data?.deleted) data = null;
          }
        } catch {}

        // 2. Si no está en Dexie, buscar en Supabase
        if (!data && navigator.onLine) {
          const { data: remote } = await supabase
            .from(tabla === "items" ? "items" : tabla)
            .select("*")
            .eq("id", id)
            .single();
          data = remote ?? null;
        }

        if (!data) return;
        if      (tabla === "personajes")   setSelectedPersonaje(data);
        else if (tabla === "criaturas")    setSelectedCriatura(data);
        else if (tabla === "items")        setSelectedObjeto(data);
        else if (tabla === "reinos")       setSelectedReino(data);
        else if (tabla === "hechizos")     setSelectedHechizo(data);
        else if (tabla === "dones")        setSelectedDon(data);
        else if (tabla === "runas")        setSelectedRuna(data);
        else if (tabla === "ciudades")      setSelectedCiudad(data as Ciudad);
        else if (tabla === "grupos_mundo") setSelectedGrupo({ ...data, miembro_ids: data.miembro_ids ?? [] } as Grupo);
        else if (tabla === "canciones")    setSelectedCancion(data as Cancion);
      } catch {}
    })();
  }, []);


  // ── Abrir item desde buscador global (openItem prop) ─────────────────────
  const lastOpenItemRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openItem) return;
    const refKey = `${openItem.tabla}:${openItem.id}:${openItem.key || 0}`;
    const { tabla, id } = openItem;
    let found: any = null;
    
    if      (tabla === "personajes") found = personajes.find(x => x.id === id);
    else if (tabla === "criaturas")  found = criaturas.find(x => x.id === id);
    else if (tabla === "items")      found = objetos.find(x => x.id === id);
    else if (tabla === "reinos")     found = reinos.find(x => x.id === id);
    else if (tabla === "ciudades")    found = ciudades.find(x => x.id === id);
    else if (tabla === "hechizos")   found = hechizos.find(x => x.id === id);
    else if (tabla === "dones")      found = dones.find(x => x.id === id);
    else if (tabla === "runas")      found = runas.find(x => x.id === id);
    else if (tabla === "canciones")  found = canciones.find(x => x.id === id);

    if (!found || lastOpenItemRef.current === refKey) return;
    lastOpenItemRef.current = refKey;
    
    if      (tabla === "personajes") setSelectedPersonaje(found);
    else if (tabla === "criaturas")  setSelectedCriatura(found);
    else if (tabla === "items")      setSelectedObjeto(found);
    else if (tabla === "reinos")     setSelectedReino(found);
    else if (tabla === "ciudades")    setSelectedCiudad(found);
    else if (tabla === "hechizos")   setSelectedHechizo(found);
    else if (tabla === "dones")      setSelectedDon(found);
    else if (tabla === "runas")      setSelectedRuna(found);
    else if (tabla === "canciones")  setSelectedCancion(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItem,
      personajes.length, criaturas.length, objetos.length, reinos.length,
      ciudades.length, hechizos.length, dones.length, runas.length, canciones.length]);

// ── onItemCreated ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!onItemCreated) return;
    const { tabla, item } = onItemCreated;
    if      (tabla === "personajes") setPersonajes(p => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "criaturas")  setCriaturas(p  => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "items")      setObjetos(p    => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "reinos")     setReinos(p     => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "ciudades")    setCiudades(p    => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "hechizos")   setHechizos(p   => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "dones")      setDones(p      => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "runas")      setRunas(p      => p.some(x => x.id === item.id) ? p : [item, ...p]);

    if      (tabla === "personajes") setSelectedPersonaje(item);
    else if (tabla === "criaturas")  setSelectedCriatura(item);
    else if (tabla === "items")      setSelectedObjeto(item);
    else if (tabla === "reinos")     setSelectedReino(item);
    else if (tabla === "ciudades")    setSelectedCiudad(item);
    else if (tabla === "hechizos")   setSelectedHechizo(item);
    else if (tabla === "dones")      setSelectedDon(item);
    else if (tabla === "runas")      setSelectedRuna(item);
    else if (tabla === "canciones")  setSelectedCancion(item);
  }, [onItemCreated]);

  // ── nuevo-ciudad / nueva-nota actions ─────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-listas-action");
      if (action !== "nuevo-ciudad") return;
      localStorage.removeItem("estudio-listas-action");
      (async () => {
        try {
          const { data, error } = await supabase.from("ciudades").insert([{ nombre: "Nuevo ciudad" }]).select("*").single();
          if (error || !data) return;
          setCiudades(prev => [data as CiudadMin, ...prev]);
          setSelectedCiudad(data as Ciudad);
        } catch {}
      })();
    };
    check();
    window.addEventListener("estudio-listas-action", check);
    return () => window.removeEventListener("estudio-listas-action", check);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-notas-action");
      if (action !== "nueva-nota") return;
      localStorage.removeItem("estudio-notas-action");
      crearNota("Nueva nota").then(nueva => { if (nueva) setSelectedNota(nueva); });
    };
    check();
    window.addEventListener("estudio-notas-action", check);
    return () => window.removeEventListener("estudio-notas-action", check);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-letras-action");
      if (action !== "nueva-cancion") return;
      localStorage.removeItem("estudio-letras-action");
      setShowModalCancion(true);
    };
    check();
    window.addEventListener("estudio-letras-action", check);
    return () => window.removeEventListener("estudio-letras-action", check);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navegar a la sección Capítulos desde el sidebar ──────────────────────
  useEffect(() => {
    const goToCapitulos = () => {
      // Si hay un overlay abierto (ej: EditorPersonaje), cerrarlo primero
      clearAllOverlays();
      // Pequeño delay para que el DOM se actualice antes de scrollear
      setTimeout(() => {
        capitulosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };
    window.addEventListener("estudio-caps-action", goToCapitulos);
    return () => window.removeEventListener("estudio-caps-action", goToCapitulos);
  }, [clearAllOverlays]);

  // ── Helper: chip genérico ─────────────────────────────────────────────────
  function Chip({ onClick, imgUrl, icon: Icon, nombre, accentBg, accentBorder, accentText, fullWidth, noMaxW }: {
    onClick: () => void; imgUrl?: string | null; icon: React.ElementType;
    nombre: string; accentBg?: string; accentBorder?: string; accentText?: string; fullWidth?: boolean; noMaxW?: boolean;
  }) {
    const hasImg = !!imgUrl;
    if (hasImg) {
      return (
        <button onClick={onClick} type="button" title={nombre}
          className={`relative rounded-xl border overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]${fullWidth ? " w-full" : ""}`}
          style={{ background: accentBg ?? "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: accentBorder ?? "color-mix(in srgb, var(--primary) 12%, transparent)", aspectRatio: "1/1", width: "100%" }}>
          <img src={imgUrl} alt={nombre} className="w-full h-full object-cover" />
        </button>
      );
    }
    return (
      <button onClick={onClick} type="button"
        className={`flex items-center rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]${fullWidth ? " w-full" : ""} px-3 py-1.5`}
        style={{ background: accentBg ?? "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: accentBorder ?? "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
        <span className={`text-[11px] font-bold truncate${(fullWidth || noMaxW) ? "" : " max-w-[120px] sm:max-w-[90px]"}`} style={{ color: accentText ?? "color-mix(in srgb, var(--primary) 70%, transparent)" }}>{nombre}</span>
      </button>
    );
  }

  // ── Helper: sección de entidades ─────────────────────────────────────────
  function SeccionEntidades({ icon: Icon, label, count, loading, children, cols = 3, minColWidth = "60px" }: {
    icon: React.ElementType; label: string; count: number; loading: boolean; children: React.ReactNode; cols?: 1 | 3; minColWidth?: string;
  }) {
    return (
      <div className="pb-1">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon size={10} className="text-primary/30 shrink-0" />
          <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            {label} · {count}
          </span>
        </div>
        {loading
          ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
          : count === 0
            ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin {label.toLowerCase()} aún</p>
            : <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}, 1fr))` }}>{children}</div>
        }
      </div>
    );
  }

  const div = "border-t my-2" as const;
  const divStyle = { borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Editor overlay ──────────────────────────────────────────────── */}
      {overlay && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: "var(--bg-main)" }}>
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {overlay === "reino" && selectedReino && (
              <EditorReino key={selectedReino.id} item={selectedReino}
                entities={allEntityNames}
                onSaved={u => { setReinos(p => p.map(r => r.id === u.id ? u : r)); setSelectedReino(u); }}
                onDeleted={id => { setReinos(p => p.filter(r => r.id !== id)); setSelectedReino(null); }}
                onSelectPersonaje={p => {
                  const found = personajes.find(x => x.id === p?.id || x.nombre === p?.nombre);
                  if (!found) return;
                  clearAllOverlays(); setSelectedPersonaje(found);
                }}
                onSelectCiudad={async (id: string) => {
                  const local = ciudades.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { setSelectedCiudad(local as Ciudad); return; }
                  const { data } = await supabase.from("ciudades").select("*").eq("id", id).single();
                  if (data) setSelectedCiudad(data as Ciudad);
                }}
                onSelectCriatura={id => { const c = criaturas.find(x => x.id === id); if (!c) return; clearAllOverlays(); setSelectedCriatura(c); }}
                onSelectItem={id => { const o = objetos.find(x => x.id === id); if (!o) return; clearAllOverlays(); setSelectedObjeto(o); }}
              />
            )}
            {overlay === "criatura" && selectedCriatura && (
              <EditorCriatura key={selectedCriatura.id} item={selectedCriatura as any}
                entities={allEntityNames}
                onSaved={u => { setCriaturas(p => p.map(c => c.id === u.id ? { ...c, ...u } : c)); setSelectedCriatura({ ...selectedCriatura, ...u }); }}
                onDeleted={id => { setCriaturas(p => p.filter(c => c.id !== id)); setSelectedCriatura(null); }}
                onSelectItem={id => { const o = objetos.find(x => x.id === id); if (!o) return; clearAllOverlays(); setSelectedObjeto(o); }}
                onSelectPersonaje={id => { const p = personajes.find(x => x.id === id); if (!p) return; clearAllOverlays(); setSelectedPersonaje(p); }}
                onSelectGrupo={async (id) => {
                  const local = grupos.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectGrupo(local); return; }
                  const { data } = await supabase.from("grupos_mundo").select("*").eq("id", id).single();
                  if (data) selectGrupo({ ...data, miembro_ids: data.miembro_ids ?? [] } as Grupo);
                }}
                onNavigateCiudad={async (id) => {
                  const local = ciudades.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectCiudad(local); return; }
                  const { data } = await supabase.from("ciudades").select("*").eq("id", id).single();
                  if (data) selectCiudad(data as Ciudad);
                }}
                onNavigateReino={async (id) => {
                  const local = reinos.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectReino(local); return; }
                  const { data } = await supabase.from("reinos").select("*").eq("id", id).single();
                  if (data) selectReino(data as Reino);
                }}
              />
            )}
            {overlay === "objeto" && selectedObjeto && (
              <EditorItem key={selectedObjeto.id} item={selectedObjeto as any}
                entities={allEntityNames}
                onSaved={u => { setObjetos(p => p.map(o => o.id === u.id ? { ...o, ...u } : o)); setSelectedObjeto({ ...selectedObjeto, ...u }); }}
                onDeleted={id => { setObjetos(p => p.filter(o => o.id !== id)); setSelectedObjeto(null); }}
                onSelectCriatura={id => { const c = criaturas.find(x => x.id === id); if (!c) return; clearAllOverlays(); setSelectedCriatura(c); }}
                onNavigateCiudad={async (id) => {
                  const local = ciudades.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectCiudad(local); return; }
                  const { data } = await supabase.from("ciudades").select("*").eq("id", id).single();
                  if (data) selectCiudad(data as Ciudad);
                }}
                onNavigateReino={async (id) => {
                  const local = reinos.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectReino(local); return; }
                  const { data } = await supabase.from("reinos").select("*").eq("id", id).single();
                  if (data) selectReino(data as Reino);
                }}
              />
            )}
            {overlay === "ciudad" && selectedCiudad && (
              <EditorCiudad key={selectedCiudad.id} item={selectedCiudad as Ciudad}
                entities={allEntityNames}
                onSaved={u => { setCiudades(p => p.map(l => l.id === u.id ? { ...l, ...u } : l)); setSelectedCiudad({ ...selectedCiudad, ...u }); }}
                onDeleted={id => { setCiudades(p => p.filter(l => l.id !== id)); setSelectedCiudad(null); }}
                onSelectPersonaje={id => { const p = personajes.find(x => x.id === id); if (!p) return; clearAllOverlays(); setSelectedPersonaje(p); }}
                onSelectCriatura={id => { const c = criaturas.find(x => x.id === id); if (!c) return; clearAllOverlays(); setSelectedCriatura(c); }}
                onSelectItem={id => { const o = objetos.find(x => x.id === id); if (!o) return; clearAllOverlays(); setSelectedObjeto(o); }}
                onNavigateReino={id => { const r = reinos.find(x => x.id === id); if (!r) return; clearAllOverlays(); setSelectedReino(r); }}
              />
            )}
            {overlay === "personaje" && selectedPersonaje && (
              <EditorPersonaje key={selectedPersonaje.id} item={selectedPersonaje}
                entities={allEntityNames}
                onSaved={u => { setPersonajes(p => p.map(x => x.id === u.id ? u : x)); setSelectedPersonaje(u); }}
                onDeleted={id => { setPersonajes(p => p.filter(x => x.id !== id)); setSelectedPersonaje(null); }}
                onNavigate={(tab, nombre) => {
                  if (tab === "criaturas") { const c = criaturas.find(x => x.nombre.toLowerCase() === nombre.toLowerCase()); if (!c) return; clearAllOverlays(); setSelectedCriatura(c); }
                  else if (tab === "reinos") { const r = reinos.find(x => x.nombre.toLowerCase() === nombre.toLowerCase()); if (!r) return; clearAllOverlays(); setSelectedReino(r); }
                }}
                onSelectPersonaje={id => { const p = personajes.find(x => x.id === id); if (!p) return; clearAllOverlays(); setSelectedPersonaje(p); }}
                onOpenGrupo={async (id) => {
                  const local = grupos.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectGrupo(local); return; }
                  const { data } = await supabase.from("grupos_mundo").select("*").eq("id", id).single();
                  if (data) selectGrupo({ ...data, miembro_ids: data.miembro_ids ?? [] } as Grupo);
                }}
                onSelectCancion={async (id) => {
                  const local = canciones.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectCancion(local as unknown as Cancion); return; }
                  const { data } = await supabase.from("canciones").select("*").eq("id", id).single();
                  if (data) selectCancion(data as unknown as Cancion);
                }}
              />
            )}
            {overlay === "hechizo" && selectedHechizo && (
              <EditorHechizos
                modo="hechizos"
                initialSelectedId={selectedHechizo.id}
                onSelectedIdChange={id => { if (!id) setSelectedHechizo(null); }}
                onItemSaved={updated => setHechizos(p => p.map(h => h.id === updated.id ? { id: updated.id, nombre: updated.nombre } : h))}
                onItemDeleted={id => { setHechizos(p => p.filter(h => h.id !== id)); setSelectedHechizo(null); }}
              />
            )}
            {overlay === "don" && selectedDon && (
              <EditorHechizos
                modo="dones"
                initialSelectedId={selectedDon.id}
                onSelectedIdChange={id => { if (!id) setSelectedDon(null); }}
                onItemSaved={updated => setDones(p => p.map(d => d.id === updated.id ? { id: updated.id, nombre: updated.nombre } : d))}
                onItemDeleted={id => { setDones(p => p.filter(d => d.id !== id)); setSelectedDon(null); }}
              />
            )}
            {overlay === "runa" && selectedRuna && (
              <EditorHechizos
                modo="runas"
                initialSelectedId={selectedRuna.id}
                onSelectedIdChange={id => { if (!id) setSelectedRuna(null); }}
                onItemSaved={updated => setRunas(p => p.map(r => r.id === updated.id ? { id: updated.id, nombre: updated.nombre, imagen_url: (updated as any).imagen_url } : r))}
                onItemDeleted={id => { setRunas(p => p.filter(r => r.id !== id)); setSelectedRuna(null); }}
              />
            )}
            {overlay === "nota" && selectedNota && (
              <EditorNota key={selectedNota.id} nota={selectedNota}
                onSaved={async (updated) => { await actualizarNota(updated); setSelectedNota(updated); }}
                onDeleted={id => { eliminarNota(id); setSelectedNota(null); }}
              />
            )}
            {overlay === "grupo" && selectedGrupo && (
              <EditorGrupo key={selectedGrupo.id} grupo={selectedGrupo}
                onSaved={async updated => { await actualizarGrupo(updated); setSelectedGrupo(updated); }}
                onDeleted={async id => { await eliminarGrupo(id); setSelectedGrupo(null); }}
                onClickMiembro={(id, tabla) => {
                  if (tabla === "personajes") { const p = personajes.find(x => x.id === id); if (!p) return; clearAllOverlays(); setSelectedPersonaje(p); }
                  else if (tabla === "criaturas") { const c = criaturas.find(x => x.id === id); if (!c) return; clearAllOverlays(); setSelectedCriatura(c); }
                  else if (tabla === "items") { const o = objetos.find(x => x.id === id); if (!o) return; clearAllOverlays(); setSelectedObjeto(o); }
                  else if (tabla === "reinos") { const r = reinos.find(x => x.id === id); if (!r) return; clearAllOverlays(); setSelectedReino(r); }
                }}
              />
            )}
            {overlay === "cancion" && selectedCancion && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Editor de la canción */}
                <PanelEditor key={selectedCancion.id} cancionId={selectedCancion.id} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scroll vertical ─────────────────────────────────────────────── */}
      {!overlay && (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0">

          {/* HISTORIA */}
          {textos && onTextoChange && onSave && (
            <div className="border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <PanelHistoriaMundo texto={textos.historia} onChange={v => onTextoChange("historia", v)} onSave={() => onSave("historia")} />
            </div>
          )}

          {/* CAPÍTULOS */}
          <div ref={capitulosRef} style={{ minHeight: "60vh" }}>
            <div className="flex flex-col min-h-0" style={{ minHeight: "58vh" }}>
              <EstudioCapitulos />
            </div>
          </div>


          {/* ENTIDADES */}
          <div className="px-3 sm:px-3 pb-4 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>

            {/* ── Fila 1 desktop: Personajes · Grupos · Notas ── */}
            <div className="sm:grid sm:grid-cols-3 sm:gap-x-4">
              <SeccionEntidades icon={Users} label={el.personajes} count={personajes.length} loading={loadingPersonajes}>
                {[...personajes].sort((a,b)=>(!!b.img_url ? 1:0)-(!!a.img_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(p => <Chip key={p.id} onClick={() => selectPersonaje(p)} imgUrl={p.img_url} icon={UserCircle2} nombre={p.nombre} />)}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={Layers} label={el.grupos} count={grupos.length} loading={!loadedGrupos}>
                {(() => {
                  const porTipo = grupos.reduce((acc, g) => {
                    const t = g.tipo || "otro";
                    if (!acc[t]) acc[t] = [];
                    acc[t].push(g);
                    return acc;
                  }, {} as Record<string, typeof grupos>);
                  return Object.entries(porTipo).map(([tipo, lista]) => (
                    <div key={tipo} className="col-span-full flex flex-col gap-1">
                      <span className="text-[7px] font-black uppercase tracking-[0.2em] px-1" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>{tipo}</span>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))" }}>
                        {lista.map(g => {
                          const cfg = GRUPO_TIPO_CONFIG[g.tipo as keyof typeof GRUPO_TIPO_CONFIG];
                          return (
                            <button key={g.id} type="button"
                              onClick={async () => {
                                const full = grupos.find(x => x.id === g.id);
                                if (full) { selectGrupo(full); return; }
                                const { data } = await supabase.from("grupos_mundo").select("*").eq("id", g.id).single();
                                if (data) selectGrupo({ ...data, miembro_ids: data.miembro_ids ?? [] } as Grupo);
                              }}
                              className="flex items-center px-3 py-1.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                              style={{ background: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 4%, transparent)`, borderColor: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 12%, transparent)` }}>
                              <span className="text-[11px] font-bold text-primary/70 truncate">{g.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={FileText} label={el.notas} count={notas.length} loading={loadingNotas}>
                {notas.map(n => (
                  <button key={n.id} onClick={() => setSelectedNota(n)} type="button"
                    className="flex items-center px-3 py-1.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <span className="text-[11px] font-bold text-primary/70 truncate">{n.titulo || <span className="italic text-primary/30">Sin título</span>}</span>
                  </button>
                ))}
              </SeccionEntidades>
            </div>
            <div className={div} style={divStyle} />

            {/* ── Fila 2 desktop: Criaturas · Objetos ── */}
            <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
              <SeccionEntidades icon={Bug} label={el.criaturas} count={criaturas.length} loading={loadingCriaturas}>
                {[...criaturas].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(c => <Chip key={c.id} onClick={() => selectCriatura(c)} imgUrl={c.imagen_url} icon={Bug} nombre={c.nombre} />)}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={Package} label="Objetos" count={objetos.length} loading={loadingObjetos}>
                {[...objetos].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(o => <Chip key={o.id} onClick={() => selectObjeto(o)} imgUrl={o.imagen_url} icon={Package} nombre={o.nombre} />)}
              </SeccionEntidades>
            </div>
            <div className={div} style={divStyle} />

            {/* ── Extra desktop: Reinos · Ciudades ── */}
            <div className="sm:grid sm:grid-cols-2 sm:gap-x-4">
              <SeccionEntidades icon={Map} label={el.reinos} count={reinos.length} loading={loadingReinos}>
                {[...reinos].sort((a,b)=>(!!b.mapa_url ? 1:0)-(!!a.mapa_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(r => <Chip key={r.id} onClick={() => selectReino(r)} imgUrl={r.mapa_url} icon={Map} nombre={r.nombre} />)}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={MapPin} label={el.ciudades} count={ciudades.length} loading={loadingCiudades}>
                {[...ciudades].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(l => (
                  <Chip key={l.id} onClick={async () => {
                    try { const { data } = await supabase.from("ciudades").select("*").eq("id", l.id).single(); if (data) { selectCiudad(data as Ciudad); return; } } catch {}
                    selectCiudad(l as Ciudad);
                  }} imgUrl={l.imagen_url} icon={MapPin} nombre={l.nombre} />
                ))}
              </SeccionEntidades>
            </div>
            <div className={div} style={divStyle} />

            {/* ── Fila 3 desktop: Hechizos · Dones · Runas ── */}
            <div className="sm:grid sm:grid-cols-3 sm:gap-x-4">
              <SeccionEntidades icon={Sparkles} label={el.hechizos} count={hechizos.length} loading={loadingHechizos}>
                {hechizos.map(h => <Chip key={h.id} onClick={() => selectHechizo(h)} icon={Sparkles} nombre={h.nombre}
                  accentBg="color-mix(in srgb, var(--accent) 5%, transparent)" accentBorder="color-mix(in srgb, var(--accent) 15%, transparent)" accentText="color-mix(in srgb, var(--accent) 80%, var(--primary))" />)}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={Star} label={el.dones} count={dones.length} loading={loadingDones}>
                {dones.map(d => <Chip key={d.id} onClick={() => selectDon(d)} icon={Star} nombre={d.nombre}
                  accentBg="color-mix(in srgb, var(--accent) 4%, transparent)" accentBorder="color-mix(in srgb, var(--accent) 13%, transparent)" accentText="color-mix(in srgb, var(--accent) 75%, var(--primary))" />)}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={ScrollText} label={el.runas} count={runas.length} loading={loadingRunas}>
                {[...runas].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(r => <Chip key={r.id} onClick={() => selectRuna(r)} imgUrl={r.imagen_url} icon={ScrollText} nombre={r.nombre} />)}
              </SeccionEntidades>
            </div>
            <div className={div} style={divStyle} />

            {/* ── Fila 4 desktop: Canciones (ancho completo) ── */}
            <SeccionEntidades icon={Music} label={el.canciones} count={canciones.length} loading={loadingCanciones} cols={1} minColWidth="160px">
              {canciones.map(c => (
                <Chip key={c.id} onClick={() => selectCancion(c as unknown as Cancion)} icon={Music} nombre={c.titulo} noMaxW />
              ))}
            </SeccionEntidades>


          </div>

                    {/* RELACIONES */}
          <div style={{ minHeight: "60vh" }}>
            <div className="flex flex-col min-h-0" style={{ minHeight: "58vh" }}>
              <AdminDescubrimientos />
            </div>
          </div>

        </div>
      )}

      {/* Modal nueva canción */}
      {showModalCancion && (
        <ModalNuevaCancion
          onCreated={(c: Cancion) => {
            setShowModalCancion(false);
            selectCancion(c as unknown as Cancion);
          }}
          onClose={() => setShowModalCancion(false)}
        />
      )}

    </div>
  );
}


// ─── Panel de texto genérico (reemplaza PanelMagia y el texto de los demás) ──
function PanelTexto({
  texto, onChange, onSave, placeholder, SaveIcon,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  placeholder: string;
  saveLabel?: string;
  SaveIcon: React.ElementType;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { onSnippetAction } = useWikilink();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async () => {
    setStatus("saving");
    try { await onSave(); setStatus("saved"); setTimeout(() => setStatus("idle"), 2000); }
    catch { setStatus("error"); }
  }, [onSave]);

  // Autosave: 1.5s tras dejar de escribir
  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void doSave(); }, 1500);
  };

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        void doSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doSave]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <MarkdownEditor value={texto} onChange={handleChange} placeholder={placeholder} rows={22} toolbar defaultMode="edit" onSnippetAction={onSnippetAction} />
      </div>
      <div className="shrink-0 flex items-center justify-end gap-2 px-3 py-1.5 border-t"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <SaveIndicator status={status} />
      </div>
    </div>
  );
}