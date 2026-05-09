"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Plus, Trash2, Save, Loader2, Search, X, Bug, ChevronDown, Check,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "../../../../forms/MarkdownEditor";

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
  // legacy — se mantiene por compatibilidad con BloqueHechizos/BloqueDones
  criatura_id?: string | null;
  criatura?: { id: string; nombre: string; imagen_url?: string } | null;
  variante_id?: string | null;
  variante?: { id: string; tipo: string } | null;
};

export type Don = Hechizo;

type EntidadMagica = Hechizo;
type Modo = "hechizos" | "dones";
type CriaturaMin = { id: string; nombre: string; imagen_url?: string };
type VarianteMin = { id: string; tipo: string };

// Una fila de la tabla join (hechizo_criaturas / don_criaturas)
type AsignacionCriatura = {
  id: string;           // PK de la fila join
  criatura_id: string;
  criatura: CriaturaMin;
  variante_id: string | null;
  variante: VarianteMin | null;
};

// Nombre de la tabla join según modo
const JOIN_TABLA: Record<Modo, string> = {
  hechizos: "hechizo_criaturas",
  dones:    "don_criaturas",
};
// Nombre de la FK en la tabla join
const JOIN_FK: Record<Modo, string> = {
  hechizos: "hechizo_id",
  dones:    "don_id",
};

const CONFIG: Record<Modo, {
  tabla: string; label: string; labelSing: string;
  Icon: React.ElementType; color: string; placeholder: string;
}> = {
  hechizos: {
    tabla: "hechizos", label: "Hechizos", labelSing: "Hechizo",
    Icon: Sparkles, color: "oklch(0.65 0.18 290)",
    placeholder: "Qué hace este hechizo, cómo se lanza, sus efectos…",
  },
  dones: {
    tabla: "dones", label: "Dones", labelSing: "Don",
    Icon: Star, color: "oklch(0.7 0.16 55)",
    placeholder: "Qué otorga este don, su origen, sus limitaciones…",
  },
};

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
      const { data } = await supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre");
      if (cancelled) return;
      const result = (data ?? []) as CriaturaMin[];
      setCriaturas(result); setLoading(false);
      await dexieWriteAll("criaturas", result);
    };
    run(); return () => { cancelled = true; };
  }, []);
  return { criaturas, loading };
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

function useEntidadesMagicas(modo: Modo) {
  const [items, setItems] = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const tabla = CONFIG[modo].tabla;
    const local = await dexieReadAll<EntidadMagica>(tabla);
    if (local.length) { setItems(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }
    setLoading(!local.length);
    const { data } = await supabase.from(tabla).select("id, nombre, explicacion").order("nombre");
    const result = (data ?? []) as EntidadMagica[];
    setItems(result); setLoading(false);
    await dexieWriteAll(tabla, result);
  }, [modo]);
  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading };
}

// Carga las asignaciones de criaturas para un hechizo/don concreto
function useAsignaciones(entidadId: string, modo: Modo) {
  const [asignaciones, setAsignaciones] = useState<AsignacionCriatura[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(JOIN_TABLA[modo])
      .select(`
        id,
        criatura_id,
        criatura:criaturas!criatura_id(id, nombre, imagen_url),
        variante_id,
        variante:criatura_variantes!variante_id(id, tipo)
      `)
      .eq(JOIN_FK[modo], entidadId);

    // Supabase puede devolver los joins como array — normalizamos
    const rows: AsignacionCriatura[] = (data ?? []).map((row: any) => ({
      id:          row.id,
      criatura_id: row.criatura_id,
      criatura:    Array.isArray(row.criatura) ? row.criatura[0] : row.criatura,
      variante_id: row.variante_id,
      variante:    Array.isArray(row.variante) ? row.variante[0] : row.variante,
    }));
    setAsignaciones(rows);
    setLoading(false);
  }, [entidadId, modo]);

  useEffect(() => { load(); }, [load]);

  const agregar = async (criatura: CriaturaMin): Promise<AsignacionCriatura | null> => {
    const { data, error } = await supabase
      .from(JOIN_TABLA[modo])
      .insert([{ [JOIN_FK[modo]]: entidadId, criatura_id: criatura.id }])
      .select("id, criatura_id, variante_id")
      .single();
    if (error || !data) return null;
    const nueva: AsignacionCriatura = {
      id: data.id, criatura_id: criatura.id, criatura,
      variante_id: null, variante: null,
    };
    setAsignaciones(prev => [...prev, nueva]);
    return nueva;
  };

  const quitar = async (asignacionId: string) => {
    await supabase.from(JOIN_TABLA[modo]).delete().eq("id", asignacionId);
    setAsignaciones(prev => prev.filter(a => a.id !== asignacionId));
  };

  const actualizarVariante = async (asignacionId: string, variante: VarianteMin | null) => {
    await supabase.from(JOIN_TABLA[modo])
      .update({ variante_id: variante?.id ?? null })
      .eq("id", asignacionId);
    setAsignaciones(prev => prev.map(a =>
      a.id === asignacionId ? { ...a, variante_id: variante?.id ?? null, variante } : a
    ));
  };

  return { asignaciones, loading, agregar, quitar, actualizarVariante };
}

