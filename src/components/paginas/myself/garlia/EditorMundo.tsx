"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Globe, Plus, Trash2, Save, Loader2, X, Bug,
  ChevronDown, Mountain, ScrollText, Map, FileText, Users, UserCircle2, Package,
  Crown, Clock, Filter, Layers, BookOpen, Music, MapPin, Leaf,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { enqueueOperation, isReallyOnline, onSyncDone } from "@/hooks/data/useOfflineSync";
import { MUNDO_SECTIONS, type MundoSectionKey, type SaveStatus, type Reino, type Personaje, type Nota } from "./components/types";
import { SaveIndicator } from "./components/UIComponents";
import { MarkdownEditor } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";
import { EditorReino } from "./EditorReino";
import { EditorPersonaje } from "./EditorPersonaje";
import { EditorCriatura } from "./EditorCriatura";
import { EditorItem } from "./EditorItem";
import { EditorCiudad, type Ciudad } from "./EditorCiudad";
import { EditorLugar, type Lugar } from "./EditorLugar";
import { EditorPlanta, type Planta } from "./EditorPlanta";
import { EditorHechizos } from "./EditorHechizos";
import { type WikiEntity } from "../../../forms/MarkdownEditor";
import { type TimelineEvent } from "./components/LoreTab";
import { useNotas } from "./components/useNotas";
import { EditorNota, ListaNotas } from "./EditorNota";
import { EditorGrupo, useGrupos, type Grupo, GRUPO_TIPO_CONFIG } from "./EditorGrupo";
import EstudioCapitulos from "@/components/paginas/myself/garlia/editorCapitulos/page";
import AdminDescubrimientos from "@/components/paginas/myself/garlia/editorRelaciones";
import { useCanciones } from "@/components/paginas/myself/garlia/editorLetras/hooks/useCanciones";
import { PanelEditor } from "@/components/paginas/myself/garlia/editorLetras/components/editor/PanelEditor";
import { ModalNuevaCancion } from "@/components/paginas/myself/garlia/editorLetras/components/modals/ModalNuevaCancion";
import type { Cancion } from "@/components/paginas/myself/garlia/editorLetras/types";


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

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const run = async () => {
      try {
        const local = await dexieReadAll<T>(tablaLocal);
        if (ctrl.signal.aborted) return;
        if (local.length) { setItems(local); setLoading(false); }
        if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
        const { data } = await buildQuery().abortSignal(ctrl.signal);
        if (ctrl.signal.aborted) return;
        const result = (data ?? []).map(mapResult) as T[];
        setItems(result); setLoading(false);
        await dexieWriteAll(tablaLocal, result);
      } catch (e: any) {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        setLoading(false);
      }
    };
    run();
    return () => { ctrl.abort(); };
  // buildQuery and mapResult are defined inline at call site — stable refs not needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablaLocal]);

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

type LugarMin = { id: string; nombre: string; imagen_url?: string | null; tipo?: string | null; reino_id?: string | null };

function useLugares() {
  const { items, setItems, loading } = useEntityList<LugarMin>(
    "lugares",
    () => supabase.from("lugares").select("id, nombre, imagen_url, tipo, reino_id").order("nombre"),
  );
  return { lugares: items, setLugares: setItems, loading };
}

function usePersonajesList() {
  const { items, setItems, loading } = useEntityList<Personaje>(
    "personajes",
    () => supabase.from("personajes").select("*").order("nombre"),
  );
  return { personajes: items, setPersonajes: setItems, loading };
}


type PlantaMin = { id: string; nombre: string; imagen_url?: string | null; categoria?: string | null };

function usePlantas() {
  const { items, setItems, loading } = useEntityList<PlantaMin>(
    "plantas",
    () => supabase.from("plantas").select("id, nombre, imagen_url, categoria").order("nombre"),
  );
  return { plantas: items, setPlantas: setItems, loading };
}

function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!criaturaId) { setVariantes([]); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const run = async () => {
      setLoading(true);
      try {
        if (db) {
          const local: any[] = await (db as any).criatura_variantes?.where("criatura_id").equals(criaturaId).toArray() ?? [];
          if (ctrl.signal.aborted) return;
          if (local.length) { setVariantes(local); setLoading(false); if (!navigator.onLine) return; }
        }
        if (!navigator.onLine) { setLoading(false); return; }
        const { data } = await (supabase.from("criatura_variantes").select("id, tipo").eq("criatura_id", criaturaId).order("tipo") as any).abortSignal(ctrl.signal);
        if (ctrl.signal.aborted) return;
        const result = (data ?? []) as VarianteMin[];
        setVariantes(result); setLoading(false);
        try { if (db && result.length) await (db as any).criatura_variantes?.bulkPut(result); } catch {}
      } catch (e: any) { if (ctrl.signal.aborted || e?.name === "AbortError") return; setLoading(false); }
    };
    run(); return () => { ctrl.abort(); };
  }, [criaturaId]);
  return { variantes, loading };
}

// ─── Hook: grupos del mundo (filtrable por tipo) ──────────────────────────────
type GrupoTodo = { id: string; nombre: string; tipo: string; miembro_ids: string[] };

