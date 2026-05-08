"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Maximize2, UserCircle2, BookOpen, Mic2, Loader2,
  ChevronDown, X, Save, Trash2,
  User, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Personaje, type SaveStatus } from "./types";
import { useCapitulosNarrados, useNombresDeTabla } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { BloqueHechizos } from "./BloqueHechizos";
import { BloqueDones } from "./BloqueDones";

// ─── Tabs internas ────────────────────────────────────────────────────────────
type InnerTab = "identidad";

const TABS: { key: InnerTab; label: string; Icon: React.ElementType }[] = [
  { key: "identidad", label: "Identidad", Icon: User },
];



// ─── Bloque capítulos narrados ────────────────────────────────────────────────
function BloqueCapsNarrados({ personajeId }: { personajeId: string }) {
  const { caps, loading } = useCapitulosNarrados(personajeId);
  if (loading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-primary/20" /></div>;
  if (!caps.length) return (
    <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-4 italic">
      Sin capítulos narrados aún
    </p>
  );
  return (
    <div className="space-y-1">
      {caps.map(cap => (
        <div key={cap.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/3 transition-colors">
          <div
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black"
            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
          >
            {cap.orden}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-primary truncate uppercase italic">{cap.titulo_capitulo}</p>
            {cap.libro_titulo && (
              <p className="text-[9px] text-primary/35 truncate flex items-center gap-1">
                <BookOpen size={8} /> {cap.libro_titulo}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Image cuerpo (mobile picker) ─────────────────────────────────────────────
function PickerCuerpo({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Maximize2 size={11} /> Imagen cuerpo</h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
            </div>
            <SimpleImagePicker onSelect={url => { onChange(url); setOpen(false); }} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      {value ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 text-[10px] font-black uppercase tracking-widest text-primary/50 hover:text-primary hover:border-primary/30 transition-all">
          <div className="w-5 h-5 rounded overflow-hidden border border-primary/15 shrink-0">
            <img src={value} alt="Cuerpo" className="w-full h-full object-cover" />
          </div>
          Cambiar cuerpo
        </button>
      ) : (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary/30 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
          <Maximize2 size={11} /> + Imagen cuerpo
        </button>
      )}
    </>
  );
}

// ─── Sección Hechizos inline ──────────────────────────────────────────────────
function SeccionHechizos({ personajeId, especie, varianteId }: { personajeId: string; especie?: string; varianteId?: string | null }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}
      >
        <Sparkles size={10} className="text-primary/40" />
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Hechizos</span>
      </div>
      <BloqueHechizos personajeId={personajeId} especie={especie} varianteId={varianteId} />
    </div>
  );
}

// ─── Hook: variantes de una criatura por nombre ───────────────────────────────
type VarianteMin = { id: string; tipo: string };

function useCriaturaVariantesPorNombre(nombreEspecie: string | null | undefined) {
  const [variantes, setVariantes] = useState<VarianteMin[]>([]);

  const load = useCallback(async () => {
    if (!nombreEspecie?.trim()) { setVariantes([]); return; }
    const { data: criatura } = await supabase
      .from("criaturas")
      .select("id")
      .ilike("nombre", nombreEspecie.trim())
      .single();
    if (!criatura) { setVariantes([]); return; }
    const { data } = await supabase
      .from("criatura_variantes")
      .select("id, tipo")
      .eq("criatura_id", criatura.id)
      .order("tipo");
    setVariantes(data ?? []);
  }, [nombreEspecie]);

  useEffect(() => { load(); }, [load]);

  return variantes;
}

// ─── FormularioPersonaje ──────────────────────────────────────────────────────
export function FormularioPersonaje({
  form, setForm, status, onSave, onDelete, compacto = false, entities = [],
}: {
  form: Personaje;
  setForm: React.Dispatch<React.SetStateAction<Personaje>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  compacto?: boolean;
  entities?: WikiEntity[];
}) {
  const especies = useNombresDeTabla("criaturas");
  const reinos   = useNombresDeTabla("reinos");
  const [tab, setTab] = useState<InnerTab>("identidad");
  const variantes = useCriaturaVariantesPorNombre(form.especie);
  const { onSnippetAction } = useWikilink();

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Fixed header ───────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.img_url
            ? <img src={form.img_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <UserCircle2 size={16} className="text-primary/25" />}
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre del personaje"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          style={{ letterSpacing: "0.02em" }}
        />

        <div className="shrink-0 flex items-center gap-1.5">
          <SaveIndicator status={status} />
          {!compacto && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            >
              <Trash2 size={10} />
            </button>
          )}
          <button
            onClick={onSave}
            disabled={status === "saving"}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save size={10} /> Guardar
          </button>
        </div>
      </div>

      {/* ── Inner tabs — solo íconos en compacto, label en full ────────────── */}
      <div
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
      >
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
            style={tab === key ? {
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color:       "var(--primary)",
              border:      "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            } : {
              color:  "color-mix(in srgb, var(--primary) 35%, transparent)",
              border: "1px solid transparent",
            }}
          >
            <Icon size={10} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden flex">

        <div className="flex-1 overflow-y-auto min-h-0">

          {/* IDENTIDAD */}
          {tab === "identidad" && (
            <div className="p-3">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Columna izquierda: imagen cara + cuerpo apilados */}
                <div className="shrink-0 w-full sm:w-52 flex sm:flex-col gap-3 sm:gap-2">
                  <div className="w-24 sm:w-full shrink-0">
                  <SelectorImagen
                    label="Cara"
                    value={form.img_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, img_url: url }))}
                    aspect="square"
                    placeholder={<UserCircle2 size={20} className="opacity-25" />}
                  />
                  </div>
                  {!compacto && (
                    <div
                      className="hidden sm:block rounded-xl overflow-hidden"
                      style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
                    >
                      {/* Label */}
                      <div
                        className="px-2 py-1 border-b"
                        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}
                      >
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25">Cuerpo</span>
                      </div>
                      {/* Imagen con hover overlay para cambiar */}
                      <div className="relative w-full group bg-primary/2" style={{ aspectRatio: "1 / 2" }}>
                        {form.img_cuerpo_url ? (
                          <img
                            src={form.img_cuerpo_url}
                            alt="Cuerpo completo"
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ objectPosition: "top center" }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Maximize2 size={20} className="opacity-15" />
                          </div>
                        )}
                        {/* Overlay hover cubre todo */}
                        <label
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ background: "color-mix(in srgb, var(--bg-main) 70%, transparent)", backdropFilter: "blur(2px)" }}
                        >
                          <Maximize2 size={14} className="text-primary/50" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Cambiar</span>
                          <SelectorImagen
                            label=""
                            value={form.img_cuerpo_url ?? ""}
                            onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
                            aspect="full"
                            placeholder={null}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna derecha: selectores en fila + descripción + resto */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Fila de dropdowns + Don */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start">
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <SelectorTexto label="Especie" value={form.especie ?? ""} onChange={v => setForm(f => ({ ...f, especie: v, variante_id: null }))} opciones={especies} placeholder="Humano, elfo, demonio…" />
                        {variantes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/25 mr-0.5">Variante</span>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, variante_id: null }))}
                              className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all"
                              style={!form.variante_id ? {
                                background:  "color-mix(in srgb, var(--primary) 10%, transparent)",
                                borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
                                color:       "var(--primary)",
                              } : {
                                borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                                color:       "color-mix(in srgb, var(--primary) 25%, transparent)",
                              }}
                            >
                              Todas
                            </button>
                            {variantes.map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, variante_id: v.id }))}
                                className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all"
                                style={form.variante_id === v.id ? {
                                  background:  "color-mix(in srgb, var(--primary) 10%, transparent)",
                                  borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
                                  color:       "var(--primary)",
                                } : {
                                  borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                                  color:       "color-mix(in srgb, var(--primary) 25%, transparent)",
                                }}
                              >
                                {v.tipo}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <SelectorTexto label="Reino" value={form.reino ?? ""} onChange={v => setForm(f => ({ ...f, reino: v }))} opciones={reinos} placeholder="Reino, grupo, nación…" />
                    </div>

                    {/* Don — mismo estilo que Especie / Reino */}
                    <div className="w-full sm:w-44 sm:shrink-0 space-y-1.5">
                      <BloqueDones personajeId={form.id} especie={form.especie} varianteId={form.variante_id} />
                    </div>
                  </div>

                  {/* Descripción + Características en fila */}
                  {!compacto ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Sobre el personaje</label>
                        <MarkdownEditor
                          value={form.sobre ?? ""}
                          onChange={v => setForm(f => ({ ...f, sobre: v }))}
                          placeholder="Biografía, personalidad…"
                          rows={8}
                          toolbar
                          defaultMode="edit"
                        onSnippetAction={onSnippetAction}
                        entities={entities}
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Características</label>
                        <MarkdownEditor
                          value={form.caracteristicas ?? ""}
                          onChange={v => setForm(f => ({ ...f, caracteristicas: v }))}
                          placeholder="Rasgos físicos, personalidad, habilidades…"
                          rows={8}
                          toolbar
                          defaultMode="edit"
                        onSnippetAction={onSnippetAction}
                        entities={entities}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Sobre el personaje</label>
                      <MarkdownEditor
                        value={form.sobre ?? ""}
                        onChange={v => setForm(f => ({ ...f, sobre: v }))}
                        placeholder="Biografía, personalidad…"
                        rows={5}
                        toolbar
                        defaultMode="edit"
                      onSnippetAction={onSnippetAction}
                      entities={entities}
                      />
                    </div>
                  )}

                  {/* Capítulos narrados + Hechizos en fila */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div
                      className="flex-1 min-w-0 rounded-xl overflow-hidden"
                      style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
                    >
                      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                        <Mic2 size={10} className="text-primary/40" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Capítulos narrados</span>
                      </div>
                      <BloqueCapsNarrados personajeId={form.id} />
                    </div>
                    <div className="w-full sm:w-56 sm:shrink-0">
                      <SeccionHechizos personajeId={form.id} especie={form.especie} varianteId={form.variante_id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── EditorPersonaje ──────────────────────────────────────────────────────────
export function EditorPersonaje({
  item, onSaved, onDeleted, entities = [],
}: {
  item: Personaje; onSaved: (p: Personaje) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
}) {
  const [form,   setForm]   = useState<Personaje>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("personajes").update({
        nombre:          form.nombre,
        img_url:         form.img_url        || null,
        img_cuerpo_url:  form.img_cuerpo_url || null,
        sobre:           form.sobre,
        reino:           form.reino,
        especie:         form.especie,
        caracteristicas: form.caracteristicas || null,
        variante_id:     (form as any).variante_id    || null,
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
    await supabase.from("personajes").delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <>
      <ConfirmModal />
      <FormularioPersonaje form={form} setForm={setForm} status={status} onSave={save} onDelete={del} entities={entities} />
    </>
  );
}