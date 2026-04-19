"use client";

import React, { useState, useEffect } from "react";
import { Bug, Plus, Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Criatura, type CriaturaVariante, type SaveStatus, INPUT_CLS } from "./types";
import { useUniqueValues, useCriaturaVariantes, usePersonajesDeEspecie } from "./hooks";
import { Campo, CampoArea, BarraAcciones, SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { PanelPersonajes } from "./PanelPersonajes";

// ─── VarianteEditor ───────────────────────────────────────────────────────────

function VarianteEditor({ variante, onSaved, onDeleted }: {
  variante: CriaturaVariante; onSaved: (v: CriaturaVariante) => void; onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState(variante);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const handleSave = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("criatura_variantes").update({
        tipo: form.tipo,
        descripcion: form.descripcion || null,
        imagen_url: form.imagen_url || null,
        notas: form.notas || null,
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
    <div className="border border-primary/10 rounded-xl bg-bg-main/50 hover:border-primary/20 transition-all overflow-hidden">
      <ConfirmModal />
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bug size={12} className="text-primary/40 shrink-0" />
          <span className="text-[11px] font-black uppercase text-primary tracking-widest truncate">{form.tipo}</span>
          {form.imagen_url && (
            <div className="w-5 h-5 rounded overflow-hidden border border-primary/10 shrink-0">
              <img src={form.imagen_url} alt={form.tipo} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <X size={13} className={`text-primary/40 shrink-0 transition-transform ${expanded ? "rotate-45" : ""}`} style={{ transform: expanded ? "rotate(45deg)" : undefined }} />
      </div>

      {expanded && (
        <div className="p-3 pt-0 border-t border-primary/5 space-y-3 bg-primary/3">
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Tipo / Nombre de variante</label>
            <input
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              className={INPUT_CLS + " mt-1"}
              placeholder="Joven, Adulto, Albino, Nocturno…"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">Imagen</label>
            <SelectorImagen label="" value={form.imagen_url ?? ""} onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
              aspect="landscape" placeholder={<Bug size={16} className="opacity-20" />} />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Descripción</label>
            <textarea value={form.descripcion ?? ""} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={4} className={`${INPUT_CLS} resize-none mt-1`} placeholder="Diferencias físicas, comportamiento particular…" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-1.5 mb-1"
              style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
              <span>🔒</span> Notas de creador
            </label>
            <textarea value={form.notas ?? ""} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={2} className={`${INPUT_CLS} resize-none`}
              style={{ borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)", background: "color-mix(in srgb, var(--accent) 4%, var(--input-bg))" }}
              placeholder="Ideas, pendientes, inspiración…" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <button onClick={handleDelete} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 size={10} /> Eliminar
            </button>
            <div className="flex items-center gap-2">
              <SaveIndicator status={status} />
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
                <Check size={10} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditorCriatura ───────────────────────────────────────────────────────────

export function EditorCriatura({ item, onSaved, onDeleted }: {
  item: Criatura; onSaved: (c: Criatura) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
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
    const { data, error } = await supabase
      .from("criatura_variantes")
      .insert([{ criatura_id: form.id, tipo: newVarianteTipo.trim() }])
      .select().single();
    if (!error && data) { setVariantes(prev => [...prev, data]); setAddingVariante(false); setNewVarianteTipo(""); }
  };

  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesDeEspecie(form.nombre);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="shrink-0 p-5 pb-3 flex items-start gap-4">
          <div className="shrink-0" style={{ width: 88 }}>
            <SelectorImagen label="Ilustración" value={form.imagen_url ?? ""}
              onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
              placeholder={<Bug size={20} className="opacity-20" />} />
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
            <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre de la criatura" />
            <SelectorTexto label="Hábitat" value={form.habitat ?? ""} onChange={v => setForm(f => ({ ...f, habitat: v }))} opciones={habitats} placeholder="Bosque, océano, volcán…" />
            <SelectorTexto label="Pensamiento" value={form.pensamiento ?? ""} onChange={v => setForm(f => ({ ...f, pensamiento: v }))} opciones={pensamientos} placeholder="¿Cómo piensa?" />
            <SelectorTexto label="Alma" value={form.alma ?? ""} onChange={v => setForm(f => ({ ...f, alma: v }))} opciones={almas} placeholder="Naturaleza espiritual…" />
          </div>
        </div>

        <div className="p-5 pt-2 space-y-5">
          <CampoArea label="Descripción" value={form.descripcion ?? ""} onChange={field("descripcion")} rows={5} placeholder="Aspecto físico general…" />
          <CampoArea label="Biología" value={form.biologia ?? ""} onChange={field("biologia")} rows={8} placeholder="Anatomía, fisiología, ciclo de vida, reproducción…" />
          <CampoArea label="Relación" value={form.relacion ?? ""} onChange={field("relacion")} rows={8} placeholder="Vínculo con otras especies, personajes o facciones…" />
          <CampoArea label="Comportamiento" value={form.comportamiento ?? ""} onChange={field("comportamiento")} rows={8} placeholder="Hábitos, instintos, patrones de caza o defensa…" />
          <CampoArea label="Magia" value={form.magia ?? ""} onChange={field("magia")} rows={8} placeholder="Poderes, habilidades mágicas, debilidades…" />
          <div className="h-px bg-primary/8" />

          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary/50 flex items-center gap-2">
              <Bug size={12} /> Variantes
              <span className="text-[9px] text-primary/30 bg-primary/8 px-2 py-0.5 rounded-full ml-1">{variantes.length}</span>
            </h3>
            <div className="space-y-2">
              {variantes.map(v => (
                <VarianteEditor key={v.id} variante={v}
                  onSaved={updated => setVariantes(prev => prev.map(x => x.id === updated.id ? updated : x))}
                  onDeleted={id => setVariantes(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
            {variantes.length === 0 && !addingVariante && (
              <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-5 border border-dashed border-primary/15 rounded-xl italic">Sin variantes registradas</p>
            )}
            {addingVariante ? (
              <div className="flex gap-2 p-3 bg-primary/5 rounded-xl border border-primary/15">
                <input autoFocus value={newVarianteTipo} onChange={e => setNewVarianteTipo(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddVariante(); if (e.key === "Escape") setAddingVariante(false); }}
                  className="flex-1 bg-bg-main border border-primary/20 rounded-lg px-3 py-2 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                  placeholder="TIPO DE VARIANTE..." />
                <button onClick={handleAddVariante} disabled={!newVarianteTipo.trim()} className="bg-primary text-btn-text px-3 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40">
                  <Check size={13} />
                </button>
                <button onClick={() => setAddingVariante(false)} className="px-2.5 py-2 rounded-lg text-primary/40 hover:text-primary transition-all">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingVariante(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
                <Plus size={11} /> Añadir Variante
              </button>
            )}
          </div>
        </div>

        <BarraAcciones status={status} onSave={save} onDelete={del} />
      </div>

      <PanelPersonajes personajes={personajes} loading={loadingPersonajes} setPersonajes={setPersonajes} titulo="De esta especie" />
    </div>
  );
}
