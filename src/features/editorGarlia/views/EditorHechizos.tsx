"use client";

import {
  Sparkles, Star, Plus, Trash2, Save, Loader2, Search, X, Layers, Check, ScrollText, Camera,
} from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { MarkdownEditor } from "@/components/forms/Markdown/MarkdownEditor";
import { useConfirm } from "@/components/ui/ConfirmModal";
import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { type SaveStatus } from "../components/types";
import { SaveIndicator } from "../components/UIComponents";
import { useWikilink } from "../components/WikilinkContext";


// ─── Botón mobile para cambiar imagen de una runa ────────────────────────────
function PickerImagenRunaBtn({ value, onChange, color, Icon }: {
  value: string;
  onChange: (url: string) => void;
  color: string;
  Icon: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Camera size={11} /> Imagen de la runa</h3>
              <button className="text-primary/30 hover:text-primary transition-colors" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <SimpleImagePicker onClose={() => setOpen(false)} onSelect={url => { onChange(url); setOpen(false); }} />
          </div>
        </div>
      )}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-main/80 backdrop-blur-sm border border-primary/20 text-primary/50 hover:text-primary hover:bg-bg-main transition-all shadow-md"
        title="Cambiar imagen"
        onClick={() => setOpen(true)}
      >
        <Camera size={13} />
      </button>
    </>
  );
}

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
    const selectFields = modo === "runas"
      ? "id, nombre, explicacion, imagen_url"
      : "id, nombre, explicacion, grupo_ids, imagen_url";
    const local = await dexieReadAll<EntidadMagica>(tabla);
    if (local.length) { setItems(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
    setLoading(!local.length);
    const { data } = await supabase
      .from(tabla)
      .select(selectFields)
      .order("nombre");
    const result = (data ?? []) as unknown as EntidadMagica[];
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
          <Layers className="text-primary/30" size={11} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-primary/85 truncate block">{grupo.nombre}</span>
          <span className="text-[9px] text-primary/30">{grupo.miembro_ids.length} criaturas</span>
        </div>
        <button
          className="w-6 h-6 rounded-lg flex items-center justify-center text-primary/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="Quitar grupo"
          onClick={onQuitar}
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
    <div ref={ref} className="relative">
      <button
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
        style={{
          borderColor: `color-mix(in srgb, ${color} 22%, transparent)`,
          color: `color-mix(in srgb, ${color} 55%, transparent)`,
        }}
        type="button"
        onClick={() => setOpen(o => !o)}
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
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" size={9} />
                <input
                  autoFocus
                  className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
                  placeholder="Buscar grupo…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {loadingGrupos ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary/20" size={14} /></div>
              ) : disponibles.length === 0 ? (
                <p className="text-[9px] text-primary/25 text-center py-4 italic">
                  {grupos.length === asignados.length ? "Todos los grupos ya están asignados" : "Sin resultados"}
                </p>
              ) : disponibles.map(g => (
                <button
                  key={g.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                  onMouseDown={() => { onAgregar(g); setSearch(""); }}
                >
                  <div className="shrink-0 w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 flex items-center justify-center">
                    <Layers className="text-primary/25" size={10} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-primary/80 truncate block">{g.nombre}</span>
                    <span className="text-[9px] text-primary/30">{g.miembro_ids.length} criaturas</span>
                  </div>
                  <Check className="text-primary/15" size={9} />
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
          <Loader2 className="animate-spin text-primary/20" size={11} />
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
              color={color}
              grupo={g}
              onQuitar={() => quitar(g.id)}
            />
          ))}

          <SelectorAgregarGrupo
            asignados={grupoIds}
            color={color}
            grupos={grupos}
            loadingGrupos={loadingGrupos}
            onAgregar={agregar}
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
        updatePayload.grupo_ids  = form.grupo_ids ?? [];
        updatePayload.imagen_url = (form as any).imagen_url || null;
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
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
            placeholder={`Nombre del ${cfg.labelSing.toLowerCase()}…`}
            value={form.nombre ?? ""}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <SaveIndicator status={status} />
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            onClick={del}>
            <Trash2 size={10} />
          </button>
          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50" disabled={status === "saving"}
            onClick={save}>
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
            <div className="shrink-0 sm:w-64 p-4 sm:border-r flex flex-col gap-3"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              {/* Mobile: imagen con botón flotante */}
              <div className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                {(form as any).imagen_url
                  ? <img alt={form.nombre} className="w-full h-full object-cover" src={(form as any).imagen_url} />
                  : <div className="w-full h-full flex items-center justify-center"><cfg.Icon size={64} style={{ color: cfg.color, opacity: 0.15 }} /></div>
                }
                <div className="absolute top-2 right-2 z-10">
                  <PickerImagenRunaBtn
                    Icon={cfg.Icon}
                    color={cfg.color}
                    value={(form as any).imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url } as any))}
                  />
                </div>
              </div>
              {/* Desktop: imagen grande con overlay de cambio */}
              <div className="hidden sm:block relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                {(form as any).imagen_url
                  ? <img alt={form.nombre} className="w-full h-full object-cover" src={(form as any).imagen_url} />
                  : <div className="w-full h-full flex items-center justify-center"><cfg.Icon size={64} style={{ color: cfg.color, opacity: 0.15 }} /></div>
                }
                <div className="absolute top-2 right-2 z-10">
                  <PickerImagenRunaBtn
                    Icon={cfg.Icon}
                    color={cfg.color}
                    value={(form as any).imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url } as any))}
                  />
                </div>
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
                  toolbar
                  defaultMode="edit"
                  placeholder={cfg.placeholder}
                  rows={16}
                  value={form.explicacion ?? ""}
                  onChange={v => setForm(f => ({ ...f, explicacion: v }))}
                  onSnippetAction={onSnippetAction}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Hechizos / Dones: layout dos columnas — imagen izquierda grande, grupos+explicación derecha */
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col sm:flex-row gap-0 h-full">
            {/* Columna izquierda: imagen grande */}
            <div className="shrink-0 sm:w-64 p-4 sm:border-r flex flex-col gap-3"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              {/* Mobile: imagen con botón flotante */}
              <div className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                {(form as any).imagen_url
                  ? <img alt={form.nombre} className="w-full h-full object-cover" src={(form as any).imagen_url} />
                  : <div className="w-full h-full flex items-center justify-center"><cfg.Icon size={64} style={{ color: cfg.color, opacity: 0.15 }} /></div>
                }
                <div className="absolute top-2 right-2 z-10">
                  <PickerImagenRunaBtn
                    Icon={cfg.Icon}
                    color={cfg.color}
                    value={(form as any).imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url } as any))}
                  />
                </div>
              </div>
              {/* Desktop: imagen grande con overlay de cambio */}
              <div className="hidden sm:block relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                {(form as any).imagen_url
                  ? <img alt={form.nombre} className="w-full h-full object-cover" src={(form as any).imagen_url} />
                  : <div className="w-full h-full flex items-center justify-center"><cfg.Icon size={64} style={{ color: cfg.color, opacity: 0.15 }} /></div>
                }
                <div className="absolute top-2 right-2 z-10">
                  <PickerImagenRunaBtn
                    Icon={cfg.Icon}
                    color={cfg.color}
                    value={(form as any).imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url } as any))}
                  />
                </div>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-center truncate"
                style={{ color: `color-mix(in srgb, ${cfg.color} 50%, transparent)` }}>
                {form.nombre || `${cfg.labelSing} sin nombre`}
              </p>
            </div>
            {/* Columna derecha: grupos + explicación */}
            <div className="flex-1 min-w-0 p-4 space-y-4">
              <PanelGruposAsignados
                color={cfg.color}
                entidadId={form.id}
                grupoIds={form.grupo_ids ?? []}
                grupos={grupos}
                loadingGrupos={loadingGrupos}
                modo={modo}
                onGrupoIdsChange={ids => setForm(f => ({ ...f, grupo_ids: ids }))}
              />
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Explicación</label>
                <MarkdownEditor
                  toolbar
                  defaultMode="edit"
                  placeholder={cfg.placeholder}
                  rows={14}
                  value={form.explicacion ?? ""}
                  onChange={v => setForm(f => ({ ...f, explicacion: v }))}
                  onSnippetAction={onSnippetAction}
                />
              </div>
            </div>
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
  onItemSaved,
  onItemDeleted,
}: {
  modo: Modo;
  initialSelectedId?: string;
  onSelectedIdChange?: (id: string | null) => void;
  onItemSaved?: (item: EntidadMagica) => void;
  onItemDeleted?: (id: string) => void;
}) {
  const cfg = CONFIG[modo];
  const { items, setItems, loading } = useEntidadesMagicas(modo);
  const { grupos, loading: loadingGrupos } = useGruposCriaturas();
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [creating,   setCreating]   = useState(false);

  // Sincronizar cuando llega un id desde afuera (buscador global)
  useEffect(() => {
    if (initialSelectedId && initialSelectedId !== selectedId) {
      setSelectedId(initialSelectedId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId]);

  const selected = items.find(i => i.id === selectedId) ?? null;

  // Si hay un selectedId pero el item no está en la lista local aún, lo buscamos
  // directamente en Supabase. Usamos un ref para no repetir el fetch.
  const fetchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) return;
    if (items.find(i => i.id === selectedId)) return; // ya está en lista
    if (fetchedRef.current === selectedId) return;     // ya lo pedimos
    fetchedRef.current = selectedId;
    const tabla = CONFIG[modo].tabla;
    const selectFields = modo === "runas"
      ? "id, nombre, explicacion, imagen_url"
      : "id, nombre, explicacion, grupo_ids, imagen_url";
    supabase.from(tabla).select(selectFields).eq("id", selectedId).single()
      .then(({ data }) => {
        if (data) {
          const item = data as unknown as EntidadMagica;
          setItems(prev => prev.some(i => i.id === item.id) ? prev.map(i => i.id === item.id ? item : i) : [item, ...prev]);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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
      {/* ── Editor principal ──────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {selected ? (
          <FormularioMagico
            key={selected.id}
            grupos={grupos}
            item={selected}
            loadingGrupos={loadingGrupos}
            modo={modo}
            onDeleted={id => {
              setItems(prev => prev.filter(i => i.id !== id));
              setSelectedId(null);
              onSelectedIdChange?.(null);
              onItemDeleted?.(id);
            }}
            onSaved={updated => {
              setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
              onItemSaved?.(updated);
            }}
          />
        ) : loading && selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary/20" size={20} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 select-none">
            <cfg.Icon size={40} strokeWidth={1} style={{ color: cfg.color, opacity: 0.2 }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">{cfg.label}</p>
            <p className="text-[10px] text-primary/20 tracking-widest">
              Seleccioná un {cfg.labelSing.toLowerCase()} o creá uno nuevo
            </p>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all mt-2" disabled={creating}
              onClick={handleCreate}>
              {creating ? <Loader2 className="animate-spin" size={10} /> : <Plus size={10} />}
              Nuevo {cfg.labelSing}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}