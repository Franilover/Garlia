"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Globe, Plus, Trash2, Save, Loader2, Search, X, Bug,
  ChevronDown, Mountain, ScrollText, Map, ChevronRight, FileText, Users, UserCircle2, Package,
  Crown, Clock, Filter, Layers, Check,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { MUNDO_SECTIONS, type MundoSectionKey, type SaveStatus, type Reino, type Personaje, type Nota } from "./types";
import { SaveIndicator, SelectorImagen } from "./UIComponents";
import { MarkdownEditor } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import { EditorReino } from "./EditorReino";
import { FormularioPersonaje } from "./EditorPersonaje";
import { EditorCriatura } from "./EditorCriatura";
import { EditorItem } from "./EditorItem";
import { type TimelineEvent } from "./LoreTab";
import { useNotas } from "./useNotas";
import { EditorNota, ListaNotas } from "./EditorNota";
import { EditorGrupo } from "./EditorGrupo";


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

type MundoTab = "magia" | "hechizos" | "dones" | "runas";
type GeoTab = "texto" | "reinos";

// Usados por useCriaturas y useCriaturaVariantes (para items del mundo)
type CriaturaMin = { id: string; nombre: string; imagen_url?: string; habitat?: string };
type VarianteMin = { id: string; tipo: string };

// ─── Hook: lista de reinos ─────────────────────────────────────────────────────
function useReinos() {
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

  useEffect(() => { load(); }, [load]);
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
function useCriaturas() {
  const [criaturas, setCriaturas] = useState<CriaturaMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
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
  }, []);
  return { criaturas, setCriaturas, loading };
}

// Hook full para objetos (PanelListas)
type ObjetoMin = { id: string; nombre: string; imagen_url?: string; categoria?: string };
function useObjetos() {
  const [objetos, setObjetos] = useState<ObjetoMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
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
  }, []);
  return { objetos, setObjetos, loading };
}

// Hook full para personajes (PanelListas)
function usePersonajesList() {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
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
  }, []);
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

function useEntidadesMagicas(tabla: string) {
  const [items, setItems] = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const local = await dexieReadAll<EntidadMagica>(tabla);
    if (local.length) { setItems(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
    const { data } = await supabase
      .from(tabla)
      .select("id, nombre, explicacion, grupo_ids")
      .order("nombre");
    const result = (data ?? []) as EntidadMagica[];
    setItems(result); setLoading(false);
    await dexieWriteAll(tabla, result);
  }, [tabla]);
  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading };
}

