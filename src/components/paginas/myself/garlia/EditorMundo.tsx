"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Globe, Plus, Trash2, Save, Loader2, Search, X, Bug,
  ChevronDown, Mountain, ScrollText, Map, FileText, Users, UserCircle2, Package,
  Crown, Clock, Filter, Layers, Check, BookOpen, Music, MapPin,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { MUNDO_SECTIONS, type MundoSectionKey, type SaveStatus, type Reino, type Personaje, type Nota } from "./components/types";
import { SaveIndicator, SelectorImagen } from "./components/UIComponents";
import { MarkdownEditor } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";
import { EditorReino } from "./EditorReino";
import { EditorPersonaje } from "./EditorPersonaje";
import { EditorCriatura } from "./EditorCriatura";
import { EditorItem } from "./EditorItem";
import { EditorLugar, type Lugar } from "./EditorLugar";
import { type WikiEntity } from "../../../forms/MarkdownEditor";
import { type TimelineEvent } from "./components/LoreTab";
import { useNotas } from "./components/useNotas";
import { EditorNota, ListaNotas } from "./EditorNota";
import { EditorGrupo, useGrupos, type Grupo, GRUPO_TIPO_CONFIG } from "./EditorGrupo";
import EstudioCapitulos from "@/components/paginas/myself/garlia/editorCapitulos/page";
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



// ─── Types locales ────────────────────────────────────────────────────────────
type EntidadMagica = {
  id: string;
  nombre: string;
  explicacion?: string;
  grupo_ids?: string[];
};

// EntidadMagica sin campos de criatura (para runas)
type Runa = {
  id: string;
  nombre: string;
  explicacion?: string;
  imagen_url?: string | null;
};

// Usados por useCriaturas y useCriaturaVariantes (para items del mundo)
type CriaturaMin = { id: string; nombre: string; imagen_url?: string; habitat?: string };
type VarianteMin = { id: string; tipo: string };

// ─── Hook genérico de carga: local (Dexie) → remoto (Supabase) ───────────────
// Reemplaza useReinos, useCriaturas, useObjetos, useLugares, usePersonajesList,
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

function useEntidadesMagicas(tabla: string) {
  const { items, setItems, loading } = useEntityList<EntidadMagica>(
    tabla,
    () => supabase.from(tabla).select("id, nombre, explicacion, grupo_ids").order("nombre"),
  );
  return { items, setItems, loading };
}

function useRunas() {
  const { items, setItems, loading } = useEntityList<Runa>(
    "runas",
    () => supabase.from("runas").select("id, nombre, explicacion, imagen_url").order("nombre"),
  );
  return { items, setItems, loading };
}

// ─── Configuración por subtab mágico ─────────────────────────────────────────
// Los colores usan variables CSS del tema activo en lugar de valores hardcodeados.
// --accent      → color de acento del tema
// --primary     → color primario del tema
// color-mix     → variaciones derivadas del accent/primary
const MAGIC_CONFIG = {
  hechizos: {
    tabla: "hechizos", label: "Hechizos", labelSing: "Hechizo",
    Icon: Sparkles, color: "var(--accent)", emoji: "✨",
    placeholder: "Qué hace este hechizo, cómo se lanza, sus efectos…",
  },
  dones: {
    tabla: "dones", label: "Dones", labelSing: "Don",
    Icon: Star, color: "color-mix(in srgb, var(--accent) 70%, var(--primary))", emoji: "⭐",
    placeholder: "Qué otorga este don, su origen, sus limitaciones…",
  },
  runas: {
    tabla: "runas", label: "Runas", labelSing: "Runa",
    Icon: ScrollText, color: "var(--primary)", emoji: "ᚱ",
    placeholder: "Qué significa esta runa, cómo se activa, su poder…",
  },
} as const;

// ─── Tipos locales de entidades mínimas ──────────────────────────────────────
type ObjetoMin = { id: string; nombre: string; imagen_url?: string; categoria?: string };
type LugarMin  = { id: string; nombre: string; imagen_url?: string; tipo?: string; reino_id?: string };

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
type GrupoMin  = { id: string; nombre: string; miembro_ids: string[] };
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

function useGruposCriaturas() {
  const { grupos, loading } = useGruposMundo("criaturas");
  return { grupos: grupos as GrupoMin[], loading };
}

function useGruposTodos() {
  const { grupos, loading } = useGruposMundo();
  return { grupos: grupos as GrupoTodo[], loading };
}

