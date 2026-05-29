"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Plus, Trash2, Save, Loader2, Search, X, Layers, Check, ScrollText,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./components/types";
import { SaveIndicator, SelectorImagen } from "./components/UIComponents";
import { MarkdownEditor } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";

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

// ─── Types ────────────────────────────────────────────────────────────────────
export type Hechizo = {
  id: string;
  nombre: string;
  explicacion?: string;
  grupo_ids?: string[];
  imagen_url?: string | null;
};

export type Don = Hechizo;

type EntidadMagica = Hechizo;
type Modo = "hechizos" | "dones" | "runas";

// Grupo mínimo de criaturas
type GrupoMin = {
  id: string;
  nombre: string;
  miembro_ids: string[];
};

const CONFIG: Record<Modo, {
  tabla: string; label: string; labelSing: string;
  Icon: React.ElementType; color: string; placeholder: string;
}> = {
  hechizos: {
    tabla: "hechizos", label: "Hechizos", labelSing: "Hechizo",
    Icon: Sparkles, color: "var(--accent)",
    placeholder: "Qué hace este hechizo, cómo se lanza, sus efectos…",
  },
  dones: {
    tabla: "dones", label: "Dones", labelSing: "Don",
    Icon: Star, color: "color-mix(in srgb, var(--accent) 70%, var(--primary))",
    placeholder: "Qué otorga este don, su origen, sus limitaciones…",
  },
  runas: {
    tabla: "runas", label: "Runas", labelSing: "Runa",
    Icon: ScrollText, color: "var(--primary)",
    placeholder: "Qué significa esta runa, cómo se activa, su poder…",
  },
};

// ─── Hook: catálogo de entidades mágicas ──────────────────────────────────────
function useEntidadesMagicas(modo: Modo) {
  const [items, setItems] = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const tabla = CONFIG[modo].tabla;
    // Runas no tienen grupo_ids en la DB
    const selectFields = modo === "runas"
      ? "id, nombre, explicacion, imagen_url"
      : "id, nombre, explicacion, grupo_ids";
    const local = await dexieReadAll<EntidadMagica>(tabla);
    if (local.length) { setItems(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
    setLoading(!local.length);
    const { data } = await supabase
      .from(tabla)
      .select(selectFields)
      .order("nombre");
    const result = (data ?? []) as EntidadMagica[];
    setItems(result); setLoading(false);
    await dexieWriteAll(tabla, result);
  }, [modo]);
  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading };
}

// ─── Hook: grupos de criaturas ────────────────────────────────────────────────
function useGruposCriaturas() {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Dexie primero
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

      const { data } = await supabase
        .from("grupos_mundo")
        .select("id, nombre, miembro_ids")
        .eq("tipo", "criaturas")
        .order("nombre");
      if (cancelled) return;
      const result: GrupoMin[] = (data ?? []).map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        miembro_ids: r.miembro_ids ?? [],
      }));
      setGrupos(result);
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return { grupos, loading };
}

// ─── FilaGrupo: un grupo asignado ─────────────────────────────────────────────
function FilaGrupo({ grupo, onQuitar, color }: {
  grupo: GrupoMin;
  onQuitar: () => void;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
        background:  `color-mix(in srgb, ${color} 4%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="shrink-0 w-7 h-7 rounded-lg border border-primary/10 bg-primary/5 flex items-center justify-center">
          <Layers size={11} className="text-primary/30" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-primary/85 truncate block">{grupo.nombre}</span>
          <span className="text-[9px] text-primary/30">{grupo.miembro_ids.length} criaturas</span>
        </div>
        <button
          onClick={onQuitar}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-primary/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="Quitar grupo"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── SelectorAgregarGrupo: dropdown para añadir grupos de criaturas ───────────
function SelectorAgregarGrupo({ grupos, loadingGrupos, asignados, onAgregar, color }: {
  grupos: GrupoMin[];
  loadingGrupos: boolean;
  asignados: string[];   // IDs de grupos ya asignados
  onAgregar: (g: GrupoMin) => void;
  color: string;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const disponibles = useMemo(
    () => grupos.filter(g =>
      !asignados.includes(g.id) &&
      g.nombre.toLowerCase().includes(search.toLowerCase())
    ),
    [grupos, asignados, search]
  );

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
        style={{
          borderColor: `color-mix(in srgb, ${color} 22%, transparent)`,
          color: `color-mix(in srgb, ${color} 55%, transparent)`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${color} 6%, transparent)`;
          (e.currentTarget as HTMLElement).style.color = color;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = `color-mix(in srgb, ${color} 55%, transparent)`;
        }}
      >
        <Plus size={9} /> Agregar grupo de criaturas
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
          <div
            className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border overflow-hidden shadow-xl"
            style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          >
            <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <div className="relative">
                <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar grupo…"
                  className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
                />
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
                <button
                  key={g.id}
                  onMouseDown={() => { onAgregar(g); setSearch(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                >
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

// ─── Panel de grupos asignados ────────────────────────────────────────────────
function PanelGruposAsignados({ entidadId, modo, grupoIds, onGrupoIdsChange, grupos, loadingGrupos, color }: {
  entidadId: string;
  modo: Modo;
  grupoIds: string[];
  onGrupoIdsChange: (ids: string[]) => void;
  grupos: GrupoMin[];
  loadingGrupos: boolean;
  color: string;
}) {
  const asignados = useMemo(
    () => grupos.filter(g => grupoIds.includes(g.id)),
    [grupos, grupoIds]
  );

  const agregar = (g: GrupoMin) => {
    if (grupoIds.includes(g.id)) return;
    onGrupoIdsChange([...grupoIds, g.id]);
  };

  const quitar = (grupoId: string) => {
    onGrupoIdsChange(grupoIds.filter(id => id !== grupoId));
  };

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
            <p className="text-[9px] text-primary/20 italic px-1">
              Sin grupos asignados — estará disponible para todos (universal)
            </p>
          )}

          {asignados.map(g => (
            <FilaGrupo
              key={g.id}
              grupo={g}
              color={color}
              onQuitar={() => quitar(g.id)}
            />
          ))}

          <SelectorAgregarGrupo
            grupos={grupos}
            loadingGrupos={loadingGrupos}
            asignados={grupoIds}
            onAgregar={agregar}
            color={color}
          />
        </div>
      )}
    </div>
  );
}

