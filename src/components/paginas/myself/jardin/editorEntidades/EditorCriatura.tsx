"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Bug, Search, Plus, Check, X, Trash2, Save, ChevronDown, Lock,
  Dna, Brain, GitBranch, Users, Sparkles, Star, Loader2,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Criatura, type CriaturaVariante, type SaveStatus, INPUT_CLS } from "./types";
import { useUniqueValues, useCriaturaVariantes, usePersonajesDeEspecie } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";
import { PanelPersonajes } from "./PanelPersonajes";

// ─── Tabs internas ─────────────────────────────────────────────────────────────
type InnerTab = "base" | "biologia" | "variantes" | "especie";

const TABS: { key: InnerTab; label: string; Icon: React.ElementType }[] = [
  { key: "base",      label: "Base",      Icon: Brain     },
  { key: "biologia",  label: "Biología",  Icon: Dna       },
  { key: "variantes", label: "Variantes", Icon: GitBranch },
  { key: "especie",   label: "Especie",   Icon: Users     },
];

// ─── Campo colapsable ─────────────────────────────────────────────────────────
function CampoLore({
  label, value, onChange, placeholder, rows = 5, icon: Icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; icon?: React.ElementType;
}) {
  const [open, setOpen] = useState(!!value);
  const preview = value.replace(/[#*`_~\[\]]/g, "").trim().slice(0, 80);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/3"
      >
        {Icon && <Icon size={12} className="shrink-0 text-primary/35" />}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/40">{label}</p>
          {!open && preview && <p className="text-[11px] text-primary/35 truncate mt-0.5 font-medium italic">{preview}…</p>}
          {!open && !preview && <p className="text-[10px] text-primary/20 mt-0.5 italic">{placeholder?.slice(0, 55)}…</p>}
        </div>
        <ChevronDown size={13} className="shrink-0 text-primary/25 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <MarkdownEditor value={value} onChange={onChange} placeholder={placeholder} rows={rows} toolbar defaultMode="edit" />
        </div>
      )}
    </div>
  );
}

