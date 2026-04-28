"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles, Star, Globe, Plus, Trash2, Save, Loader2, Search, X, Bug,
  ChevronDown, Mountain, ScrollText, Map, ChevronRight, FileText,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { MUNDO_SECTIONS, type MundoSectionKey, type SaveStatus, type Reino } from "./types";
import { SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";
import { EditorReino } from "./EditorReino";

// ─── Types locales ────────────────────────────────────────────────────────────
type EntidadMagica = {
  id: string;
  nombre: string;
  explicacion?: string;
  criatura_id?: string | null;
  criatura?: { id: string; nombre: string; imagen_url?: string } | null;
  variante_id?: string | null;
  variante?: { id: string; tipo: string } | null;
};

type CriaturaMin = { id: string; nombre: string; imagen_url?: string };
type VarianteMin = { id: string; tipo: string };
type MundoTab = "magia" | "hechizos" | "dones" | "runas";
type GeoTab = "texto" | "reinos";

// ─── Hook: lista de reinos ─────────────────────────────────────────────────────
function useReinos() {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reinos").select("*").order("nombre");
    setReinos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { reinos, setReinos, loading };
}

// ─── Configuración por subtab mágico ─────────────────────────────────────────
const MAGIC_CONFIG = {
  hechizos: {
    tabla: "hechizos", label: "Hechizos", labelSing: "Hechizo",
    Icon: Sparkles, color: "oklch(0.65 0.18 290)", emoji: "✨",
    placeholder: "Qué hace este hechizo, cómo se lanza, sus efectos…",
  },
  dones: {
    tabla: "dones", label: "Dones", labelSing: "Don",
    Icon: Star, color: "oklch(0.7 0.16 55)", emoji: "⭐",
    placeholder: "Qué otorga este don, su origen, sus limitaciones…",
  },
  runas: {
    tabla: "runas", label: "Runas", labelSing: "Runa",
    Icon: ScrollText, color: "oklch(0.62 0.16 160)", emoji: "ᚱ",
    placeholder: "Qué significa esta runa, cómo se activa, su poder…",
  },
} as const;

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

function useEntidadesMagicas(tabla: string) {
  const [items, setItems] = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(tabla)
      .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url)")
      .order("nombre");
    setItems(data ?? []);
    setLoading(false);
  }, [tabla]);
  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading };
}

