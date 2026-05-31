"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Loader2, CheckCircle2, Mic2, Music,
  PenLine, Globe, Beaker, FileText, ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/api/client/supabase";
import { ESTADOS } from "../../constants";
import type { Cancion } from "../../types";

// Mapa de etiquetas legibles por estado
const ESTADO_LABEL: Record<string, string> = {
  "BORRADOR":   "Borrador",
  "EN PROCESO": "WIP",
  "TERMINADA":  "Terminada",
};

// Colores por estado (clases Tailwind inline)
const ESTADO_STYLES: Record<string, { active: string; dot: string }> = {
  "BORRADOR":   { active: "bg-primary/8 text-primary border-primary/20",         dot: "bg-primary/30" },
  "EN PROCESO": { active: "bg-amber-500/10 text-amber-400 border-amber-400/30",  dot: "bg-amber-400" },
  "TERMINADA":  { active: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30", dot: "bg-emerald-400" },
};

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
    titulo:      cancion.titulo      || "",
    cantante:    cancion.cantante    || "",
    compositor:  cancion.compositor  || "",
    idioma:      cancion.idioma      || "",
    info_cancion: cancion.info_cancion || "",
    estado:      (cancion.estado as Cancion["estado"]) || "BORRADOR",
  });

  const [suggestions, setSuggestions] = useState<{ [key: string]: string[] }>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [dirty,  setDirty]  = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const { data } = await supabase.from("canciones").select("cantante, compositor, idioma");
      if (data) {
        const unique = (field: string) =>
          Array.from(new Set(data.map((item: any) => item[field]).filter(Boolean))) as string[];
        setSuggestions({
          cantante:   unique("cantante"),
          compositor: unique("compositor"),
          idioma:     unique("idioma"),
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
          titulo:       data.titulo      || null,
          cantante:     data.cantante    || null,
          compositor:   data.compositor  || null,
          idioma:       data.idioma      || null,
          info_cancion: data.info_cancion || null,
          estado:       data.estado,
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

  // Para cambios de estado guardamos inmediatamente (sin debounce)
  const handleEstadoChange = (nuevoEstado: Cancion["estado"]) => {
    const newData = { ...localData, estado: nuevoEstado };
    setLocalData(newData);
    setDirty(true);
    setSaved(false);
    clearTimeout(timer.current);
    doSave(newData);
  };

  const getFilteredSuggestions = (field: string) => {
    const val = (localData as any)[field].toLowerCase();
    if (!val) return [];
    return (suggestions[field] || [])
      .filter(s => s.toLowerCase().includes(val) && s.toLowerCase() !== val)
      .slice(0, 5);
  };

  const estadoActual = ESTADO_STYLES[localData.estado] ?? ESTADO_STYLES["BORRADOR"];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto px-6 py-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40">
            <Beaker size={16} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Ficha Técnica</h3>
            <p className="text-[9px] font-medium text-primary/30 uppercase tracking-widest">Metadatos y créditos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 size={10} className="animate-spin text-primary/20" />}
          {saved  && <CheckCircle2 size={10} className="text-emerald-500" />}
        </div>
      </div>

      {/* DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* COLUMNA IZQUIERDA */}
        <section className="space-y-8">

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-primary/25 uppercase tracking-[0.2em] flex items-center gap-2">
              {/* Dot de color dinámico */}
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${estadoActual.dot}`} />
              Estado
            </label>
            <div className="flex gap-2">
              {([...ESTADOS] as Cancion["estado"][]).map((e) => {
                const isActive = localData.estado === e;
                const styles = ESTADO_STYLES[e] ?? ESTADO_STYLES["BORRADOR"];
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handleEstadoChange(e)}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      isActive
                        ? styles.active
                        : "border-primary/10 text-primary/30 hover:border-primary/25 hover:text-primary/50"
                    }`}
                  >
                    {ESTADO_LABEL[e] ?? e}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div className="group relative space-y-2">
            <label className="text-[9px] font-black text-primary/25 uppercase tracking-[0.2em] flex items-center gap-2 group-focus-within:text-primary/50 transition-colors">
              <Music size={12} /> Título
            </label>
            <input
              value={localData.titulo}
              onChange={(e) => handleChange("titulo", e.target.value)}
              className="w-full bg-transparent border-b border-primary/10 py-2 text-sm font-bold text-primary outline-none focus:border-primary/40 transition-all"
              placeholder="Nombre de la canción..."
            />
          </div>

          {/* Cantante / Compositor / Idioma con sugerencias */}
          {[
            { label: "Cantante",   key: "cantante",   icon: <Mic2 size={12}/>,    placeholder: "Hatsune Miku..." },
            { label: "Compositor", key: "compositor", icon: <PenLine size={12}/>, placeholder: "Deco*27..." },
            { label: "Idioma",     key: "idioma",     icon: <Globe size={12}/>,   placeholder: "Japonés..." },
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
        </section>

        {/* COLUMNA DERECHA — notas */}
        <section className="space-y-4 flex flex-col h-full">
          <div className="flex items-center gap-3 border-b border-primary/5 pb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/40">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Contexto y Notas</h3>
            </div>
          </div>
          <textarea
            value={localData.info_cancion}
            onChange={e => handleChange("info_cancion", e.target.value)}
            className="flex-1 w-full bg-transparent border-l-2 border-primary/5 focus:border-primary/20 px-4 text-sm text-primary/80 outline-none transition-all resize-none min-h-[300px]"
          />
        </section>

      </div>
    </motion.div>
  );
};