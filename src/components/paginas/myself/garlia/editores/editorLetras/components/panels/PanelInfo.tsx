"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Info, Loader2, CheckCircle2, User, Mic2, PenLine, Globe, Beaker } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";

export const PanelInfo = ({
  cancionId,
  cancion,
  onCancionUpdate,
}: {
  cancionId: string;
  cancion: any;
  onCancionUpdate: (updates: any) => void;
}) => {
  // Estado local para evitar lag al escribir
  const [localData, setLocalData] = useState({
    cantante: cancion.cantante || "",
    compositor: cancion.compositor || "",
    personaje: cancion.personaje || "",
    idioma: cancion.idioma || "",
    info_cancion: cancion.info_cancion || ""
  });

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [dirty,  setDirty]  = useState(false);
  const timer = useRef<any>(null);

  // Sincronizar si cambian los datos externos (pero no si estamos escribiendo)
  useEffect(() => {
    if (!dirty) {
      setLocalData({
        cantante: cancion.cantante || "",
        compositor: cancion.compositor || "",
        personaje: cancion.personaje || "",
        idioma: cancion.idioma || "",
        info_cancion: cancion.info_cancion || ""
      });
    }
  }, [cancion, dirty]);

  const doSave = useCallback(async (data: typeof localData) => {
    clearTimeout(timer.current);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("canciones")
        .update({
          cantante: data.cantante || null,
          compositor: data.compositor || null,
          personaje: data.personaje || null,
          idioma: data.idioma || null,
          info_cancion: data.info_cancion || null
        })
        .eq("id", cancionId);

      if (error) throw error;
      
      onCancionUpdate(data);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("PanelInfo save:", e);
    }
    setSaving(false);
  }, [cancionId, onCancionUpdate]);

  const handleChange = (field: string, value: string) => {
    const newData = { ...localData, [field]: value };
    setLocalData(newData);
    setDirty(true);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(newData), 1500);
  };

  const rows = Math.max(8, localData.info_cancion.split("\n").length + 2);

  return (
    <div className="px-4 sm:px-8 py-6 space-y-8">
      {/* ── SECCIÓN 1: FICHA TÉCNICA ── */}
      <section className="bg-primary/[0.03] border border-primary/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center gap-2">
            <Beaker size={14} /> Ficha Técnica
          </h3>
          <div className="flex items-center gap-2">
             {saving && <Loader2 size={12} className="animate-spin text-primary/30" />}
             {saved && <CheckCircle2 size={12} className="text-emerald-400" />}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {[
            { label: "Cantante / Vocal", key: "cantante", icon: <Mic2 size={12}/>, placeholder: "Ej: Hatsune Miku" },
            { label: "Productor / Autor", key: "compositor", icon: <PenLine size={12}/>, placeholder: "Ej: Iyowa" },
            { label: "Personaje / Grupo", key: "personaje", icon: <User size={12}/>, placeholder: "Ej: More More Jump!" },
            { label: "Idioma Original", key: "idioma", icon: <Globe size={12}/>, placeholder: "Ej: Japonés" },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-[9px] font-bold text-primary/30 uppercase ml-1 flex items-center gap-1.5">
                {field.icon} {field.label}
              </label>
              <input 
                value={(localData as any)[field.key]} 
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full bg-bg-main border border-primary/10 rounded-xl px-4 py-2.5 text-xs font-bold text-primary outline-none focus:border-primary/30 focus:bg-primary/[0.02] transition-all placeholder:text-primary/10"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── SECCIÓN 2: NOTAS ADICIONALES ── */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center gap-2">
          <Info size={14} /> Notas y Referencias
        </h3>
        <textarea
          value={localData.info_cancion}
          onChange={e => handleChange("info_cancion", e.target.value)}
          rows={rows}
          placeholder={`Escribe todo lo que quieras recordar...\n• Idea original\n• Emociones\n• Referencias visuales...`}
          className="w-full bg-bg-main/60 border border-primary/10 rounded-xl px-4 py-3 text-sm text-primary resize-none outline-none transition-colors placeholder:text-primary/15 leading-relaxed focus:border-primary/30"
        />
        <p className="text-[8px] text-primary/20 font-bold uppercase tracking-widest text-right">
          Se guarda automáticamente al dejar de escribir
        </p>
      </section>
    </div>
  );
};