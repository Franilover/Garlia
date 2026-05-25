"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Info, Loader2, CheckCircle2, User, Mic2, 
  PenLine, Globe, Beaker, FileText, Sparkles, ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    idioma: cancion.idioma || "",
    info_cancion: cancion.info_cancion || ""
  });

  // Estados para sugerencias
  const [suggestions, setSuggestions] = useState<{ [key: string]: string[] }>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [dirty,  setDirty]  = useState(false);
  const timer = useRef<any>(null);

  // 1. Cargar sugerencias únicas de la base de datos al montar el componente
  useEffect(() => {
    const fetchSuggestions = async () => {
      const { data } = await supabase.from("canciones").select("cantante, compositor, idioma");
      if (data) {
        const unique = (field: string) => 
          Array.from(new Set(data.map(item => item[field]).filter(Boolean))) as string[];
        
        setSuggestions({
          cantante: unique("cantante"),
          compositor: unique("compositor"),
          idioma: unique("idioma")
        });
      }
    };
    fetchSuggestions();
  }, []);

  const doSave = useCallback(async (data: typeof localData) => {
    clearTimeout(timer.current);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("canciones")
        .update({
          cantante: data.cantante || null,
          compositor: data.compositor || null,
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
      console.error("Error al guardar:", e);
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

  // Filtrar sugerencias basadas en lo que se está escribiendo
  const getFilteredSuggestions = (field: string) => {
    const val = (localData as any)[field].toLowerCase();
    if (!val) return [];
    return (suggestions[field] || []).filter(s => 
      s.toLowerCase().includes(val) && s.toLowerCase() !== val
    ).slice(0, 5); // Mostrar máximo 5
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40"><Beaker size={16} /></div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Ficha Técnica</h3>
              <p className="text-[9px] font-medium text-primary/30 uppercase tracking-widest">Metadatos y créditos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             {saving && <Loader2 size={10} className="animate-spin text-primary/20" />}
             {saved && <CheckCircle2 size={10} className="text-emerald-500" />}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {[
            { label: "Vocal / Cantante", key: "cantante", icon: <Mic2 size={12}/>, placeholder: "Hatsune Miku..." },
            { label: "Compositor / Productor", key: "compositor", icon: <PenLine size={12}/>, placeholder: "Deco*27..." },
            { label: "Idioma", key: "idioma", icon: <Globe size={12}/>, placeholder: "Japonés..." },
          ].map((field) => {
            const filtered = getFilteredSuggestions(field.key);
            return (
              <div key={field.key} className="group relative space-y-2">
                <label className="text-[9px] font-black text-primary/25 uppercase tracking-[0.2em] flex items-center gap-2 group-focus-within:text-primary/50 transition-colors">
                  {field.icon} {field.label}
                </label>
                <input 
                  value={(localData as any)[field.key]} 
                  onFocus={() => setActiveField(field.key)}
                  onBlur={() => setTimeout(() => setActiveField(null), 200)}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full bg-transparent border-b border-primary/10 py-2 text-sm font-bold text-primary outline-none focus:border-primary/40 transition-all"
                  placeholder={field.placeholder}
                />
                
                {/* LISTA DE SUGERENCIAS */}
                <AnimatePresence>
                  {activeField === field.key && filtered.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-10 w-full mt-1 bg-bg-main border border-primary/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    >
                      {filtered.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleChange(field.key, s)}
                          className="w-full px-4 py-2 text-left text-[10px] font-bold text-primary/60 hover:bg-primary/5 hover:text-primary transition-colors flex items-center justify-between group"
                        >
                          {s}
                          <ChevronDown size={10} className="-rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECCIÓN: NOTAS ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-primary/5 pb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40"><FileText size={16} /></div>
          <div><h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Contexto y Notas</h3></div>
        </div>
        <textarea
          value={localData.info_cancion}
          onChange={e => handleChange("info_cancion", e.target.value)}
          rows={10}
          className="w-full bg-transparent border-l-2 border-primary/5 focus:border-primary/20 px-4 text-sm text-primary/80 outline-none transition-all"
        />
      </section>
    </motion.div>
  );
};