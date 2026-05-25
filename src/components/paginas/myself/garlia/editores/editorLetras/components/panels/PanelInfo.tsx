"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Info, Loader2, CheckCircle2, User, Mic2, 
  PenLine, Globe, Beaker, FileText, Sparkles 
} from "lucide-react";
import { motion } from "framer-motion";
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


  // En PanelInfo.tsx, cambia la función doSave por esta:
const doSave = useCallback(async (data: typeof localData) => {
  clearTimeout(timer.current);
  setSaving(true);
  try {
    const { error } = await supabase
      .from("canciones")
      .update({
        cantante: data.cantante || null,
        compositor: data.compositor || null,
        // personaje: data.personaje || null, // <--- COMENTA O ELIMINA ESTA LÍNEA
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
    console.error("Error al guardar info:", e);
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 py-10 space-y-12"
    >
      {/* ── SECCIÓN: FICHA TÉCNICA ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-primary/5 pb-4">
          <div className="flex items-center gap-2 h-6">
             {saving && <span className="flex items-center gap-2 text-[8px] font-bold text-primary/20 uppercase tracking-tighter"><Loader2 size={10} className="animate-spin" /> Guardando...</span>}
             {saved && <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase tracking-tighter"><CheckCircle2 size={10} /> Sincronizado</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {[
            { label: "Vocal / Cantante", key: "cantante", icon: <Mic2 size={12}/>, placeholder: "Hatsune Miku, etc." },
            { label: "Compositor / Productor", key: "compositor", icon: <PenLine size={12}/>, placeholder: "Mitchie M, Deco*27..." },
            { label: "Personaje / Unidad", key: "personaje", icon: <User size={12}/>, placeholder: "Leo/need, 25-ji..." },
            { label: "Idioma de la Obra", key: "idioma", icon: <Globe size={12}/>, placeholder: "Japonés, Inglés..." },
          ].map((field) => (
            <div key={field.key} className="group space-y-2">
              <label className="text-[9px] font-black text-primary/25 uppercase tracking-[0.2em] flex items-center gap-2 group-focus-within:text-primary/50 transition-colors">
                {field.icon} {field.label}
              </label>
              <input 
                value={(localData as any)[field.key]} 
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full bg-transparent border-b border-primary/10 py-2 text-sm font-bold text-primary outline-none focus:border-primary/40 transition-all placeholder:text-primary/5"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── SECCIÓN: NOTAS Y CONTEXTO ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-primary/5 pb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40">
            <FileText size={16} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Contexto y Notas</h3>
            <p className="text-[9px] font-medium text-primary/30 uppercase tracking-widest">Historia, referencias y detalles creativos</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-primary/5 group-focus-within:bg-primary/20 transition-colors" />
          <textarea
            value={localData.info_cancion}
            onChange={e => handleChange("info_cancion", e.target.value)}
            rows={12}
            placeholder="Escribe aquí el trasfondo de la canción, referencias estéticas o notas de producción..."
            className="w-full bg-transparent py-2 text-sm text-primary/80 resize-none outline-none leading-relaxed placeholder:text-primary/10 placeholder:italic"
          />
        </div>
        
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-[0.2em] text-primary/15">
            <span className="flex items-center gap-1"><Sparkles size={10} /> Markdown soportado</span>
            <span>•</span>
            <span>Autoguardado inteligente</span>
          </div>
        </div>
      </section>
    </motion.div>
  );
};