// ─── FilaCriatura: una criatura asignada con selector de variante ─────────────
function FilaCriatura({ asig, modo, onQuitar, onVarianteChange, color }: {
  asig: AsignacionCriatura;
  modo: Modo;
  onQuitar: () => void;
  onVarianteChange: (v: VarianteMin | null) => void;
  color: string;
}) {
  const { variantes, loading } = useCriaturaVariantes(asig.criatura_id);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
        background:  `color-mix(in srgb, ${color} 4%, transparent)`,
      }}
    >
      {/* Fila principal */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
          {asig.criatura.imagen_url
            ? <img src={asig.criatura.imagen_url} alt={asig.criatura.nombre} className="w-full h-full object-cover" />
            : <Bug size={11} className="text-primary/25" />}
        </div>
        <span className="flex-1 text-[11px] font-bold text-primary/85 truncate">{asig.criatura.nombre}</span>
        <button
          onClick={onQuitar}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-primary/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
          title="Quitar criatura"
        >
          <X size={10} />
        </button>
      </div>

      {/* Selector de variante */}
      {(loading || variantes.length > 0) && (
        <div
          className="flex flex-wrap items-center gap-1 px-3 pb-2 pt-0 border-t"
          style={{ borderColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5 mt-1.5">Variante</span>
          {loading ? (
            <Loader2 size={9} className="animate-spin text-primary/20 mt-1.5" />
          ) : (
            <>
              <button
                type="button"
                onClick={() => onVarianteChange(null)}
                className="mt-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all"
                style={!asig.variante_id ? {
                  background:  `color-mix(in srgb, ${color} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
                  color,
                } : {
                  borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
              >
                Todas
              </button>
              {variantes.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVarianteChange(v)}
                  className="mt-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all"
                  style={asig.variante_id === v.id ? {
                    background:  `color-mix(in srgb, ${color} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
                    color,
                  } : {
                    borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "color-mix(in srgb, var(--primary) 25%, transparent)",
                  }}
                >
                  {v.tipo}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SelectorAgregarCriatura: dropdown para añadir criaturas ─────────────────
function SelectorAgregarCriatura({ criaturas, loadingCriaturas, asignadas, onAgregar, color }: {
  criaturas: CriaturaMin[];
  loadingCriaturas: boolean;
  asignadas: string[];   // IDs ya asignados
  onAgregar: (c: CriaturaMin) => void;
  color: string;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const disponibles = useMemo(
    () => criaturas.filter(c =>
      !asignadas.includes(c.id) &&
      c.nombre.toLowerCase().includes(search.toLowerCase())
    ),
    [criaturas, asignadas, search]
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
        <Plus size={9} /> Agregar criatura
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
                  placeholder="Buscar criatura…"
                  className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {loadingCriaturas ? (
                <div className="flex justify-center py-6"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
              ) : disponibles.length === 0 ? (
                <p className="text-[9px] text-primary/25 text-center py-4 italic">
                  {criaturas.length === asignadas.length ? "Todas las criaturas ya están asignadas" : "Sin resultados"}
                </p>
              ) : disponibles.map(c => (
                <button
                  key={c.id}
                  onMouseDown={() => { onAgregar(c); setSearch(""); /* NO cerramos — permite agregar varias */ }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                >
                  <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {c.imagen_url
                      ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                      : <Bug size={10} className="text-primary/20" />}
                  </div>
                  <span className="flex-1 text-[11px] font-medium text-primary/80 truncate">{c.nombre}</span>
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

// ─── Panel de criaturas asignadas ─────────────────────────────────────────────
function PanelCriaturasAsignadas({ entidadId, modo, criaturas, loadingCriaturas, color }: {
  entidadId: string;
  modo: Modo;
  criaturas: CriaturaMin[];
  loadingCriaturas: boolean;
  color: string;
}) {
  const { asignaciones, loading, agregar, quitar, actualizarVariante } = useAsignaciones(entidadId, modo);
  const asignadasIds = asignaciones.map(a => a.criatura_id);

  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
        <Bug size={9} /> Criaturas que pueden usarlo
      </label>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={11} className="animate-spin text-primary/20" />
          <span className="text-[10px] text-primary/25 italic">Cargando…</span>
        </div>
      ) : (
        <div className="space-y-2">
          {asignaciones.length === 0 && (
            <p className="text-[9px] text-primary/20 italic px-1">
              Sin criaturas asignadas — estará disponible para todos (universal)
            </p>
          )}

          {asignaciones.map(asig => (
            <FilaCriatura
              key={asig.id}
              asig={asig}
              modo={modo}
              color={color}
              onQuitar={() => quitar(asig.id)}
              onVarianteChange={v => actualizarVariante(asig.id, v)}
            />
          ))}

          <SelectorAgregarCriatura
            criaturas={criaturas}
            loadingCriaturas={loadingCriaturas}
            asignadas={asignadasIds}
            onAgregar={c => agregar(c)}
            color={color}
          />
        </div>
      )}
    </div>
  );
}

// ─── Formulario de edición ────────────────────────────────────────────────────
function FormularioMagico({ item, modo, criaturas, loadingCriaturas, onSaved, onDeleted }: {
  item: EntidadMagica;
  modo: Modo;
  criaturas: CriaturaMin[];
  loadingCriaturas: boolean;
  onSaved:   (i: EntidadMagica) => void;
  onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<EntidadMagica>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const cfg = CONFIG[modo];

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from(cfg.tabla)
        .update({ nombre: form.nombre, explicacion: form.explicacion || null })
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

      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}
      >
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border"
          style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)` }}>
          <cfg.Icon size={16} style={{ color: cfg.color }} />
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder={`Nombre del ${cfg.labelSing.toLowerCase()}…`}
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
        {/* Criaturas asignadas — multi */}
        <PanelCriaturasAsignadas
          entidadId={form.id}
          modo={modo}
          criaturas={criaturas}
          loadingCriaturas={loadingCriaturas}
          color={cfg.color}
        />

        {/* Explicación */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Explicación</label>
          <MarkdownEditor
            value={form.explicacion ?? ""}
            onChange={v => setForm(f => ({ ...f, explicacion: v }))}
            rows={14}
            placeholder={cfg.placeholder}
            toolbar
            defaultMode="edit"
          />
        </div>
      </div>
    </div>
  );
}

// ─── EditorHechizos (componente principal) ────────────────────────────────────
export function EditorHechizos({ modo }: { modo: Modo }) {
  const cfg = CONFIG[modo];
  const { items, setItems, loading } = useEntidadesMagicas(modo);
  const { criaturas, loading: loadingCriaturas } = useCriaturas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [creating,   setCreating]   = useState(false);

  const selected = items.find(i => i.id === selectedId) ?? null;

  const filtered = items.filter(i =>
    i.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from(cfg.tabla)
        .insert([{ nombre: `Nuevo ${cfg.labelSing}` }])
        .select("id, nombre, explicacion")
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
              onClick={() => setSelectedId(item.id)}
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
            criaturas={criaturas}
            loadingCriaturas={loadingCriaturas}
            onSaved={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
            onDeleted={id => { setItems(prev => prev.filter(i => i.id !== id)); setSelectedId(null); }}
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