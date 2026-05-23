"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Globe, Plus, Trash2, Save, Loader2, Search, X, Bug,
  ChevronDown, Mountain, ScrollText, Map, ChevronRight, FileText, Users, UserCircle2, Package,
  Crown, Clock, Filter, Layers, Check, BookOpen, Music, MapPin,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { MUNDO_SECTIONS, type MundoSectionKey, type SaveStatus, type Reino, type Personaje, type Nota } from "../editorEntidades/types";
import { SaveIndicator, SelectorImagen } from "../editorEntidades/UIComponents";
import { MarkdownEditor } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import { EditorReino } from "./EditorReino";
import { EditorPersonaje } from "./EditorPersonaje";
import { EditorCriatura } from "./EditorCriatura";
import { EditorItem } from "./EditorItem";
import { EditorLugar, type Lugar } from "./EditorLugar";
import { type WikiEntity } from "../../../../forms/MarkdownEditor";
import { type TimelineEvent } from "../editorEntidades/LoreTab";
import { useNotas } from "../editorEntidades/useNotas";
import { EditorNota, ListaNotas } from "./EditorNota";
import { EditorGrupo } from "./EditorGrupo";
import EstudioCapitulos from "@/components/paginas/myself/garlia/editores/editorCapitulos";
import EditorLetrasPanel from "@/components/paginas/myself/garlia/editores/editorLetras/page";


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

// ─── Hook: lista de reinos ─────────────────────────────────────────────────────
function useReinos(enabled = true) {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const local = await dexieReadAll<Reino>("reinos");
    if (local.length) { setReinos(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
    const { data } = await supabase.from("reinos").select("*").order("nombre");
    const result = (data ?? []) as Reino[];
    setReinos(result); setLoading(false);
    await dexieWriteAll("reinos", result);
  }, []);

  useEffect(() => { if (enabled) load(); else setLoading(false); }, [load, enabled]);
  return { reinos, setReinos, loading };
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

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useCriaturas(enabled = true) {
  const [criaturas, setCriaturas] = useState<CriaturaMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      const local = await dexieReadAll<CriaturaMin>("criaturas");
      if (local.length && !cancelled) { setCriaturas(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
      const { data } = await supabase.from("criaturas").select("id, nombre, imagen_url, habitat").order("nombre");
      if (cancelled) return;
      const result = (data ?? []) as CriaturaMin[];
      setCriaturas(result); setLoading(false);
      await dexieWriteAll("criaturas", result);
    };
    run(); return () => { cancelled = true; };
  }, [enabled]);
  return { criaturas, setCriaturas, loading };
}

// Hook full para objetos (PanelListas)
type ObjetoMin = { id: string; nombre: string; imagen_url?: string; categoria?: string };
function useObjetos(enabled = true) {
  const [objetos, setObjetos] = useState<ObjetoMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      const local = await dexieReadAll<ObjetoMin>("items");
      if (local.length && !cancelled) { setObjetos(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
      const { data } = await supabase.from("items").select("id, nombre, imagen_url, categoria").order("nombre");
      if (cancelled) return;
      const result = (data ?? []) as ObjetoMin[];
      setObjetos(result); setLoading(false);
      await dexieWriteAll("items", result);
    };
    run(); return () => { cancelled = true; };
  }, [enabled]);
  return { objetos, setObjetos, loading };
}

// Hook full para lugares (PanelListas)
type LugarMin = { id: string; nombre: string; imagen_url?: string; tipo?: string; reino_id?: string };
function useLugares(enabled = true) {
  const [lugares, setLugares] = useState<LugarMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      const local = await dexieReadAll<LugarMin>("lugares");
      if (local.length && !cancelled) { setLugares(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
      const { data } = await supabase.from("lugares").select("id, nombre, imagen_url, tipo, reino_id").order("nombre");
      if (cancelled) return;
      const result = (data ?? []) as LugarMin[];
      setLugares(result); setLoading(false);
      await dexieWriteAll("lugares", result);
    };
    run(); return () => { cancelled = true; };
  }, [enabled]);
  return { lugares, setLugares, loading };
}


function usePersonajesList(enabled = true) {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      const local = await dexieReadAll<Personaje>("personajes");
      if (local.length && !cancelled) { setPersonajes(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
      const { data } = await supabase.from("personajes").select("*").order("nombre");
      if (cancelled) return;
      const result = (data ?? []) as Personaje[];
      setPersonajes(result); setLoading(false);
      await dexieWriteAll("personajes", result);
    };
    run(); return () => { cancelled = true; };
  }, [enabled]);
  return { personajes, setPersonajes, loading };
}

function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!criaturaId) { setVariantes([]); return; }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        if (db) {
          const local: any[] = await (db as any).criatura_variantes?.where("criatura_id").equals(criaturaId).toArray() ?? [];
          if (local.length && !cancelled) { setVariantes(local); setLoading(false); if (!navigator.onLine) return; }
        }
      } catch {}
      if (!navigator.onLine) { setLoading(false); return; }
      const { data } = await supabase.from("criatura_variantes").select("id, tipo").eq("criatura_id", criaturaId).order("tipo");
      if (cancelled) return;
      const result = (data ?? []) as VarianteMin[];
      setVariantes(result); setLoading(false);
      try { if (db && result.length) await (db as any).criatura_variantes?.bulkPut(result); } catch {}
    };
    run(); return () => { cancelled = true; };
  }, [criaturaId]);
  return { variantes, loading };
}

function useEntidadesMagicas(tabla: string, enabled = true) {
  const [items, setItems] = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      const local = await dexieReadAll<EntidadMagica>(tabla);
      if (local.length && !cancelled) { setItems(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length && !cancelled) setLoading(false); return; }
      const { data } = await supabase
        .from(tabla)
        .select("id, nombre, explicacion, grupo_ids")
        .order("nombre");
      if (cancelled) return;
      const result = (data ?? []) as EntidadMagica[];
      setItems(result); setLoading(false);
      await dexieWriteAll(tabla, result);
    };
    run(); return () => { cancelled = true; };
  }, [tabla, enabled]);
  return { items, setItems, loading };
}

function useRunas(enabled = true) {
  const [items, setItems] = useState<Runa[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      const local = await dexieReadAll<Runa>("runas");
      if (local.length && !cancelled) { setItems(local); setLoading(false); }
      if (!navigator.onLine) { if (!local.length && !cancelled) setLoading(false); return; }
      const { data } = await supabase.from("runas").select("id, nombre, explicacion, imagen_url").order("nombre");
      if (cancelled) return;
      const result = (data ?? []) as Runa[];
      setItems(result); setLoading(false);
      await dexieWriteAll("runas", result);
    };
    run(); return () => { cancelled = true; };
  }, [enabled]);
  return { items, setItems, loading };
}

// ─── Hook: grupos de criaturas ────────────────────────────────────────────────
type GrupoMin = { id: string; nombre: string; miembro_ids: string[] };

function useGruposCriaturas(enabled = true) {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      try {
        if (db && (db as any).grupos_mundo) {
          const all = await (db as any).grupos_mundo.toArray() as any[];
          const local: GrupoMin[] = all
            .filter((g: any) => !g.deleted && g.tipo === "criaturas")
            .map((g: any) => ({ id: g.id, nombre: g.nombre, miembro_ids: g.miembro_ids ?? [] }));
          if (local.length && !cancelled) { setGrupos(local); setLoading(false); }
        }
      } catch {}
      if (!navigator.onLine) { setLoading(false); return; }
      const { data } = await supabase.from("grupos_mundo").select("id, nombre, miembro_ids").eq("tipo", "criaturas").order("nombre");
      if (cancelled) return;
      const result: GrupoMin[] = (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, miembro_ids: r.miembro_ids ?? [] }));
      setGrupos(result); setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [enabled]);
  return { grupos, loading };
}

// ─── Hook: todos los grupos (sin filtro de tipo) ──────────────────────────────
type GrupoTodo = { id: string; nombre: string; tipo: string; miembro_ids: string[] };

function useGruposTodos(enabled = true) {
  const [grupos, setGrupos] = useState<GrupoTodo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    const run = async () => {
      try {
        if (db && (db as any).grupos_mundo) {
          const all = await (db as any).grupos_mundo.toArray() as any[];
          const local: GrupoTodo[] = all
            .filter((g: any) => !g.deleted)
            .map((g: any) => ({ id: g.id, nombre: g.nombre, tipo: g.tipo ?? "", miembro_ids: g.miembro_ids ?? [] }));
          if (local.length && !cancelled) { setGrupos(local); setLoading(false); }
        }
      } catch {}
      if (!navigator.onLine) { setLoading(false); return; }
      const { data } = await supabase.from("grupos_mundo").select("id, nombre, tipo, miembro_ids").order("nombre");
      if (cancelled) return;
      const result: GrupoTodo[] = (data ?? []).map((r: any) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo ?? "", miembro_ids: r.miembro_ids ?? [] }));
      setGrupos(result); setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [enabled]);
  return { grupos, loading };
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

// ─── Hook: lista de personajes ────────────────────────────────────────────────

type HistoriaTab = "texto" | "personajes";

// ─── Panel Historia con tabs (texto + lista de personajes) ────────────────────

// ─── Helper: lista con buscador reutilizable ──────────────────────────────────

// ─── Hook: lista de criaturas (para PanelMundo) ───────────────────────────────

type MundoGeoTab = "texto" | "reinos" | "criaturas" | "objetos";

