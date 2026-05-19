"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Info, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";

export const PanelInfo = ({
  cancionId,
  infoInicial,
  onInfoChange,
}: {
  cancionId: string;
  infoInicial: string | null | undefined;
  onInfoChange: (v: string) => void;
}) => {
  const [texto,  setTexto]  = useState(infoInicial || "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [dirty,  setDirty]  = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    setTexto(infoInicial || "");
    setDirty(false);
    setSaved(false);
  }, [cancionId, infoInicial]);

  const doSave = useCallback(async (val: string) => {
    clearTimeout(timer.current);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("canciones")
        .update({ info_cancion: val || null })
        .eq("id", cancionId);
      if (error) throw error;
      onInfoChange(val);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("PanelInfo save:", e);
    }
    setSaving(false);
  }, [cancionId, onInfoChange]);

  const onChange = (val: string) => {
    setTexto(val);
    setDirty(true);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(val), 1500);
  };

  const rows = Math.max(8, texto.split("\n").length + 2);

  return (
    <div className="px-8 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
            <Info size={10} /> Información de la Canción
          </p>
          <p className="text-[8px] text-primary/20 font-bold uppercase tracking-widest mt-0.5">
            Concepto, historia, referencias, notas de producción…
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
          {saving  && <Loader2 size={10} className="animate-spin text-primary/30" />}
          {saved   && <CheckCircle2 size={10} className="text-emerald-400" />}
          {dirty && !saving && !saved && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </span>
      </div>

      <textarea
        value={texto}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); doSave(texto); } }}
        rows={rows}
        spellCheck
        placeholder={`Escribe todo lo que quieras recordar sobre esta canción:\n\n• De dónde surgió la idea\n• Qué emociones busca transmitir\n• Referencias visuales o musicales\n• Notas de producción\n• Historia detrás de la letra\n• Cualquier otra nota…`}
        className="w-full bg-bg-main/60 border border-primary/10 rounded-xl px-4 py-3 text-sm text-primary resize-none outline-none transition-colors placeholder:text-primary/15 leading-relaxed focus:border-primary/30"
      />

      <p className="text-[8px] text-primary/20 font-bold uppercase tracking-widest">
        Ctrl+S para guardar · se guarda solo al dejar de escribir
      </p>
    </div>
  );
};