function FilaGrupo({ grupo, color, onQuitar }: { grupo: GrupoMin; color: string; onQuitar: () => void }) {
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)`, background: `color-mix(in srgb, ${color} 4%, transparent)` }}>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="shrink-0 w-7 h-7 rounded-lg border border-primary/10 bg-primary/5 flex items-center justify-center">
          <Layers size={11} className="text-primary/30" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-primary/85 truncate block">{grupo.nombre}</span>
          <span className="text-[9px] text-primary/30">{grupo.miembro_ids.length} criaturas</span>
        </div>
        <button onClick={onQuitar}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-primary/20 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <X size={10} />
        </button>
      </div>
    </div>
  );
}

function SelectorAgregarGrupo({ grupos, loadingGrupos, asignados, onAgregar, color }: {
  grupos: GrupoMin[]; loadingGrupos: boolean; asignados: string[];
  onAgregar: (g: GrupoMin) => void; color: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const disponibles = useMemo(
    () => grupos.filter(g => !asignados.includes(g.id) && g.nombre.toLowerCase().includes(search.toLowerCase())),
    [grupos, asignados, search]
  );
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
        style={{ borderColor: `color-mix(in srgb, ${color} 22%, transparent)`, color: `color-mix(in srgb, ${color} 55%, transparent)` }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${color} 6%, transparent)`; (e.currentTarget as HTMLElement).style.color = color; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = `color-mix(in srgb, ${color} 55%, transparent)`; }}>
        <Plus size={9} /> Agregar grupo de criaturas
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border overflow-hidden shadow-xl"
            style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
            <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <div className="relative">
                <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar grupo…"
                  className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25" />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {loadingGrupos ? (
                <div className="flex justify-center py-6"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
              ) : disponibles.length === 0 ? (
                <p className="text-[9px] text-primary/25 text-center py-4 italic">
                  {grupos.length === asignados.length ? "Todos los grupos ya están asignados" : "Sin resultados"}
                </p>
              ) : disponibles.map(g => (
                <button key={g.id} onMouseDown={() => { onAgregar(g); setSearch(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors">
                  <div className="shrink-0 w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 flex items-center justify-center">
                    <Layers size={10} className="text-primary/25" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-primary/80 truncate block">{g.nombre}</span>
                    <span className="text-[9px] text-primary/30">{g.miembro_ids.length} criaturas</span>
                  </div>
                  <Check size={9} className="text-primary/15" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PanelGruposAsignados({ grupoIds, onGrupoIdsChange, grupos, loadingGrupos, color }: {
  grupoIds: string[]; onGrupoIdsChange: (ids: string[]) => void;
  grupos: GrupoMin[]; loadingGrupos: boolean; color: string;
}) {
  const asignados = useMemo(() => grupos.filter(g => grupoIds.includes(g.id)), [grupos, grupoIds]);
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
        <Layers size={9} /> Grupos de criaturas que pueden usarlo
      </label>
      {loadingGrupos ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={11} className="animate-spin text-primary/20" />
          <span className="text-[10px] text-primary/25 italic">Cargando grupos…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {asignados.length === 0 && (
            <p className="text-[9px] text-primary/20 italic px-1">Sin grupos asignados — universal</p>
          )}
          {asignados.map(g => (
            <FilaGrupo key={g.id} grupo={g} color={color}
              onQuitar={() => onGrupoIdsChange(grupoIds.filter(id => id !== g.id))} />
          ))}
          <SelectorAgregarGrupo grupos={grupos} loadingGrupos={loadingGrupos} asignados={grupoIds}
            onAgregar={g => { if (!grupoIds.includes(g.id)) onGrupoIdsChange([...grupoIds, g.id]); }}
            color={color} />
        </div>
      )}
    </div>
  );
}

// ─── Formulario de edición de hechizo/don ────────────────────────────────────
function FormularioMagico({ item, modo, grupos, loadingGrupos, onSaved, onDeleted }: {
  item: EntidadMagica;
  modo: "hechizos" | "dones" | "runas";
  grupos: GrupoMin[];
  loadingGrupos: boolean;
  onSaved: (i: EntidadMagica) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<EntidadMagica>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();
  const cfg = MAGIC_CONFIG[modo];

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from(cfg.tabla).update({
        nombre: form.nombre,
        explicacion: form.explicacion || null,
        grupo_ids: form.grupo_ids ?? [],
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut(cfg.tabla, form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from(cfg.tabla).delete().eq("id", form.id);
    void dexieDel(cfg.tabla, form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* Header */}
      <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden flex items-center justify-center border"
            style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)` }}>
            <cfg.Icon size={15} style={{ color: cfg.color }} />
          </div>
          <input
            value={form.nombre ?? ""}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder={`Nombre del ${cfg.labelSing.toLowerCase()}…`}
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <SaveIndicator status={status} />
          <button onClick={del}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
            <Trash2 size={10} />
          </button>
          <button onClick={save} disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
        <PanelGruposAsignados
          grupoIds={form.grupo_ids ?? []}
          onGrupoIdsChange={ids => setForm(f => ({ ...f, grupo_ids: ids }))}
          grupos={grupos}
          loadingGrupos={loadingGrupos}
          color={cfg.color}
        />
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Explicación</label>
          <MarkdownEditor
            value={form.explicacion ?? ""}
            onChange={v => setForm(f => ({ ...f, explicacion: v }))}
            rows={14}
            placeholder={cfg.placeholder}
            toolbar
            defaultMode="edit"
            onSnippetAction={onSnippetAction}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Formulario de edición de runa (sin criatura) ────────────────────────────
function FormularioRuna({ item, onSaved, onDeleted }: {
  item: Runa;
  onSaved: (i: Runa) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<Runa>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { onSnippetAction } = useWikilink();
  const { confirm, ConfirmModal } = useConfirm();
  const cfg = MAGIC_CONFIG.runas;

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("runas").update({
        nombre: form.nombre,
        explicacion: form.explicacion || null,
        imagen_url: form.imagen_url || null,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("runas").delete().eq("id", form.id);
    void dexieDel("runas", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
        <input
          value={form.nombre ?? ""}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Nombre de la runa…"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
        />
        <div className="shrink-0 flex items-center gap-2">
          <SaveIndicator status={status} />
          <button onClick={del}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
            <Trash2 size={10} />
          </button>
          <button onClick={save} disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>
      {/* Body — dos columnas: imagen grande + contenido */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col sm:flex-row gap-0 h-full">
          {/* Columna izquierda: imagen grande */}
          <div className="shrink-0 sm:w-48 p-4 sm:border-r flex flex-col gap-3"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            <div className="w-full sm:w-full mx-auto" style={{ maxWidth: "10rem" }}>
              <SelectorImagen
                label="Imagen"
                value={form.imagen_url ?? ""}
                onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                aspect="square"
                placeholder={<cfg.Icon size={28} style={{ color: cfg.color, opacity: 0.4 }} />}
              />
            </div>
            {/* Nombre de la runa como subtítulo bajo la imagen */}
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-center truncate"
              style={{ color: `color-mix(in srgb, ${cfg.color} 50%, transparent)` }}>
              {form.nombre || "Runa sin nombre"}
            </p>
          </div>
          {/* Columna derecha: explicación */}
          <div className="flex-1 min-w-0 p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Explicación</label>
              <MarkdownEditor
                value={form.explicacion ?? ""}
                onChange={v => setForm(f => ({ ...f, explicacion: v }))}
                rows={16}
                placeholder={cfg.placeholder}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Panel de lista + editor para hechizos o dones ───────────────────────────

type MundoTimelineEvent = TimelineEvent & {
  source: "mundo" | "reino";
  reinoNombre?: string;
  reinoId?: string;
  yearNum: number; // para ordenar (valor numérico)
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
  const [mundoEvents, setMundoEvents] = useState<TimelineEvent[]>(() => decodeTimeline(texto));
  useEffect(() => { setMundoEvents(decodeTimeline(texto)); }, [texto]);

  const { reinos, setReinos, loading: loadingReinos } = useReinos();
  const [reinoEvents, setReinoEvents] = useState<Record<string, TimelineEvent[]>>({});

  useEffect(() => {
    const map: Record<string, TimelineEvent[]> = {};
    for (const r of reinos) {
      map[r.id] = decodeTimeline((r as any).historia);
    }
    setReinoEvents(map);
  }, [reinos]);

  const handleMundoChange = (evts: TimelineEvent[]) => {
    setMundoEvents(evts);
    onChange(encodeTimeline(evts));
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
    const { error } = await supabase.from("reinos").update({ historia: encoded }).eq("id", reinoId);
    if (!error) {
      setReinos(prev => prev.map(r => r.id === reinoId ? { ...r, historia: encoded } as Reino : r));
      void dexiePut("reinos", { id: reinoId, historia: encoded });
    }
    return error;
  }, [setReinos]);

  const [filterReino, setFilterReino] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savingReinos, setSavingReinos] = useState<Set<string>>(new Set());
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null); // "evtId" o "reinoId:evtId"
  const { onSnippetAction } = useWikilink();

  const handleSave = async () => {
    setSaveStatus("saving");
    try { await onSave(); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }
    catch { setSaveStatus("error"); }
  };

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
    return list.sort((a, b) => parseYear(a.year) - parseYear(b.year));
  }, [mundoEvents, reinos, reinoEvents, filterReino]);

  const reinosConEventos = useMemo(
    () => reinos.filter(r => {
      const evts = reinoEvents[r.id] ?? decodeTimeline((r as any).historia);
      return evts.some(e => e.year?.trim() || e.title?.trim());
    }),
    [reinos, reinoEvents]
  );

  // Resolver el evento seleccionado actual
  const selectedEvt = useMemo(() => {
    if (!selectedEventKey) return null;
    return allEvents.find(e => {
      const key = e.source === "mundo" ? e.id : `${e.reinoId}:${e.id}`;
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
          <button onClick={async () => {
            handleSave();
            for (const reinoId of Object.keys(reinoEvents)) {
              await handleSaveReinoEvent(reinoId);
            }
          }} disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50">
            <Save size={9} /> Guardar todo
          </button>
        </div>
      </div>

      {/* ── Fila 1: Pista horizontal ───────────────────────────────────────── */}
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
                const totalLen = allEvents.length;
                const key = isMundo ? evt.id : `${evt.reinoId}:${evt.id}`;
                return (
                  <div key={key} className="flex flex-col shrink-0" style={{ width: 190 }}>
                    {/* Conector */}
                    <div className="flex items-center" style={{ height: 26 }}>
                      <div className="flex-1 h-px" style={{ background: idx === 0 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                      <div className="shrink-0 rounded-full transition-all"
                        style={isMundo ? {
                          width: 10, height: 10,
                          background: "var(--primary)",
                          boxShadow: "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)",
                        } : {
                          width: 7, height: 7,
                          background: "color-mix(in srgb, var(--primary) 40%, transparent)",
                          boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 10%, transparent)",
                        }} />
                      <div className="flex-1 h-px" style={{ background: idx === totalLen - 1 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                    </div>

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
                  </div>
                );
              })}

              {/* Botón "+" al final de la pista */}
              {!filterReino && (
                <div className="flex flex-col shrink-0 items-center" style={{ width: 80, paddingTop: 0 }}>
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

// ─── EditorMundo unificado ────────────────────────────────────────────────────
export function EditorMundo({
  textos,
  onTextoChange,
  onSave,
  initialItemId,
  openItem,
  onOverlayChange,
  onItemCreated,
}: {
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
  initialItemId?: string;
  openItem?: { tabla: string; id: string } | null;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  onItemCreated?: { tabla: string; item: any } | null;
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
}: {
  initialItemId?: string;
  openItem?: { tabla: string; id: string } | null;
  textos?: Record<MundoSectionKey, string>;
  onTextoChange?: (section: MundoSectionKey, value: string) => void;
  onSave?: (section: MundoSectionKey) => Promise<void>;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  onItemCreated?: { tabla: string; item: any } | null;
}) {
  // ── Datos — todos cargan al montar ───────────────────────────────────────
  const { reinos,    setReinos,    loading: loadingReinos    } = useReinos();
  const { criaturas, setCriaturas, loading: loadingCriaturas } = useCriaturas();
  const { objetos,   setObjetos,   loading: loadingObjetos   } = useObjetos();
  const { lugares,   setLugares,   loading: loadingLugares   } = useLugares();
  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesList();
  const { items: hechizos, setItems: setHechizos, loading: loadingHechizos } = useEntidadesMagicas("hechizos");
  const { items: dones,    setItems: setDones,    loading: loadingDones    } = useEntidadesMagicas("dones");
  const { items: runas,    setItems: setRunas,    loading: loadingRunas    } = useRunas();
  const { grupos: gruposMagicos, loading: loadingGruposMagicos } = useGruposCriaturas();
  const { grupos, loaded: loadedGrupos, actualizarGrupo, eliminarGrupo } = useGrupos();
  const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } = useNotas();
  const { canciones, loading: loadingCanciones } = useCanciones();

  // ── Estado de selección (overlay) ────────────────────────────────────────
  const [selectedReino,     setSelectedReino]     = useState<Reino | null>(null);
  const [selectedCriatura,  setSelectedCriatura]  = useState<{ id: string; nombre: string; imagen_url?: string; habitat?: string } | null>(null);
  const [selectedObjeto,    setSelectedObjeto]    = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string } | null>(null);
  const [selectedLugar,     setSelectedLugar]     = useState<Lugar | null>(null);
  const [selectedPersonaje, setSelectedPersonaje] = useState<Personaje | null>(null);
  const [selectedHechizo,   setSelectedHechizo]   = useState<EntidadMagica | null>(null);
  const [selectedDon,       setSelectedDon]       = useState<EntidadMagica | null>(null);
  const [selectedRuna,      setSelectedRuna]      = useState<Runa | null>(null);
  const [selectedNota,      setSelectedNota]      = useState<Nota | null>(null);
  const [selectedGrupo,     setSelectedGrupo]     = useState<Grupo | null>(null);
  const [selectedCancion,   setSelectedCancion]   = useState<Cancion | null>(null);
  const [showModalCancion,  setShowModalCancion]  = useState(false);

  // ── Scroll position ───────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const selectLugar     = useCallback((l: Lugar | null)         => { setSelectedLugar(l);     l ? persistOpenItem("lugares",    l.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectPersonaje = useCallback((p: Personaje | null)     => { setSelectedPersonaje(p); p ? persistOpenItem("personajes", p.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectHechizo   = useCallback((h: EntidadMagica | null) => { setSelectedHechizo(h);   h ? persistOpenItem("hechizos",   h.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectDon       = useCallback((d: EntidadMagica | null) => { setSelectedDon(d);       d ? persistOpenItem("dones",      d.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectRuna      = useCallback((r: Runa | null)          => { setSelectedRuna(r);      r ? persistOpenItem("runas",      r.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectGrupo     = useCallback((g: Grupo | null)         => { setSelectedGrupo(g);     g ? persistOpenItem("grupos_mundo", g.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);
  const selectCancion   = useCallback((c: Cancion | null)       => { setSelectedCancion(c);   c ? persistOpenItem("canciones",   c.id) : clearPersistedItem(); }, [persistOpenItem, clearPersistedItem]);

  // ── Overlay activo ────────────────────────────────────────────────────────
  const overlay: "reino" | "criatura" | "objeto" | "personaje" | "hechizo" | "don" | "runa" | "nota" | "lugar" | "grupo" | "cancion" | null =
    selectedReino     ? "reino"     :
    selectedCriatura  ? "criatura"  :
    selectedObjeto    ? "objeto"    :
    selectedLugar     ? "lugar"     :
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
    setSelectedNota(null); setSelectedLugar(null); setSelectedGrupo(null);
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
    ...lugares   .map(e => ({ name: e.nombre, type: "lugar"     })),
    ...hechizos  .map(e => ({ name: e.nombre, type: "hechizo"   })),
    ...dones     .map(e => ({ name: e.nombre, type: "don"       })),
    ...runas     .map(e => ({ name: e.nombre, type: "runa"      })),
  ], [personajes, criaturas, objetos, reinos, lugares, hechizos, dones, runas]);

  // ── Restaurar item al montar ───────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem(LS_ITEM_KEY);
        if (!raw) return;
        const { tabla, id } = JSON.parse(raw) as { tabla: string; id: string };
        const { data } = await supabase.from(tabla === "items" ? "items" : tabla).select("*").eq("id", id).single();
        if (!data) return;
        if      (tabla === "personajes") setSelectedPersonaje(data);
        else if (tabla === "criaturas")  setSelectedCriatura(data);
        else if (tabla === "items")      setSelectedObjeto(data);
        else if (tabla === "reinos")     setSelectedReino(data);
        else if (tabla === "hechizos")   setSelectedHechizo(data);
        else if (tabla === "dones")      setSelectedDon(data);
        else if (tabla === "runas")      setSelectedRuna(data);
        else if (tabla === "lugares")    setSelectedLugar(data as Lugar);
        else if (tabla === "grupos_mundo") setSelectedGrupo(data as Grupo);
        else if (tabla === "canciones")  setSelectedCancion(data as Cancion); // <--- AÑADIDO
      } catch {}
    })();
  }, []);


  // ── Abrir item desde buscador global (openItem prop) ─────────────────────
  const lastOpenItemRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openItem) return;
    const key = `${openItem.tabla}:${openItem.id}`;
    const { tabla, id } = openItem;
    let found: any = null;
    
    if      (tabla === "personajes") found = personajes.find(x => x.id === id);
    else if (tabla === "criaturas")  found = criaturas.find(x => x.id === id);
    else if (tabla === "items")      found = objetos.find(x => x.id === id);
    else if (tabla === "reinos")     found = reinos.find(x => x.id === id);
    else if (tabla === "lugares")    found = lugares.find(x => x.id === id);
    else if (tabla === "hechizos")   found = hechizos.find(x => x.id === id);
    else if (tabla === "dones")      found = dones.find(x => x.id === id);
    else if (tabla === "runas")      found = runas.find(x => x.id === id);
    else if (tabla === "canciones")  found = canciones.find(x => x.id === id); // <--- AÑADIDO

    if (!found || lastOpenItemRef.current === key) return;
    lastOpenItemRef.current = key;
    
    if      (tabla === "personajes") setSelectedPersonaje(found);
    else if (tabla === "criaturas")  setSelectedCriatura(found);
    else if (tabla === "items")      setSelectedObjeto(found);
    else if (tabla === "reinos")     setSelectedReino(found);
    else if (tabla === "lugares")    setSelectedLugar(found);
    else if (tabla === "hechizos")   setSelectedHechizo(found);
    else if (tabla === "dones")      setSelectedDon(found);
    else if (tabla === "runas")      setSelectedRuna(found);
    else if (tabla === "canciones")  setSelectedCancion(found); // <--- AÑADIDO
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItem,
      personajes.length, criaturas.length, objetos.length, reinos.length,
      lugares.length, hechizos.length, dones.length, runas.length, canciones.length]); // <--- AÑADIDA DEPENDENCIA

// ── onItemCreated ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!onItemCreated) return;
    const { tabla, item } = onItemCreated;
    if      (tabla === "personajes") setPersonajes(p => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "criaturas")  setCriaturas(p  => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "items")      setObjetos(p    => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "reinos")     setReinos(p     => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "lugares")    setLugares(p    => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "hechizos")   setHechizos(p   => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "dones")      setDones(p      => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "runas")      setRunas(p      => p.some(x => x.id === item.id) ? p : [item, ...p]);

    if      (tabla === "personajes") setSelectedPersonaje(item);
    else if (tabla === "criaturas")  setSelectedCriatura(item);
    else if (tabla === "items")      setSelectedObjeto(item);
    else if (tabla === "reinos")     setSelectedReino(item);
    else if (tabla === "lugares")    setSelectedLugar(item);
    else if (tabla === "hechizos")   setSelectedHechizo(item);
    else if (tabla === "dones")      setSelectedDon(item);
    else if (tabla === "runas")      setSelectedRuna(item);
    else if (tabla === "canciones")  setSelectedCancion(item); // <--- AÑADIDO
  }, [onItemCreated]);

  // ── nuevo-lugar / nueva-nota actions ─────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-listas-action");
      if (action !== "nuevo-lugar") return;
      localStorage.removeItem("estudio-listas-action");
      (async () => {
        try {
          const { data, error } = await supabase.from("lugares").insert([{ nombre: "Nuevo lugar" }]).select("*").single();
          if (error || !data) return;
          setLugares(prev => [data as LugarMin, ...prev]);
          setSelectedLugar(data as Lugar);
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

  // ── Helper: chip genérico ─────────────────────────────────────────────────
  function Chip({ onClick, imgUrl, icon: Icon, nombre, accentBg, accentBorder, accentText }: {
    onClick: () => void; imgUrl?: string | null; icon: React.ElementType;
    nombre: string; accentBg?: string; accentBorder?: string; accentText?: string;
  }) {
    return (
      <button onClick={onClick} type="button"
        className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]"
        style={{ background: accentBg ?? "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: accentBorder ?? "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
        <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
          {imgUrl ? <img src={imgUrl} alt={nombre} className="w-full h-full object-cover" /> : <Icon size={10} className="text-primary/25" />}
        </div>
        <span className="text-[11px] font-bold truncate max-w-[90px]" style={{ color: accentText ?? "color-mix(in srgb, var(--primary) 70%, transparent)" }}>{nombre}</span>
      </button>
    );
  }

  // ── Helper: sección de entidades ─────────────────────────────────────────
  function SeccionEntidades({ icon: Icon, label, count, loading, children }: {
    icon: React.ElementType; label: string; count: number; loading: boolean; children: React.ReactNode;
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
            : <div className="flex flex-wrap gap-1.5">{children}</div>
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
                onSelectLugar={async (id: string) => {
                  const local = lugares.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { setSelectedLugar(local as Lugar); return; }
                  const { data } = await supabase.from("lugares").select("*").eq("id", id).single();
                  if (data) setSelectedLugar(data as Lugar);
                }}
                onSelectCriatura={id => { const c = criaturas.find(x => x.id === id); if (!c) return; clearAllOverlays(); setSelectedCriatura(c); }}
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
                onNavigateLugar={async (id) => {
                  const local = lugares.find(x => x.id === id);
                  clearAllOverlays();
                  if (local) { selectLugar(local); return; }
                  const { data } = await supabase.from("lugares").select("*").eq("id", id).single();
                  if (data) selectLugar(data as Lugar);
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
              />
            )}
            {overlay === "lugar" && selectedLugar && (
              <EditorLugar key={selectedLugar.id} item={selectedLugar as Lugar}
                entities={allEntityNames}
                onSaved={u => { setLugares(p => p.map(l => l.id === u.id ? { ...l, ...u } : l)); setSelectedLugar({ ...selectedLugar, ...u }); }}
                onDeleted={id => { setLugares(p => p.filter(l => l.id !== id)); setSelectedLugar(null); }}
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
              />
            )}
            {overlay === "hechizo" && selectedHechizo && (
              <FormularioMagico key={selectedHechizo.id} item={selectedHechizo} modo="hechizos"
                grupos={gruposMagicos} loadingGrupos={loadingGruposMagicos}
                onSaved={u => { setHechizos(p => p.map(h => h.id === u.id ? u : h)); setSelectedHechizo(u); }}
                onDeleted={id => { setHechizos(p => p.filter(h => h.id !== id)); setSelectedHechizo(null); }} />
            )}
            {overlay === "don" && selectedDon && (
              <FormularioMagico key={selectedDon.id} item={selectedDon} modo="dones"
                grupos={gruposMagicos} loadingGrupos={loadingGruposMagicos}
                onSaved={u => { setDones(p => p.map(d => d.id === u.id ? u : d)); setSelectedDon(u); }}
                onDeleted={id => { setDones(p => p.filter(d => d.id !== id)); setSelectedDon(null); }} />
            )}
            {overlay === "runa" && selectedRuna && (
              <FormularioRuna key={selectedRuna.id} item={selectedRuna}
                onSaved={u => { setRunas(p => p.map(r => r.id === u.id ? u : r)); setSelectedRuna(u); }}
                onDeleted={id => { setRunas(p => p.filter(r => r.id !== id)); setSelectedRuna(null); }} />
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

          {/* GEO & MAGIA */}
          {textos && onTextoChange && onSave && (
            <div className="flex flex-col sm:flex-row border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              {/* Geografía */}
              <div className="flex flex-col sm:flex-1 border-b sm:border-b-0 sm:border-r" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", minHeight: "42vh" }}>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
                  <Mountain size={11} className="text-primary/40 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Geografía</span>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <PanelTexto texto={textos.geografia} onChange={v => onTextoChange("geografia", v)} onSave={() => onSave("geografia")} placeholder="Continentes, mares, climas, fronteras del mundo…" saveLabel="Guardar" SaveIcon={Mountain} />
                </div>
              </div>
              {/* Magia */}
              <div className="flex flex-col sm:flex-1" style={{ minHeight: "42vh" }}>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--accent) 3%, transparent)" }}>
                  <Sparkles size={11} style={{ color: "var(--accent)" }} className="shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Magia</span>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <PanelTexto texto={textos.magia} onChange={v => onTextoChange("magia", v)} onSave={() => onSave("magia")} placeholder="Sistema de magia, reglas, fuentes de poder, limitaciones…" saveLabel="Guardar" SaveIcon={Sparkles} />
                </div>
              </div>
            </div>
          )}

          {/* ENTIDADES */}
          <div className="px-3 pb-3 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            <div className="flex items-center gap-2 pt-3 pb-2">
              <Globe size={11} className="text-primary/40 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Entidades</span>
            </div>

            <SeccionEntidades icon={Map} label="Reinos" count={reinos.length} loading={loadingReinos}>
              {reinos.map(r => <Chip key={r.id} onClick={() => selectReino(r)} imgUrl={r.mapa_url} icon={Map} nombre={r.nombre} />)}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={Bug} label="Criaturas" count={criaturas.length} loading={loadingCriaturas}>
              {criaturas.map(c => <Chip key={c.id} onClick={() => selectCriatura(c)} imgUrl={c.imagen_url} icon={Bug} nombre={c.nombre} />)}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={Users} label="Personajes" count={personajes.length} loading={loadingPersonajes}>
              {personajes.map(p => <Chip key={p.id} onClick={() => selectPersonaje(p)} imgUrl={p.img_url} icon={UserCircle2} nombre={p.nombre} />)}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={Package} label="Objetos" count={objetos.length} loading={loadingObjetos}>
              {objetos.map(o => <Chip key={o.id} onClick={() => selectObjeto(o)} imgUrl={o.imagen_url} icon={Package} nombre={o.nombre} />)}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={MapPin} label="Lugares" count={lugares.length} loading={loadingLugares}>
              {lugares.map(l => (
                <Chip key={l.id} onClick={async () => {
                  try { const { data } = await supabase.from("lugares").select("*").eq("id", l.id).single(); if (data) { selectLugar(data as Lugar); return; } } catch {}
                  selectLugar(l as Lugar);
                }} imgUrl={l.imagen_url} icon={MapPin} nombre={l.nombre} />
              ))}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={Sparkles} label="Hechizos" count={hechizos.length} loading={loadingHechizos}>
              {hechizos.map(h => <Chip key={h.id} onClick={() => selectHechizo(h)} icon={Sparkles} nombre={h.nombre}
                accentBg="color-mix(in srgb, var(--accent) 5%, transparent)" accentBorder="color-mix(in srgb, var(--accent) 15%, transparent)" accentText="color-mix(in srgb, var(--accent) 80%, var(--primary))" />)}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={Star} label="Dones" count={dones.length} loading={loadingDones}>
              {dones.map(d => <Chip key={d.id} onClick={() => selectDon(d)} icon={Star} nombre={d.nombre}
                accentBg="color-mix(in srgb, var(--accent) 4%, transparent)" accentBorder="color-mix(in srgb, var(--accent) 13%, transparent)" accentText="color-mix(in srgb, var(--accent) 75%, var(--primary))" />)}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={ScrollText} label="Runas" count={runas.length} loading={loadingRunas}>
              {runas.map(r => <Chip key={r.id} onClick={() => selectRuna(r)} imgUrl={r.imagen_url} icon={ScrollText} nombre={r.nombre} />)}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={FileText} label="Notas" count={notas.length} loading={loadingNotas}>
              {notas.map(n => (
                <button key={n.id} onClick={() => setSelectedNota(n)} type="button"
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]"
                  style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                  <div className="w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center"><FileText size={10} className="text-primary/25" /></div>
                  <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{n.titulo || <span className="italic text-primary/30">Sin título</span>}</span>
                </button>
              ))}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={Music} label="Canciones" count={canciones.length} loading={loadingCanciones}>
              {canciones.map(c => (
                <Chip key={c.id} onClick={() => selectCancion(c as unknown as Cancion)} icon={Music} nombre={c.titulo} />
              ))}
            </SeccionEntidades>
            <div className={div} style={divStyle} />

            <SeccionEntidades icon={Layers} label="Grupos" count={grupos.length} loading={!loadedGrupos}>
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
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]"
                    style={{ background: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 4%, transparent)`, borderColor: `color-mix(in srgb, ${cfg?.color ?? "var(--primary)"} 12%, transparent)` }}>
                    <div className="w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                      {cfg ? <cfg.Icon size={10} className="text-primary/25" /> : <Layers size={10} className="text-primary/25" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{g.nombre}</span>
                      <span className="text-[8px] text-primary/30">{g.miembro_ids.length} miembros</span>
                    </div>
                  </button>
                );
              })}
            </SeccionEntidades>
          </div>

          {/* HISTORIA */}
          {textos && onTextoChange && onSave && (
            <div className="border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
                <Clock size={11} className="text-primary/40 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Historia</span>
              </div>
              <PanelHistoriaMundo texto={textos.historia} onChange={v => onTextoChange("historia", v)} onSave={() => onSave("historia")} />
            </div>
          )}

          {/* CAPÍTULOS */}
          <div style={{ minHeight: "60vh" }}>
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
              <BookOpen size={11} className="text-primary/40 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Capítulos</span>
            </div>
            <div className="flex flex-col min-h-0" style={{ minHeight: "58vh" }}>
              <EstudioCapitulos />
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
  texto, onChange, onSave, placeholder, saveLabel, SaveIcon,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  placeholder: string;
  saveLabel: string;
  SaveIcon: React.ElementType;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { onSnippetAction } = useWikilink();
  const handle = async () => {
    setStatus("saving");
    try { await onSave(); setStatus("saved"); setTimeout(() => setStatus("idle"), 2000); }
    catch { setStatus("error"); }
  };
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <MarkdownEditor value={texto} onChange={onChange} placeholder={placeholder} rows={22} toolbar defaultMode="edit" onSnippetAction={onSnippetAction}
/>
      </div>
      <div className="shrink-0 flex items-center justify-end gap-2 px-3 py-1.5 border-t"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <SaveIndicator status={status} />
        <button onClick={handle} disabled={status === "saving"}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50">
          <SaveIcon size={10} /> Guardar
        </button>
      </div>
    </div>
  );
}