function FormularioMagico({ item, modo, grupos, loadingGrupos, onSaved, onDeleted }: {
  item: EntidadMagica;
  modo: Modo;
  grupos: GrupoMin[];
  loadingGrupos: boolean;
  onSaved:   (i: EntidadMagica) => void;
  onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<EntidadMagica>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();
  const cfg = CONFIG[modo];

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const updatePayload: any = {
        nombre:      form.nombre,
        explicacion: form.explicacion || null,
      };
      if (modo !== "runas") {
        updatePayload.grupo_ids = form.grupo_ids ?? [];
      } else {
        updatePayload.imagen_url = (form as any).imagen_url || null;
      }
      const { error } = await supabase.from(cfg.tabla)
        .update(updatePayload)
        .eq("id", form.id);
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

      {/* Header — dos filas como EditorMundo */}
      <div
        className="shrink-0 flex flex-col gap-2 px-4 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}
      >
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
      {modo === "runas" ? (
        /* Runas: layout dos columnas con imagen grande a la izquierda */
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col sm:flex-row gap-0 h-full">
            {/* Columna izquierda: imagen */}
            <div className="shrink-0 sm:w-48 p-4 sm:border-r flex flex-col gap-3"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <div className="w-full sm:w-full mx-auto" style={{ maxWidth: "10rem" }}>
                <SelectorImagen
                  label="Imagen"
                  value={(form as any).imagen_url ?? ""}
                  onChange={url => setForm(f => ({ ...f, imagen_url: url } as any))}
                  aspect="square"
                  placeholder={<cfg.Icon size={28} style={{ color: cfg.color, opacity: 0.4 }} />}
                />
              </div>
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
      ) : (
        /* Hechizos / Dones: layout original con grupos */
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
          <PanelGruposAsignados
            entidadId={form.id}
            modo={modo}
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
      )}
    </div>
  );
}

// ─── EditorHechizos (componente principal) ────────────────────────────────────
export function EditorHechizos({
  modo,
  initialSelectedId,
  onSelectedIdChange,
}: {
  modo: Modo;
  initialSelectedId?: string;
  onSelectedIdChange?: (id: string | null) => void;
}) {
  const cfg = CONFIG[modo];
  const { items, setItems, loading } = useEntidadesMagicas(modo);
  const { grupos, loading: loadingGrupos } = useGruposCriaturas();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [search,     setSearch]     = useState("");
  const [creating,   setCreating]   = useState(false);

  // Sincronizar cuando llega un id desde afuera (buscador global)
  useEffect(() => {
    if (initialSelectedId && initialSelectedId !== selectedId) {
      setSelectedId(initialSelectedId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId]);

  const selected = items.find(i => i.id === selectedId) ?? null;

  const filtered = items.filter(i =>
    i.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const insertPayload = modo === "runas"
        ? { nombre: `Nueva ${cfg.labelSing}` }
        : { nombre: `Nuevo ${cfg.labelSing}`, grupo_ids: [] };
      const selectFields = modo === "runas"
        ? "id, nombre, explicacion, imagen_url"
        : "id, nombre, explicacion, grupo_ids";
      const { data, error } = await supabase
        .from(cfg.tabla)
        .insert([insertPayload])
        .select(selectFields)
        .single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setSelectedId(data.id);
    } finally { setCreating(false); }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Lista lateral ─────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col border-r min-h-0"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>

        <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <cfg.Icon size={12} style={{ color: cfg.color }} />
          <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-primary/50">{cfg.label}</span>
          <button onClick={handleCreate} disabled={creating}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all border border-primary/10 text-primary/30 hover:text-primary hover:border-primary/30 hover:bg-primary/8">
            {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
          </button>
        </div>

        <div className="shrink-0 px-2 pt-2">
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
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-8 italic">
              {search ? "Sin resultados" : `Sin ${cfg.label.toLowerCase()} aún`}
            </p>
          ) : filtered.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedId(item.id);
                onSelectedIdChange?.(item.id);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                selectedId === item.id
                  ? "border-primary/20 bg-primary/10"
                  : "border-transparent hover:bg-primary/6 hover:border-primary/10"
              }`}
            >
              <p className={`text-[11px] font-bold truncate ${selectedId === item.id ? "text-primary" : "text-primary/70"}`}>
                {item.nombre}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Editor principal ──────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {selected ? (
          <FormularioMagico
            key={selected.id}
            item={selected}
            modo={modo}
            grupos={grupos}
            loadingGrupos={loadingGrupos}
            onSaved={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
            onDeleted={id => { setItems(prev => prev.filter(i => i.id !== id)); setSelectedId(null); onSelectedIdChange?.(null); }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
            <cfg.Icon size={40} strokeWidth={1} style={{ color: cfg.color, opacity: 0.2 }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">{cfg.label}</p>
            <p className="text-[10px] text-primary/20 tracking-widest">
              Seleccioná un {cfg.labelSing.toLowerCase()} o creá uno nuevo
            </p>
            <button onClick={handleCreate} disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all mt-2">
              {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              Nuevo {cfg.labelSing}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}