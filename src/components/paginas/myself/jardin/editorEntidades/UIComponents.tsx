"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Loader2, AlertCircle, CheckCircle2, ChevronDown,
  Image as ImageIcon, X, Save, Trash2,
} from "lucide-react";
import SimpleImagePicker from "@/components/forms/SimpleImagePicker";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS, type SaveStatus } from "./types";
import { MarkdownEditor } from "../../../../forms/MarkdownEditor";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map = {
    saving: { icon: <Loader2 size={11} className="animate-spin" />, text: "Guardando…", cls: "text-primary/40" },
    saved:  { icon: <CheckCircle2 size={11} />,                     text: "Guardado",   cls: "text-emerald-400" },
    error:  { icon: <AlertCircle  size={11} />,                     text: "Error",      cls: "text-red-400" },
  }[status];
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${map.cls}`}>
      {map.icon} {map.text}
    </span>
  );
}

export function Campo({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <input value={value} onChange={onChange} placeholder={placeholder} className={INPUT_CLS} />
    </div>
  );
}

export function CampoArea({ label, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number;
}) {
  const handleChange = (v: string) => {
    onChange({ target: { value: v } } as React.ChangeEvent<HTMLTextAreaElement>);
  };
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <MarkdownEditor value={value} onChange={handleChange} placeholder={placeholder} rows={rows} toolbar defaultMode="split" />
    </div>
  );
}

export function BarraAcciones({ status, onSave, onDelete }: {
  status: SaveStatus; onSave: () => void; onDelete: () => void;
}) {
  return (
    <div
      className="shrink-0 sticky bottom-0 z-10 px-4 py-3 flex items-center justify-between gap-3 border-t border-primary/8"
      style={{ background: "color-mix(in srgb, var(--bg-main) 95%, transparent)", backdropFilter: "blur(8px)" }}
    >
      <SaveIndicator status={status} />
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all min-h-[36px]">
          <Trash2 size={11} /> <span className="hidden xs:inline">Eliminar</span>
        </button>
        <button onClick={onSave}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 min-h-[36px]">
          <Save size={11} /> Guardar
        </button>
      </div>
    </div>
  );
}

export function SelectorImagen({ label, value, onChange, aspect, placeholder }: {
  label: string; value: string; onChange: (url: string) => void;
  aspect: "square" | "portrait" | "landscape" | "video" | "full"; placeholder?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const aspectCls =
    aspect === "square"    ? "aspect-square" :
    aspect === "portrait"  ? "aspect-[3/4]"  :
    aspect === "landscape" ? "aspect-video"  :
    aspect === "full"      ? "h-full"        :
    "aspect-video";

  const fitCls = aspect === "landscape" ? "object-contain" : "object-cover";

  return (
    <div className={`flex flex-col gap-1.5 ${aspect === "full" ? "h-full" : ""}`}>
      {label && <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 shrink-0">{label}</label>}

      <div
        onClick={() => setOpen(true)}
        className={`relative ${aspectCls} ${aspect === "full" ? "flex-1" : ""} rounded-none overflow-hidden border-0 bg-primary/4 cursor-pointer group`}
      >
        {value ? (
          <>
            <img src={value} alt={label} className={`w-full h-full ${fitCls} transition-transform duration-300 group-hover:scale-105`} />
            <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
              <ImageIcon size={18} className="text-white" />
              <span className="text-[9px] font-black uppercase text-white tracking-widest">Cambiar</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 hover:bg-red-500/80 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={10} className="text-white" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-primary/20 hover:text-primary/40 transition-colors">
            {placeholder ?? <ImageIcon size={24} />}
            <span className="text-[9px] font-black uppercase tracking-widest">Elegir imagen</span>
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white-custom rounded-t-2xl sm:rounded-2xl shadow-2xl border border-primary/15 w-full sm:max-w-lg p-5 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <ImageIcon size={11} /> {label}
              </h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onSelect={url => { onChange(url); setOpen(false); }}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SelectorTexto({ label, value, onChange, opciones, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  opciones: string[]; placeholder?: string;
}) {
  const [open,  setOpen]  = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onChange(input);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, input, onChange]);

  const filtradas = useMemo(
    () => opciones.filter(o => normalize(o).includes(normalize(input))),
    [opciones, input]
  );

  const select = (v: string) => { setInput(v); onChange(v); setOpen(false); };

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">{label}</label>
      <div className="relative">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onChange(e.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={INPUT_CLS + " pr-8"}
        />
        <button
          type="button" onClick={() => setOpen(o => !o)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
        >
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (filtradas.length > 0 || (input.trim() && !opciones.includes(input.trim()))) && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {filtradas.map(o => (
              <button key={o} onMouseDown={() => select(o)}
                className="w-full px-3 py-2 text-left text-xs font-medium text-primary/70 hover:bg-primary/8 hover:text-primary transition-colors">
                {o}
              </button>
            ))}
            {input.trim() && !opciones.includes(input.trim()) && (
              <button onMouseDown={() => select(input.trim())}
                className="w-full px-3 py-2 text-left text-xs font-medium text-primary/40 hover:bg-primary/5 transition-colors italic">
                Usar "{input.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}