"use client";

import React, { useState } from "react";
import { Pencil, X, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { ModalBase, CampoInput } from "@/components/templates/EstudioTemplates";
import { SelectPersonaje, SelectIdioma } from "@/hooks/useEditorShared";
import { InputConSugerencias } from "../InputConSugerencias";
import { ESTADOS } from "../../constants";
import type { Cancion } from "../../types";

export const ModalEditarCancion = ({
  cancion,
  onSaved,
  onClose,
}: {
  cancion: Cancion;
  onSaved: (c: Cancion) => void;
  onClose: () => void;
}) => {
  const [titulo,      setTitulo]      = useState(cancion.titulo);
  const [personaje,   setPersonaje]   = useState(cancion.personaje  || "");
  const [cantante,    setCantante]    = useState(cancion.cantante   || "");
  const [compositor,  setCompositor]  = useState(cancion.compositor || "");
  const [idioma,      setIdioma]      = useState(cancion.idioma     || "");
  const [estado,      setEstado]      = useState<Cancion["estado"]>(cancion.estado);
  const [visible,     setVisible]     = useState(cancion.visible);
  const [duracionStr, setDuracionStr] = useState(() => {
    const d = cancion.duracion_segundos;
    if (!d) return "";
    const m = Math.floor(d / 60);
    const s = d % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const parseDuracion = (str: string): number | null => {
    if (!str.trim()) return null;
    const parts = str.split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0]);
      const s = parseInt(parts[1]);
      if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
    }
    const plain = parseInt(str);
    return isNaN(plain) ? null : plain;
  };

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    setError("");
    try {
      const updates: any = {
        titulo: titulo.trim().toUpperCase(),
        personaje:  personaje.trim()  || null,
        cantante:   cantante.trim()   || null,
        compositor: compositor.trim() || null,
        idioma:     idioma.trim()     || null,
        estado,
        visible,
        duracion_segundos: parseDuracion(duracionStr),
      };
      const { data, error: err } = await supabase
        .from("canciones")
        .update(updates)
        .eq("id", cancion.id)
        .select()
        .single();
      if (err) throw err;
      onSaved(data as Cancion);
      onClose();
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    }
    setSaving(false);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 italic flex items-center gap-2">
          <Pencil size={12} /> Editar Canción
        </h3>
        <button type="button" onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
      </div>

      <div className="space-y-4 mt-4">
        <CampoInput label="Título *" value={titulo} onChange={setTitulo} placeholder="NOMBRE DE LA CANCIÓN…" autoFocus />
        <SelectPersonaje value={personaje} onChange={setPersonaje} />
        <div className="grid grid-cols-2 gap-3">
          <InputConSugerencias label="Cantante"   value={cantante}   onChange={setCantante}   placeholder="Cantante…"   tabla="canciones" columna="cantante" />
          <InputConSugerencias label="Compositor" value={compositor} onChange={setCompositor} placeholder="Compositor…" tabla="canciones" columna="compositor" />
        </div>
        <SelectIdioma value={idioma} onChange={setIdioma} />

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Duración (mm:ss)</label>
          <input
            type="text"
            value={duracionStr}
            onChange={e => setDuracionStr(e.target.value)}
            placeholder="3:42"
            className="w-full bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-[11px] font-bold text-primary outline-none focus:border-primary/30 transition-colors placeholder:text-primary/20"
          />
          <p className="text-[8px] text-primary/25 font-bold uppercase tracking-widest">
            Usado para el slider del karaoke · formato min:seg
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Estado</label>
          <div className="flex gap-2">
            {ESTADOS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEstado(e)}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  estado === e ? "bg-primary text-bg-main border-primary" : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary"
                }`}
              >
                {e === "EN PROCESO" ? "WIP" : e}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Visibilidad</label>
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center justify-center gap-2 transition-all ${
              visible
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "border-primary/15 text-primary/40 hover:border-primary/30 hover:text-primary"
            }`}
          >
            {visible ? <><Eye size={12} /> Visible para lectores</> : <><EyeOff size={12} /> Oculta</>}
          </button>
        </div>

        {error && <p className="text-[9px] font-black uppercase text-red-400 tracking-widest">⚠ {error}</p>}

        <button
          type="button"
          disabled={saving || !titulo.trim()}
          onClick={handleSave}
          className="w-full bg-primary text-bg-main py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" />Guardando…</>
            : <><Check size={13} />Guardar Cambios</>
          }
        </button>
      </div>
    </ModalBase>
  );
};