// ─── Sub-componentes del editor mágico ───────────────────────────────────────
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
            background: `color-mix(in srgb, ${color} 6%, transparent)`,
          } : {
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
            {selected?.imagen_url
              ? <img src={selected.imagen_url} alt={selected.nombre} className="w-full h-full object-cover" />
              : <Bug size={11} className="text-primary/25" />}
          </div>
          <span className="flex-1 text-[11px] font-bold truncate"
            style={{ color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            {selected ? selected.nombre : "Sin criatura asignada (universal)"}
          </span>
          {selected && (
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null, null); }}
              className="w-5 h-5 rounded flex items-center justify-center text-primary/25 hover:text-red-400 transition-colors">
              <X size={9} />
            </button>
          )}
          <ChevronDown size={11} className="text-primary/30 shrink-0 transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl border overflow-hidden shadow-xl"
              style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <div className="relative">
                  <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar criatura…"
                    className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25" />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto p-1">
                {loadingCriaturas ? (
                  <div className="flex justify-center py-6"><Loader2 size={14} className="animate-spin text-primary/20" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-[9px] text-primary/25 text-center py-4 italic">Sin resultados</p>
                ) : filtered.map(c => (
                  <button key={c.id} onMouseDown={() => { onChange(c.id, c); setOpen(false); setSearch(""); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors">
                    <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                      {c.imagen_url ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" /> : <Bug size={10} className="text-primary/20" />}
                    </div>
                    <span className="flex-1 text-[11px] font-medium text-primary/80 truncate">{c.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <p className="text-[9px] text-primary/25 italic">Solo personajes de esta especie podrán tenerlo asignado</p>
    </div>
  );
}

function SelectorVariante({ variantes, loading, value, onChange, color }: {
  variantes: VarianteMin[]; loading: boolean;
  value: string | null; onChange: (id: string | null, v: VarianteMin | null) => void;
  color: string;
}) {
  if (loading) return <Loader2 size={10} className="animate-spin text-primary/20" />;
  return (
    <div className="flex flex-wrap items-center gap-1 pt-1">
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/25 mr-1">Variante</span>
      {[{ id: null, tipo: "Todas" }, ...variantes].map(v => (
        <button key={v.id ?? "all"} type="button"
          onClick={() => onChange(v.id, v.id ? (v as VarianteMin) : null)}
          className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all"
          style={value === v.id ? {
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
            color,
          } : {
            borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "color-mix(in srgb, var(--primary) 25%, transparent)",
          }}>
          {v.tipo}
        </button>
      ))}
    </div>
  );
}

// ─── Formulario de edición de hechizo/don ────────────────────────────────────
function FormularioMagico({ item, modo, criaturas, loadingCriaturas, onSaved, onDeleted }: {
  item: EntidadMagica;
  modo: "hechizos" | "dones" | "runas";
  criaturas: CriaturaMin[];
  loadingCriaturas: boolean;
  onSaved: (i: EntidadMagica) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<EntidadMagica>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const cfg = MAGIC_CONFIG[modo];
  const criaturaId = form.criatura_id ?? null;
  const { variantes, loading: loadingVariantes } = useCriaturaVariantes(criaturaId);

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from(cfg.tabla).update({
        nombre: form.nombre,
        explicacion: form.explicacion || null,
        criatura_id: form.criatura_id ?? null,
        variante_id: form.variante_id ?? null,
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
    await supabase.from(cfg.tabla).delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border"
          style={{
            background: form.criatura?.imagen_url ? "transparent" : `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
          }}>
          {form.criatura?.imagen_url
            ? <img src={form.criatura.imagen_url} alt="" className="w-full h-full object-cover" />
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
        <SelectorCriatura
          criaturas={criaturas} loadingCriaturas={loadingCriaturas}
          value={form.criatura_id ?? null}
          onChange={(id, criatura) => setForm(f => ({ ...f, criatura_id: id, criatura: criatura ?? null, variante_id: null, variante: null }))}
          color={cfg.color}
        />

        {criaturaId && variantes.length > 0 && (
          <SelectorVariante
            variantes={variantes} loading={loadingVariantes}
            value={form.variante_id ?? null}
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

// ─── Panel de lista + editor para hechizos o dones ───────────────────────────
function PanelMagico({ modo }: { modo: "hechizos" | "dones" | "runas" }) {
  const cfg = MAGIC_CONFIG[modo];
  const { items, setItems, loading } = useEntidadesMagicas(cfg.tabla);
  const { criaturas, loading: loadingCriaturas } = useCriaturas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = items.find(i => i.id === selectedId) ?? null;
  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return i.nombre.toLowerCase().includes(q) || (i.criatura?.nombre ?? "").toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.from(cfg.tabla)
        .insert([{ nombre: `Nuevo ${cfg.labelSing}` }])
        .select("*, criatura:criaturas!criatura_id(id, nombre, imagen_url)")
        .single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setSelectedId(data.id);
    } finally { setCreating(false); }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Lista lateral */}
      <div className="w-52 shrink-0 flex flex-col border-r min-h-0"
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
              {item.criatura && (
                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black"
                  style={{ background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, color: cfg.color }}>
                  {item.criatura.imagen_url
                    ? <img src={item.criatura.imagen_url} alt="" className="w-3 h-3 rounded-sm object-cover" />
                    : <Bug size={7} />}
                  {item.criatura.nombre}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {selected ? (
          <FormularioMagico
            key={selected.id} item={selected} modo={modo}
            criaturas={criaturas} loadingCriaturas={loadingCriaturas}
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

// ─── Panel Geografía con tabs (texto + lista de reinos) ──────────────────────
function PanelGeografia({
  texto, onChange, onSave, status,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  status: SaveStatus;
}) {
  const [geoTab, setGeoTab] = useState<GeoTab>("texto");
  const [localStatus, setLocalStatus] = useState<SaveStatus>("idle");
  const { reinos, setReinos, loading } = useReinos();
  const [selectedReino, setSelectedReino] = useState<Reino | null>(null);
  const [search, setSearch] = useState("");

  const handleSave = async () => {
    setLocalStatus("saving");
    try {
      await onSave();
      setLocalStatus("saved");
      setTimeout(() => setLocalStatus("idle"), 2000);
    } catch { setLocalStatus("error"); }
  };

  const filtered = reinos.filter(r =>
    r.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const GEO_TABS: { key: GeoTab; label: string; Icon: React.ElementType }[] = [
    { key: "texto",   label: "Texto",   Icon: FileText },
    { key: "reinos",  label: "Reinos",  Icon: Map      },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Tab bar */}
      <div
        className="shrink-0 flex items-center gap-0 border-b px-4"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {GEO_TABS.map(tab => {
          const active = geoTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setGeoTab(tab.key)}
              className="relative flex items-center gap-1.5 px-3.5 py-3 text-[10px] font-black uppercase tracking-widest transition-all"
              style={{ color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <tab.Icon size={10} />
              {tab.label}
              {tab.key === "reinos" && !loading && reinos.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[8px] font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
                >
                  {reinos.length}
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
      </div>

      {/* Tab: Texto */}
      {geoTab === "texto" && (
        <div className="flex-1 flex flex-col min-h-0 p-5 gap-4 overflow-y-auto">
          <MarkdownEditor
            value={texto}
            onChange={onChange}
            placeholder="Continentes, mares, climas, fronteras del mundo…"
            rows={22}
            toolbar
            defaultMode="split"
          />
          <div className="flex items-center justify-end gap-3">
            <SaveIndicator status={localStatus} />
            <button
              onClick={handleSave}
              disabled={localStatus === "saving"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              <Mountain size={11} /> Guardar Geografía
            </button>
          </div>
        </div>
      )}

      {/* Tab: Reinos */}
      {geoTab === "reinos" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Overlay editor de reino */}
          {selectedReino && (
            <div
              className="absolute inset-0 z-10 flex flex-col"
              style={{ background: "var(--bg-main)" }}
            >
              {/* Back button */}
              <div
                className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-primary/10"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}
              >
                <button
                  onClick={() => setSelectedReino(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
                >
                  <ChevronRight size={12} className="rotate-180" /> Volver a Reinos
                </button>
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/60 truncate">
                  {selectedReino.nombre}
                </span>
              </div>
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <EditorReino
                  key={selectedReino.id}
                  item={selectedReino}
                  onSaved={updated => {
                    setReinos(prev => prev.map(r => r.id === updated.id ? updated : r));
                    setSelectedReino(updated);
                  }}
                  onDeleted={id => {
                    setReinos(prev => prev.filter(r => r.id !== id));
                    setSelectedReino(null);
                  }}
                />
              </div>
            </div>
          )}

          {/* Lista de reinos */}
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
                  placeholder="Buscar reino…"
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
                  {search ? "Sin resultados" : "Sin reinos aún"}
                </p>
              ) : filtered.map(reino => (
                <button
                  key={reino.id}
                  onClick={() => setSelectedReino(reino)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/6 border border-transparent hover:border-primary/10 transition-all rounded-xl group"
                >
                  {/* Miniatura del mapa o ícono */}
                  <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {reino.mapa_url
                      ? <img src={reino.mapa_url} alt={reino.nombre} className="w-full h-full object-cover" />
                      : <Map size={13} className="text-primary/20" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-primary/80 truncate">{reino.nombre}</p>
                    {reino.oculto && (
                      <p className="text-[9px] text-primary/30 italic">Oculto en mapa</p>
                    )}
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

// ─── Panel de texto Magia (markdown) ─────────────────────────────────────────
function PanelMagia({
  texto, onChange, onSave, status,
}: {
  texto: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void>;
  status: SaveStatus;
}) {
  const [localStatus, setLocalStatus] = useState<SaveStatus>("idle");
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

// ─── TABS internas del módulo Magia ──────────────────────────────────────────
const MUNDO_TABS: { key: MundoTab; label: string; Icon: React.ElementType; color?: string }[] = [
  { key: "magia",    label: "Magia",    Icon: Sparkles,    color: "oklch(0.65 0.18 290)" },
  { key: "hechizos", label: "Hechizos", Icon: Sparkles,    color: "oklch(0.65 0.18 290)" },
  { key: "dones",    label: "Dones",    Icon: Star,        color: "oklch(0.7 0.16 55)"   },
  { key: "runas",    label: "Runas",    Icon: ScrollText,  color: "oklch(0.62 0.16 160)" },
];

// ─── EditorMundo (rediseñado) ─────────────────────────────────────────────────
export function EditorMundo({
  activeSection,
  textos,
  onTextoChange,
  onSave,
}: {
  activeSection: MundoSectionKey;
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
}) {
  // Para Geografía e Historia, seguimos usando el panel de texto igual que antes.
  // Para Magia, mostramos tabs internas: Magia (texto) | Hechizos | Dones
  const [mundoTab, setMundoTab] = useState<MundoTab>("magia");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Si el activeSection cambia a no-magia, salimos a la vista simple
  const isMagiaSection = activeSection === "magia";

  // ── Vista simple (historia) ───────────────────────────────────────────────
  if (activeSection === "historia") {
    const current = MUNDO_SECTIONS.find(s => s.key === activeSection)!;
    const SectionIcon = current.Icon;

    const handleSave = async () => {
      setSaveStatus("saving");
      try {
        await onSave(activeSection);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("error"); }
    };

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/8 border border-primary/15">
            <SectionIcon size={18} className="text-primary/60" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">{current.label}</h2>
            <p className="text-[10px] text-primary/35">Worldbuilding · {current.label}</p>
          </div>
        </div>

        <MarkdownEditor
          value={textos[activeSection]}
          onChange={v => onTextoChange(activeSection, v)}
          placeholder="Grandes eras, eventos fundacionales, cronología del mundo…"
          rows={24}
          toolbar
          defaultMode="split"
        />

        <div className="flex items-center justify-end gap-3 flex-wrap">
          <SaveIndicator status={saveStatus} />
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <SectionIcon size={11} /> Guardar {current.label}
          </button>
        </div>
      </div>
    );
  }

  // ── Vista Geografía con tabs (texto + lista de reinos) ────────────────────
  if (activeSection === "geografia") {
    return (
      <PanelGeografia
        texto={textos.geografia}
        onChange={v => onTextoChange("geografia", v)}
        onSave={() => onSave("geografia")}
        status={saveStatus}
      />
    );
  }

  // ── Vista Magia con tabs internas ─────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Cabecera con tabs */}
      <div
        className="shrink-0 flex items-center gap-0 border-b px-4"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {/* Ícono sección */}
        <div className="flex items-center gap-2.5 py-3 pr-4 mr-2 border-r"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "color-mix(in srgb, oklch(0.65 0.18 290) 12%, transparent)", border: "1px solid color-mix(in srgb, oklch(0.65 0.18 290) 25%, transparent)" }}>
            <Sparkles size={14} style={{ color: "oklch(0.65 0.18 290)" }} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary leading-tight">Magia</p>
            <p className="text-[9px] text-primary/30 leading-tight">Worldbuilding</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0 flex-1">
          {MUNDO_TABS.map(tab => {
            const active = mundoTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setMundoTab(tab.key)}
                className="relative flex items-center gap-1.5 px-3.5 py-3 text-[10px] font-black uppercase tracking-widest transition-all"
                style={{ color: active ? (tab.color ?? "var(--primary)") : "color-mix(in srgb, var(--primary) 30%, transparent)" }}
              >
                <tab.Icon size={10} />
                {tab.label}
                {/* Indicador activo */}
                {active && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                    style={{ background: tab.color ?? "var(--primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {mundoTab === "magia" && (
          <PanelMagia
            texto={textos.magia}
            onChange={v => onTextoChange("magia", v)}
            onSave={() => onSave("magia")}
            status={saveStatus}
          />
        )}
        {mundoTab === "hechizos" && <PanelMagico modo="hechizos" />}
        {mundoTab === "dones"    && <PanelMagico modo="dones" />}
        {mundoTab === "runas"    && <PanelMagico modo="runas" />}
      </div>
    </div>
  );
}