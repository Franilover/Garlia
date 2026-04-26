"use client";

import React, { useState, useEffect } from "react";
import {
  Maximize2, UserCircle2, BookOpen, Mic2, Loader2,
  ChevronDown, X, Save, Trash2, Lock,
  User, Scroll, FileEdit, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Personaje, type SaveStatus } from "./types";
import { useUniqueValues, useCapitulosNarrados, useNombresDeTabla } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { BloqueHechizos } from "./BloqueHechizos";

// ─── Tabs internas ────────────────────────────────────────────────────────────
type InnerTab = "identidad" | "lore" | "magia" | "notas";

const TABS: { key: InnerTab; label: string; Icon: React.ElementType }[] = [
  { key: "identidad", label: "Identidad", Icon: User     },
  { key: "lore",      label: "Lore",      Icon: Scroll   },
  { key: "magia",     label: "Magia",     Icon: Sparkles },
  { key: "notas",     label: "Notas",     Icon: FileEdit },
];

// ─── Campo colapsable con preview ─────────────────────────────────────────────
function CampoLore({
  label, value, onChange, placeholder, rows = 5,
  accent = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; accent?: boolean;
}) {
  const [open, setOpen] = useState(!!value);
  const preview = value.replace(/[#*`_~\[\]]/g, "").trim().slice(0, 80);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${accent
          ? "color-mix(in srgb, var(--accent) 20%, transparent)"
          : "color-mix(in srgb, var(--primary) 10%, transparent)"}`,
        background: accent
          ? "color-mix(in srgb, var(--accent) 3%, transparent)"
          : "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/3"
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-black uppercase tracking-[0.25em]"
            style={{ color: accent ? "color-mix(in srgb, var(--accent) 70%, transparent)" : "color-mix(in srgb, var(--primary) 45%, transparent)" }}
          >
            {accent && "🔒 "}{label}
          </p>
          {!open && preview && (
            <p className="text-[11px] text-primary/40 truncate mt-0.5 font-medium italic">{preview}…</p>
          )}
          {!open && !preview && (
            <p className="text-[10px] text-primary/20 mt-0.5 italic">{placeholder?.slice(0, 50)}…</p>
          )}
        </div>
        <ChevronDown
          size={13}
          className="shrink-0 text-primary/30 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          <MarkdownEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            toolbar
            defaultMode="edit"
          />
        </div>
      )}
    </div>
  );
}

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

// ─── FormularioPersonaje ──────────────────────────────────────────────────────
export function FormularioPersonaje({
  form, setForm, status, onSave, onDelete, compacto = false,
}: {
  form: Personaje;
  setForm: React.Dispatch<React.SetStateAction<Personaje>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  compacto?: boolean;
}) {
  // Especie: lista desde tabla criaturas (todas las entidades reales)
  const especies = useNombresDeTabla("criaturas");
  // Reino: lista desde tabla reinos (todas las entidades reales)
  const reinos   = useNombresDeTabla("reinos");
  const [tab, setTab] = useState<InnerTab>("identidad");

  const field = (k: keyof Personaje) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Fixed header ───────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.img_url
            ? <img src={form.img_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <UserCircle2 size={18} className="text-primary/25" />}
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre del personaje"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          style={{ letterSpacing: "0.02em" }}
        />

        <div className="shrink-0 flex items-center gap-2">
          <SaveIndicator status={status} />
          {!compacto && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            >
              <Trash2 size={10} />
            </button>
          )}
          <button
            onClick={onSave}
            disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>

      {/* ── Inner tabs ─────────────────────────────────────────────────────── */}
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
              background: key === "magia"
                ? "color-mix(in srgb, oklch(0.65 0.18 290) 12%, transparent)"
                : "color-mix(in srgb, var(--primary) 12%, transparent)",
              color: key === "magia" ? "oklch(0.65 0.18 290)" : "var(--primary)",
              border: `1px solid ${key === "magia"
                ? "color-mix(in srgb, oklch(0.65 0.18 290) 25%, transparent)"
                : "color-mix(in srgb, var(--primary) 20%, transparent)"}`,
            } : {
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
              border: "1px solid transparent",
            }}
          >
            <Icon size={11} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden flex">

        <div className="flex-1 overflow-y-auto min-h-0">

          {/* IDENTIDAD */}
          {tab === "identidad" && (
            <div className="p-4 space-y-4">
              <div className="flex gap-4">
                <div className="shrink-0 w-24">
                  <SelectorImagen
                    label="Cara"
                    value={form.img_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, img_url: url }))}
                    aspect="square"
                    placeholder={<UserCircle2 size={22} className="opacity-25" />}
                  />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                  <SelectorTexto label="Especie" value={form.especie ?? ""} onChange={v => setForm(f => ({ ...f, especie: v }))} opciones={especies} placeholder="Humano, elfo, demonio…" />
                  <SelectorTexto label="Reino" value={form.reino ?? ""} onChange={v => setForm(f => ({ ...f, reino: v }))} opciones={reinos} placeholder="Reino, grupo, nación…" />
                  <div className="sm:hidden col-span-full">
                    <PickerCuerpo value={form.img_cuerpo_url ?? ""} onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Sobre el personaje</label>
                <MarkdownEditor
                  value={form.sobre ?? ""}
                  onChange={v => setForm(f => ({ ...f, sobre: v }))}
                  placeholder="Biografía, personalidad, historia…"
                  rows={6}
                  toolbar
                  defaultMode="edit"
                />
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)", background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                  <Mic2 size={12} className="text-primary/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">Capítulos narrados</span>
                </div>
                <BloqueCapsNarrados personajeId={form.id} />
              </div>
            </div>
          )}

          {/* LORE */}
          {tab === "lore" && !compacto && (
            <div className="p-4 space-y-3">
              <CampoLore label="Deseo" value={form.deseo ?? ""} onChange={v => setForm(f => ({ ...f, deseo: v }))}
                placeholder="Qué busca, qué quiere lograr, motivaciones profundas…" rows={6} />
              <CampoLore label="Historia" value={form.historia ?? ""} onChange={v => setForm(f => ({ ...f, historia: v }))}
                placeholder="Pasado, eventos clave, origen…" rows={6} />
              <CampoLore label="Características" value={form.caracteristicas ?? ""} onChange={v => setForm(f => ({ ...f, caracteristicas: v }))}
                placeholder="Rasgos físicos, personalidad, habilidades destacadas…" rows={6} />
            </div>
          )}

          {tab === "lore" && compacto && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-primary/20">
              <Scroll size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest">Vista reducida activa</p>
            </div>
          )}

          {/* MAGIA — Don + Hechizos del personaje */}
          {tab === "magia" && !compacto && (
            <BloqueHechizos personajeId={form.id} />
          )}

          {tab === "magia" && compacto && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-primary/20">
              <Sparkles size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest">Vista reducida activa</p>
            </div>
          )}

          {/* NOTAS */}
          {tab === "notas" && !compacto && (
            <div className="p-4 space-y-3">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
                style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
              >
                <Lock size={11} style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }}>
                  Solo visible para el creador
                </span>
              </div>
              <MarkdownEditor
                value={form.notas_creador ?? ""}
                onChange={v => setForm(f => ({ ...f, notas_creador: v }))}
                rows={16}
                placeholder="Ideas, pendientes, inspiración, spoilers… solo para ti."
                toolbar
                defaultMode="edit"
              />
            </div>
          )}

          {tab === "notas" && compacto && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-primary/20">
              <Lock size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest">Vista reducida activa</p>
            </div>
          )}
        </div>

        {/* ── Right column: full-body image (desktop only) ─────────────────── */}
        {!compacto && (
          <div className="hidden sm:flex w-36 shrink-0 border-l flex-col overflow-hidden"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
            <div className="flex-1 min-h-0">
              <SelectorImagen
                label=""
                value={form.img_cuerpo_url ?? ""}
                onChange={url => setForm(f => ({ ...f, img_cuerpo_url: url }))}
                aspect="full"
                placeholder={<Maximize2 size={20} className="opacity-20" />}
              />
            </div>
            <div className="shrink-0 px-2 py-1.5 border-t" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 block text-center">Cuerpo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EditorPersonaje ──────────────────────────────────────────────────────────
export function EditorPersonaje({
  item, onSaved, onDeleted,
}: {
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