function useGruposMundo(filtroTipo?: string) {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const run = async () => {
      try {
        if (db && (db as any).grupos_mundo) {
          const all = await (db as any).grupos_mundo.toArray() as any[];
          if (ctrl.signal.aborted) return;
          const local = all
            .filter((g: any) => !g.deleted && (!filtroTipo || g.tipo === filtroTipo))
            .map((g: any) => ({ id: g.id, nombre: g.nombre, tipo: g.tipo ?? "", miembro_ids: g.miembro_ids ?? [] }));
          if (local.length) { setGrupos(local); setLoading(false); }
        }
        if (!navigator.onLine) { setLoading(false); return; }
        let query = supabase.from("grupos_mundo").select("id, nombre, tipo, miembro_ids").order("nombre");
        if (filtroTipo) query = (query as any).eq("tipo", filtroTipo);
        const { data } = await (query as any).abortSignal(ctrl.signal);
        if (ctrl.signal.aborted) return;
        const result = (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo ?? "", miembro_ids: r.miembro_ids ?? [] }));
        setGrupos(result); setLoading(false);
      } catch (e: any) { if (ctrl.signal.aborted || e?.name === "AbortError") return; setLoading(false); }
    };
    run();
    return () => { ctrl.abort(); };
  }, [filtroTipo]);

  return { grupos, loading };
}


function useGruposTodos() {
  const { grupos, loading } = useGruposMundo();
  return { grupos: grupos as GrupoTodo[], loading };
}








// ─── Panel de lista + editor para hechizos o dones ───────────────────────────

type MundoTimelineEvent = TimelineEvent & {
  source: "mundo" | "reino" | "capitulo";
  reinoNombre?: string;
  reinoId?: string;
  yearNum: number; // para ordenar (valor numérico)
  capData?: CapTimeline; // solo para source === "capitulo"
};

/** Extrae el valor numérico de un año para ordenamiento.
 *  Soporta negativos: -100 < -10 < -1 < 1 < 2 < 10 < 100 …
 *  Texto puro sin números queda al final (Infinity).
 */
function parseYear(year: string): number {
  if (!year?.trim()) return Infinity;
  const normalized = year.replace(/(\d)[.,](\d{3})/g, "$1$2");
  const match = normalized.match(/(-?\d+)/);
  if (!match) return Infinity;
  return parseInt(match[1], 10);
}

function decodeTimeline(raw: string | undefined): TimelineEvent[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TimelineEvent[];
  } catch {}
  return [];
}

function encodeTimeline(events: TimelineEvent[]): string {
  return JSON.stringify(events);
}

function newEvent(): TimelineEvent {
  return { id: crypto.randomUUID(), year: "", title: "", description: "" };
}

// ── Tarjeta de capítulo en la línea de tiempo (solo lectura, con link) ─────────
function CapituloEventoRow({
  cap,
  reinoNombre,
  onNavigate,
}: {
  cap: CapTimeline;
  reinoNombre?: string;
  onNavigate: () => void;
}) {
  return (
    <div className="group/card" style={{ width: 188 }}>
      <div
        className="mx-1.5 rounded-xl transition-all"
        style={{
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        <div className="flex flex-col gap-1 p-2">
          {/* Año */}
          <div className="flex items-center gap-1">
            <span
              className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-md"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                color: "var(--primary)",
              }}
            >
              {cap.orden_linea_tiempo}
            </span>
            {cap.libroTitulo && (
              <span
                className="text-[7px] font-black uppercase tracking-widest truncate"
                style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
              >
                {cap.libroTitulo}
              </span>
            )}
          </div>

          {/* Título del capítulo como botón navegable */}
          <button
            type="button"
            onClick={onNavigate}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg border w-full text-left transition-all"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "color-mix(in srgb, var(--primary) 9%, transparent)";
              el.style.borderColor = "color-mix(in srgb, var(--primary) 22%, transparent)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)";
              el.style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)";
            }}
            title={`Abrir: ${cap.titulo_capitulo}`}
          >
            <BookOpen size={8} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
            <span
              className="text-[8px] font-bold truncate"
              style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}
            >
              {cap.titulo_capitulo}
            </span>
          </button>

          {/* Badge del reino */}
          {reinoNombre && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest truncate self-start"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                maxWidth: "100%",
              }}
            >
              <Crown size={6} /> {reinoNombre}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta horizontal de evento (mundo O reino) — solo visualización ────────
