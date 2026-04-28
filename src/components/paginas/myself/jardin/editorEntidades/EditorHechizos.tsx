"use client";

/**
 * EditorHechizos.tsx
 * ─────────────────────────────────────────────────────────────────────
 * Editor para `hechizos` y `dones`.
 * "Quién puede usarlo" → múltiples criaturas vía tablas join:
 *   hechizo_criaturas (hechizo_id, criatura_id, variante_id)
 *   don_criaturas     (don_id,     criatura_id, variante_id)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Plus, Trash2, Save, Loader2, Search, X, Bug,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Hechizo = {
  id: string;
  nombre: string;
  explicacion?: string;
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

type AsignacionCriatura = {
  id: string;
  criatura_id: string;
  criatura: CriaturaMin;
  variante_id: string | null;
  variante: VarianteMin | null;
};

const CONFIG: Record<Modo, {
  tabla: string; tablaJoin: string; fkCol: string;
  label: string; labelSing: string;
  Icon: React.ElementType; color: string; placeholder: string;
}> = {
  hechizos: {
    tabla: "hechizos", tablaJoin: "hechizo_criaturas", fkCol: "hechizo_id",
    label: "Hechizos", labelSing: "Hechizo",
    Icon: Sparkles, color: "oklch(0.65 0.18 290)",
    placeholder: "Qué hace este hechizo, cómo se lanza, sus efectos…",
  },
  dones: {
    tabla: "dones", tablaJoin: "don_criaturas", fkCol: "don_id",
    label: "Dones", labelSing: "Don",
    Icon: Star, color: "oklch(0.7 0.16 55)",
    placeholder: "Qué otorga este don, su origen, sus limitaciones…",
  },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCriaturas() {
  const [criaturas, setCriaturas] = useState<CriaturaMin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre")
      .then(({ data }) => { setCriaturas(data ?? []); setLoading(false); });
  }, []);
  return { criaturas, loading };
}

function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!criaturaId) { setVariantes([]); return; }
    setLoading(true);
    supabase.from("criatura_variantes").select("id, tipo").eq("criatura_id", criaturaId).order("tipo")
      .then(({ data }) => { setVariantes(data ?? []); setLoading(false); });
  }, [criaturaId]);
  return { variantes, loading };
}

function useEntidadesMagicas(modo: Modo) {
  const [items, setItems] = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);
  const cfg = CONFIG[modo];

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from(cfg.tabla).select("id, nombre, explicacion").order("nombre");
    setItems(data ?? []);
    setLoading(false);
  }, [cfg.tabla]);

  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading };
}

function useAsignaciones(modo: Modo, entidadId: string | null) {
  const [asignaciones, setAsignaciones] = useState<AsignacionCriatura[]>([]);
  const [loading, setLoading] = useState(false);
  const cfg = CONFIG[modo];

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await supabase
      .from(cfg.tablaJoin)
      .select("id, criatura_id, variante_id, criatura:criaturas!criatura_id(id, nombre, imagen_url), variante:criatura_variantes!variante_id(id, tipo)")
      .eq(cfg.fkCol, id);
    setAsignaciones((data ?? []).map((r: any) => ({
      id: r.id,
      criatura_id: r.criatura_id,
      criatura: r.criatura,
      variante_id: r.variante_id,
      variante: r.variante ?? null,
    })));
    setLoading(false);
  }, [cfg.tablaJoin, cfg.fkCol]);

  useEffect(() => {
    if (entidadId) load(entidadId);
    else setAsignaciones([]);
  }, [entidadId, load]);

  return { asignaciones, setAsignaciones, loading };
}

// ─── PillsVariante ─────────────────────────────────────────────────────────────

function PillsVariante({ criaturaId, value, onChange, color }: {
  criaturaId: string;
  value: string | null;
  onChange: (id: string | null, v: VarianteMin | null) => void;
  color: string;
}) {
  const { variantes, loading } = useCriaturaVariantes(criaturaId);
  if (loading) return <Loader2 size={9} className="animate-spin text-primary/20" />;
  if (variantes.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-8">
      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5">Variante</span>
      {[{ id: null as string | null, tipo: "Todas" }, ...variantes].map(v => (
        <button
          key={v.id ?? "all"}
          type="button"
          onClick={() => onChange(v.id, v.id ? (v as VarianteMin) : null)}
          className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all"
          style={value === v.id ? {
            background:  `color-mix(in srgb, ${color} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
            color,
          } : {
            borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color:       "color-mix(in srgb, var(--primary) 25%, transparent)",
          }}
        >
          {v.tipo}
        </button>
      ))}
    </div>
  );
}

// ─── FilaCriatura ─────────────────────────────────────────────────────────────

function FilaCriatura({ asig, color, onChangeVariante, onRemove }: {
  asig: AsignacionCriatura;
  color: string;
  onChangeVariante: (varianteId: string | null, variante: VarianteMin | null) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5 group"
      style={{
        borderColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        background:  `color-mix(in srgb, ${color} 4%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2">
        <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
          {asig.criatura.imagen_url
            ? <img src={asig.criatura.imagen_url} alt={asig.criatura.nombre} className="w-full h-full object-cover" />
            : <Bug size={10} className="text-primary/25" />}
        </div>

        <span className="flex-1 text-[11px] font-bold truncate" style={{ color: `color-mix(in srgb, ${color} 80%, var(--primary))` }}>
          {asig.criatura.nombre}
        </span>

        {asig.variante && (
          <span
            className="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-md"
            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
          >
            {asig.variante.tipo}
          </span>
        )}

        <button
          onClick={onRemove}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-primary/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
        >
          <X size={9} />
        </button>
      </div>

      <PillsVariante
        criaturaId={asig.criatura_id}
        value={asig.variante_id}
        onChange={onChangeVariante}
        color={color}
      />
    </div>
  );
}

// ─── SelectorCriaturas (multi) ────────────────────────────────────────────────

function SelectorCriaturas({
  entidadId, modo, criaturas, loadingCriaturas, asignaciones, setAsignaciones,
}: {
  entidadId: string;
  modo: Modo;
  criaturas: CriaturaMin[];
  loadingCriaturas: boolean;
  asignaciones: AsignacionCriatura[];
  setAsignaciones: React.Dispatch<React.SetStateAction<AsignacionCriatura[]>>;
}) {
  const cfg = CONFIG[modo];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const asignadasIds = useMemo(() => new Set(asignaciones.map(a => a.criatura_id)), [asignaciones]);
  const disponibles = useMemo(
    () => criaturas.filter(c => !asignadasIds.has(c.id) && c.nombre.toLowerCase().includes(search.toLowerCase())),
    [criaturas, asignadasIds, search]
  );

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const agregar = async (criatura: CriaturaMin) => {
    const { data, error } = await supabase
      .from(cfg.tablaJoin)
      .insert({ [cfg.fkCol]: entidadId, criatura_id: criatura.id, variante_id: null })
      .select("id, criatura_id, variante_id, criatura:criaturas!criatura_id(id, nombre, imagen_url), variante:criatura_variantes!variante_id(id, tipo)")
      .single();
    if (error || !data) return;
    const row = data as any;
    const nueva: AsignacionCriatura = {
      id: row.id,
      criatura_id: row.criatura_id,
      criatura: Array.isArray(row.criatura) ? row.criatura[0] : row.criatura,
      variante_id: null,
      variante: null,
    };
    setAsignaciones(prev => [...prev, nueva]);
    setSearch("");
    // No cerramos el dropdown — permite seguir agregando criaturas
  };

  const quitar = async (asig: AsignacionCriatura) => {
    await supabase.from(cfg.tablaJoin).delete().eq("id", asig.id);
    setAsignaciones(prev => prev.filter(a => a.id !== asig.id));
  };

  const cambiarVariante = async (asig: AsignacionCriatura, varianteId: string | null, variante: VarianteMin | null) => {
    await supabase.from(cfg.tablaJoin).update({ variante_id: varianteId }).eq("id", asig.id);
    setAsignaciones(prev => prev.map(a => a.id === asig.id ? { ...a, variante_id: varianteId, variante } : a));
  };

  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
        <Bug size={9} /> Criaturas que pueden usarlo
      </label>

      {asignaciones.length > 0 && (
        <div className="space-y-1.5">
          {asignaciones.map(asig => (
            <FilaCriatura
              key={asig.id}
              asig={asig}
              color={cfg.color}
              onChangeVariante={(vId, v) => cambiarVariante(asig, vId, v)}
              onRemove={() => quitar(asig)}
            />
          ))}
        </div>
      )}

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed text-left transition-all"
          style={open ? {
            borderColor: `color-mix(in srgb, ${cfg.color} 40%, transparent)`,
            background:  `color-mix(in srgb, ${cfg.color} 6%, transparent)`,
            color: cfg.color,
          } : {
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            color:       "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          <Plus size={10} />
          <span className="text-[10px] font-black uppercase tracking-widest">Agregar criatura</span>
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
                    {criaturas.length === asignadasIds.size ? "Todas las criaturas ya están asignadas" : "Sin resultados"}
                  </p>
                ) : disponibles.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => agregar(c)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                  >
                    <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                      {c.imagen_url
                        ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                        : <Bug size={10} className="text-primary/20" />}
                    </div>
                    <span className="flex-1 text-[11px] font-medium text-primary/80 truncate">{c.nombre}</span>
                    <Plus size={9} className="shrink-0 text-primary/20" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {asignaciones.length === 0 && (
        <p className="text-[9px] text-primary/25 italic">
          Sin criaturas asignadas → universal (cualquier personaje puede usarlo)
        </p>
      )}
    </div>
  );
}

// ─── FormularioMagico ─────────────────────────────────────────────────────────

function FormularioMagico({
  item, modo, criaturas, loadingCriaturas, onSaved, onDeleted,
}: {
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

  const { asignaciones, setAsignaciones, loading: loadingAsig } = useAsignaciones(modo, item.id);

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from(cfg.tabla)
        .update({ nombre: form.nombre, explicacion: form.explicacion || null })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from(cfg.tabla).delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />

      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div
          className="shrink-0 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border"
          style={{
            background:  asignaciones[0]?.criatura.imagen_url ? "transparent" : `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
          }}
        >
          {asignaciones[0]?.criatura.imagen_url
            ? <img src={asignaciones[0].criatura.imagen_url} alt="" className="w-full h-full object-cover" />
            : <cfg.Icon size={16} style={{ color: cfg.color }} />}
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

      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
        {loadingAsig ? (
          <div className="flex items-center gap-2">
            <Loader2 size={11} className="animate-spin text-primary/20" />
            <span className="text-[10px] text-primary/25">Cargando criaturas…</span>
          </div>
        ) : (
          <SelectorCriaturas
            entidadId={item.id}
            modo={modo}
            criaturas={criaturas}
            loadingCriaturas={loadingCriaturas}
            asignaciones={asignaciones}
            setAsignaciones={setAsignaciones}
          />
        )}

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
  const filtered = items.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()));

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

      <div
        className="w-56 shrink-0 flex flex-col border-r min-h-0"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
        >
          <cfg.Icon size={12} style={{ color: cfg.color }} />
          <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-primary/50">{cfg.label}</span>
          <button
            onClick={handleCreate} disabled={creating}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all border border-primary/10 text-primary/30 hover:text-primary hover:border-primary/30 hover:bg-primary/8"
          >
            {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
          </button>
        </div>

        <div className="shrink-0 px-2 pt-2">
          <div className="relative">
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full bg-primary/4 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
            />
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

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
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
            <button
              onClick={handleCreate} disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all mt-2"
            >
              {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              Nuevo {cfg.labelSing}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}