// ─── VarianteEditor ────────────────────────────────────────────────────────────
function VarianteEditor({
  variante, onSaved, onDeleted,
}: {
  variante: CriaturaVariante; onSaved: (v: CriaturaVariante) => void; onDeleted: (id: string) => void;
}) {
  const [form,     setForm]     = useState(variante);
  const [expanded, setExpanded] = useState(false);
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const handleSave = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("criatura_variantes").update({
        tipo: form.tipo, descripcion: form.descripcion || null,
        imagen_url: form.imagen_url || null, notas: form.notas || null,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ message: `¿Eliminar la variante "${form.tipo}"?`, danger: true });
    if (!ok) return;
    await supabase.from("criatura_variantes").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <ConfirmModal />
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        {form.imagen_url && (
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-primary/10 shrink-0">
            <img src={form.imagen_url} alt={form.tipo} className="w-full h-full object-cover" />
          </div>
        )}
        <Bug size={11} className="text-primary/30 shrink-0" />
        <span className="flex-1 text-[11px] font-black uppercase tracking-widest text-primary truncate">{form.tipo}</span>
        <div className="flex items-center gap-2 shrink-0">
          <SaveIndicator status={status} />
          <X size={12} className="text-primary/30 transition-transform duration-200"
            style={{ transform: expanded ? "rotate(45deg)" : undefined }} />
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t space-y-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Tipo / Nombre</label>
              <input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className={INPUT_CLS + " mt-1"} placeholder="Joven, Adulto, Albino, Nocturno…" />
            </div>
            <SelectorImagen label="Imagen" value={form.imagen_url ?? ""} onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
              aspect="landscape" placeholder={<Bug size={16} className="opacity-20" />} />
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">Descripción</label>
              <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                rows={4} placeholder="Diferencias físicas, comportamiento particular…" toolbar defaultMode="edit" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-1.5 mb-1"
                style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                <Lock size={9} /> Notas de creador
              </label>
              <MarkdownEditor value={form.notas ?? ""} onChange={v => setForm(f => ({ ...f, notas: v }))}
                rows={3} placeholder="Ideas, pendientes, inspiración…" toolbar defaultMode="edit" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button onClick={handleDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
              <Trash2 size={10} /> Eliminar
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
              <Check size={10} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hechizos/Dones de criatura (via tablas join) ────────────────────────────
// Las tablas join son:
//   hechizo_criaturas: id, hechizo_id, criatura_id, variante_id
//   don_criaturas:     id, don_id,     criatura_id, variante_id
// La FK de la entidad mágica en cada join:
const JOIN_TABLA: Record<string, string> = { hechizos: "hechizo_criaturas", dones: "don_criaturas" };
const JOIN_FK:    Record<string, string> = { hechizos: "hechizo_id",        dones: "don_id"        };

type EntidadMin = { id: string; nombre: string };

// Fila de la tabla join enriquecida con el nombre del hechizo/don
type FilaJoin = { joinId: string; entidadId: string; nombre: string };

// Hook: carga las filas join para esta criatura + todos los hechizos/dones del catálogo
function useMagicoDeCriatura(criaturaId: string, tablaEntidad: string) {
  const [asignados, setAsignados] = useState<FilaJoin[]>([]);
  const [catalogo,  setCatalogo]  = useState<EntidadMin[]>([]);
  const [loading,   setLoading]   = useState(true);
  const tablaJoin = JOIN_TABLA[tablaEntidad];
  const fk        = JOIN_FK[tablaEntidad];

  const load = useCallback(async () => {
    setLoading(true);
    const [joinRes, catRes] = await Promise.all([
      supabase.from(tablaJoin)
        .select(`id, ${fk}, entidad:${tablaEntidad}!${fk}(id, nombre)`)
        .eq("criatura_id", criaturaId),
      supabase.from(tablaEntidad).select("id, nombre").order("nombre"),
    ]);
    const filas: FilaJoin[] = (joinRes.data ?? []).map((r: any) => {
      const ent = Array.isArray(r.entidad) ? r.entidad[0] : r.entidad;
      return { joinId: r.id, entidadId: r[fk], nombre: ent?.nombre ?? "?" };
    });
    setAsignados(filas.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setCatalogo(catRes.data ?? []);
    setLoading(false);
  }, [criaturaId, tablaJoin, fk, tablaEntidad]);

  useEffect(() => { load(); }, [load]);

  const asignar = async (entidad: EntidadMin) => {
    const { data, error } = await supabase.from(tablaJoin)
      .insert([{ [fk]: entidad.id, criatura_id: criaturaId }])
      .select("id")
      .single();
    if (error || !data) return;
    setAsignados(prev =>
      [...prev, { joinId: data.id, entidadId: entidad.id, nombre: entidad.nombre }]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
  };

  const quitar = async (joinId: string) => {
    await supabase.from(tablaJoin).delete().eq("id", joinId);
    setAsignados(prev => prev.filter(f => f.joinId !== joinId));
  };

  const crear = async (nombre: string): Promise<EntidadMin | null> => {
    // Crea el hechizo/don en su tabla principal y lo asigna a la vez
    const { data: entData, error: entErr } = await supabase
      .from(tablaEntidad).insert([{ nombre: nombre.trim() }]).select("id, nombre").single();
    if (entErr || !entData) return null;
    await asignar(entData);
    setCatalogo(prev => [...prev, entData].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return entData;
  };

  return { asignados, catalogo, loading, asignar, quitar, crear };
}

function PanelMagicoCriatura({ criaturaId, tabla, label, color, Icon }: {
  criaturaId: string;
  tabla: string;
  label: string;
  color: string;
  Icon: React.ElementType;
}) {
  const { asignados, catalogo, loading, asignar, quitar, crear } = useMagicoDeCriatura(criaturaId, tabla);
  const [search,    setSearch]    = useState("");
  const [open,      setOpen]      = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [creating,  setCreating]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const asignadosIds = asignados.map(a => a.entidadId);
  const disponibles  = useMemo(
    () => catalogo.filter(e =>
      !asignadosIds.includes(e.id) &&
      e.nombre.toLowerCase().includes(search.toLowerCase())
    ),
    [catalogo, asignadosIds, search]
  );

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleCrear = async () => {
    if (!newNombre.trim()) return;
    setCreating(true);
    await crear(newNombre);
    setNewNombre(""); setAddingNew(false); setCreating(false);
  };

  if (loading) return (
    <div className="flex items-center gap-2 py-2">
      <Loader2 size={11} className="animate-spin text-primary/20" />
      <span className="text-[10px] text-primary/25 italic">Cargando {label.toLowerCase()}…</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Lista de asignados */}
      {asignados.length === 0 ? (
        <p className="text-[9px] text-primary/20 italic text-center py-3 border border-dashed border-primary/10 rounded-xl">
          Sin {label.toLowerCase()} asignados
        </p>
      ) : (
        <div className="space-y-1">
          {asignados.map(h => (
            <div key={h.joinId}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border group transition-all"
              style={{ borderColor: `color-mix(in srgb, ${color} 15%, transparent)`, background: `color-mix(in srgb, ${color} 4%, transparent)` }}>
              <Icon size={10} style={{ color }} className="shrink-0" />
              <span className="flex-1 text-[11px] font-bold text-primary/80 truncate">{h.nombre}</span>
              <button
                onClick={() => quitar(h.joinId)}
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-primary/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <Trash2 size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selector: asignar existente */}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-dashed text-[9px] font-black uppercase tracking-widest transition-all"
          style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)`, color: `color-mix(in srgb, ${color} 50%, transparent)` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = color; (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${color} 6%, transparent)`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = `color-mix(in srgb, ${color} 50%, transparent)`; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Plus size={9} /> Asignar {label.slice(0, -1).toLowerCase()} existente
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
            <div className="absolute z-50 bottom-full left-0 right-0 mb-1.5 rounded-xl border overflow-hidden shadow-xl"
              style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <div className="relative">
                  <Search size={9} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={`Buscar ${label.toLowerCase()}…`}
                    className="w-full bg-primary/5 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] outline-none focus:border-primary/25 text-primary placeholder:text-primary/25" />
                </div>
              </div>
              <div className="max-h-44 overflow-y-auto p-1">
                {disponibles.length === 0 ? (
                  <p className="text-[9px] text-primary/25 text-center py-3 italic">
                    {catalogo.length === asignadosIds.length ? "Todos asignados" : "Sin resultados"}
                  </p>
                ) : disponibles.map(e => (
                  <button key={e.id}
                    onMouseDown={() => { asignar(e); setSearch(""); /* sin cerrar — permite asignar varios */ }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-primary/6 transition-colors">
                    <Icon size={9} style={{ color }} className="shrink-0" />
                    <span className="flex-1 text-[11px] font-medium text-primary/75 truncate">{e.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Crear nuevo directamente */}
      {addingNew ? (
        <div className="flex gap-2 p-2.5 rounded-xl border"
          style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)`, background: `color-mix(in srgb, ${color} 4%, transparent)` }}>
          <input autoFocus value={newNombre} onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCrear(); if (e.key === "Escape") setAddingNew(false); }}
            placeholder={`Nombre del ${label.slice(0, -1).toLowerCase()}…`}
            className="flex-1 bg-transparent text-xs font-bold text-primary outline-none placeholder:text-primary/25" />
          <button onClick={handleCrear} disabled={!newNombre.trim() || creating}
            className="px-2.5 py-1 rounded-lg text-[9px] font-black transition-all disabled:opacity-40"
            style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
            {creating ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
          </button>
          <button onClick={() => { setAddingNew(false); setNewNombre(""); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-primary/30 hover:text-primary transition-colors">
            <X size={11} />
          </button>
        </div>
      ) : (
        <button onClick={() => setAddingNew(true)}
          className="w-full flex items-center justify-center gap-1.5 py-1 text-[9px] font-black uppercase tracking-widest transition-colors"
          style={{ color: `color-mix(in srgb, ${color} 35%, transparent)` }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = color}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = `color-mix(in srgb, ${color} 35%, transparent)`}
        >
          <Plus size={8} /> Crear nuevo {label.slice(0, -1).toLowerCase()}
        </button>
      )}
    </div>
  );
}

// ─── EditorCriatura ───────────────────────────────────────────────────────────
export function EditorCriatura({
  item, onSaved, onDeleted,
}: {
  item: Criatura; onSaved: (c: Criatura) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [tab,    setTab]    = useState<InnerTab>("base");
  const { confirm, ConfirmModal } = useConfirm();

  const habitats     = useUniqueValues("criaturas", "habitat");
  const pensamientos = useUniqueValues("criaturas", "pensamiento");
  const almas        = useUniqueValues("criaturas", "alma");
  const { variantes, setVariantes } = useCriaturaVariantes(item.id);
  const [addingVariante,  setAddingVariante]  = useState(false);
  const [newVarianteTipo, setNewVarianteTipo] = useState("");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Criatura) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("criaturas").update({
        nombre: form.nombre, imagen_url: form.imagen_url || null,
        descripcion: form.descripcion, habitat: form.habitat,
        pensamiento: form.pensamiento, alma: form.alma,
        biologia: form.biologia, relacion: form.relacion,
        comportamiento: form.comportamiento, magia: form.magia,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar a "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("criaturas").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  const handleAddVariante = async () => {
    if (!newVarianteTipo.trim()) return;
    const { data, error } = await supabase.from("criatura_variantes")
      .insert([{ criatura_id: form.id, tipo: newVarianteTipo.trim() }]).select().single();
    if (!error && data) { setVariantes(prev => [...prev, data]); setAddingVariante(false); setNewVarianteTipo(""); }
  };

  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesDeEspecie(form.nombre);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── Fixed header ─────────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          {/* Thumbnail */}
          <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
            {form.imagen_url
              ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
              : <Bug size={16} className="text-primary/25" />}
          </div>

          {/* Name inline */}
          <input
            value={form.nombre ?? ""}
            onChange={field("nombre")}
            placeholder="Nombre de la criatura"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />

          {/* Actions */}
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

        {/* ── Inner tabs ───────────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-1 px-4 py-2 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={tab === key ? {
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              } : {
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                border: "1px solid transparent",
              }}
            >
              <Icon size={11} /> <span className="hidden sm:inline">{label}</span>
              {key === "variantes" && variantes.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                  {variantes.length}
                </span>
              )}
              {key === "especie" && personajes.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                  {personajes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* BASE */}
          {tab === "base" && (
            <div className="p-4 space-y-4">
              {/* Image + meta fields */}
              <div className="flex gap-4">
                <div className="shrink-0 w-24">
                  <SelectorImagen label="Ilustración" value={form.imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
                    placeholder={<Bug size={20} className="opacity-20" />} />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 content-start">
                  <SelectorTexto label="Hábitat" value={form.habitat ?? ""} onChange={v => setForm(f => ({ ...f, habitat: v }))} opciones={habitats} placeholder="Bosque, océano, volcán…" />
                  <SelectorTexto label="Pensamiento" value={form.pensamiento ?? ""} onChange={v => setForm(f => ({ ...f, pensamiento: v }))} opciones={pensamientos} placeholder="¿Cómo piensa?" />
                  <SelectorTexto label="Alma" value={form.alma ?? ""} onChange={v => setForm(f => ({ ...f, alma: v }))} opciones={almas} placeholder="Naturaleza espiritual…" />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
                <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                  placeholder="Aspecto físico general…" rows={5} toolbar defaultMode="edit" />
              </div>
            </div>
          )}

          {/* BIOLOGÍA */}
          {tab === "biologia" && (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Biología</label>
                  <MarkdownEditor value={form.biologia ?? ""} onChange={v => setForm(f => ({ ...f, biologia: v }))}
                    placeholder="Anatomía, fisiología, ciclo de vida, reproducción…" rows={10} toolbar defaultMode="edit" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Comportamiento</label>
                  <MarkdownEditor value={form.comportamiento ?? ""} onChange={v => setForm(f => ({ ...f, comportamiento: v }))}
                    placeholder="Hábitos, instintos, patrones de caza o defensa…" rows={10} toolbar defaultMode="edit" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Magia</label>
                  <MarkdownEditor value={form.magia ?? ""} onChange={v => setForm(f => ({ ...f, magia: v }))}
                    placeholder="Poderes, habilidades mágicas, debilidades…" rows={10} toolbar defaultMode="edit" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Relación</label>
                  <MarkdownEditor value={form.relacion ?? ""} onChange={v => setForm(f => ({ ...f, relacion: v }))}
                    placeholder="Vínculo con otras especies, personajes o facciones…" rows={10} toolbar defaultMode="edit" />
                </div>
              </div>

              {/* ── Hechizos y Dones de esta criatura ──────────────────────── */}
              <div
                className="rounded-2xl p-4 space-y-4 border"
                style={{
                  borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  background: "color-mix(in srgb, var(--primary) 2%, transparent)",
                }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/30">
                  Catálogo mágico · {form.nombre || "esta criatura"}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Hechizos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={11} style={{ color: "oklch(0.65 0.18 290)" }} />
                      <span className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: "oklch(0.65 0.18 290)" }}>Hechizos</span>
                    </div>
                    <PanelMagicoCriatura
                      criaturaId={form.id}
                      tabla="hechizos"
                      label="Hechizos"
                      color="oklch(0.65 0.18 290)"
                      Icon={Sparkles}
                    />
                  </div>

                  {/* Dones */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Star size={11} style={{ color: "oklch(0.7 0.16 55)" }} />
                      <span className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: "oklch(0.7 0.16 55)" }}>Dones</span>
                    </div>
                    <PanelMagicoCriatura
                      criaturaId={form.id}
                      tabla="dones"
                      label="Dones"
                      color="oklch(0.7 0.16 55)"
                      Icon={Star}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VARIANTES */}
          {tab === "variantes" && (
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                {variantes.map(v => (
                  <VarianteEditor key={v.id} variante={v}
                    onSaved={updated => setVariantes(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    onDeleted={id => setVariantes(prev => prev.filter(x => x.id !== id))} />
                ))}
              </div>

              {variantes.length === 0 && !addingVariante && (
                <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-8 border border-dashed border-primary/15 rounded-xl italic">
                  Sin variantes registradas
                </p>
              )}

              {addingVariante ? (
                <div className="flex gap-2 p-3 rounded-xl border border-primary/15"
                  style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                  <input autoFocus value={newVarianteTipo} onChange={e => setNewVarianteTipo(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddVariante(); if (e.key === "Escape") setAddingVariante(false); }}
                    className="flex-1 bg-bg-main border border-primary/20 rounded-lg px-3 py-2 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                    placeholder="TIPO DE VARIANTE..." />
                  <button onClick={handleAddVariante} disabled={!newVarianteTipo.trim()}
                    className="bg-primary text-btn-text px-3 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40">
                    <Check size={13} />
                  </button>
                  <button onClick={() => setAddingVariante(false)}
                    className="px-2.5 py-2 rounded-lg text-primary/40 hover:text-primary transition-all">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setAddingVariante(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
                  <Plus size={11} /> Añadir Variante
                </button>
              )}
            </div>
          )}
          {/* ESPECIE */}
          {tab === "especie" && (
            <div className="p-4">
              <PanelPersonajes
                personajes={personajes}
                loading={loadingPersonajes}
                setPersonajes={setPersonajes}
                titulo="De esta especie"
                inline
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}