function MundoEventoRow({
  evt,
  source = "mundo",
  isSelected,
  onSelect,
  onRemove,
  reinos = [],
}: {
  evt: TimelineEvent;
  source?: "mundo" | "reino";
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  reinos?: Reino[];
}) {
  const hasYear  = !!evt.year?.trim();
  const hasTitle = !!evt.title?.trim();
  const reinoId  = (evt as any).reinoId as string | null | undefined;
  const reinoNombre = reinoId ? reinos.find(r => r.id === reinoId)?.nombre : null;

  return (
    <div className="group/card" style={{ width: 188 }}>
      <div
        className="mx-1.5 rounded-xl transition-all"
        style={{
          border: `1px solid ${isSelected
            ? "color-mix(in srgb, var(--primary) 30%, transparent)"
            : source === "reino"
              ? "color-mix(in srgb, var(--primary) 8%, transparent)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)"}`,
          background: isSelected
            ? "color-mix(in srgb, var(--primary) 6%, transparent)"
            : source === "reino"
              ? "color-mix(in srgb, var(--primary) 1.5%, transparent)"
              : "color-mix(in srgb, var(--primary) 2.5%, transparent)",
        }}
      >
        <div className="flex flex-col gap-1 p-2">
          {/* Año (solo lectura — editable en panel inferior) */}
          <div className="text-[10px] font-black tracking-widest text-center px-1 py-1 rounded-lg border"
            style={{
              color: hasYear ? "var(--primary)" : "color-mix(in srgb, var(--primary) 25%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              background: hasYear ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent",
            }}>
            {hasYear ? evt.year : <span className="italic opacity-40">Año…</span>}
          </div>
          {/* Título */}
          <div className="px-1 text-[10px] font-bold truncate"
            style={{ color: hasTitle ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            {hasTitle ? evt.title : <span className="italic opacity-50">Sin título…</span>}
          </div>
          {/* Acciones */}
          <div className="flex items-center justify-between mt-0.5">
            {reinoNombre && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest truncate"
                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", maxWidth: "80px" }}>
                <Crown size={6} /> {reinoNombre}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity">
              <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
                className="p-1.5 rounded-lg border transition-all"
                style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", background: "transparent" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#f87171"; el.style.borderColor = "rgba(248,113,113,0.35)"; el.style.background = "rgba(248,113,113,0.06)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "color-mix(in srgb, var(--primary) 25%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)"; el.style.background = "transparent"; }}>
                <Trash2 size={11} />
              </button>
              <button type="button" onClick={onSelect}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all"
                style={isSelected ? {
                  color: "var(--primary)", borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", background: "color-mix(in srgb, var(--primary) 8%, transparent)"
                } : {
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", background: "transparent"
                }}>
                <ChevronDown size={11} style={{ transform: isSelected ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                <span>{isSelected ? "Cerrar" : "Editar"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tipo para capítulos con posición en línea de tiempo ─────────────────────
type CapTimeline = {
  id: string;
  libro_id: string;
  titulo_capitulo: string;
  orden_linea_tiempo: number;
  libroTitulo?: string;
  reinos_ids?: string[];
};

// ── Carga reinos con historia completa (query dedicada, no el hook genérico) ──
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
    const online = await isReallyOnline();
    if (!online || !isMounted.current) { setLoading(false); return; }

    try {
      const { data } = await supabase
        .from("reinos")
        .select("*") // necesitamos historia completa
        .order("nombre");
      if (!isMounted.current) return;
      if (data?.length) {
        setReinos(data as Reino[]);
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
  // mundoEvents: se inicializa con texto y se actualiza cuando texto cambia,
  // pero solo si el texto externo es más rico que lo que ya tenemos (evita pisar ediciones)
  const mundoInitRef   = useRef(false);
  const [mundoEvents, setMundoEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const decoded = decodeTimeline(texto);
    if (!mundoInitRef.current && decoded.length > 0) {
      // Primera carga real con datos
      mundoInitRef.current = true;
      setMundoEvents(decoded);
    } else if (!mundoInitRef.current && texto !== undefined) {
      // texto llegó pero está vacío — igual marcamos para no volver a pisar
      mundoInitRef.current = true;
      setMundoEvents(decoded);
    }
  }, [texto]);

  const { reinos, setReinos, loading: loadingReinos, recargar } = useReinosConHistoria();

  // ── Capítulos con posición en línea de tiempo ─────────────────────────────
  const [capsTimeline, setCapsTimeline] = useState<CapTimeline[]>([]);
  // Mapa de todos los capítulos con reinos_ids (para los botones de filtro,
  // independientemente de si tienen orden_linea_tiempo)
  const [capsReinosIds, setCapsReinosIds] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;

    const cargarCaps = async () => {
      // 1. Leer de Dexie primero para mostrar datos offline inmediatamente
      try {
        if (db) {
          const localCaps: any[] = await (db as any).capitulos?.toArray() ?? [];
          const localLibros: any[] = await (db as any).libros?.toArray() ?? [];
          const libroMapLocal: Record<string, string> = {};
          localLibros.forEach((l: any) => { libroMapLocal[l.id] = l.titulo ?? ""; });

          const conOrden = localCaps.filter((c: any) => c.orden_linea_tiempo != null);
          if (conOrden.length && !cancelled) {
            setCapsTimeline(conOrden.map((c: any) => ({
              id: c.id,
              libro_id: c.libro_id,
              titulo_capitulo: c.titulo_capitulo,
              orden_linea_tiempo: c.orden_linea_tiempo,
              libroTitulo: libroMapLocal[c.libro_id] ?? "",
              reinos_ids: c.reinos_ids ?? [],
            })));
          }

          const mapLocal: Record<string, string[]> = {};
          localCaps.forEach((c: any) => { if (c.reinos_ids?.length) mapLocal[c.id] = c.reinos_ids; });
          if (Object.keys(mapLocal).length && !cancelled) setCapsReinosIds(mapLocal);
        }
      } catch {}

      // 2. Fetch remoto si hay conexión
      const online = await isReallyOnline();
      if (!online || cancelled) return;

      // Query 1: capítulos con orden_linea_tiempo → se muestran en la pista
      try {
        const { data } = await supabase
          .from("capitulos")
          .select("id, libro_id, titulo_capitulo, orden_linea_tiempo, reinos_ids")
          .not("orden_linea_tiempo", "is", null);
        if (!data?.length || cancelled) return;

        const libroIds = [...new Set(data.map((c: any) => c.libro_id))];
        const { data: libros } = await supabase
          .from("libros")
          .select("id, titulo")
          .in("id", libroIds);
        if (cancelled) return;

        const libroMap: Record<string, string> = {};
        (libros ?? []).forEach((l: any) => { libroMap[l.id] = l.titulo; });
        setCapsTimeline(
          (data as any[]).map(c => ({
            id: c.id,
            libro_id: c.libro_id,
            titulo_capitulo: c.titulo_capitulo,
            orden_linea_tiempo: c.orden_linea_tiempo,
            libroTitulo: libroMap[c.libro_id] ?? "",
            reinos_ids: c.reinos_ids ?? [],
          }))
        );
      } catch {}

      // Query 2: todos los capítulos con reinos_ids → alimenta los botones de filtro
      try {
        const { data } = await supabase
          .from("capitulos")
          .select("id, reinos_ids")
          .not("reinos_ids", "is", null);
        if (!data?.length || cancelled) return;
        const map: Record<string, string[]> = {};
        for (const c of data as any[]) {
          if (c.reinos_ids?.length) map[c.id] = c.reinos_ids;
        }
        setCapsReinosIds(map);
      } catch {}
    };

    cargarCaps();

    // Recargar al volver online
    const handleOnline = () => { cargarCaps(); };
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // ── reinoEvents: se inicializa UNA SOLA VEZ por reino, no se re-inicializa ──
  const reinoInitedRef = useRef<Set<string>>(new Set());
  const [reinoEvents, setReinoEvents] = useState<Record<string, TimelineEvent[]>>({});

  useEffect(() => {
    // Solo inicializa los reinos que aún no fueron agregados
    const nuevos: Record<string, TimelineEvent[]> = {};
    let hayNuevos = false;
    for (const r of reinos) {
      if (!reinoInitedRef.current.has(r.id)) {
        reinoInitedRef.current.add(r.id);
        nuevos[r.id] = decodeTimeline((r as any).historia);
        hayNuevos = true;
      }
    }
    if (hayNuevos) {
      setReinoEvents(prev => ({ ...prev, ...nuevos }));
    }
  }, [reinos]);

  const handleMundoChange = (evts: TimelineEvent[]) => {
    setMundoEvents(evts);
    onChange(encodeTimeline(evts));
    if (debounceHistRef.current) clearTimeout(debounceHistRef.current);
    debounceHistRef.current = setTimeout(() => { void handleSave(); }, 1500);
  };

  const updateReinoEvent = useCallback((reinoId: string, id: string, patch: Partial<TimelineEvent>) => {
    setReinoEvents(prev => {
      const evts = (prev[reinoId] ?? []).map(e => e.id === id ? { ...e, ...patch } : e);
      return { ...prev, [reinoId]: evts };
    });
  }, []);

  const removeReinoEvent = useCallback((reinoId: string, id: string) => {
    setReinoEvents(prev => {
      const evts = (prev[reinoId] ?? []).filter(e => e.id !== id);
      return { ...prev, [reinoId]: evts };
    });
  }, []);

  const saveReinoHistory = useCallback(async (reinoId: string, evts: TimelineEvent[]) => {
    const encoded = encodeTimeline(evts);

    // Siempre persistir en Dexie de inmediato
    try {
      if (db) {
        const existing = await (db as any).reinos?.get(reinoId);
        await (db as any).reinos?.put({ ...(existing ?? {}), id: reinoId, historia: encoded });
      }
    } catch {}

    // Actualizar estado local optimistamente
    setReinos(prev => prev.map(r => r.id === reinoId ? { ...r, historia: encoded } as Reino : r));

    const online = await isReallyOnline();
    if (!online) {
      // Encolar para sync cuando vuelva internet
      try {
        await enqueueOperation("reinos", "update", reinoId, { id: reinoId, historia: encoded });
      } catch {}
      return null;
    }

    const { error } = await supabase.from("reinos").update({ historia: encoded }).eq("id", reinoId);
    return error ?? null;
  }, [setReinos]);

  const [filterReino, setFilterReino] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savingReinos, setSavingReinos] = useState<Set<string>>(new Set());
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null); // "evtId" o "reinoId:evtId"
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

  const add = () => {
    const e = newEvent();
    handleMundoChange([...mundoEvents, e]);
    setSelectedEventKey(e.id);
  };
  const update = (id: string, patch: Partial<TimelineEvent>) =>
    handleMundoChange(mundoEvents.map(e => e.id === id ? { ...e, ...patch } : e));
  const remove = (id: string) => {
    handleMundoChange(mundoEvents.filter(e => e.id !== id));
    if (selectedEventKey === id) setSelectedEventKey(null);
  };

  const handleSaveReinoEvent = useCallback(async (reinoId: string) => {
    const evts = reinoEvents[reinoId] ?? [];
    setSavingReinos(prev => new Set(prev).add(reinoId));
    await saveReinoHistory(reinoId, evts);
    setSavingReinos(prev => { const s = new Set(prev); s.delete(reinoId); return s; });
  }, [reinoEvents, saveReinoHistory]);

  const allEvents = useMemo<MundoTimelineEvent[]>(() => {
    const list: MundoTimelineEvent[] = [];
    for (const e of mundoEvents) {
      const reinoId = (e as any).reinoId as string | null | undefined;
      if (filterReino && reinoId !== filterReino) continue;
      list.push({ ...e, source: "mundo", yearNum: parseYear(e.year) });
    }
    for (const reino of reinos) {
      if (filterReino && reino.id !== filterReino) continue;
      const evts = reinoEvents[reino.id] ?? decodeTimeline((reino as any).historia);
      for (const e of evts) {
        if (!e.year?.trim() && !e.title?.trim()) continue;
        list.push({ ...e, source: "reino", reinoNombre: reino.nombre, reinoId: reino.id, yearNum: parseYear(e.year) });
      }
    }
    // Capítulos — cada uno como tarjeta propia, ordenada por año, sin agrupar
    for (const cap of capsTimeline) {
      list.push({
        id: `cap:${cap.id}`,
        year: String(cap.orden_linea_tiempo),
        title: cap.titulo_capitulo,
        description: "",
        source: "capitulo",
        yearNum: cap.orden_linea_tiempo,
        capData: cap,
      });
    }
    // Sort estable: por año; en empate, mundo → reino → capítulo
    return list.sort((a, b) => {
      const diff = a.yearNum - b.yearNum;
      if (diff !== 0) return diff;
      const order = { mundo: 0, reino: 1, capitulo: 2 };
      return (order[a.source] ?? 1) - (order[b.source] ?? 1);
    });
  }, [mundoEvents, reinos, reinoEvents, filterReino, capsTimeline]);

  const reinosConEventos = useMemo(
    () => reinos.filter(r => {
      const evts = reinoEvents[r.id] ?? decodeTimeline((r as any).historia);
      const tieneEventos = evts.some(e => e.year?.trim() || e.title?.trim());
      // Usar capsReinosIds (todos los caps con reinos) para los botones de filtro,
      // no solo los que tienen orden_linea_tiempo
      const tieneCaps = Object.values(capsReinosIds).some(ids => ids.includes(r.id));
      return tieneEventos || tieneCaps;
    }),
    [reinos, reinoEvents, capsReinosIds]
  );

  // Resolver el evento seleccionado actual
  const selectedEvt = useMemo(() => {
    if (!selectedEventKey) return null;
    return allEvents.find(e => {
      const key = e.source === "mundo" ? e.id : e.source === "capitulo" ? e.id : `${e.reinoId}:${e.id}`;
      return key === selectedEventKey;
    }) ?? null;
  }, [selectedEventKey, allEvents]);

  const handleUpdateSelected = (patch: Partial<TimelineEvent>) => {
    if (!selectedEvt) return;
    if (selectedEvt.source === "mundo") update(selectedEvt.id, patch);
    else if (selectedEvt.reinoId) updateReinoEvent(selectedEvt.reinoId, selectedEvt.id, patch);
  };

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
              mundoInitRef.current = false;
              reinoInitedRef.current = new Set();
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
          <button onClick={async () => {
            for (const reinoId of Object.keys(reinoEvents)) {
              await handleSaveReinoEvent(reinoId);
            }
          }} disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all disabled:opacity-50"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
            <Save size={9} /> Guardar reinos
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
            <div className="flex items-start" style={{ minWidth: "max-content", paddingLeft: 8, paddingRight: 8 }}>

              {allEvents.map((evt, idx) => {
                const isMundo = evt.source === "mundo";
                const isCapitulo = evt.source === "capitulo";
                const totalLen = allEvents.length;
                const key = isCapitulo ? evt.id : isMundo ? evt.id : `${evt.reinoId}:${evt.id}`;
                return (
                  <div key={key} className="flex flex-col shrink-0" style={{ width: 190 }}>
                    {/* Nodo en la línea */}
                    <div className="flex items-center" style={{ height: 26 }}>
                      <div className="flex-1 h-px" style={{ background: idx === 0 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                      <div className="shrink-0 rounded-full transition-all"
                        style={isMundo ? {
                          width: 10, height: 10,
                          background: "var(--primary)",
                          boxShadow: "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)",
                        } : isCapitulo ? {
                          width: 8, height: 8,
                          background: "color-mix(in srgb, var(--accent) 70%, var(--primary))",
                          boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent)",
                        } : {
                          width: 7, height: 7,
                          background: "color-mix(in srgb, var(--primary) 40%, transparent)",
                          boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 10%, transparent)",
                        }} />
                      <div className="flex-1 h-px" style={{ background: idx === totalLen - 1 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                    </div>
                    {/* Tarjeta */}
                    {isCapitulo && evt.capData ? (
                      <CapituloEventoRow
                        cap={evt.capData}
                        onNavigate={() => {
                          localStorage.setItem("estudio-caps-last-cap", evt.capData!.id);
                          localStorage.setItem("estudio-caps-last-libro", evt.capData!.libro_id);
                          window.dispatchEvent(new Event("estudio-caps-action"));
                        }}
                      />
                    ) : (
                      <MundoEventoRow
                        evt={evt}
                        source={isMundo ? "mundo" : "reino"}
                        reinos={reinos}
                        isSelected={selectedEventKey === key}
                        onSelect={() => setSelectedEventKey(prev => prev === key ? null : key)}
                        onRemove={() => {
                          if (isMundo) remove(evt.id);
                          else if (evt.reinoId) {
                            removeReinoEvent(evt.reinoId, evt.id);
                            void handleSaveReinoEvent(evt.reinoId);
                          }
                          if (selectedEventKey === key) setSelectedEventKey(null);
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Botón "+" al final */}
              {!filterReino && (
                <div className="flex flex-col shrink-0 items-center" style={{ width: 80 }}>
                  <div className="flex items-center w-full" style={{ height: 26 }}>
                    <div className="flex-1 h-px" style={{ background: allEvents.length > 0 ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent" }} />
                    <button type="button" onClick={add}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-dashed transition-all"
                      style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "color-mix(in srgb, var(--primary) 45%, transparent)"; el.style.color = "var(--primary)"; el.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "color-mix(in srgb, var(--primary) 20%, transparent)"; el.style.color = "color-mix(in srgb, var(--primary) 35%, transparent)"; el.style.background = "transparent"; }}>
                      <Plus size={11} />
                    </button>
                    <div className="flex-1 h-px" style={{ background: "transparent" }} />
                  </div>
                  <span className="text-[7px] font-black uppercase tracking-widest mt-1 text-center"
                    style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                    Nuevo
                  </span>
                </div>
              )}

              {/* Estado vacío */}
              {allEvents.length === 0 && filterReino && (
                <p className="text-[9px] text-primary/20 italic px-4 py-2 self-center">Sin eventos para este reino.</p>
              )}
              {allEvents.length === 0 && !filterReino && (
                <p className="text-[9px] text-primary/20 italic px-2 py-2 self-center">Usá el "+" para añadir el primer evento.</p>
              )}

            </div>
          </div>
        )}
      </div>

      {/* ── Fila 2: Panel de edición — ancho completo ─────────────────────── */}
      {selectedEvt && (
        <div className="border-t px-4 py-4 space-y-3"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>

          {/* Header del panel con campos de edición inline */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              className="bg-transparent outline-none text-[10px] font-black tracking-widest text-center placeholder:text-primary/20 px-2 py-1 rounded-lg border w-28 shrink-0"
              value={selectedEvt.year}
              onChange={e => handleUpdateSelected({ year: e.target.value })}
              placeholder="Año"
              style={{
                color: selectedEvt.year?.trim() ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                background: selectedEvt.year?.trim() ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent",
              }}
            />
            <input
              className="flex-1 min-w-0 bg-transparent outline-none text-sm font-black placeholder:text-primary/25"
              value={selectedEvt.title}
              onChange={e => handleUpdateSelected({ title: e.target.value })}
              placeholder="Nombre del evento…"
              style={{ color: "var(--primary)" }}
            />
            {selectedEvt.source === "mundo" && reinos.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={(selectedEvt as any).reinoId ?? ""}
                  onChange={e => handleUpdateSelected({ reinoId: e.target.value || null } as any)}
                  className="appearance-none text-[10px] font-bold rounded-lg px-2.5 py-1.5 outline-none border cursor-pointer pr-7"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                    borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    color: (selectedEvt as any).reinoId ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  }}>
                  <option value="">— Mundo (sin reino) —</option>
                  {reinos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                <Crown size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: (selectedEvt as any).reinoId ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
              </div>
            )}
            {selectedEvt.source === "reino" && (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0"
                style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                <Crown size={9} /> {(selectedEvt as any).reinoNombre}
              </span>
            )}
            <button type="button" onClick={() => setSelectedEventKey(null)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--primary)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 28%, transparent)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "color-mix(in srgb, var(--primary) 40%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 12%, transparent)"; }}>
              <X size={11} /> Cerrar
            </button>
          </div>

          {/* Editor de descripción — ancho completo */}
          <MarkdownEditor
            value={selectedEvt.description}
            onChange={v => handleUpdateSelected({ description: v })}
            placeholder="Descripción del evento…"
            rows={10}
            toolbar
            defaultMode="edit"
            onSnippetAction={onSnippetAction}
          />
        </div>
      )}
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
  plantas?: string;
  lugares?: string;
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
  plantas: "Plantas",
  lugares: "Lugares",
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

// ─── PlantaOverlay: carga la planta completa y renderiza EditorPlanta ──────────
function PlantaOverlay({
  plantaMin, allEntityNames, reinos, ciudades,
  onUpdated, onDeleted, onSelectCiudad, onSelectReino,
}: {
  plantaMin: PlantaMin;
  allEntityNames: WikiEntity[];
  reinos: Reino[];
  ciudades: CiudadMin[];
  onUpdated: (p: any) => void;
  onDeleted: (id: string) => void;
  onSelectCiudad: (id: string) => void;
  onSelectReino: (id: string) => void;
}) {
  const [planta, setPlanta] = useState<Planta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("plantas").select("*").eq("id", plantaMin.id).single()
      .then(({ data }) => { if (data) setPlanta(data as Planta); setLoading(false); });
  }, [plantaMin.id]);

  if (loading || !planta) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <EditorPlanta
      planta={planta}
      entities={allEntityNames}
      onSaved={(updated) => { setPlanta(updated); onUpdated(updated); }}
      onDeleted={onDeleted}
      onNavigateCiudad={onSelectCiudad}
      onNavigateReino={onSelectReino}
    />
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
  const { lugares,    setLugares,    loading: loadingLugares    } = useLugares();
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
  const { plantas, setPlantas, loading: loadingPlantas } = usePlantas();

  const { grupos, loaded: loadedGrupos, actualizarGrupo, eliminarGrupo } = useGrupos();
  const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } = useNotas();
  const { canciones, loading: loadingCanciones } = useCanciones();

  // ── Estado de selección (overlay) ────────────────────────────────────────
  const [selectedReino,     setSelectedReino]     = useState<Reino | null>(null);
  const [selectedCriatura,  setSelectedCriatura]  = useState<{ id: string; nombre: string; imagen_url?: string; habitat?: string } | null>(null);
  const [selectedObjeto,    setSelectedObjeto]    = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string } | null>(null);
  const [selectedCiudad,     setSelectedCiudad]     = useState<Ciudad | null>(null);
  const [selectedLugar,      setSelectedLugar]      = useState<Lugar | null>(null);
  const [selectedPersonaje, setSelectedPersonaje] = useState<Personaje | null>(null);
  const [selectedHechizo,   setSelectedHechizo]   = useState<EntidadMagicaMin | null>(null);
  const [selectedDon,       setSelectedDon]       = useState<EntidadMagicaMin | null>(null);
  const [selectedRuna,      setSelectedRuna]      = useState<RunaMin | null>(null);
  const [selectedNota,      setSelectedNota]      = useState<Nota | null>(null);
  const [selectedGrupo,     setSelectedGrupo]     = useState<Grupo | null>(null);
  const [selectedCancion,   setSelectedCancion]   = useState<Cancion | null>(null);
  const [selectedPlanta,    setSelectedPlanta]    = useState<PlantaMin | null>(null);
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
  const selectPlanta    = useCallback((p: PlantaMin | null)     => { setSelectedPlanta(p);    p ? persistOpenItem("plantas",     p.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectLugar     = useCallback((l: Lugar | null)         => { setSelectedLugar(l);     l ? persistOpenItem("lugares",     l.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);

  // ── Overlay activo ────────────────────────────────────────────────────────
  const overlay: "reino" | "criatura" | "objeto" | "personaje" | "hechizo" | "don" | "runa" | "nota" | "ciudad" | "grupo" | "cancion" | "planta" | "lugar" | null =
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
    selectedCancion   ? "cancion"   :
    selectedPlanta    ? "planta"    :
    selectedLugar     ? "lugar"     : null;

  const clearAllOverlays = useCallback(() => {
    setSelectedReino(null); setSelectedCriatura(null);
    setSelectedObjeto(null); setSelectedPersonaje(null);
    setSelectedHechizo(null); setSelectedDon(null); setSelectedRuna(null);
    setSelectedNota(null); setSelectedCiudad(null); setSelectedGrupo(null);
    setSelectedCancion(null); setSelectedPlanta(null); setSelectedLugar(null);
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
    ...plantas   .map(e => ({ name: e.nombre, type: "planta"    })),
    ...lugares   .map(e => ({ name: e.nombre, type: "lugar"     })),
  ], [personajes, criaturas, objetos, reinos, ciudades, lugares, hechizos, dones, runas, plantas]);

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
        else if (tabla === "plantas")      setSelectedPlanta(data as PlantaMin);
        else if (tabla === "lugares")      setSelectedLugar(data as Lugar);
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
    else if (tabla === "canciones")  found = canciones.find(x => x.id === id); // <--- AÑADIDO
    else if (tabla === "plantas")    found = plantas.find(x => x.id === id);
    else if (tabla === "lugares")    found = lugares.find(x => x.id === id);

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
    else if (tabla === "canciones")  setSelectedCancion(found); // <--- AÑADIDO
    else if (tabla === "plantas")    setSelectedPlanta(found);
    else if (tabla === "lugares")    setSelectedLugar(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItem,
      personajes.length, criaturas.length, objetos.length, reinos.length,
      ciudades.length, lugares.length, hechizos.length, dones.length, runas.length, canciones.length, plantas.length]);

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
    else if (tabla === "canciones")  setSelectedCancion(item); // <--- AÑADIDO
    else if (tabla === "plantas")    { setPlantas(p => p.some(x => x.id === item.id) ? p : [item, ...p]); setSelectedPlanta(item); }
    else if (tabla === "lugares")    { setLugares(p => p.some(x => x.id === item.id) ? p : [item, ...p]); setSelectedLugar(item); }
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
            {overlay === "planta" && selectedPlanta && (() => {
              // Fetch full planta data to pass to EditorPlanta
              return (
                <PlantaOverlay
                  key={selectedPlanta.id}
                  plantaMin={selectedPlanta}
                  allEntityNames={allEntityNames}
                  reinos={reinos}
                  ciudades={ciudades}
                  onUpdated={(updated) => { setPlantas(p => p.map(x => x.id === updated.id ? { ...x, ...updated } : x)); setSelectedPlanta({ ...selectedPlanta, ...updated }); }}
                  onDeleted={(id) => { setPlantas(p => p.filter(x => x.id !== id)); setSelectedPlanta(null); }}
                  onSelectCiudad={async (id) => {
                    const local = ciudades.find(x => x.id === id);
                    clearAllOverlays();
                    if (local) { setSelectedCiudad(local as Ciudad); return; }
                    const { data } = await supabase.from("ciudades").select("*").eq("id", id).single();
                    if (data) setSelectedCiudad(data as Ciudad);
                  }}
                  onSelectReino={async (id) => {
                    const local = reinos.find(x => x.id === id);
                    clearAllOverlays();
                    if (local) { setSelectedReino(local); return; }
                    const { data } = await supabase.from("reinos").select("*").eq("id", id).single();
                    if (data) setSelectedReino(data as Reino);
                  }}
                />
              );
            })()}
            {overlay === "lugar" && selectedLugar && (
              <EditorLugar key={selectedLugar.id} item={selectedLugar}
                entities={allEntityNames}
                onSaved={u => { setLugares(p => p.map(l => l.id === u.id ? { ...l, ...u } : l)); setSelectedLugar(u); }}
                onDeleted={id => { setLugares(p => p.filter(l => l.id !== id)); setSelectedLugar(null); }}
                onNavigateReino={id => { const r = reinos.find(x => x.id === id); if (!r) return; clearAllOverlays(); setSelectedReino(r); }}
              />
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

          {/* RELACIONES */}
          <div style={{ minHeight: "60vh" }}>
            <div className="flex flex-col min-h-0" style={{ minHeight: "58vh" }}>
              <AdminDescubrimientos />
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
                {grupos.map(g => {
                  const cfg = GRUPO_TIPO_CONFIG[g.tipo as keyof typeof GRUPO_TIPO_CONFIG];
                  return (
                    <button key={g.id} type="button"
                      onClick={async () => {
                        const full = grupos.find(x => x.id === g.id);
                        if (full) { selectGrupo(full); return; }
                        const { data } = await supabase.from("grupos_mundo").select("*").eq("id", g.id).single();
                        if (data) selectGrupo({ ...data, miembro_ids: data.miembro_ids ?? [] } as Grupo);
                      }}
                      className="flex flex-col px-3 py-1.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 4%, transparent)`, borderColor: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 12%, transparent)` }}>
                      <span className="text-[11px] font-bold text-primary/70 truncate">{g.nombre}</span>
                    </button>
                  );
                })}
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

            {/* ── Fila 2 desktop: Criaturas · Plantas · Items ── */}
            <div className="sm:grid sm:grid-cols-3 sm:gap-x-4">
              <SeccionEntidades icon={Bug} label={el.criaturas} count={criaturas.length} loading={loadingCriaturas}>
                {[...criaturas].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(c => <Chip key={c.id} onClick={() => selectCriatura(c)} imgUrl={c.imagen_url} icon={Bug} nombre={c.nombre} />)}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={Leaf} label={el.plantas} count={plantas.length} loading={loadingPlantas}>
                {[...plantas].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(p => (
                  <Chip key={p.id} onClick={() => selectPlanta(p)} imgUrl={p.imagen_url} icon={Leaf} nombre={p.nombre} />
                ))}
              </SeccionEntidades>
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={Package} label={el.objetos} count={objetos.length} loading={loadingObjetos}>
                {[...objetos].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(o => <Chip key={o.id} onClick={() => selectObjeto(o)} imgUrl={o.imagen_url} icon={Package} nombre={o.nombre} />)}
              </SeccionEntidades>
            </div>
            <div className={div} style={divStyle} />

            {/* ── Extra desktop: Reinos · Ciudades · Lugares ── */}
            <div className="sm:grid sm:grid-cols-3 sm:gap-x-4">
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
              <div className={`${div} sm:hidden`} style={divStyle} />

              <SeccionEntidades icon={Mountain} label={el.lugares} count={lugares.length} loading={loadingLugares}>
                {[...lugares].sort((a,b)=>(!!b.imagen_url ? 1:0)-(!!a.imagen_url ? 1:0)||a.nombre.localeCompare(b.nombre)).map(l => (
                  <Chip key={l.id} onClick={async () => {
                    try { const { data } = await supabase.from("lugares").select("*").eq("id", l.id).single(); if (data) { selectLugar(data as Lugar); return; } } catch {}
                    selectLugar(l as Lugar);
                  }} imgUrl={l.imagen_url} icon={Mountain} nombre={l.nombre} />
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