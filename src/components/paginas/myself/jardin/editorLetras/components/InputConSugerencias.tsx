"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Check, Plus } from "lucide-react";
import { useValoresUnicos } from "../hooks/useValoresUnicos";

export const InputConSugerencias = ({
  label, value, onChange, placeholder, tabla, columna,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tabla: string;
  columna: string;
}) => {
  const sugerencias = useValoresUnicos(tabla, columna);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtradas = useMemo(
    () => sugerencias.filter(s => s.toLowerCase().includes(value.toLowerCase().trim())),
    [sugerencias, value]
  );

  const esNuevo = value.trim() && !sugerencias.includes(value.trim());

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
      <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-medium text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/20"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary/60 transition-colors"
          >
            <X size={13} />
          </button>
        )}

        {open && (filtradas.length > 0 || esNuevo) && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-primary/15 shadow-xl overflow-hidden max-h-48 overflow-y-auto"
            style={{ background: "var(--white-custom)" }}
          >
            {filtradas.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-primary/8 transition-colors flex items-center justify-between ${
                  value === s ? "text-primary" : "text-primary/70"
                }`}
              >
                <span>{s}</span>
                {value === s && <Check size={11} className="text-primary shrink-0" />}
              </button>
            ))}
            {esNuevo && (
              <>
                {filtradas.length > 0 && <div className="h-px bg-primary/8 mx-3" />}
                <button
                  type="button"
                  onClick={() => { onChange(value.trim()); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-primary/8 transition-colors flex items-center gap-2 text-primary/50"
                >
                  <Plus size={11} /> Usar «{value.trim()}»
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