// ─── Panel Mundo con tabs (texto + reinos + criaturas) ────────────────────────

// ─── Panel Historia del Mundo — línea de tiempo unificada ────────────────────

type MundoTimelineEvent = TimelineEvent & {
  source: "mundo" | "reino";
  reinoNombre?: string;
  reinoId?: string;
  yearNum: string; // para ordenar (clave lexicográfica)
};

/** Ordena años lexicográficamente por su parte numérica, respetando ceros iniciales.
 *  "0001" < "0002" < "0003" < "02" < "1" < "10" < "100"
 *  Los ceros definen el "grupo" (0001 es antes que 02 que es antes que 1).
 *  Texto puro sin números queda al final.
 */
function parseYear(year: string): string {
  if (!year?.trim()) return "~";
  const normalized = year.replace(/(\d)[.,](\d{3})/g, "$1$2");
  const match = normalized.match(/(-?)(\d+)/);
  if (!match) return "~" + year;
  const negative = match[1] === "-";
  const digits = match[2];
  if (negative) {
    // Negativos van primero: invertimos para que -100 < -10 < -1
    return "!" + digits.split("").reverse().join("").padEnd(30, "0");
  }
  return digits; // lexicográfico puro
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

// ── Fila de evento del mundo (mismo diseño que TimelineRow en LoreTab) ────────
function MundoEventoRow({
  evt,
  idx,
  total,
  onUpdate,
  onRemove,
  onMove,
  reinos = [],
}: {
  evt: TimelineEvent;
  idx: number;
  total: number;
  onUpdate: (patch: Partial<TimelineEvent>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  reinos?: Reino[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { onSnippetAction } = useWikilink();

  const hasYear  = !!evt.year?.trim();
  const hasTitle = !!evt.title?.trim();
  const hasDesc  = !!evt.description?.trim();
  const reinoId  = (evt as any).reinoId as string | null | undefined;
  const reinoNombre = reinoId ? reinos.find(r => r.id === reinoId)?.nombre : null;

  return (
    <div className="relative flex gap-0 group/row">
      {/* Línea vertical */}
      <div className="flex flex-col items-center" style={{ width: 28, flexShrink: 0 }}>
        <div
          className="relative z-10 mt-[22px] w-2 h-2 rounded-full shrink-0 transition-all"
          style={{
            background: hasYear ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
            boxShadow: hasYear ? "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)" : "none",
          }}
        />
        {idx < total - 1 && (
          <div className="flex-1 w-px mt-1" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", minHeight: 24 }} />
        )}
      </div>

      {/* Tarjeta */}
      <div
        className="flex-1 mb-2.5 rounded-xl overflow-hidden transition-all"
        style={{
          border: `1px solid ${expanded ? "color-mix(in srgb, var(--primary) 22%, transparent)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`,
          background: expanded ? "color-mix(in srgb, var(--primary) 4%, transparent)" : "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        {/* Cabecera clicable */}
        <div className="flex items-stretch cursor-pointer select-none" onClick={() => setExpanded(x => !x)}>

          {/* BLOQUE AÑO */}
          <div
            className="shrink-0 flex items-center justify-center border-r"
            style={{
              width: 70,
              borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              background: hasYear ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <input
              className="bg-transparent outline-none w-full text-[10px] font-black tracking-widest text-center placeholder:text-primary/20 px-2 py-2.5"
              value={evt.year}
              onChange={e => onUpdate({ year: e.target.value })}
              placeholder="Año"
              style={{ color: hasYear ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            />
          </div>

          {/* BLOQUE TÍTULO */}
          <div className="flex-1 flex items-center min-w-0 px-2.5 py-2 gap-2" onClick={e => e.stopPropagation()}>
            <input
              className="bg-transparent outline-none flex-1 min-w-0 text-[11px] font-bold placeholder:text-primary/20 transition-colors"
              value={evt.title}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder="Nombre del evento…"
              style={{ color: hasTitle ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            />
            {/* Badge de reino asignado */}
            {reinoNombre && !expanded && (
              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest hidden sm:flex"
                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                <Crown size={7} />
                {reinoNombre}
              </span>
            )}
            {hasDesc && !expanded && !reinoNombre && (
              <span
                className="shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md hidden sm:block"
                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              >
                ver más
              </span>
            )}
          </div>

          {/* Eliminar — hover */}
          <div className="shrink-0 flex items-center px-1 opacity-0 group-hover/row:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={onRemove}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#f87171")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "color-mix(in srgb, var(--primary) 25%, transparent)")}>
              <Trash2 size={9} />
            </button>
          </div>

          {/* Chevron — siempre visible */}
          <div className="shrink-0 flex items-center px-2.5 border-l" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            <ChevronDown size={10} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
          </div>
        </div>

        {/* Panel expandible */}
        {expanded && (
          <div className="px-3 pb-3 pt-3 space-y-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>

            {/* Selector de Reino — botones pill con color del tema */}
            {reinos.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-1"
                  style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                  <Crown size={9} /> Reino del suceso
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {/* Pill "Mundo" */}
                  <button
                    type="button"
                    onClick={() => onUpdate({ reinoId: null } as any)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all"
                    style={!reinoId ? {
                      background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                      borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
                      color: "var(--primary)",
                      boxShadow: "0 0 0 1px color-mix(in srgb, var(--primary) 20%, transparent)",
                    } : {
                      background: "transparent",
                      borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                      color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                    }}
                  >
                    <Globe size={8} /> Mundo
                  </button>

                  {/* Un pill por reino */}
                  {reinos.map(r => {
                    const active = reinoId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onUpdate({ reinoId: active ? null : r.id } as any)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all"
                        style={active ? {
                          background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                          borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
                          color: "var(--primary)",
                          boxShadow: "0 0 0 1px color-mix(in srgb, var(--primary) 20%, transparent)",
                        } : {
                          background: "transparent",
                          borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                          color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                        }}
                      >
                        <Crown size={8} /> {r.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <MarkdownEditor
              value={evt.description}
              onChange={v => onUpdate({ description: v })}
              placeholder="Descripción del evento, consecuencias, personajes involucrados…"
              rows={14}
              toolbar
              defaultMode="edit"
              onSnippetAction={onSnippetAction}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Editor de eventos propios del mundo ──────────────────────────────────────
function MundoEventoEditor({
  events,
  onChange,
  reinos = [],
}: {
  events: TimelineEvent[];
  onChange: (events: TimelineEvent[]) => void;
  reinos?: Reino[];
}) {
  const add = () => onChange([...events, newEvent()]);
  const update = (id: string, patch: Partial<TimelineEvent>) => onChange(events.map(e => e.id === id ? { ...e, ...patch } : e));
  const remove = (id: string) => onChange(events.filter(e => e.id !== id));

  const sorted = [...events].sort((a, b) => parseYear(a.year).localeCompare(parseYear(b.year)));

  return (
    <div className="space-y-0">
      {sorted.map((evt, idx) => (
        <MundoEventoRow
          key={evt.id}
          evt={evt}
          idx={idx}
          total={sorted.length}
          reinos={reinos}
          onUpdate={patch => update(evt.id, patch)}
          onRemove={() => remove(evt.id)}
          onMove={() => {}}
        />
      ))}
      <button type="button" onClick={add}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all mt-1"
        style={{ border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--primary)"; (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 40%, transparent)"; (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 40%, transparent)"; (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 20%, transparent)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
        <Plus size={10} /> Añadir evento del mundo
      </button>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────
function PanelHistoriaMundo({
  texto,
  onChange,
  onSave,
}: {
  texto: string;       // JSON de eventos propios del mundo
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
}) {
  // Eventos propios del mundo
  const [mundoEvents, setMundoEvents] = useState<TimelineEvent[]>(() => decodeTimeline(texto));

  // Sync si cambia desde afuera
  useEffect(() => { setMundoEvents(decodeTimeline(texto)); }, [texto]);

  const handleMundoChange = (evts: TimelineEvent[]) => {
    setMundoEvents(evts);
    onChange(encodeTimeline(evts));
  };

  // Reinos con su historia
  const { reinos, loading: loadingReinos } = useReinos();

  // Vista activa: "unificada" (todo junto) o "editar" (solo eventos del mundo)
  const [view, setView] = useState<"unified" | "edit">("unified");
  const [filterReino, setFilterReino] = useState<string | null>(null); // null = todos
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = async () => {
    setSaveStatus("saving");
    try { await onSave(); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2000); }
    catch { setSaveStatus("error"); }
  };

  // Construir línea de tiempo unificada
  const unifiedEvents = useMemo<MundoTimelineEvent[]>(() => {
    const list: MundoTimelineEvent[] = [];

    // Eventos del mundo — se ocultan cuando hay un filtro de reino activo
    if (!filterReino) {
      for (const e of mundoEvents) {
        list.push({ ...e, source: "mundo", yearNum: parseYear(e.year) });
      }
    } else {
      // Incluir solo los eventos de mundo que tengan reinoId == filterReino
      for (const e of mundoEvents) {
        if ((e as any).reinoId === filterReino) {
          list.push({ ...e, source: "mundo", yearNum: parseYear(e.year) });
        }
      }
    }

    // Eventos de cada reino
    for (const reino of reinos) {
      if (filterReino && reino.id !== filterReino) continue;
      const events = decodeTimeline((reino as any).historia);
      for (const e of events) {
        if (!e.year?.trim() && !e.title?.trim()) continue;
        list.push({ ...e, source: "reino", reinoNombre: reino.nombre, reinoId: reino.id, yearNum: parseYear(e.year) });
      }
    }

    return list.sort((a, b) => parseYear(a.year).localeCompare(parseYear(b.year)));
  }, [mundoEvents, reinos, filterReino]);

  // Reinos que tienen al menos un evento
  const reinosConEventos = useMemo(
    () => reinos.filter(r => decodeTimeline((r as any).historia).some(e => e.year?.trim() || e.title?.trim())),
    [reinos]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b flex-wrap"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>

        {/* Toggle vista */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          {([["unified", Clock, "Cronología"], ["edit", Plus, "Editar mundo"]] as const).map(([key, Icon, label]) => (
            <button key={key} type="button" onClick={() => setView(key as any)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
              style={view === key ? {
                background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
              } : { color: "color-mix(in srgb, var(--primary) 35%, transparent)", border: "1px solid transparent" }}>
              <Icon size={9} /> {label}
            </button>
          ))}
        </div>

        {/* Filtro por reino — solo en vista unificada */}
        {view === "unified" && reinosConEventos.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Filter size={9} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
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
          <button onClick={handleSave} disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50">
            <Save size={10} /> Guardar
          </button>
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">

        {/* Vista: Cronología unificada */}
        {view === "unified" && (
          <>
            {loadingReinos && (
              <div className="flex justify-center py-8">
                <Loader2 size={14} className="animate-spin text-primary/20" />
              </div>
            )}
            {!loadingReinos && unifiedEvents.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-14 rounded-2xl border border-dashed text-center"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                <Clock size={28} strokeWidth={1} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
                <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                  Sin eventos históricos
                </p>
                <p className="text-[9px] text-primary/20 max-w-xs">
                  Añadí eventos propios del mundo en "Editar mundo", o sumá eventos desde la historia de cada reino.
                </p>
              </div>
            )}
            {!loadingReinos && unifiedEvents.map((evt, idx) => (
              <div key={evt.id + (evt.reinoId ?? "")} className="relative flex gap-0 mb-0">
                {/* Línea vertical */}
                <div className="flex flex-col items-center" style={{ width: 32, flexShrink: 0 }}>
                  <div
                    className="relative z-10 mt-5 shrink-0 rounded-full transition-all"
                    style={evt.source === "mundo" ? {
                      width: 10, height: 10,
                      background: "var(--primary)",
                      boxShadow: "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)",
                    } : {
                      width: 8, height: 8,
                      background: "color-mix(in srgb, var(--primary) 50%, transparent)",
                      boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 10%, transparent)",
                    }}
                  />
                  {idx < unifiedEvents.length - 1 && (
                    <div className="flex-1 w-px mt-1" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", minHeight: 20 }} />
                  )}
                </div>

                {/* Tarjeta */}
                <div className="flex-1 mb-3 rounded-xl overflow-hidden"
                  style={{
                    border: evt.source === "mundo"
                      ? "1px solid color-mix(in srgb, var(--primary) 14%, transparent)"
                      : "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    background: evt.source === "mundo"
                      ? "color-mix(in srgb, var(--primary) 3%, transparent)"
                      : "color-mix(in srgb, var(--primary) 1%, transparent)",
                  }}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    {/* Año */}
                    {evt.year?.trim() && (
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                          color: "var(--primary)",
                          border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                        }}>
                        {evt.year}
                      </span>
                    )}

                    {/* Título */}
                    <span className="flex-1 text-[11px] font-bold text-primary/85 truncate">
                      {evt.title || <span className="italic text-primary/30">Sin título</span>}
                    </span>

                    {/* Badge de reino */}
                    {evt.source === "reino" && evt.reinoNombre && (
                      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                        style={{ background: "color-mix(in srgb, var(--primary) 7%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <Crown size={7} />
                        {evt.reinoNombre}
                      </span>
                    )}
                    {evt.source === "mundo" && (
                      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                        style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)" }}>
                        <Globe size={7} />
                        Mundo
                      </span>
                    )}
                  </div>

                  {/* Descripción */}
                  {evt.description?.trim() && (
                    <div className="px-3 pb-2.5 pt-0" style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                      <p className="text-[11px] leading-relaxed pt-2" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                        {evt.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Vista: Editar eventos propios del mundo */}
        {view === "edit" && (
          <MundoEventoEditor events={mundoEvents} onChange={handleMundoChange} reinos={reinos} />
        )}
      </div>
    </div>
  );
}

// ─── Tab unificada de Mundo ───────────────────────────────────────────────────
type UnifiedTab =
  | "mundo"     // texto geografía
  | "historia"  // texto historia
  | "listas"    // columnas: reinos · criaturas · objetos · personajes · hechizos · dones · runas
  | "magia";    // texto sistema de magia

type TabGroup = {
  key: UnifiedTab;
  label: string;
  Icon: React.ElementType;
  color?: string;
};





// Mapea el activeSection + subTab al nuevo UnifiedTab
function resolveInitialTab(activeSection: MundoSectionKey, initialMundoTab?: string): UnifiedTab {
  if (activeSection === "historia") return "historia";
  if (activeSection === "magia") {
    if (initialMundoTab === "magia") return "magia";
    // hechizos, dones y runas ahora viven en listas
    if (["hechizos", "dones", "runas"].includes(initialMundoTab ?? "")) return "listas";
    return "magia";
  }
  // geografia
  const listsKeys = ["listas", "reinos", "criaturas", "objetos", "personajes", "hechizos", "dones", "runas", "notas"];
  if (initialMundoTab && listsKeys.includes(initialMundoTab)) return "listas";
  // Por defecto abre geo-magia (geografía + magia juntos)
  return "geo-magia" as any;
}

// ─── EditorMundo unificado ────────────────────────────────────────────────────
export function EditorMundo({
  activeSection,
  textos,
  onTextoChange,
  onSave,
  initialMundoTab,
  initialItemId,
  onTabChange,
  openItem,
  onOverlayChange,
  onItemCreated,
}: {
  activeSection: MundoSectionKey;
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
  initialMundoTab?: string;
  initialItemId?: string;
  onTabChange?: (section: MundoSectionKey, mundoTab: string) => void;
  /** { tabla, id } — abre ese ítem directamente en el overlay */
  openItem?: { tabla: string; id: string } | null;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  /** Notifica un item recién creado para que PanelListas lo inyecte en su lista local */
  onItemCreated?: { tabla: string; item: any } | null;
}) {

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <PanelListas
        initialSubTab={initialMundoTab ?? resolveInitialTab(activeSection, initialMundoTab)}
        initialItemId={initialItemId}
        openItem={openItem}
        textos={textos}
        onTextoChange={onTextoChange}
        onSave={onSave}
        onTabChange={onTabChange}
        onOverlayChange={onOverlayChange}
        onItemCreated={onItemCreated}
      />
    </div>
  );
}


// ─── Componentes auxiliares de PanelListas (definidos fuera para evitar re-montaje) ──

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="shrink-0 px-3 py-2">
      <div className="relative">
        <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-primary/4 border border-primary/10 rounded-xl pl-7 pr-6 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25" />
        {value && (
          <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/25 hover:text-primary transition-colors">
            <X size={8} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PanelListas: columnas side-by-side (reinos, criaturas, objetos, personajes, hechizos, dones) ──
function PanelListas({
  initialSubTab, initialItemId, openItem,
  textos, onTextoChange, onSave, onTabChange, onOverlayChange, onItemCreated,
}: {
  initialSubTab?: string;
  initialItemId?: string;
  openItem?: { tabla: string; id: string } | null;
  textos?: Record<MundoSectionKey, string>;
  onTextoChange?: (section: MundoSectionKey, value: string) => void;
  onSave?: (section: MundoSectionKey) => Promise<void>;
  onTabChange?: (section: MundoSectionKey, mundoTab: string) => void;
  onOverlayChange?: (hasOverlay: boolean, clearFn: () => void) => void;
  onItemCreated?: { tabla: string; item: any } | null;
}) {
  // ── Lazy loading: cada tabla solo carga cuando su tab fue visitado ────────
  // "geo-magia" y "historia" no necesitan datos de lista — empezamos con ellos off.
  // Una vez que el usuario abre un tab, lo marcamos como "visitado" y ya no se desmonta.
  const [visited, setVisited] = useState<Set<string>>(() => {
    // Pre-activar el tab inicial para que cargue de inmediato
    const init = new Set<string>();
    const t = initialSubTab ?? "geo-magia";
    if (t === "reinos")     init.add("reinos");
    if (t === "criaturas")  init.add("criaturas");
    if (t === "objetos")    init.add("objetos");
    if (t === "lugares")    init.add("lugares");
    if (t === "personajes") init.add("personajes");
    if (t === "hechizos")   { init.add("hechizos"); init.add("grupos"); }
    if (t === "dones")      { init.add("dones");    init.add("grupos"); }
    if (t === "runas")      init.add("runas");
    if (t === "grupos")     { init.add("grupos"); init.add("gruposTodos"); }
    if (t === "notas")      init.add("notas");
    // "todo" y "magia-objetos" necesitan todo — carga en dos pasos para no saturar
    if (t === "todo" || t === "mundo-personajes" || t === "magia-objetos") {
      ["reinos","criaturas","objetos","personajes"].forEach(k => init.add(k));
      // Los secundarios se activan después via markVisited con timeout
    }
    return init;
  });

  // Cuando el usuario cambia de tab, registrar visita y activar los hooks necesarios
  const markVisited = useCallback((tab: string) => {
    setVisited(prev => {
      const next = new Set(prev);
      const add = (...keys: string[]) => keys.forEach(k => next.add(k));
      if (tab === "reinos")         add("reinos");
      else if (tab === "criaturas") add("criaturas");
      else if (tab === "objetos")   add("objetos");
      else if (tab === "lugares")   add("lugares");
      else if (tab === "personajes")add("personajes");
      else if (tab === "hechizos")  add("hechizos", "grupos");
      else if (tab === "dones")     add("dones", "grupos");
      else if (tab === "runas")     add("runas");
      else if (tab === "grupos")    add("grupos", "gruposTodos");
      else if (tab === "notas")     add("notas");
      else if (tab === "todo" || tab === "mundo-personajes" || tab === "magia-objetos") {
        // Cargar primero los datos principales, luego los secundarios con delay
        add("reinos", "criaturas", "objetos", "personajes", "lugares");
        setTimeout(() => {
          setVisited(prev => {
            const next2 = new Set(prev);
            ["hechizos","dones","runas","grupos","gruposTodos","notas"].forEach(k => next2.add(k));
            return next2;
          });
        }, 400);
      }
      return next;
    });
  }, []);

  const { reinos,    setReinos,    loading: loadingReinos    } = useReinos(visited.has("reinos"));
  const { criaturas, setCriaturas, loading: loadingCriaturas } = useCriaturas(visited.has("criaturas"));
  const { objetos,   setObjetos,   loading: loadingObjetos   } = useObjetos(visited.has("objetos"));
  const { lugares,   setLugares,   loading: loadingLugares   } = useLugares(visited.has("lugares"));
  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesList(visited.has("personajes"));
  const { items: hechizos, setItems: setHechizos, loading: loadingHechizos } = useEntidadesMagicas("hechizos", visited.has("hechizos"));
  const { items: dones,    setItems: setDones,    loading: loadingDones    } = useEntidadesMagicas("dones",    visited.has("dones"));
  const { items: runas,    setItems: setRunas,    loading: loadingRunas    } = useRunas(visited.has("runas"));
  const { grupos: gruposMagicos, loading: loadingGruposMagicos } = useGruposCriaturas(visited.has("grupos"));
  const { grupos: gruposTodos,   loading: loadingGruposTodos   } = useGruposTodos(visited.has("gruposTodos"));
  const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } = useNotas();
  const [searchNotas, setSearchNotas] = useState("");
  const [selectedNota, setSelectedNota] = useState<Nota | null>(null);

  // Inyectar + abrir editor cuando llega un item recién creado.
  // Fusionado con el routing para evitar race condition.
  useEffect(() => {
    if (!onItemCreated) return;
    const { tabla, item } = onItemCreated;

    // 1. Inyectar en array local
    if      (tabla === "personajes") setPersonajes(p => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "criaturas")  setCriaturas(p  => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "items")      setObjetos(p    => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "reinos")     setReinos(p     => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "lugares")    setLugares(p    => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "hechizos")   setHechizos(p   => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "dones")      setDones(p      => p.some(x => x.id === item.id) ? p : [item, ...p]);
    else if (tabla === "runas")      setRunas(p      => p.some(x => x.id === item.id) ? p : [item, ...p]);

    // 2. Abrir editor directamente (el item ya está aquí, sin buscar en el array)
    if      (tabla === "personajes") setSelectedPersonaje(item);
    else if (tabla === "criaturas")  setSelectedCriatura(item);
    else if (tabla === "items")      setSelectedObjeto(item);
    else if (tabla === "reinos")     setSelectedReino(item);
    else if (tabla === "lugares")    setSelectedLugar(item);
    else if (tabla === "hechizos")   setSelectedHechizo(item);
    else if (tabla === "dones")      setSelectedDon(item);
    else if (tabla === "runas")      setSelectedRuna(item);

    // 3. Navegar a "todo" y guardar prevMobileTab para que "volver" funcione
    markVisited("todo");
    setPrevMobileTab("todo");
    setMobileTab("todo");
  }, [onItemCreated]);

  const [searchR, setSearchR] = useState("");
  const [searchC, setSearchC] = useState("");
  const [searchO, setSearchO] = useState("");
  const [searchL, setSearchL] = useState("");
  const [searchP, setSearchP] = useState("");
  const [searchH, setSearchH] = useState("");
  const [searchD, setSearchD] = useState("");
  const [searchRu, setSearchRu] = useState("");

  const [selectedReino,    setSelectedReino]    = useState<Reino | null>(null);
  const [selectedCriatura, setSelectedCriatura] = useState<{ id: string; nombre: string; imagen_url?: string; habitat?: string } | null>(null);
  const [selectedObjeto,   setSelectedObjeto]   = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string } | null>(null);
  const [selectedLugar,    setSelectedLugar]    = useState<Lugar | null>(null);
  const [selectedPersonaje, setSelectedPersonaje] = useState<Personaje | null>(null);
  const [selectedHechizo,  setSelectedHechizo]  = useState<EntidadMagica | null>(null);
  const [selectedDon,      setSelectedDon]      = useState<EntidadMagica | null>(null);
  const [selectedRuna,     setSelectedRuna]     = useState<Runa | null>(null);

  // Nombres de todas las entidades para el WikilinkEditor
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

  type ListaTab = "mundo" | "historia" | "magia" | "reinos" | "criaturas" | "objetos" | "personajes" | "hechizos" | "dones" | "runas" | "notas" | "grupos" | "lugares" | "magia-objetos" | "mundo-personajes" | "geo-magia" | "todo" | "capitulos" | "letras";
  const VALID_LISTA_TABS: ListaTab[] = ["mundo", "historia", "magia", "reinos", "criaturas", "objetos", "personajes", "hechizos", "dones", "runas", "notas", "grupos", "lugares", "magia-objetos", "mundo-personajes", "geo-magia", "todo", "capitulos", "letras"];

  const [mobileTab, setMobileTab] = useState<ListaTab>(() => {
    // initialSubTab puede ser un UnifiedTab ("mundo","historia","magia","listas") o un ListaTab directo
    const mapped: Record<string, ListaTab> = { mundo: "geo-magia", historia: "historia", magia: "geo-magia", listas: "todo", notas: "todo", lugares: "todo", "geo-magia": "geo-magia" };
    const resolved = mapped[initialSubTab ?? ""] ?? (VALID_LISTA_TABS.includes(initialSubTab as ListaTab) ? initialSubTab as ListaTab : "geo-magia");
    return resolved;
  });

  // Sincronizar mobileTab cuando el buscador/sidebar navega a un subtab diferente
  // y cerrar el overlay abierto para que el contenido sea visible de inmediato
  useEffect(() => {
    if (!initialSubTab) return;
    const mapped: Record<string, ListaTab> = { mundo: "geo-magia", historia: "historia", magia: "geo-magia", listas: "todo", notas: "todo", lugares: "todo", "geo-magia": "geo-magia" };
    const resolved = mapped[initialSubTab] ?? (VALID_LISTA_TABS.includes(initialSubTab as ListaTab) ? initialSubTab as ListaTab : null);
    if (resolved) {
      setMobileTab(resolved);
      markVisited(resolved);
      // Cerrar editor abierto al navegar desde el sidebar externo
      setSelectedReino(null);    setSelectedCriatura(null);
      setSelectedObjeto(null);   setSelectedPersonaje(null);
      setSelectedHechizo(null);  setSelectedDon(null);
      setSelectedRuna(null);     setSelectedNota(null);
      setSelectedLugar(null);
    }
  }, [initialSubTab, markVisited]);

  // Abrir un ítem concreto desde navegación externa (buscador global)
  // Usamos una ref para no re-ejecutar cuando los arrays crecen con datos adicionales,
  // evitando que la navegación interna (reino->lugar, lugar->reino) sea pisada.
  const lastOpenItemRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openItem) return;
    const key = `${openItem.tabla}:${openItem.id}`;
    const { tabla, id } = openItem;

    const tablaToListaTab: Record<string, ListaTab> = {
      personajes: "personajes", criaturas: "criaturas",
      items: "objetos", reinos: "reinos",
      lugares: "lugares", hechizos: "hechizos",
      dones: "dones", runas: "runas",
    };
    const listaTab = tablaToListaTab[tabla];
    if (!listaTab) return;

    let found: any = null;
    if      (tabla === "personajes") found = personajes.find(x => x.id === id);
    else if (tabla === "criaturas")  found = criaturas.find(x => x.id === id);
    else if (tabla === "items")      found = objetos.find(x => x.id === id);
    else if (tabla === "reinos")     found = reinos.find(x => x.id === id);
    else if (tabla === "lugares")    found = lugares.find(x => x.id === id);
    else if (tabla === "hechizos")   found = hechizos.find(x => x.id === id);
    else if (tabla === "dones")      found = dones.find(x => x.id === id);
    else if (tabla === "runas")      found = runas.find(x => x.id === id);

    if (!found || lastOpenItemRef.current === key) return;
    lastOpenItemRef.current = key;

    markVisited(listaTab);
    markVisited("todo");

    // Primero el editor (overlay visible), luego el tab
    if      (tabla === "personajes") setSelectedPersonaje(found);
    else if (tabla === "criaturas")  setSelectedCriatura(found);
    else if (tabla === "items")      setSelectedObjeto(found);
    else if (tabla === "reinos")     setSelectedReino(found);
    else if (tabla === "lugares")    setSelectedLugar(found);
    else if (tabla === "hechizos")   setSelectedHechizo(found);
    else if (tabla === "dones")      setSelectedDon(found);
    else if (tabla === "runas")      setSelectedRuna(found);

    setPrevMobileTab("todo");
    setMobileTab("todo");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openItem,
      personajes.length, criaturas.length, objetos.length, reinos.length,
      lugares.length, hechizos.length, dones.length, runas.length]);

  // Editor overlay activo
  const overlay: "reino" | "criatura" | "objeto" | "personaje" | "hechizo" | "don" | "runa" | "nota" | "lugar" | null =
    selectedReino    ? "reino"    :
    selectedCriatura ? "criatura" :
    selectedObjeto   ? "objeto"   :
    selectedLugar    ? "lugar"    :
    selectedPersonaje? "personaje":
    selectedHechizo  ? "hechizo"  :
    selectedDon      ? "don"      :
    selectedRuna     ? "runa"     :
    selectedNota     ? "nota"     : null;

  // Tab previo para restaurar al cerrar el overlay (ej: "todo" → item → volver → "todo")
  const [prevMobileTab, setPrevMobileTab] = useState<ListaTab | null>(null);

  const clearAllOverlays = useCallback(() => {
    setSelectedReino(null); setSelectedCriatura(null);
    setSelectedObjeto(null); setSelectedPersonaje(null);
    setSelectedHechizo(null); setSelectedDon(null); setSelectedRuna(null);
    setSelectedNota(null); setSelectedLugar(null);
    if (prevMobileTab) { setMobileTab(prevMobileTab); setPrevMobileTab(null); }
  }, [prevMobileTab]);

  useEffect(() => {
    onOverlayChange?.(!!overlay, clearAllOverlays);
  }, [!!overlay, clearAllOverlays, onOverlayChange]);

  const filteredR = reinos.filter(r    => r.nombre.toLowerCase().includes(searchR.toLowerCase()));
  const filteredC = criaturas.filter(c => c.nombre.toLowerCase().includes(searchC.toLowerCase()));
  const filteredO = objetos.filter(o   => o.nombre.toLowerCase().includes(searchO.toLowerCase()));
  const filteredL = lugares.filter(l   => l.nombre.toLowerCase().includes(searchL.toLowerCase()));
  const filteredP = personajes.filter(p => p.nombre.toLowerCase().includes(searchP.toLowerCase()));
  const filteredH = hechizos.filter(h  => h.nombre.toLowerCase().includes(searchH.toLowerCase()));
  const filteredD = dones.filter(d     => d.nombre.toLowerCase().includes(searchD.toLowerCase()));
  const filteredRu = runas.filter(r    => r.nombre.toLowerCase().includes(searchRu.toLowerCase()));

  // Auto-seleccionar item cuando se navega desde wikilink o buscador.
  // Se dispara tanto al montar (cuando los datos cargan) como cuando
  // initialItemId cambia (navegación desde el buscador global).
  useEffect(() => {
    if (!initialItemId || !initialSubTab) return;
    if (initialSubTab === "hechizos") {
      markVisited("hechizos");
      const found = hechizos.find(i => i.id === initialItemId);
      if (found) { setSelectedHechizo(found); setMobileTab("hechizos"); }
    } else if (initialSubTab === "dones") {
      markVisited("dones");
      const found = dones.find(i => i.id === initialItemId);
      if (found) { setSelectedDon(found); setMobileTab("dones"); }
    } else if (initialSubTab === "runas") {
      markVisited("runas");
      const found = runas.find(i => i.id === initialItemId);
      if (found) { setSelectedRuna(found); setMobileTab("runas"); }
    }
  // Reacciona a cambios de initialItemId (buscador) y a la carga inicial de datos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItemId, hechizos.length, dones.length, runas.length]);

  // Leer localStorage para auto-crear un nuevo lugar al navegar desde el menú Add
  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-listas-action");
      if (action !== "nuevo-lugar") return;
      localStorage.removeItem("estudio-listas-action");
      markVisited("lugares");
      markVisited("todo");
      setMobileTab("todo");
      setPrevMobileTab("todo");
      (async () => {
        try {
          const { data, error } = await supabase
            .from("lugares")
            .insert([{ nombre: "Nuevo lugar" }])
            .select("*")
            .single();
          if (error || !data) return;
          setLugares(prev => [data as LugarMin, ...prev]);
          setSelectedLugar(data as Lugar);
        } catch {}
      })();
    };
    check(); // revisar al montar
    window.addEventListener("estudio-listas-action", check);
    return () => window.removeEventListener("estudio-listas-action", check);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leer localStorage para auto-crear una nueva nota al navegar desde el menú Add
  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-notas-action");
      if (action !== "nueva-nota") return;
      localStorage.removeItem("estudio-notas-action");
      markVisited("notas");
      markVisited("todo");
      setMobileTab("todo");
      setPrevMobileTab("todo");
      crearNota("Nueva nota").then(nueva => {
        if (nueva) setSelectedNota(nueva);
      });
    };
    check(); // revisar al montar
    window.addEventListener("estudio-notas-action", check);
    return () => window.removeEventListener("estudio-notas-action", check);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── search state unified per active tab ──

  const searchMap: Record<string, string> = {
    reinos: searchR, criaturas: searchC, objetos: searchO, lugares: searchL,
    personajes: searchP, hechizos: searchH, dones: searchD, runas: searchRu,
    notas: searchNotas, grupos: "",
  };
  const setSearchMap: Record<string, (v: string) => void> = {
    reinos: setSearchR, criaturas: setSearchC, objetos: setSearchO, lugares: setSearchL,
    personajes: setSearchP, hechizos: setSearchH, dones: setSearchD, runas: setSearchRu,
    notas: setSearchNotas, grupos: () => {},
  };

  type TabDef = { key: ListaTab; label: string; Icon: React.ElementType; count: number; color?: string };

  const TAB_GROUPS: { label: string; tabs: TabDef[] }[] = [
    {
      label: "Textos",
      tabs: [
        { key: "geo-magia" as ListaTab, label: "Geo & Magia", Icon: Mountain, count: 0 },
        { key: "historia"  as ListaTab, label: "Historia",    Icon: Clock,    count: 0 },
      ],
    },
    {
      label: "Listas",
      tabs: [
        { key: "todo" as ListaTab,    label: "Todo",    Icon: Layers,  count: reinos.length + criaturas.length + personajes.length + dones.length + hechizos.length + runas.length + objetos.length + lugares.length + notas.length },
      ],
    },
    {
      label: "Escritura",
      tabs: [
        { key: "capitulos" as ListaTab, label: "Capítulos", Icon: BookOpen, count: 0 },
        { key: "letras" as ListaTab, label: "Canciones", Icon: Music, count: 0 },
      ],
    },
  ];

  const TABS: TabDef[] = TAB_GROUPS.flatMap(g => g.tabs);

  // ── Tab bar (solo visible cuando no hay overlay) ──────────────────────────
  const tabBar = (
    <div className="shrink-0 flex items-center border-b px-2 gap-0.5"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
      {TABS.map(t => {
        const active = mobileTab === t.key;
        const color = t.color ?? "var(--primary)";
        return (
          <button
            key={t.key}
            onClick={() => {
              setMobileTab(t.key);
              markVisited(t.key);
              setPrevMobileTab(null);
              setSelectedReino(null); setSelectedCriatura(null);
              setSelectedObjeto(null); setSelectedPersonaje(null);
              setSelectedHechizo(null); setSelectedDon(null);
              setSelectedRuna(null); setSelectedNota(null);
              setSelectedLugar(null);
            }}
            className="relative flex items-center gap-1.5 px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all"
            style={{ color: active ? color : "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            <t.Icon size={11} className="shrink-0" />
            {t.label}
            {active && (
              <span
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                style={{ background: color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Editor overlay — tapa TODO el panel incluyendo el tab bar ────── */}
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
                  setSelectedReino(null); setSelectedCriatura(null);
                  setSelectedObjeto(null); setSelectedLugar(null);
                  setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedPersonaje(found);
                }}
                onSelectLugar={async (id: string) => {
                  const local = lugares.find(x => x.id === id);
                  setSelectedReino(null); setSelectedCriatura(null);
                  setSelectedObjeto(null); setSelectedPersonaje(null);
                  setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  if (local) { setSelectedLugar(local as Lugar); return; }
                  const { data } = await supabase.from("lugares").select("*").eq("id", id).single();
                  if (data) { setSelectedLugar(data as Lugar); }
                }}
              />
            )}
            {overlay === "criatura" && selectedCriatura && (
              <EditorCriatura key={selectedCriatura.id} item={selectedCriatura as any}
                entities={allEntityNames}
                onSaved={u => { setCriaturas(p => p.map(c => c.id === u.id ? { ...c, ...u } : c)); setSelectedCriatura({ ...selectedCriatura, ...u }); }}
                onDeleted={id => { setCriaturas(p => p.filter(c => c.id !== id)); setSelectedCriatura(null); }}
                onSelectItem={id => {
                  const o = objetos.find(x => x.id === id);
                  if (!o) return;
                  setSelectedReino(null); setSelectedCriatura(null); setSelectedPersonaje(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedObjeto(o);
                }}
                onSelectPersonaje={id => {
                  const p = personajes.find(x => x.id === id);
                  if (!p) return;
                  setSelectedReino(null); setSelectedCriatura(null); setSelectedObjeto(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedPersonaje(p);
                }}
                onSelectGrupo={() => { setMobileTab("grupos"); markVisited("grupos"); }}
              />
            )}
            {overlay === "objeto" && selectedObjeto && (
              <EditorItem key={selectedObjeto.id} item={selectedObjeto as any}
                entities={allEntityNames}
                onSaved={u => { setObjetos(p => p.map(o => o.id === u.id ? { ...o, ...u } : o)); setSelectedObjeto({ ...selectedObjeto, ...u }); }}
                onDeleted={id => { setObjetos(p => p.filter(o => o.id !== id)); setSelectedObjeto(null); }}
                onSelectCriatura={id => {
                  const c = criaturas.find(x => x.id === id);
                  if (!c) return;
                  setSelectedReino(null); setSelectedPersonaje(null); setSelectedObjeto(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedCriatura(c);
                }}
              />
            )}
            {overlay === "lugar" && selectedLugar && (
              <EditorLugar key={selectedLugar.id} item={selectedLugar as Lugar}
                entities={allEntityNames}
                onSaved={u => { setLugares(p => p.map(l => l.id === u.id ? { ...l, ...u } : l)); setSelectedLugar({ ...selectedLugar, ...u }); }}
                onDeleted={id => { setLugares(p => p.filter(l => l.id !== id)); setSelectedLugar(null); }}
                onSelectPersonaje={id => {
                  const p = personajes.find(x => x.id === id);
                  if (!p) return;
                  setSelectedReino(null); setSelectedCriatura(null); setSelectedObjeto(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedPersonaje(p);
                }}
                onSelectCriatura={id => {
                  const c = criaturas.find(x => x.id === id);
                  if (!c) return;
                  setSelectedReino(null); setSelectedPersonaje(null); setSelectedObjeto(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedCriatura(c);
                }}
                onSelectItem={id => {
                  const o = objetos.find(x => x.id === id);
                  if (!o) return;
                  setSelectedReino(null); setSelectedCriatura(null); setSelectedPersonaje(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedObjeto(o);
                }}
                onNavigateReino={id => {
                  const r = reinos.find(x => x.id === id);
                  if (!r) return;
                  setSelectedCriatura(null); setSelectedPersonaje(null); setSelectedObjeto(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedReino(r);
                }}
              />
            )}
            {overlay === "personaje" && selectedPersonaje && (
              <EditorPersonaje key={selectedPersonaje.id} item={selectedPersonaje}
                entities={allEntityNames}
                onSaved={u => { setPersonajes(p => p.map(x => x.id === u.id ? u : x)); setSelectedPersonaje(u); }}
                onDeleted={id => { setPersonajes(p => p.filter(x => x.id !== id)); setSelectedPersonaje(null); }}
                onNavigate={(tab, nombre) => {
                  if (tab === "criaturas") {
                    const c = criaturas.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
                    if (!c) return;
                    setSelectedReino(null); setSelectedPersonaje(null); setSelectedObjeto(null);
                    setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                    setSelectedRuna(null); setSelectedNota(null);
                    setSelectedCriatura(c);
                  } else if (tab === "reinos") {
                    const r = reinos.find(x => x.nombre.toLowerCase() === nombre.toLowerCase());
                    if (!r) return;
                    setSelectedCriatura(null); setSelectedPersonaje(null); setSelectedObjeto(null);
                    setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                    setSelectedRuna(null); setSelectedNota(null);
                    setSelectedReino(r);
                  }
                }}
                onSelectPersonaje={id => {
                  const p = personajes.find(x => x.id === id);
                  if (!p) return;
                  setSelectedReino(null); setSelectedCriatura(null); setSelectedObjeto(null);
                  setSelectedLugar(null); setSelectedHechizo(null); setSelectedDon(null);
                  setSelectedRuna(null); setSelectedNota(null);
                  setSelectedPersonaje(p);
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
              <EditorNota
                key={selectedNota.id}
                nota={selectedNota}
                onSaved={async (updated) => {
                  await actualizarNota(updated);
                  setSelectedNota(updated);
                }}
                onDeleted={id => { eliminarNota(id); setSelectedNota(null); }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Vista normal: tab bar + contenido ───────────────────────────── */}
      {!overlay && tabBar}
      {!overlay && (
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Área de lista — ocupa el espacio principal */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Paneles de texto — reemplazan toda el área de contenido */}
          {mobileTab === "mundo" && textos && onTextoChange && onSave && (
            <PanelTexto
              texto={textos.geografia}
              onChange={v => onTextoChange("geografia", v)}
              onSave={() => onSave("geografia")}
              placeholder="Continentes, mares, climas, fronteras del mundo…"
              saveLabel="Guardar Geografía"
              SaveIcon={Mountain}
            />
          )}
          {mobileTab === "historia" && textos && onTextoChange && onSave && (
            <PanelHistoriaMundo
              texto={textos.historia}
              onChange={v => onTextoChange("historia", v)}
              onSave={() => onSave("historia")}
            />
          )}
          {mobileTab === "magia" && textos && onTextoChange && onSave && (
            <PanelTexto
              texto={textos.magia}
              onChange={v => onTextoChange("magia", v)}
              onSave={() => onSave("magia")}
              placeholder="Sistema de magia, reglas, fuentes de poder, limitaciones…"
              saveLabel="Guardar Magia"
              SaveIcon={Sparkles}
            />
          )}

          {/* Header del tab activo (solo para tabs de lista individuales) */}
          {!["mundo", "historia", "magia", "magia-objetos", "mundo-personajes", "geo-magia", "todo", "capitulos", "letras"].includes(mobileTab) && (() => {
            const t = TABS.find(t => t.key === mobileTab);
            if (!t) return null;
            const color = t.color ?? "var(--primary)";
            return (
              <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-b"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
                <t.Icon size={13} style={{ color }} className="shrink-0" />
                <p className="flex-1 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color }}>{t.label}</p>
                {mobileTab === "notas" && (
                  <button
                    onClick={async () => {
                      const nueva = await crearNota("Nueva nota");
                      if (nueva) setSelectedNota(nueva);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-dashed transition-all text-primary/40 hover:text-primary hover:border-primary/30"
                    style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                  >
                    <Plus size={9} /> Nueva
                  </button>
                )}
                {t.count > 0 && (
                  <span className="text-[9px] font-black tabular-nums"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                    {t.count}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Buscador */}
          {!["mundo", "historia", "magia", "magia-objetos", "mundo-personajes", "geo-magia", "todo", "capitulos", "letras"].includes(mobileTab) && mobileTab !== "grupos" && (
            <SearchInput
              value={searchMap[mobileTab] ?? ""}
              onChange={v => setSearchMap[mobileTab]?.(v)}
              placeholder={`Buscar ${TABS.find(t => t.key === mobileTab)?.label.toLowerCase()}…`}
            />
          )}

          {/* Vista: Editor de Capítulos embebido */}
          {mobileTab === "capitulos" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <EstudioCapitulos />
            </div>
          )}

          {/* Vista: Editor de Canciones embebido */}
          {mobileTab === "letras" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <EditorLetrasPanel />
            </div>
          )}

          {/* Vista combinada: Geografía + Magia — columna en mobile, lado a lado en desktop */}
          {mobileTab === "geo-magia" && textos && onTextoChange && onSave && (
            <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-y-auto sm:overflow-hidden">
              {/* Geografía — arriba en mobile, izquierda en desktop */}
              <div className="flex flex-col sm:flex-1 sm:min-h-0 border-b sm:border-b-0 sm:border-r"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", minHeight: "52vh" }}>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
                  <Mountain size={11} className="text-primary/40 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Geografía</span>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <PanelTexto
                    texto={textos.geografia}
                    onChange={v => onTextoChange("geografia", v)}
                    onSave={() => onSave("geografia")}
                    placeholder="Continentes, mares, climas, fronteras del mundo…"
                    saveLabel="Guardar"
                    SaveIcon={Mountain}
                  />
                </div>
              </div>
              {/* Magia — abajo en mobile, derecha en desktop */}
              <div className="flex flex-col sm:flex-1 sm:min-h-0"
                style={{ minHeight: "52vh" }}>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--accent) 3%, transparent)" }}>
                  <Sparkles size={11} style={{ color: "var(--accent)" }} className="shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Magia</span>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <PanelTexto
                    texto={textos.magia}
                    onChange={v => onTextoChange("magia", v)}
                    onSave={() => onSave("magia")}
                    placeholder="Sistema de magia, reglas, fuentes de poder, limitaciones…"
                    saveLabel="Guardar"
                    SaveIcon={Sparkles}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Vista combinada: TODO — reinos, criaturas, personajes, dones, hechizos, runas, objetos, notas */}
          {mobileTab === "todo" && (
            <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
              {/* Reinos */}
              <div className="pt-3 pb-1">
                <div className="flex items-center gap-1.5 mb-2"><Map size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Reinos · {reinos.length}</span></div>
                {loadingReinos ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : reinos.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin reinos aún</p>
                  : <div className="flex flex-wrap gap-1.5">{reinos.map(r => (
                      <button key={r.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("reinos"); setMobileTab("reinos"); setSelectedReino(r); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">{r.mapa_url ? <img src={r.mapa_url} alt={r.nombre} className="w-full h-full object-cover" /> : <Map size={10} className="text-primary/25" />}</div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{r.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Criaturas */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><Bug size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Criaturas · {criaturas.length}</span></div>
                {loadingCriaturas ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : criaturas.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin criaturas aún</p>
                  : <div className="flex flex-wrap gap-1.5">{criaturas.map(c => (
                      <button key={c.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("criaturas"); setMobileTab("criaturas"); setSelectedCriatura(c); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">{c.imagen_url ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" /> : <Bug size={10} className="text-primary/25" />}</div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{c.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Personajes */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><Users size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Personajes · {personajes.length}</span></div>
                {loadingPersonajes ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : personajes.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin personajes aún</p>
                  : <div className="flex flex-wrap gap-1.5">{personajes.map(p => (
                      <button key={p.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("personajes"); setMobileTab("personajes"); setSelectedPersonaje(p); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">{p.img_url ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" /> : <UserCircle2 size={10} className="text-primary/25" />}</div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{p.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Dones */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><Star size={10} style={{ color: "color-mix(in srgb, var(--accent) 65%, transparent)" }} className="shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--accent) 45%, transparent)" }}>Dones · {dones.length}</span></div>
                {loadingDones ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : dones.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin dones aún</p>
                  : <div className="flex flex-wrap gap-1.5">{dones.map(d => (
                      <button key={d.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("dones"); setMobileTab("dones"); setSelectedDon(d); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 13%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}><Star size={10} style={{ color: "color-mix(in srgb, var(--accent) 65%, transparent)" }} /></div>
                        <span className="text-[11px] font-bold truncate max-w-[90px]" style={{ color: "color-mix(in srgb, var(--accent) 75%, var(--primary))" }}>{d.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Hechizos */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><Sparkles size={10} style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }} className="shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--accent) 45%, transparent)" }}>Hechizos · {hechizos.length}</span></div>
                {loadingHechizos ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : hechizos.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin hechizos aún</p>
                  : <div className="flex flex-wrap gap-1.5">{hechizos.map(h => (
                      <button key={h.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("hechizos"); setMobileTab("hechizos"); setSelectedHechizo(h); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}><Sparkles size={10} style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }} /></div>
                        <span className="text-[11px] font-bold truncate max-w-[90px]" style={{ color: "color-mix(in srgb, var(--accent) 80%, var(--primary))" }}>{h.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Runas */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><ScrollText size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Runas · {runas.length}</span></div>
                {loadingRunas ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : runas.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin runas aún</p>
                  : <div className="flex flex-wrap gap-1.5">{runas.map(r => (
                      <button key={r.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("runas"); setMobileTab("runas"); setSelectedRuna(r); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>{r.imagen_url ? <img src={r.imagen_url} alt={r.nombre} className="w-full h-full object-cover" /> : <ScrollText size={10} className="text-primary/40" />}</div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{r.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Objetos */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><Package size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Objetos · {objetos.length}</span></div>
                {loadingObjetos ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : objetos.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin objetos aún</p>
                  : <div className="flex flex-wrap gap-1.5">{objetos.map(o => (
                      <button key={o.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("objetos"); setMobileTab("objetos"); setSelectedObjeto(o); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">{o.imagen_url ? <img src={o.imagen_url} alt={o.nombre} className="w-full h-full object-cover" /> : <Package size={10} className="text-primary/25" />}</div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{o.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Lugares */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><MapPin size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Lugares · {lugares.length}</span></div>
                {loadingLugares ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : lugares.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin lugares aún</p>
                  : <div className="flex flex-wrap gap-1.5">{lugares.map(l => (
                      <button key={l.id} onClick={async () => {
                        setPrevMobileTab(mobileTab);
                        try {
                          const { data } = await supabase.from("lugares").select("*").eq("id", l.id).single();
                          if (data) { setSelectedLugar(data as Lugar); return; }
                        } catch {}
                        setSelectedLugar(l as Lugar);
                      }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">{l.imagen_url ? <img src={l.imagen_url} alt={l.nombre} className="w-full h-full object-cover" /> : <MapPin size={10} className="text-primary/25" />}</div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{l.nombre}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Notas */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2"><FileText size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Notas · {notas.length}</span></div>
                {loadingNotas ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : notas.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin notas aún</p>
                  : <div className="flex flex-wrap gap-1.5">{notas.map(n => (
                      <button key={n.id} onClick={() => { setPrevMobileTab(mobileTab); markVisited("notas"); setMobileTab("notas"); setSelectedNota(n); }} type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center"><FileText size={10} className="text-primary/25" /></div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{n.titulo || <span className="italic text-primary/30">Sin título</span>}</span>
                      </button>
                    ))}</div>}
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Grupos */}
              <div className="pb-3">
                <div className="flex items-center gap-1.5 mb-2"><Layers size={10} className="text-primary/30 shrink-0" /><span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Grupos · {gruposTodos.length}</span></div>
                {loadingGruposTodos ? <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : gruposTodos.length === 0 ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin grupos aún</p>
                  : <div className="flex flex-wrap gap-1.5">{gruposTodos.map(g => (
                      <button key={g.id} onClick={() => { setMobileTab("grupos"); markVisited("grupos"); }} type="button"
                        className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02]"
                        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center"><Layers size={10} className="text-primary/25" /></div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{g.nombre}</span>
                          <span className="text-[8px] text-primary/30 truncate">{g.miembro_ids.length} miembros</span>
                        </div>
                      </button>
                    ))}</div>}
              </div>
            </div>
          )}

          {/* Vista combinada: Personajes & Mundo (reinos + criaturas + personajes) */}
          {mobileTab === "mundo-personajes" && (
            <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
              {/* Reinos */}
              <div className="pt-3 pb-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Map size={10} className="text-primary/30 shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Reinos · {reinos.length}</span>
                </div>
                {loadingReinos
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : reinos.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin reinos aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {reinos.map(r => (
                          <button key={r.id} onClick={() => setSelectedReino(r)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                              {r.mapa_url ? <img src={r.mapa_url} alt={r.nombre} className="w-full h-full object-cover" /> : <Map size={10} className="text-primary/25" />}
                            </div>
                            <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{r.nombre}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Criaturas */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Bug size={10} className="text-primary/30 shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Criaturas · {criaturas.length}</span>
                </div>
                {loadingCriaturas
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : criaturas.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin criaturas aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {criaturas.map(c => (
                          <button key={c.id} onClick={() => setSelectedCriatura(c)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                              {c.imagen_url ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" /> : <Bug size={10} className="text-primary/25" />}
                            </div>
                            <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{c.nombre}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Personajes */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users size={10} className="text-primary/30 shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Personajes · {personajes.length}</span>
                </div>
                {loadingPersonajes
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : personajes.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin personajes aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {personajes.map(p => (
                          <button key={p.id} onClick={() => setSelectedPersonaje(p)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                              {p.img_url ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" /> : <UserCircle2 size={10} className="text-primary/25" />}
                            </div>
                            <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{p.nombre}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
            </div>
          )}

          {/* Vista combinada: Magia & Objetos (dones + hechizos + runas + objetos) */}
          {mobileTab === "magia-objetos" && (
            <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
              {/* Dones */}
              <div className="pt-3 pb-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star size={10} style={{ color: "color-mix(in srgb, var(--accent) 65%, transparent)" }} className="shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--accent) 45%, transparent)" }}>Dones · {dones.length}</span>
                </div>
                {loadingDones
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : dones.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin dones aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {dones.map(d => (
                          <button key={d.id} onClick={() => setSelectedDon(d)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 13%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center"
                              style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                              <Star size={10} style={{ color: "color-mix(in srgb, var(--accent) 65%, transparent)" }} />
                            </div>
                            <span className="text-[11px] font-bold truncate max-w-[90px]" style={{ color: "color-mix(in srgb, var(--accent) 75%, var(--primary))" }}>{d.nombre}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Hechizos */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={10} style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }} className="shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--accent) 45%, transparent)" }}>Hechizos · {hechizos.length}</span>
                </div>
                {loadingHechizos
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : hechizos.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin hechizos aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {hechizos.map(h => (
                          <button key={h.id} onClick={() => setSelectedHechizo(h)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center"
                              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                              <Sparkles size={10} style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }} />
                            </div>
                            <span className="text-[11px] font-bold truncate max-w-[90px]" style={{ color: "color-mix(in srgb, var(--accent) 80%, var(--primary))" }}>{h.nombre}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Runas */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <ScrollText size={10} className="text-primary/30 shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Runas · {runas.length}</span>
                </div>
                {loadingRunas
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : runas.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin runas aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {runas.map(r => (
                          <button key={r.id} onClick={() => setSelectedRuna(r)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center"
                              style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                              {r.imagen_url
                                ? <img src={r.imagen_url} alt={r.nombre} className="w-full h-full object-cover" />
                                : <ScrollText size={10} className="text-primary/40" />}
                            </div>
                            <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{r.nombre}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Objetos */}
              <div className="pb-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Package size={10} className="text-primary/30 shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Objetos · {objetos.length}</span>
                </div>
                {loadingObjetos
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : objetos.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin objetos aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {objetos.map(o => (
                          <button key={o.id} onClick={() => setSelectedObjeto(o)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                              {o.imagen_url ? <img src={o.imagen_url} alt={o.nombre} className="w-full h-full object-cover" /> : <Package size={10} className="text-primary/25" />}
                            </div>
                            <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{o.nombre}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
              <div className="border-t my-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
              {/* Notas */}
              <div className="pb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText size={10} className="text-primary/30 shrink-0" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Notas · {notas.length}</span>
                </div>
                {loadingNotas
                  ? <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                  : notas.length === 0
                    ? <p className="text-[9px] text-primary/20 italic px-1 pb-2">Sin notas aún</p>
                    : <div className="flex flex-wrap gap-1.5">
                        {notas.map(n => (
                          <button key={n.id} onClick={() => setSelectedNota(n)} type="button"
                            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                            style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                            <div className="w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                              <FileText size={10} className="text-primary/25" />
                            </div>
                            <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{n.titulo || <span className="italic text-primary/30">Sin título</span>}</span>
                          </button>
                        ))}
                      </div>
                }
              </div>
            </div>
          )}

          {/* Listado */}
          {!(["mundo", "historia", "magia", "magia-objetos", "mundo-personajes", "geo-magia", "todo", "capitulos", "letras"].includes(mobileTab)) && (
          <div
            className={mobileTab === "grupos"
              ? "flex-1 flex min-h-0 overflow-hidden relative"
              : "flex-1 overflow-y-auto min-h-0 px-3 pb-3 pt-2 relative flex flex-wrap gap-1.5 content-start"
            }
          >
            {/* Reinos */}
            {mobileTab === "reinos" && (loadingReinos
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredR.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchR ? "Sin resultados" : "Sin reinos aún"}</p>
                : filteredR.map(r => (
                  <button key={r.id} onClick={() => setSelectedReino(r)} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                      {r.mapa_url ? <img src={r.mapa_url} alt={r.nombre} className="w-full h-full object-cover" /> : <Map size={10} className="text-primary/25" />}
                    </div>
                    <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{r.nombre}</span>
                  </button>
                ))
            )}

            {/* Criaturas */}
            {mobileTab === "criaturas" && (loadingCriaturas
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredC.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchC ? "Sin resultados" : "Sin criaturas aún"}</p>
                : filteredC.map(c => (
                  <button key={c.id} onClick={() => setSelectedCriatura(c)} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                      {c.imagen_url ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" /> : <Bug size={10} className="text-primary/25" />}
                    </div>
                    <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{c.nombre}</span>
                  </button>
                ))
            )}

            {/* Objetos */}
            {mobileTab === "objetos" && (loadingObjetos
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredO.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchO ? "Sin resultados" : "Sin objetos aún"}</p>
                : filteredO.map(o => (
                  <button key={o.id} onClick={() => setSelectedObjeto(o)} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                      {o.imagen_url ? <img src={o.imagen_url} alt={o.nombre} className="w-full h-full object-cover" /> : <Package size={10} className="text-primary/25" />}
                    </div>
                    <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{o.nombre}</span>
                  </button>
                ))
            )}



            {/* Lugares */}
            {mobileTab === "lugares" && (loadingLugares
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredL.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchL ? "Sin resultados" : "Sin lugares aún"}</p>
                : filteredL.map(l => (
                  <button key={l.id} onClick={async () => {
                    try {
                      const { data } = await supabase.from("lugares").select("*").eq("id", l.id).single();
                      if (data) { setSelectedLugar(data as Lugar); return; }
                    } catch {}
                    setSelectedLugar(l as Lugar);
                  }} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                      {l.imagen_url ? <img src={l.imagen_url} alt={l.nombre} className="w-full h-full object-cover" /> : <MapPin size={10} className="text-primary/25" />}
                    </div>
                    <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{l.nombre}</span>
                  </button>
                ))
            )}

            {/* Personajes */}
            {mobileTab === "personajes" && (loadingPersonajes
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredP.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchP ? "Sin resultados" : "Sin personajes aún"}</p>
                : filteredP.map(p => (
                  <button key={p.id} onClick={() => setSelectedPersonaje(p)} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                      {p.img_url ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" /> : <UserCircle2 size={10} className="text-primary/25" />}
                    </div>
                    <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{p.nombre}</span>
                  </button>
                ))
            )}

            {/* Hechizos */}
            {mobileTab === "hechizos" && (loadingHechizos
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredH.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchH ? "Sin resultados" : "Sin hechizos aún"}</p>
                : filteredH.map(h => (
                  <button key={h.id} onClick={() => setSelectedHechizo(h)} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--accent) 5%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center"
                      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                      <Sparkles size={10} style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }} />
                    </div>
                    <span className="text-[11px] font-bold truncate max-w-[90px]" style={{ color: "color-mix(in srgb, var(--accent) 80%, var(--primary))" }}>{h.nombre}</span>
                  </button>
                ))
            )}

            {/* Dones */}
            {mobileTab === "dones" && (loadingDones
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredD.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchD ? "Sin resultados" : "Sin dones aún"}</p>
                : filteredD.map(d => (
                  <button key={d.id} onClick={() => setSelectedDon(d)} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--accent) 4%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 13%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center"
                      style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                      <Star size={10} style={{ color: "color-mix(in srgb, var(--accent) 65%, transparent)" }} />
                    </div>
                    <span className="text-[11px] font-bold truncate max-w-[90px]" style={{ color: "color-mix(in srgb, var(--accent) 75%, var(--primary))" }}>{d.nombre}</span>
                  </button>
                ))
            )}

            {/* Runas */}
            {mobileTab === "runas" && (loadingRunas
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : filteredRu.length === 0
                ? <p className="text-[9px] text-primary/20 uppercase tracking-widest text-center py-10 italic">{searchRu ? "Sin resultados" : "Sin runas aún"}</p>
                : filteredRu.map(r => (
                  <button key={r.id} onClick={() => setSelectedRuna(r)} type="button"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="w-6 h-6 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                      {r.imagen_url
                        ? <img src={r.imagen_url} alt={r.nombre} className="w-full h-full object-cover" />
                        : <ScrollText size={10} className="text-primary/40" />}
                    </div>
                    <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{r.nombre}</span>
                  </button>
                ))
            )}
            {mobileTab === "notas" && (loadingNotas
              ? <div className="flex justify-center py-10"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
              : notas.length === 0
                ? (
                  <div className="flex flex-col items-center gap-3 py-14 text-center">
                    <FileText size={24} strokeWidth={1} className="text-primary/15" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/20">Sin notas aún</p>
                    <button
                      onClick={async () => {
                        const nueva = await crearNota("Nueva nota");
                        if (nueva) setSelectedNota(nueva);
                      }}
                      className="mt-1 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-dashed text-primary/30 hover:text-primary/60 transition-all"
                      style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                    >
                      Crear primera nota
                    </button>
                  </div>
                )
                : notas
                    .filter(n =>
                      n.titulo.toLowerCase().includes(searchNotas.toLowerCase()) ||
                      (n.contenido ?? "").toLowerCase().includes(searchNotas.toLowerCase()) ||
                      (n.etiquetas ?? "").toLowerCase().includes(searchNotas.toLowerCase())
                    )
                    .map(n => (
                      <button key={n.id} onClick={() => setSelectedNota(n)} type="button"
                        className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                        <div className="w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                          <FileText size={10} className="text-primary/25" />
                        </div>
                        <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">
                          {n.titulo || <span className="italic text-primary/30">Sin título</span>}
                        </span>
                      </button>
                    ))
            )}

            {/* Grupos */}
            {mobileTab === "grupos" && (
              <EditorGrupo
                onClickMiembro={(id, tabla) => {
                  // Mapa tabla → subtab de listas
                  const tablaMap: Record<string, ListaTab> = {
                    personajes: "personajes",
                    criaturas: "criaturas",
                    items: "objetos",
                    lugares: "lugares",
                    hechizos: "hechizos",
                    dones: "dones",
                    runas: "runas",
                  };
                  const subtab = tablaMap[tabla];
                  if (!subtab) return;
                  setMobileTab(subtab);
                  markVisited(subtab);
                  // Abrir el editor del ítem usando el mismo sistema de overlay
                  if (tabla === "personajes") {
                    const p = personajes.find(x => x.id === id);
                    if (p) setSelectedPersonaje(p);
                  } else if (tabla === "criaturas") {
                    const c = criaturas.find(x => x.id === id);
                    if (c) setSelectedCriatura(c);
                  } else if (tabla === "items") {
                    const o = objetos.find(x => x.id === id);
                    if (o) setSelectedObjeto(o);
                  } else if (tabla === "hechizos") {
                    const h = hechizos.find(x => x.id === id);
                    if (h) setSelectedHechizo(h);
                  } else if (tabla === "dones") {
                    const d = dones.find(x => x.id === id);
                    if (d) setSelectedDon(d);
                  } else if (tabla === "runas") {
                    const r = runas.find(x => x.id === id);
                    if (r) setSelectedRuna(r);
                  }
                }}
              />
            )}
          </div>
          )}
        </div>

      </div>

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
      <div className="shrink-0 flex items-center justify-end gap-3 px-3 sm:px-5 py-2.5 sm:py-3 border-t"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <SaveIndicator status={status} />
        <button onClick={handle} disabled={status === "saving"}
          className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
          <SaveIcon size={11} /> <span className="hidden sm:inline">{saveLabel}</span><span className="sm:hidden">Guardar</span>
        </button>
      </div>
    </div>
  );
}