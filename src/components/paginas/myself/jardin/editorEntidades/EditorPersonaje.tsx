"use client";

import React, { useState, useEffect } from "react";
import { Maximize2, UserCircle2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Personaje, type SaveStatus } from "./types";
import { useUniqueValues, useCapitulosNarrados } from "./hooks";
import { Campo, CampoArea, BarraAcciones, SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { BookOpen, Mic2, Loader2, ChevronDown, ImageIcon, X } from "lucide-react";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";

function BloqueCapsNarrados({ personajeId }: { personajeId: string }) {
  const { caps, loading } = useCapitulosNarrados(personajeId);

  return (
    <div className="rounded-2xl border border-primary/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/8"
        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
        <Mic2 size={13} className="text-primary/50" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">Capítulos narrados</span>
        {!loading && caps.length > 0 && (
          <span className="ml-auto text-[9px] font-black text-primary/30 bg-primary/8 px-2 py-0.5 rounded-full">{caps.length}</span>
        )}
      </div>
      <div className="divide-y divide-primary/5">
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
        ) : caps.length === 0 ? (
          <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest px-4 py-5 text-center italic">Sin capítulos narrados aún</p>
        ) : caps.map(cap => (
          <div key={cap.id} className="flex items-center gap-3 px-4 py-3 hover:bg-primary/3 transition-colors">
            <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}>
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
    </div>
  );
}

function MobileCuerpoButton({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open,       setOpen]       = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="sm:hidden shrink-0 px-5 pb-3">
      {pickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <Maximize2 size={11} /> Imagen cuerpo
              </h3>
              <button onClick={() => setPickerOpen(false)} className="text-primary/30 hover:text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onSelect={url => { onChange(url); setPickerOpen(false); }}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        </div>
      )}

      {value ? (
        <div className="rounded-xl border border-primary/15 overflow-hidden">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-primary/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-primary/10 shrink-0">
              <img src={value} alt="Cuerpo" className="w-full h-full object-cover" />
            </div>
            <span className="flex-1 text-left text-[10px] font-black uppercase tracking-widest text-primary/60">Imagen cuerpo</span>
            <ChevronDown size={12} className={`text-primary/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="border-t border-primary/10">
              <div className="max-h-72 overflow-hidden bg-primary/3 flex items-center justify-center">
                <img src={value} alt="Cuerpo completo" className="max-h-72 w-auto object-contain" />
              </div>
              <div className="p-2 flex gap-2 border-t border-primary/8">
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <ImageIcon size={10} /> Cambiar
                </button>
                <button
                  onClick={() => { onChange(""); setOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all"
                >
                  <X size={10} /> Quitar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/35 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest"
        >
          <Maximize2 size={11} /> Imagen cuerpo
        </button>
      )}
    </div>
  );
}

export function FormularioPersonaje({ form, setForm, status, onSave, onDelete, compacto = false }: {
  form: Personaje;
  setForm: React.Dispatch<React.SetStateAction<Personaje>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  compacto?: boolean;
}) {
  const reinos   = useUniqueValues("personajes", "reino");
  const especies = useUniqueValues("personajes", "especie");

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="shrink-0 p-5 pb-3 flex items-start gap-4">
          <div className="shrink-0" style={{ width: 88 }}>
            <SelectorImagen
              label="Cara"
              value={form.img_url ?? ""}
              onChange={url => setForm(f => ({ ...f, img_url: url }))}
              aspect="square"
              placeholder={<UserCircle2 size={22} className="opacity-25" />}
            />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3 pt-0.5">
            <Campo label="Nombre" value={form.nombre ?? ""} onChange={field("nombre")} placeholder="Nombre del personaje" />
            <SelectorTexto label="Especie" value={form.especie ?? ""} onChange={v => setForm(f => ({ ...f, especie: v }))} opciones={especies} placeholder="Humano, elfo, demonio…" />
            <SelectorTexto label="Reino / Facción" value={form.reino ?? ""} onChange={v => setForm(f => ({ ...f, reino: v }))} opciones={reinos} placeholder="Reino, grupo, nación…" />
          </div>
        </div>

        <div className="p-5 pt-2 space-y-5">
          <CampoArea label="Sobre el personaje" value={form.sobre ?? ""} onChange={field("sobre")} rows={6} placeholder="Biografía, personalidad, historia…" />
          {!compacto && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <CampoArea label="Deseo" value={form.deseo ?? ""} onChange={field("deseo")} rows={8} placeholder="Qué busca, qué quiere lograr, motivaciones profundas…" />
                <CampoArea label="Historia" value={form.historia ?? ""} onChange={field("historia")} rows={8} placeholder="Pasado, eventos clave, origen…" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <CampoArea label="Características" value={form.caracteristicas ?? ""} onChange={field("caracteristicas")} rows={8} placeholder="Rasgos físicos, personalidad, habilidades destacadas…" />
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-1.5"
                    style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                    <span>🔒</span> Notas de creador
                  </label>
                  <textarea
                    value={form.notas_creador ?? ""}
                    onChange={field("notas_creador")}
                    rows={8}
                    placeholder="Ideas, pendientes, inspiración, spoilers… solo para ti."
                    className="w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-primary/40 placeholder:text-primary/25 transition-colors resize-none"
                    style={{
                      borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
                      background:  "color-mix(in srgb, var(--accent) 4%, var(--input-bg))",
                    }}
                  />
                </div>
              </div>
            </>
          )}
          <div className="h-px bg-primary/8" />
          <BloqueCapsNarrados personajeId={form.id} />
        </div>

        {!compacto && (
          <MobileCuerpoButton
            value={form.img_cuerpo_url ?? ""}
            onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
          />
        )}

        <BarraAcciones status={status} onSave={onSave} onDelete={onDelete} />
      </div>

      {}
      <div className="hidden sm:flex w-44 shrink-0 border-l border-primary/10 flex-col overflow-hidden">
        <div className="flex-1 min-h-0">
          <SelectorImagen
            label=""
            value={form.img_cuerpo_url ?? ""}
            onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
            aspect="full"
            placeholder={<Maximize2 size={20} className="opacity-20" />}
          />
        </div>
        <div className="shrink-0 px-2 py-1.5 border-t border-primary/8">
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 block text-center">Cuerpo</span>
        </div>
      </div>
    </div>
  );
}

export function EditorPersonaje({ item, onSaved, onDeleted }: {
  item: Personaje; onSaved: (p: Personaje) => void; onDeleted: (id: string) => void;
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
        notas_creador:   form.notas_creador  || null,
        deseo:           form.deseo          || null,
        historia:        form.historia       || null,
        caracteristicas: form.caracteristicas || null,
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
      <FormularioPersonaje form={form} setForm={setForm} status={status} onSave={save} onDelete={del} />
    </>
  );
}