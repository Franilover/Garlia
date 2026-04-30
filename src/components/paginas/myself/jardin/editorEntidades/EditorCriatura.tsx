"use client";

import React, { useState, useEffect } from "react";
import {
  Bug, Plus, Check, X, Trash2, Save, ChevronDown, Lock,
  Dna, Brain, Wand2, GitBranch, Users, Package,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Criatura, type CriaturaVariante, type SaveStatus, INPUT_CLS } from "./types";
import { useUniqueValues, useCriaturaVariantes, usePersonajesDeEspecie } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";
import { PanelPersonajes } from "./PanelPersonajes";
import { BloqueHechizos } from "./BloqueHechizos";
import { BloqueDones } from "./BloqueDones";
import { BloqueDrops } from "./BloqueDrops";

// ─── Tabs internas ─────────────────────────────────────────────────────────────
type InnerTab = "base" | "especie";

const TABS: { key: InnerTab; label: string; Icon: React.ElementType }[] = [
  { key: "base",    label: "Base",    Icon: Brain },
  { key: "especie", label: "Especie", Icon: Users },
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
  variante, criaturaId, onSaved, onDeleted,
}: {
  variante: CriaturaVariante;
  criaturaId: string;
  onSaved: (v: CriaturaVariante) => void;
  onDeleted: (id: string) => void;
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
        imagen_url: form.imagen_url || null,
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
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
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
        <div
          className="border-t px-3 pb-3 pt-3"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          {/* Layout de columnas: imagen | descripción | drops */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Imagen */}
            <div className="shrink-0 sm:w-48">
              <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
                onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                aspect="landscape" placeholder={<Bug size={16} className="opacity-20" />} />
            </div>

            {/* Tipo + Descripción */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Tipo / Nombre</label>
                <input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className={INPUT_CLS + " mt-1"} placeholder="Joven, Adulto, Albino, Nocturno…" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">Descripción</label>
                <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                  rows={4} placeholder="Diferencias físicas, comportamiento particular…" toolbar defaultMode="edit" />
              </div>
            </div>

            {/* Drops */}
            <div className="sm:shrink-0 sm:w-52 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30">Drops</p>
              <BloqueDrops criaturaId={criaturaId} varianteId={form.id} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
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
          <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
            {form.imagen_url
              ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
              : <Bug size={16} className="text-primary/25" />}
          </div>

          <input
            value={form.nombre ?? ""}
            onChange={field("nombre")}
            placeholder="Nombre de la criatura"
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

              <div className="flex flex-col sm:flex-row gap-5">
                {/* Columna izquierda: imagen */}
                <div className="shrink-0 sm:w-96 w-full max-w-xs mx-auto sm:mx-0">
                  <SelectorImagen label="Ilustración" value={form.imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
                    placeholder={<Bug size={20} className="opacity-20" />} />
                </div>

                {/* Columna central: selectores + descripción */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <SelectorTexto label="Hábitat" value={form.habitat ?? ""} onChange={v => setForm(f => ({ ...f, habitat: v }))} opciones={habitats} placeholder="Bosque, océano, volcán…" />
                    <SelectorTexto label="Pensamiento" value={form.pensamiento ?? ""} onChange={v => setForm(f => ({ ...f, pensamiento: v }))} opciones={pensamientos} placeholder="¿Cómo piensa?" />
                    <SelectorTexto label="Alma" value={form.alma ?? ""} onChange={v => setForm(f => ({ ...f, alma: v }))} opciones={almas} placeholder="Naturaleza espiritual…" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
                      <Package size={9} /> Drops base
                    </span>
                    <BloqueDrops criaturaId={form.id} varianteId={null} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
                    <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                      placeholder="Aspecto físico general…" rows={5} toolbar defaultMode="edit" />
                  </div>
                </div>

                {/* Columna derecha: Catálogo Mágico */}
                <div className="sm:shrink-0 sm:w-64 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Catálogo Mágico</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25">Hechizos</p>
                      <BloqueHechizos personajeId={form.id} especie={form.nombre} varianteId={null} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25">Dones</p>
                      <BloqueDones personajeId={form.id} especie={form.nombre} varianteId={null} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Variantes */}
              <div className="space-y-3">
                <div className="space-y-2">
                  {variantes.map(v => (
                    <VarianteEditor
                      key={v.id}
                      variante={v}
                      criaturaId={form.id}
                      onSaved={updated => setVariantes(prev => prev.map(x => x.id === updated.id ? updated : x))}
                      onDeleted={id => setVariantes(prev => prev.filter(x => x.id !== id))}
                    />
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