function useRunas() {
  const [items, setItems] = useState<Runa[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const local = await dexieReadAll<Runa>("runas");
    if (local.length) { setItems(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
    const { data } = await supabase.from("runas").select("id, nombre, explicacion, imagen_url").order("nombre");
    const result = (data ?? []) as Runa[];
    setItems(result); setLoading(false);
    await dexieWriteAll("runas", result);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading };
}

// ─── Hook: grupos de criaturas ────────────────────────────────────────────────
type GrupoMin = { id: string; nombre: string; miembro_ids: string[] };

function useGruposCriaturas() {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
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
  }, []);
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

// ─── Panel Runas (sin criatura) ───────────────────────────────────────────────
function PanelRunas() {
  const cfg = MAGIC_CONFIG.runas;
  const { items, setItems, loading } = useRunas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = items.find(i => i.id === selectedId) ?? null;
  const filtered = items.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.from("runas")
        .insert([{ nombre: "Nueva Runa" }])
        .select("id, nombre, explicacion, imagen_url")
        .single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setSelectedId(data.id);
    } finally { setCreating(false); }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      {/* Lista lateral — w-52 en desktop, full en mobile cuando no hay selección */}
      <div className={`flex-col border-r min-h-0 sm:w-52 sm:shrink-0 sm:flex ${selected ? "hidden sm:flex" : "flex flex-1"}`}
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <div className="shrink-0 px-2 pt-2 pb-2 space-y-1.5">
          <div className="relative">
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
              className="w-full bg-primary/4 border border-primary/10 rounded-lg pl-7 pr-6 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary">
                <X size={9} />
              </button>
            )}
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
            style={{ borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`, color: `color-mix(in srgb, ${cfg.color} 60%, transparent)` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${cfg.color} 6%, transparent)`; (e.currentTarget as HTMLElement).style.color = cfg.color; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = `color-mix(in srgb, ${cfg.color} 60%, transparent)`; }}
          >
            {creating ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
            Nueva Runa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-8 italic">
              {search ? "Sin resultados" : "Sin runas aún"}
            </p>
          ) : filtered.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)}
              className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all border ${
                selectedId === item.id ? "border-primary/20 bg-primary/10" : "border-transparent hover:bg-primary/6 hover:border-primary/10"
              }`}>
              <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                {item.imagen_url
                  ? <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
                  : <ScrollText size={11} className="text-primary/40" />}
              </div>
              <p className={`text-[11px] font-bold truncate flex-1 min-w-0 ${selectedId === item.id ? "text-primary" : "text-primary/70"}`}>
                {item.nombre}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor — full en mobile cuando hay selección */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${selected ? "flex" : "hidden sm:flex"}`}>
        {selected && (
          <div className="sm:hidden shrink-0 px-3 py-2 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
            <button onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary transition-all">
              <ChevronRight size={12} className="rotate-180" /> Volver
            </button>
          </div>
        )}
        {selected ? (
          <FormularioRuna
            key={selected.id} item={selected}
            onSaved={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
            onDeleted={id => { setItems(prev => prev.filter(i => i.id !== id)); setSelectedId(null); }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
            <cfg.Icon size={36} strokeWidth={1} style={{ color: cfg.color, opacity: 0.2 }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">{cfg.label}</p>
            <p className="text-[10px] text-primary/20 tracking-widest">Seleccioná o creá una runa</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel de lista + editor para hechizos o dones ───────────────────────────
function PanelMagico({ modo }: { modo: "hechizos" | "dones" }) {
  const cfg = MAGIC_CONFIG[modo];
  const { items, setItems, loading } = useEntidadesMagicas(cfg.tabla);
  const { grupos, loading: loadingGrupos } = useGruposCriaturas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = items.find(i => i.id === selectedId) ?? null;
  const filtered = items.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.from(cfg.tabla)
        .insert([{ nombre: `Nuevo ${cfg.labelSing}`, grupo_ids: [] }])
        .select("id, nombre, explicacion, grupo_ids")
        .single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setSelectedId(data.id);
    } finally { setCreating(false); }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      {/* Lista lateral — w-52 en desktop, full en mobile cuando no hay selección */}
      <div className={`flex-col border-r min-h-0 sm:w-52 sm:shrink-0 sm:flex ${selected ? "hidden sm:flex" : "flex flex-1"}`}
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>

        {/* Buscador + nuevo */}
        <div className="shrink-0 px-2 pt-2 pb-2 space-y-1.5">
          <div className="relative">
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
              className="w-full bg-primary/4 border border-primary/10 rounded-lg pl-7 pr-6 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary">
                <X size={9} />
              </button>
            )}
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
            style={{
              borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
              color: `color-mix(in srgb, ${cfg.color} 60%, transparent)`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${cfg.color} 6%, transparent)`;
              (e.currentTarget as HTMLElement).style.color = cfg.color;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = `color-mix(in srgb, ${cfg.color} 60%, transparent)`;
            }}
          >
            {creating ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
            Nuevo {cfg.labelSing}
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-8 italic">
              {search ? "Sin resultados" : `Sin ${cfg.label.toLowerCase()} aún`}
            </p>
          ) : filtered.map(item => (
            <button key={item.id} onClick={() => setSelectedId(item.id)}
              className={`w-full text-left px-2.5 py-2 rounded-xl transition-all border ${
                selectedId === item.id
                  ? "border-primary/20 bg-primary/10"
                  : "border-transparent hover:bg-primary/6 hover:border-primary/10"
              }`}>
              <p className={`text-[11px] font-bold truncate ${selectedId === item.id ? "text-primary" : "text-primary/70"}`}>
                {item.nombre}
              </p>
              {(item.grupo_ids?.length ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black"
                  style={{ background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, color: cfg.color }}>
                  <Layers size={7} />
                  {item.grupo_ids!.length} {item.grupo_ids!.length === 1 ? "grupo" : "grupos"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor — full en mobile cuando hay selección, ocupa resto en desktop */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${selected ? "flex" : "hidden sm:flex"}`}>
        {/* Back button — solo mobile */}
        {selected && (
          <div className="sm:hidden shrink-0 px-3 py-2 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
            <button onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary transition-all">
              <ChevronRight size={12} className="rotate-180" /> Volver
            </button>
          </div>
        )}
        {selected ? (
          <FormularioMagico
            key={selected.id} item={selected} modo={modo}
            grupos={grupos} loadingGrupos={loadingGrupos}
            onSaved={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
            onDeleted={id => { setItems(prev => prev.filter(i => i.id !== id)); setSelectedId(null); }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
            <cfg.Icon size={36} strokeWidth={1} style={{ color: cfg.color, opacity: 0.2 }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">{cfg.label}</p>
            <p className="text-[10px] text-primary/20 tracking-widest">
              Seleccioná o creá un {cfg.labelSing.toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hook: lista de personajes ────────────────────────────────────────────────
function usePersonajes() {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("personajes").select("id, nombre, img_url, especie, reino, sobre").order("nombre")
      .then(({ data }) => { setPersonajes(data ?? []); setLoading(false); });
  }, []);

  return { personajes, setPersonajes, loading };
}

type HistoriaTab = "texto" | "personajes";

// ─── Panel Historia con tabs (texto + lista de personajes) ────────────────────
function PanelHistoria({
  texto, onChange, onSave, status, initialHistoriaTab, hideTabs,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  status: SaveStatus;
  initialHistoriaTab?: HistoriaTab;
  hideTabs?: boolean;
}) {
  const [historiaTab, setHistoriaTab] = useState<HistoriaTab>(initialHistoriaTab ?? "texto");
  const [localStatus, setLocalStatus] = useState<SaveStatus>("idle");
  const { onSnippetAction } = useWikilink();
  const { personajes, setPersonajes, loading } = usePersonajes();
  const [selectedPersonaje, setSelectedPersonaje] = useState<Personaje | null>(null);
  const [search, setSearch] = useState("");

  const handleSave = async () => {
    setLocalStatus("saving");
    try { await onSave(); setLocalStatus("saved"); setTimeout(() => setLocalStatus("idle"), 2000); }
    catch { setLocalStatus("error"); }
  };

  const filtered = personajes.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const [personajeStatus, setPersonajeStatus] = useState<SaveStatus>("idle");

  const handleSavePersonaje = async () => {
    if (!selectedPersonaje) return;
    setPersonajeStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre: selectedPersonaje.nombre,
        img_url: selectedPersonaje.img_url || null,
        img_cuerpo_url: (selectedPersonaje as any).img_cuerpo_url || null,
        sobre: selectedPersonaje.sobre,
        reino: selectedPersonaje.reino,
        especie: selectedPersonaje.especie,
      }).eq("id", selectedPersonaje.id);
      if (error) throw error;
      setPersonajes(prev => prev.map(p => p.id === selectedPersonaje.id ? selectedPersonaje : p));
      setPersonajeStatus("saved");
      setTimeout(() => setPersonajeStatus("idle"), 2000);
    } catch { setPersonajeStatus("error"); }
  };

  const handleDeletePersonaje = async () => {
    if (!selectedPersonaje) return;
    await supabase.from("personajes").delete().eq("id", selectedPersonaje.id);
    void dexieDel("personajes", selectedPersonaje.id);
    setPersonajes(prev => prev.filter(p => p.id !== selectedPersonaje.id));
    setSelectedPersonaje(null);
  };

  const HISTORIA_TABS: { key: HistoriaTab; label: string; Icon: React.ElementType }[] = [
    { key: "texto",      label: "Texto",      Icon: ScrollText },
    { key: "personajes", label: "Personajes", Icon: Users },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Tab bar — oculta cuando lo controla el EditorMundo unificado */}
      {!hideTabs && <div
        className="shrink-0 flex items-center gap-0 border-b px-4"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {HISTORIA_TABS.map(tab => {
          const active = historiaTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setHistoriaTab(tab.key)}
              className="relative flex items-center gap-1.5 px-3.5 py-3 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{ color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <tab.Icon size={10} />
              {tab.label}
              {tab.key === "personajes" && !loading && personajes.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
                >
                  {personajes.length}
                </span>
              )}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>}

      {/* Tab: Texto */}
      {historiaTab === "texto" && (
        <div className="flex-1 flex flex-col min-h-0 p-5 gap-4 overflow-y-auto">
          <MarkdownEditor
            value={texto}
            onChange={onChange}
            placeholder="Grandes eras, eventos fundacionales, cronología del mundo…"
            rows={22}
            toolbar
            defaultMode="split"
                    onSnippetAction={onSnippetAction}
          />
          <div className="flex items-center justify-end gap-3">
            <SaveIndicator status={localStatus} />
            <button
              onClick={handleSave}
              disabled={localStatus === "saving"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              <ScrollText size={11} /> Guardar Historia
            </button>
          </div>
        </div>
      )}

      {/* Tab: Personajes */}
      {historiaTab === "personajes" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Overlay editor de personaje */}
          {selectedPersonaje && (
            <div
              className="absolute inset-0 z-10 flex flex-col"
              style={{ background: "var(--bg-main)" }}
            >
              <div
                className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-primary/10"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}
              >
                <button
                  onClick={() => setSelectedPersonaje(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
                >
                  <ChevronRight size={12} className="rotate-180" /> Volver a Personajes
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center shrink-0">
                    {selectedPersonaje.img_url
                      ? <img src={selectedPersonaje.img_url} alt={selectedPersonaje.nombre} className="w-full h-full object-cover" />
                      : <UserCircle2 size={12} className="text-primary/25" />}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/70 truncate">
                    {selectedPersonaje.nombre}
                  </span>
                </div>
              </div>
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <FormularioPersonaje
                  form={selectedPersonaje}
                  setForm={(updated) => {
                    const p = typeof updated === "function" ? updated(selectedPersonaje) : updated;
                    setSelectedPersonaje(p);
                    setPersonajes(prev => prev.map(x => x.id === p.id ? p : x));
                  }}
                  status={personajeStatus}
                  onSave={handleSavePersonaje}
                  onDelete={handleDeletePersonaje}
                  compacto
                />
              </div>
            </div>
          )}

          {/* Lista de personajes */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Buscador */}
            <div
              className="shrink-0 px-3 pt-3 pb-2"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
            >
              <div className="relative">
                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar personaje…"
                  className="w-full bg-primary/4 border border-primary/10 rounded-lg pl-7 pr-6 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary">
                    <X size={9} />
                  </button>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-0.5">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={16} className="animate-spin text-primary/20" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-12 italic">
                  {search ? "Sin resultados" : "Sin personajes aún"}
                </p>
              ) : filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersonaje(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/6 border border-transparent hover:border-primary/10 transition-all rounded-xl group"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {p.img_url
                      ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                      : <UserCircle2 size={13} className="text-primary/20" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-primary/80 truncate">{p.nombre}</p>
                    <p className="text-[9px] text-primary/35 truncate">
                      {[p.especie, p.reino].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <ChevronRight size={10} className="text-primary/20 shrink-0 group-hover:text-primary/40 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: lista con buscador reutilizable ──────────────────────────────────
function ListaConBuscador({ search, onSearch, placeholder, loading, emptyText, children }: {
  search: string; onSearch: (v: string) => void; placeholder: string;
  loading: boolean; emptyText: string; children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 px-3 pt-3 pb-2"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}>
        <div className="relative">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder}
            className="w-full bg-primary/4 border border-primary/10 rounded-lg pl-7 pr-6 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25" />
          {search && (
            <button onClick={() => onSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary">
              <X size={9} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-0.5">
        {loading
          ? <div className="flex justify-center py-12"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
          : React.Children.count(children) === 0
            ? <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-12 italic">{search ? "Sin resultados" : emptyText}</p>
            : children}
      </div>
    </div>
  );
}

// ─── Hook: lista de criaturas (para PanelMundo) ───────────────────────────────
function useCriaturasList() {
  const [criaturas, setCriaturas] = useState<{ id: string; nombre: string; imagen_url?: string; habitat?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("criaturas").select("id, nombre, imagen_url, habitat").order("nombre")
      .then(({ data }) => { setCriaturas(data ?? []); setLoading(false); });
  }, []);
  return { criaturas, setCriaturas, loading };
}

function useObjetosList() {
  const [objetos, setObjetos] = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("items").select("id, nombre, imagen_url, categoria").order("nombre")
      .then(({ data }) => { setObjetos(data ?? []); setLoading(false); });
  }, []);
  return { objetos, setObjetos, loading };
}

type MundoGeoTab = "texto" | "reinos" | "criaturas" | "objetos";

// ─── Panel Mundo con tabs (texto + reinos + criaturas) ────────────────────────
function PanelMundo({
  texto, onChange, onSave, status, initialGeoTab, hideTabs,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  status: SaveStatus;
  initialGeoTab?: MundoGeoTab;
  hideTabs?: boolean;
}) {
  const [geoTab, setGeoTab] = useState<MundoGeoTab>(initialGeoTab ?? "texto");
  const [localStatus, setLocalStatus] = useState<SaveStatus>("idle");
  const { onSnippetAction } = useWikilink();
  const { reinos, setReinos, loading: loadingReinos } = useReinos();
  const { criaturas, setCriaturas, loading: loadingCriaturas } = useCriaturas();
  const { objetos, setObjetos, loading: loadingObjetos } = useObjetosList();
  const [selectedReino, setSelectedReino] = useState<Reino | null>(null);
  const [selectedCriatura, setSelectedCriatura] = useState<{ id: string; nombre: string; imagen_url?: string; habitat?: string } | null>(null);
  const [selectedObjeto, setSelectedObjeto] = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string } | null>(null);
  const [search, setSearch] = useState("");

  // Reset search when switching tabs
  useEffect(() => { setSearch(""); }, [geoTab]);

  const handleSave = async () => {
    setLocalStatus("saving");
    try { await onSave(); setLocalStatus("saved"); setTimeout(() => setLocalStatus("idle"), 2000); }
    catch { setLocalStatus("error"); }
  };

  const filteredReinos = reinos.filter(r => r.nombre.toLowerCase().includes(search.toLowerCase()));
  const filteredCriaturas = criaturas.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));
  const filteredObjetos = objetos.filter(o => o.nombre.toLowerCase().includes(search.toLowerCase()));

  const GEO_TABS: { key: MundoGeoTab; label: string; Icon: React.ElementType; count?: number }[] = [
    { key: "texto",    label: "Texto",    Icon: FileText },
    { key: "reinos",   label: "Reinos",   Icon: Map,     count: reinos.length },
    { key: "criaturas",label: "Criaturas",Icon: Bug,     count: criaturas.length },
    { key: "objetos",  label: "Objetos",  Icon: Package, count: objetos.length },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Tab bar — oculta cuando lo controla el EditorMundo unificado */}
      {!hideTabs && <div
        className="shrink-0 flex items-center gap-0 border-b px-4"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {GEO_TABS.map(tab => {
          const active = geoTab === tab.key;
          const loading = tab.key === "reinos" ? loadingReinos : tab.key === "criaturas" ? loadingCriaturas : tab.key === "objetos" ? loadingObjetos : false;
          return (
            <button
              key={tab.key}
              onClick={() => setGeoTab(tab.key)}
              className="relative flex items-center gap-1.5 px-3.5 py-3 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{ color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <tab.Icon size={10} />
              {tab.label}
              {tab.count !== undefined && !loading && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                  {tab.count}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                  style={{ background: "var(--primary)" }} />
              )}
            </button>
          );
        })}
      </div>}

      {/* Tab: Texto */}
      {geoTab === "texto" && (
        <div className="flex-1 flex flex-col min-h-0 p-5 gap-4 overflow-y-auto">
          <MarkdownEditor value={texto} onChange={onChange}
            placeholder="Continentes, mares, climas, fronteras del mundo…"
            rows={22} toolbar defaultMode="split"             onSnippetAction={onSnippetAction}
            />
          <div className="flex items-center justify-end gap-3">
            <SaveIndicator status={localStatus} />
            <button onClick={handleSave} disabled={localStatus === "saving"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
              <Mountain size={11} /> Guardar Mundo
            </button>
          </div>
        </div>
      )}

      {/* Tab: Reinos */}
      {geoTab === "reinos" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {selectedReino && (
            <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "var(--bg-main)" }}>
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-primary/10"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <button onClick={() => setSelectedReino(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all">
                  <ChevronRight size={12} className="rotate-180" /> Volver a Reinos
                </button>
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/60 truncate">{selectedReino.nombre}</span>
              </div>
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <EditorReino key={selectedReino.id} item={selectedReino}
                  onSaved={updated => { setReinos(prev => prev.map(r => r.id === updated.id ? updated : r)); setSelectedReino(updated); }}
                  onDeleted={id => { setReinos(prev => prev.filter(r => r.id !== id)); setSelectedReino(null); }} />
              </div>
            </div>
          )}
          <ListaConBuscador
            search={search} onSearch={setSearch} placeholder="Buscar reino…"
            loading={loadingReinos} emptyText="Sin reinos aún"
          >
            {filteredReinos.map(reino => (
              <button key={reino.id} onClick={() => setSelectedReino(reino)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/6 border border-transparent hover:border-primary/10 transition-all rounded-xl group">
                <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {reino.mapa_url ? <img src={reino.mapa_url} alt={reino.nombre} className="w-full h-full object-cover" /> : <Map size={13} className="text-primary/20" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-primary/80 truncate">{reino.nombre}</p>
                  {reino.oculto && <p className="text-[9px] text-primary/30 italic">Oculto en mapa</p>}
                </div>
                <ChevronRight size={10} className="text-primary/20 shrink-0 group-hover:text-primary/40 transition-colors" />
              </button>
            ))}
          </ListaConBuscador>
        </div>
      )}

      {/* Tab: Criaturas */}
      {geoTab === "criaturas" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {selectedCriatura && (
            <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "var(--bg-main)" }}>
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-primary/10"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <button onClick={() => setSelectedCriatura(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all">
                  <ChevronRight size={12} className="rotate-180" /> Volver a Criaturas
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center shrink-0">
                    {selectedCriatura.imagen_url ? <img src={selectedCriatura.imagen_url} alt={selectedCriatura.nombre} className="w-full h-full object-cover" /> : <Bug size={12} className="text-primary/25" />}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/70 truncate">{selectedCriatura.nombre}</span>
                </div>
              </div>
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <EditorCriatura
                  key={selectedCriatura.id}
                  item={selectedCriatura as any}
                  onSaved={updated => { setCriaturas(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)); setSelectedCriatura({ ...selectedCriatura, ...updated }); }}
                  onDeleted={id => { setCriaturas(prev => prev.filter(c => c.id !== id)); setSelectedCriatura(null); }}
                />
              </div>
            </div>
          )}
          <ListaConBuscador
            search={search} onSearch={setSearch} placeholder="Buscar criatura…"
            loading={loadingCriaturas} emptyText="Sin criaturas aún"
          >
            {filteredCriaturas.map(c => (
              <button key={c.id} onClick={() => setSelectedCriatura(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/6 border border-transparent hover:border-primary/10 transition-all rounded-xl group">
                <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {c.imagen_url ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" /> : <Bug size={13} className="text-primary/20" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-primary/80 truncate">{c.nombre}</p>
                  {c.habitat && <p className="text-[9px] text-primary/35 truncate">{c.habitat}</p>}
                </div>
                <ChevronRight size={10} className="text-primary/20 shrink-0 group-hover:text-primary/40 transition-colors" />
              </button>
            ))}
          </ListaConBuscador>
        </div>
      )}
      {/* Tab: Objetos */}
      {geoTab === "objetos" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {selectedObjeto && (
            <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "var(--bg-main)" }}>
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-primary/10"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <button onClick={() => setSelectedObjeto(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all">
                  <ChevronRight size={12} className="rotate-180" /> Volver a Objetos
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center shrink-0">
                    {selectedObjeto.imagen_url
                      ? <img src={selectedObjeto.imagen_url} alt={selectedObjeto.nombre} className="w-full h-full object-cover" />
                      : <Package size={12} className="text-primary/25" />}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/70 truncate">{selectedObjeto.nombre}</span>
                </div>
              </div>
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <EditorItem
                  key={selectedObjeto.id}
                  item={selectedObjeto as any}
                  onSaved={updated => {
                    setObjetos(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
                    setSelectedObjeto({ ...selectedObjeto, ...updated });
                  }}
                  onDeleted={id => {
                    setObjetos(prev => prev.filter(o => o.id !== id));
                    setSelectedObjeto(null);
                  }}
                />
              </div>
            </div>
          )}
          <ListaConBuscador
            search={search} onSearch={setSearch} placeholder="Buscar objeto…"
            loading={loadingObjetos} emptyText="Sin objetos aún"
          >
            {filteredObjetos.map(o => (
              <button key={o.id} onClick={() => setSelectedObjeto(o)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/6 border border-transparent hover:border-primary/10 transition-all rounded-xl group">
                <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {o.imagen_url
                    ? <img src={o.imagen_url} alt={o.nombre} className="w-full h-full object-cover" />
                    : <Package size={13} className="text-primary/20" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-primary/80 truncate">{o.nombre}</p>
                  {o.categoria && <p className="text-[9px] text-primary/35 truncate">{o.categoria}</p>}
                </div>
                <ChevronRight size={10} className="text-primary/20 shrink-0 group-hover:text-primary/40 transition-colors" />
              </button>
            ))}
          </ListaConBuscador>
        </div>
      )}
    </div>
  );
}
function PanelMagia({
  texto, onChange, onSave, status,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  status: SaveStatus;
}) {
  const [localStatus, setLocalStatus] = useState<SaveStatus>("idle");
  const { onSnippetAction } = useWikilink();
  const handleSave = async () => {
    setLocalStatus("saving");
    try {
      await onSave();
      setLocalStatus("saved");
      setTimeout(() => setLocalStatus("idle"), 2000);
    } catch { setLocalStatus("error"); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-5 gap-4">
      <MarkdownEditor
        value={texto}
        onChange={onChange}
        placeholder="Sistema de magia, reglas, fuentes de poder, limitaciones…"
        rows={22}
        toolbar
        defaultMode="split"
                onSnippetAction={onSnippetAction}
          />
      <div className="flex items-center justify-end gap-3">
        <SaveIndicator status={localStatus} />
        <button
          onClick={handleSave}
          disabled={localStatus === "saving"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
        >
          <Globe size={11} /> Guardar
        </button>
      </div>
    </div>
  );
}

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



const UNIFIED_TABS: (TabGroup | "sep")[] = [
  { key: "mundo",    label: "Mundo",    Icon: Globe },
  { key: "historia", label: "Historia", Icon: ScrollText },
  { key: "magia",    label: "Magia",    Icon: Sparkles, color: "var(--accent)" },
  "sep",
  
  { key: "listas",   label: "Listas",   Icon: Users },
];



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
  return "mundo";
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
}: {
  activeSection: MundoSectionKey;
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
  initialMundoTab?: string;
  initialItemId?: string;
  onTabChange?: (section: MundoSectionKey, mundoTab: string) => void;
}) {
  const [tab, setTab] = useState<UnifiedTab>(() =>
    resolveInitialTab(activeSection, initialMundoTab)
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const userChangedTabRef = useRef(false);

  // Sync solo cuando el cambio viene desde afuera (buscador global, etc).
  // Si el usuario acaba de cambiar tab manualmente, omitimos este disparo.
  useEffect(() => {
    if (userChangedTabRef.current) {
      userChangedTabRef.current = false;
      return;
    }
    setTab(resolveInitialTab(activeSection, initialMundoTab));
  }, [activeSection, initialMundoTab]);

  // Notifica al padre cuando el usuario cambia de tab manualmente
  const handleTabChange = useCallback((next: UnifiedTab) => {
    userChangedTabRef.current = true;
    setTab(next);
    // Mapea el tab unificado a (section, mundoTab) para persistencia
    const sectionMap: Record<UnifiedTab, MundoSectionKey> = {
      mundo: "geografia", historia: "historia", listas: "geografia",
      magia: "magia",
    };
    onTabChange?.(sectionMap[next], next);
  }, [onTabChange]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <PanelListas
        initialSubTab={initialMundoTab ?? resolveInitialTab(activeSection, initialMundoTab)}
        initialItemId={initialItemId}
        textos={textos}
        onTextoChange={onTextoChange}
        onSave={onSave}
        onTabChange={onTabChange}
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
  initialSubTab, initialItemId,
  textos, onTextoChange, onSave, onTabChange,
}: {
  initialSubTab?: string;
  initialItemId?: string;
  textos?: Record<MundoSectionKey, string>;
  onTextoChange?: (section: MundoSectionKey, value: string) => void;
  onSave?: (section: MundoSectionKey) => Promise<void>;
  onTabChange?: (section: MundoSectionKey, mundoTab: string) => void;
}) {
  const { reinos,    setReinos,    loading: loadingReinos    } = useReinos();
  const { criaturas, setCriaturas, loading: loadingCriaturas } = useCriaturas();
  const { objetos,   setObjetos,   loading: loadingObjetos   } = useObjetos();
  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesList();
  const { items: hechizos, setItems: setHechizos, loading: loadingHechizos } = useEntidadesMagicas("hechizos");
  const { items: dones,    setItems: setDones,    loading: loadingDones    } = useEntidadesMagicas("dones");
  const { items: runas,    setItems: setRunas,    loading: loadingRunas    } = useRunas();
  const { grupos: gruposMagicos, loading: loadingGruposMagicos } = useGruposCriaturas();
  const { notas, loading: loadingNotas, crear: crearNota, actualizar: actualizarNota, eliminar: eliminarNota } = useNotas();
  const [searchNotas, setSearchNotas] = useState("");
  const [selectedNota, setSelectedNota] = useState<Nota | null>(null);

  const [searchR, setSearchR] = useState("");
  const [searchC, setSearchC] = useState("");
  const [searchO, setSearchO] = useState("");
  const [searchP, setSearchP] = useState("");
  const [searchH, setSearchH] = useState("");
  const [searchD, setSearchD] = useState("");
  const [searchRu, setSearchRu] = useState("");

  const [selectedReino,    setSelectedReino]    = useState<Reino | null>(null);
  const [selectedCriatura, setSelectedCriatura] = useState<{ id: string; nombre: string; imagen_url?: string; habitat?: string } | null>(null);
  const [selectedObjeto,   setSelectedObjeto]   = useState<{ id: string; nombre: string; imagen_url?: string; categoria?: string } | null>(null);
  const [selectedPersonaje, setSelectedPersonaje] = useState<Personaje | null>(null);
  const [selectedHechizo,  setSelectedHechizo]  = useState<EntidadMagica | null>(null);
  const [selectedDon,      setSelectedDon]      = useState<EntidadMagica | null>(null);
  const [selectedRuna,     setSelectedRuna]     = useState<Runa | null>(null);
  const [personajeStatus,  setPersonajeStatus]  = useState<SaveStatus>("idle");

  type ListaTab = "mundo" | "historia" | "magia" | "reinos" | "criaturas" | "objetos" | "personajes" | "hechizos" | "dones" | "runas" | "notas" | "grupos" | "magia-objetos" | "mundo-personajes" | "geo-magia";
  const VALID_LISTA_TABS: ListaTab[] = ["mundo", "historia", "magia", "reinos", "criaturas", "objetos", "personajes", "hechizos", "dones", "runas", "notas", "grupos", "magia-objetos", "mundo-personajes", "geo-magia"];

  const [mobileTab, setMobileTab] = useState<ListaTab>(() => {
    // initialSubTab puede ser un UnifiedTab ("mundo","historia","magia","listas") o un ListaTab directo
    const mapped: Record<string, ListaTab> = { mundo: "mundo", historia: "historia", magia: "magia", listas: "reinos" };
    const resolved = mapped[initialSubTab ?? ""] ?? (VALID_LISTA_TABS.includes(initialSubTab as ListaTab) ? initialSubTab as ListaTab : "mundo");
    return resolved;
  });

  // Sincronizar mobileTab cuando el buscador navega a un subtab diferente
  useEffect(() => {
    if (!initialSubTab) return;
    const mapped: Record<string, ListaTab> = { mundo: "mundo", historia: "historia", magia: "magia", listas: "reinos" };
    const resolved = mapped[initialSubTab] ?? (VALID_LISTA_TABS.includes(initialSubTab as ListaTab) ? initialSubTab as ListaTab : null);
    if (resolved) setMobileTab(resolved);
  }, [initialSubTab]);

  // Editor overlay activo
  const overlay: "reino" | "criatura" | "objeto" | "personaje" | "hechizo" | "don" | "runa" | "nota" | null =
    selectedReino    ? "reino"    :
    selectedCriatura ? "criatura" :
    selectedObjeto   ? "objeto"   :
    selectedPersonaje? "personaje":
    selectedHechizo  ? "hechizo"  :
    selectedDon      ? "don"      :
    selectedRuna     ? "runa"     :
    selectedNota     ? "nota"     : null;

  const filteredR = reinos.filter(r    => r.nombre.toLowerCase().includes(searchR.toLowerCase()));
  const filteredC = criaturas.filter(c => c.nombre.toLowerCase().includes(searchC.toLowerCase()));
  const filteredO = objetos.filter(o   => o.nombre.toLowerCase().includes(searchO.toLowerCase()));
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
      const found = hechizos.find(i => i.id === initialItemId);
      if (found) { setSelectedHechizo(found); setMobileTab("hechizos"); }
    } else if (initialSubTab === "dones") {
      const found = dones.find(i => i.id === initialItemId);
      if (found) { setSelectedDon(found); setMobileTab("dones"); }
    } else if (initialSubTab === "runas") {
      const found = runas.find(i => i.id === initialItemId);
      if (found) { setSelectedRuna(found); setMobileTab("runas"); }
    }
  // Reacciona a cambios de initialItemId (buscador) y a la carga inicial de datos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItemId, hechizos.length, dones.length, runas.length]);

  const handleSavePersonaje = async () => {
    if (!selectedPersonaje) return;
    setPersonajeStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre: selectedPersonaje.nombre,
        img_url: selectedPersonaje.img_url || null,
        sobre: selectedPersonaje.sobre,
        reino: selectedPersonaje.reino,
        especie: selectedPersonaje.especie,
      }).eq("id", selectedPersonaje.id);
      if (error) throw error;
      setPersonajes(prev => prev.map(p => p.id === selectedPersonaje.id ? selectedPersonaje : p));
      setPersonajeStatus("saved");
      setTimeout(() => setPersonajeStatus("idle"), 2000);
    } catch { setPersonajeStatus("error"); }
  };

  const handleDeletePersonaje = async () => {
    if (!selectedPersonaje) return;
    await supabase.from("personajes").delete().eq("id", selectedPersonaje.id);
    void dexieDel("personajes", selectedPersonaje.id);
    setPersonajes(prev => prev.filter(p => p.id !== selectedPersonaje.id));
    setSelectedPersonaje(null);
  };

  // ── search state unified per active tab ──

  const searchMap: Record<string, string> = {
    reinos: searchR, criaturas: searchC, objetos: searchO,
    personajes: searchP, hechizos: searchH, dones: searchD, runas: searchRu,
    notas: searchNotas, grupos: "",
  };
  const setSearchMap: Record<string, (v: string) => void> = {
    reinos: setSearchR, criaturas: setSearchC, objetos: setSearchO,
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
      label: "Personajes & Mundo",
      tabs: [
        { key: "mundo-personajes" as ListaTab, label: "Personajes", Icon: Users,    count: reinos.length + criaturas.length + personajes.length },
        { key: "magia-objetos"   as ListaTab, label: "Magia",       Icon: Sparkles, count: dones.length + hechizos.length + runas.length + objetos.length, color: "var(--accent)" },
      ],
    },
    {
      label: "Notas & Grupos",
      tabs: [
        { key: "notas",  label: "Notas",  Icon: FileText, count: notas.length },
        { key: "grupos", label: "Grupos", Icon: Layers,   count: 0 },
      ],
    },
  ];

  const TABS: TabDef[] = TAB_GROUPS.flatMap(g => g.tabs);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">

      {/* ── Editor overlay — cubre toda la sección Listas ────────────────── */}
      {overlay && (
        <div className="absolute inset-0 z-20 flex flex-col" style={{ background: "var(--bg-main)" }}>
          <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
            <button
              onClick={() => {
                setSelectedReino(null); setSelectedCriatura(null);
                setSelectedObjeto(null); setSelectedPersonaje(null);
                setSelectedHechizo(null); setSelectedDon(null); setSelectedRuna(null);
                setSelectedNota(null);  // ← agregar
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
            >
              <ChevronRight size={12} className="rotate-180" /> Volver a Listas
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {overlay === "reino"    && <Map        size={12} className="text-primary/40 shrink-0" />}
              {overlay === "criatura" && <Bug        size={12} className="text-primary/40 shrink-0" />}
              {overlay === "objeto"   && <Package    size={12} className="text-primary/40 shrink-0" />}
              {overlay === "personaje"&& <Users      size={12} className="text-primary/40 shrink-0" />}
              {overlay === "hechizo"  && <Sparkles   size={12} className="shrink-0" style={{ color: "var(--accent)" }} />}
              {overlay === "don"      && <Star       size={12} className="shrink-0" style={{ color: "color-mix(in srgb, var(--accent) 70%, var(--primary))" }} />}
              {overlay === "runa"     && <ScrollText size={12} className="shrink-0" style={{ color: "var(--primary)" }} />}
              {overlay === "nota"     && <FileText  size={12} className="text-primary/40 shrink-0" />}
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/60 truncate">
                  {selectedReino?.nombre ?? selectedCriatura?.nombre ?? selectedObjeto?.nombre ?? selectedPersonaje?.nombre ?? selectedHechizo?.nombre ?? selectedDon?.nombre ?? selectedRuna?.nombre ?? selectedNota?.titulo}
              </span>
            </div>
          </div>
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {overlay === "reino" && selectedReino && (
              <EditorReino key={selectedReino.id} item={selectedReino}
                onSaved={u => { setReinos(p => p.map(r => r.id === u.id ? u : r)); setSelectedReino(u); }}
                onDeleted={id => { setReinos(p => p.filter(r => r.id !== id)); setSelectedReino(null); }} />
            )}
            {overlay === "criatura" && selectedCriatura && (
              <EditorCriatura key={selectedCriatura.id} item={selectedCriatura as any}
                onSaved={u => { setCriaturas(p => p.map(c => c.id === u.id ? { ...c, ...u } : c)); setSelectedCriatura({ ...selectedCriatura, ...u }); }}
                onDeleted={id => { setCriaturas(p => p.filter(c => c.id !== id)); setSelectedCriatura(null); }} />
            )}
            {overlay === "objeto" && selectedObjeto && (
              <EditorItem key={selectedObjeto.id} item={selectedObjeto as any}
                onSaved={u => { setObjetos(p => p.map(o => o.id === u.id ? { ...o, ...u } : o)); setSelectedObjeto({ ...selectedObjeto, ...u }); }}
                onDeleted={id => { setObjetos(p => p.filter(o => o.id !== id)); setSelectedObjeto(null); }} />
            )}
            {overlay === "personaje" && selectedPersonaje && (
              <FormularioPersonaje
                form={selectedPersonaje}
                setForm={updated => {
                  const p = typeof updated === "function" ? updated(selectedPersonaje) : updated;
                  setSelectedPersonaje(p);
                  setPersonajes(prev => prev.map(x => x.id === p.id ? p : x));
                }}
                status={personajeStatus}
                onSave={handleSavePersonaje}
                onDelete={handleDeletePersonaje}
                compacto
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

      {/* ── Layout principal: lista + sidebar ───────────────────────────── */}
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
          {!["mundo", "historia", "magia", "magia-objetos", "mundo-personajes", "geo-magia"].includes(mobileTab) && (() => {
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
          {!["mundo", "historia", "magia", "magia-objetos", "mundo-personajes", "geo-magia"].includes(mobileTab) && mobileTab !== "grupos" && (
            <SearchInput
              value={searchMap[mobileTab] ?? ""}
              onChange={v => setSearchMap[mobileTab]?.(v)}
              placeholder={`Buscar ${TABS.find(t => t.key === mobileTab)?.label.toLowerCase()}…`}
            />
          )}

          {/* Vista combinada: Geografía + Magia mitad y mitad */}
          {mobileTab === "geo-magia" && textos && onTextoChange && onSave && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Geografía — mitad izquierda */}
              <div className="flex-1 flex flex-col min-h-0 border-r" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
                  <Mountain size={11} className="text-primary/40 shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/50">Geografía</span>
                </div>
                <PanelTexto
                  texto={textos.geografia}
                  onChange={v => onTextoChange("geografia", v)}
                  onSave={() => onSave("geografia")}
                  placeholder="Continentes, mares, climas, fronteras del mundo…"
                  saveLabel="Guardar"
                  SaveIcon={Mountain}
                />
              </div>
              {/* Magia — mitad derecha */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
                  style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--accent) 3%, transparent)" }}>
                  <Sparkles size={11} style={{ color: "var(--accent)" }} className="shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Magia</span>
                </div>
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
            </div>
          )}

          {/* Listado */}
          {!(["mundo", "historia", "magia", "magia-objetos", "mundo-personajes", "geo-magia"].includes(mobileTab)) && (
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
                    hechizos: "hechizos",
                    dones: "dones",
                    runas: "runas",
                  };
                  const subtab = tablaMap[tabla];
                  if (!subtab) return;
                  setMobileTab(subtab);
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

        {/* Sidebar de navegación — fija, estrecha, con grupos, ahora a la derecha */}
        <div className="shrink-0 w-48 flex flex-col border-l min-h-0 overflow-y-auto py-2 gap-1"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          {TAB_GROUPS.map((group, gi) => (
            <div key={group.label}
              className="mx-2 rounded-xl overflow-hidden"
              style={{
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                background: "color-mix(in srgb, var(--primary) 2%, transparent)",
                marginTop: gi === 0 ? 0 : 4,
              }}
            >
              {/* Etiqueta del grupo */}
              <div className="px-2 pt-1.5 pb-0.5">
                <span className="text-[7px] font-black uppercase tracking-[0.2em]"
                  style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}>
                  {group.label}
                </span>
              </div>
              {/* Tabs del grupo */}
              <div className="pb-1.5 flex flex-col gap-0.5 px-1">
                {group.tabs.map(t => {
                  const active = mobileTab === t.key;
                  const color = t.color ?? "var(--primary)";
                  return (
                    <button
                      key={t.key}
                      onClick={() => setMobileTab(t.key)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left w-full"
                      style={active ? {
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        color,
                      } : {
                        color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                      }}
                    >
                      <t.Icon size={11} className="shrink-0" />
                      <span className="flex-1 text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                      {t.count > 0 && (
                        <span
                          className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full tabular-nums"
                          style={active ? {
                            background: `color-mix(in srgb, ${color} 18%, transparent)`,
                            color,
                          } : {
                            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                            color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                          }}
                        >
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
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