"use client";

/**
 * EditorHechizos.tsx
 * ─────────────────────────────────────────────────────────────────────
 * Editor completo para las tablas `hechizos` y `dones`.
 * "Quién puede usarlo" → FK criatura_id a tabla criaturas.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Plus, Trash2, Save, Loader2, Search, X, Bug, ChevronDown,
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

export type Don = {
  id: string;
  nombre: string;
  explicacion?: string;
  criatura_id?: string | null;
  criatura?: { id: string; nombre: string; imagen_url?: string } | null;
  variante_id?: string | null;
  variante?: { id: string; tipo: string } | null;
};

type EntidadMagica = Hechizo | Don;
type Modo = "hechizos" | "dones";
type CriaturaMin = { id: string; nombre: string; imagen_url?: string };

const CONFIG: Record<Modo, {
  tabla: string; label: string; labelSing: string;
  Icon: React.ElementType; color: string; emoji: string; placeholder: string;
}> = {
  hechizos: {
    tabla: "hechizos", label: "Hechizos", labelSing: "Hechizo",
    Icon: Sparkles, color: "oklch(0.65 0.18 290)", emoji: "",
    placeholder: "Qué hace este hechizo, cómo se lanza, sus efectos…",
  },
  dones: {
    tabla: "dones", label: "Dones", labelSing: "Don",
    Icon: Star, color: "oklch(0.7 0.16 55)", emoji: "",
    placeholder: "Qué otorga este don, su origen, sus limitaciones…",
  },
};

// ─── Hook: todas las criaturas ────────────────────────────────────────────────
function useCriaturas() {
  const [criaturas, setCriaturas] = useState<CriaturaMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("criaturas")
      .select("id, nombre, imagen_url")
      .order("nombre")
      .then(({ data }) => { setCriaturas(data ?? []); setLoading(false); });
  }, []);

  return { criaturas, loading };
}


// ─── Hook: variantes de una criatura ─────────────────────────────────────────
type VarianteMin = { id: string; tipo: string };

function useCriaturaVariantes(criaturaId: string | null) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!criaturaId) { setVariantes([]); return; }
    setLoading(true);
    supabase
      .from("criatura_variantes")
      .select("id, tipo")
      .eq("criatura_id", criaturaId)
      .order("tipo")
      .then(({ data }) => { setVariantes(data ?? []); setLoading(false); });
  }, [criaturaId]);

  return { variantes, loading };
}

// ─── Hook: hechizos/dones con join a criaturas ────────────────────────────────
function useEntidadesMagicas(modo: Modo) {
  const [items,   setItems]   = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(CONFIG[modo].tabla)
      .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url)")
      .order("nombre");
    setItems(data ?? []);
    setLoading(false);
  }, [modo]);

  useEffect(() => { load(); }, [load]);

  return { items, setItems, loading };
}

// ─── Selector de criatura ─────────────────────────────────────────────────────
function SelectorCriatura({
  criaturas, loadingCriaturas, value, onChange, color,
}: {
  criaturas: CriaturaMin[];
  loadingCriaturas: boolean;
  value: string | null;
  onChange: (id: string | null, criatura: CriaturaMin | null) => void;
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = criaturas.find(c => c.id === value) ?? null;
  const filtered = useMemo(
    () => criaturas.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase())),
    [criaturas, search]
  );

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const select = (c: CriaturaMin | null) => {
    onChange(c?.id ?? null, c);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
        <Bug size={9} /> Criatura que puede usarlo
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all"
          style={selected ? {
            borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
            background:  `color-mix(in srgb, ${color} 6%, transparent)`,
          } : {
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
            {selected?.imagen_url
              ? <img src={selected.imagen_url} alt={selected.nombre} className="w-full h-full object-cover" />
              : <Bug size={11} className="text-primary/25" />}
          </div>

          <span
            className="flex-1 text-[11px] font-bold truncate"
            style={{ color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            {selected ? selected.nombre : "Sin criatura asignada…"}
          </span>

          {selected && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); select(null); }}
              className="w-5 h-5 rounded flex items-center justify-center text-primary/25 hover:text-red-400 transition-colors"
            >
              <X size={9} />
            </button>
          )}

          <ChevronDown
            size={11}
            className="text-primary/30 transition-transform duration-200 shrink-0"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border overflow-hidden shadow-xl"
              style={{
                background:  "var(--bg-main)",
                borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
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
                  <div className="flex justify-center py-6">
                    <Loader2 size={14} className="animate-spin text-primary/20" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-[9px] text-primary/25 text-center py-4 italic">Sin resultados</p>
                ) : filtered.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => select(c)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors"
                  >
                    <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                      {c.imagen_url
                        ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                        : <Bug size={10} className="text-primary/20" />}
                    </div>
                    
                    <span className="flex-1 text-[11px] font-medium text-primary/80 truncate">{c.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <p className="text-[9px] text-primary/25 italic">
        Solo personajes de esta especie podrán tenerlo asignado
      </p>
    </div>
  );
}

// ─── Selector de variante ────────────────────────────────────────────────────
function SelectorVariante({
  variantes, loading, value, onChange, color,
}: {
  variantes: VarianteMin[];
  loading: boolean;
  value: string | null;
  onChange: (id: string | null, variante: VarianteMin | null) => void;
  color: string;
}) {
  const selected = variantes.find(v => v.id === value) ?? null;

  if (loading) return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
        <Bug size={9} /> Variante
      </label>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary/10">
        <Loader2 size={10} className="animate-spin text-primary/25" />
        <span className="text-[10px] text-primary/25">Cargando variantes…</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
        <Bug size={9} /> Variante (opcional)
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all"
          style={!value ? {
            background:  `color-mix(in srgb, ${color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
            color:        color,
          } : {
            borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            color:       "color-mix(in srgb, var(--primary) 30%, transparent)",
          }}
        >
          Todas
        </button>
        {variantes.map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id, v)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all"
            style={value === v.id ? {
              background:  `color-mix(in srgb, ${color} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
              color:        color,
            } : {
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color:       "color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
          >
            {v.tipo}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Formulario de edición ────────────────────────────────────────────────────
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
  const criaturaId = (form as Hechizo).criatura_id ?? null;
  const { variantes, loading: loadingVariantes } = useCriaturaVariantes(criaturaId);

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const criaturaActual = (form as Hechizo).criatura;

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from(cfg.tabla)
        .update({
          nombre:      form.nombre,
          explicacion: form.explicacion || null,
          criatura_id: (form as Hechizo).criatura_id ?? null,
          variante_id: (form as Hechizo).variante_id ?? null,
        })
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
            background:  criaturaActual?.imagen_url ? "transparent" : `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
          }}
        >
          {criaturaActual?.imagen_url
            ? <img src={criaturaActual.imagen_url} alt="" className="w-full h-full object-cover" />
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
          <button
            onClick={del}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
          >
            <Trash2 size={10} />
          </button>
          <button
            onClick={save}
            disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
        <SelectorCriatura
          criaturas={criaturas}
          loadingCriaturas={loadingCriaturas}
          value={(form as Hechizo).criatura_id ?? null}
          onChange={(id, criatura) =>
            setForm(f => ({ ...f, criatura_id: id, criatura: criatura ?? null, variante_id: null, variante: null }))
          }
          color={cfg.color}
        />

        {criaturaId && variantes.length > 0 && (
          <SelectorVariante
            variantes={variantes}
            loading={loadingVariantes}
            value={(form as Hechizo).variante_id ?? null}
            onChange={(id, variante) => setForm(f => ({ ...f, variante_id: id, variante: variante ?? null }))}
            color={cfg.color}
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

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const criatNombre = ((i as Hechizo).criatura?.nombre ?? "").toLowerCase();
    return i.nombre.toLowerCase().includes(q) || criatNombre.includes(q);
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from(cfg.tabla)
        .insert([{ nombre: `Nuevo ${cfg.labelSing}` }])
        .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url)")
        .single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setSelectedId(data.id);
    } finally { setCreating(false); }
  };

  const handleSaved = (updated: EntidadMagica) =>
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));

  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Lista lateral ───────────────────────────────────────────── */}
      <div
        className="w-56 shrink-0 flex flex-col border-r min-h-0"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
        >
          <cfg.Icon size={12} style={{ color: cfg.color }} />
          <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-primary/50">
            {cfg.label}
          </span>
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
            <div className="flex justify-center py-8">
              <Loader2 size={16} className="animate-spin text-primary/20" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-8 italic">
              {search ? "Sin resultados" : `Sin ${cfg.label.toLowerCase()} aún`}
            </p>
          ) : filtered.map(item => {
            const criatura = (item as Hechizo).criatura;
            return (
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
                {criatura && (
                  <span
                    className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md text-[8px] font-black"
                    style={{
                      background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
                      color: cfg.color,
                    }}
                  >
                    {criatura.imagen_url
                      ? <img src={criatura.imagen_url} alt="" className="w-3 h-3 rounded-sm object-cover" />
                      : <Bug size={7} />}
                    {criatura.nombre}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Editor principal ─────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {selected ? (
          <FormularioMagico
            key={selected.id}
            item={selected}
            modo={modo}
            criaturas={criaturas}
            loadingCriaturas={loadingCriaturas}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
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