"use client";

import React, { useState, useEffect } from "react";
import {
  Edit3, X, Eye, EyeOff, Save, Trash2,
  User, ChevronRight, Globe, Mic2, PenTool,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/api/client/supabase";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { SmartImage } from "@/components/display/SmartImage";
import EntidadPageBase from "@/components/templates/GaleriaBase";
import { Btn, BtnIcon, Badge } from "@/components/ui";

const ESTADOS = ["BORRADOR", "EN PROCESO", "TERMINADA"];
const IDIOMAS_DISPONIBLES = ["Español", "Inglés", "Japonés"];
const TEMAS_DISPONIBLES = [
  "Relaciones", "Identidad", "Realidad", "Nostalgia", "Deseo",
  "Existencialismo", "Conflicto", "Escapismo", "Superación",
  "Misticismo", "Naturaleza", "Cotidianidad",
];
const EMOCIONES_DISPONIBLES = [
  "Enérgica", "Melancólica", "Relajada", "Agresiva", "Optimista",
  "Íntima", "Atmosférica", "Misteriosa", "Épica", "Ansiosa", "Cálida", "Fría",
];
const PLANTILLA_NUEVA_CANCION = {
  titulo: "", personaje: null, estado: "BORRADOR", visible: false,
  portada_url: "/placeholder-cover.jpg", cantante: "", compositor: "",
  idioma: "Español", tema: null, emocion: null,
};

const getEstadoColor = (estado: string) => {
  const colores: Record<string, string> = {
    TERMINADA:    "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    "EN PROCESO": "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    BORRADOR:     "bg-primary/10 text-primary/60 border-primary/20",
  };
  return colores[estado] || colores["BORRADOR"];
};

const selectCls = "w-full bg-bg-main border border-primary/10 py-4 px-6 rounded-[var(--radius-btn)] text-sm font-black text-primary uppercase outline-none appearance-none focus:border-primary/30 transition-all";
const inputCls  = "w-full bg-bg-main border border-primary/10 py-4 px-6 rounded-[var(--radius-btn)] text-sm font-black text-primary uppercase outline-none focus:border-primary/30 transition-all";

const CancionCard = ({ cancion, onClick, vistaFila }: { cancion: any; onClick: () => void; vistaFila: boolean }) => {
  if (vistaFila) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={onClick}
        className="group relative flex items-center justify-between gap-4 bg-white-custom/50 hover:bg-white-custom/80 backdrop-blur-sm border border-primary/10 hover:border-primary/20 rounded-[var(--radius-btn)] px-6 py-4 transition-all duration-300 cursor-pointer">
        <h2 className="text-primary font-black uppercase text-sm group-hover:text-[var(--accent)] transition-colors tracking-tighter italic truncate">
          {cancion.titulo}
        </h2>
      </motion.div>
    );
  }

  return (
    <div className="relative group h-full">
      <Link href={`/wiki/canciones/${cancion.id}`}>
        <motion.div whileHover={{ y: -12 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="cursor-pointer h-full flex flex-col">
          <div className="relative aspect-square rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10 bg-linear-to-br from-primary/10 to-primary/5 group-hover:shadow-[0_20px_40px_rgba(107,94,112,0.15)] transition-all duration-500">
            <SmartImage src={cancion.portada_url || "/placeholder-cover.jpg"} alt={cancion.titulo}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-linear-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`absolute top-6 left-6 z-20 backdrop-blur-md px-4 py-2 rounded-full border font-black text-[9px] uppercase tracking-widest shadow-lg ${getEstadoColor(cancion.estado)}`}>
              {cancion.estado}
            </div>
            {cancion.personaje && (
              <div className="absolute bottom-6 right-6 z-20 bg-white-custom/95 backdrop-blur-md px-4 py-2 rounded-full border border-primary/20 flex items-center gap-2 shadow-lg">
                <User size={11} className="text-primary" />
                <span className="text-[9px] font-black text-primary uppercase italic tracking-tighter">{cancion.personaje}</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
              <div className="bg-white-custom/90 p-5 rounded-full shadow-2xl backdrop-blur-sm border border-primary/10">
                <ChevronRight size={32} className="text-primary ml-1" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex-1 flex flex-col px-2">
            <h2 className="text-primary font-black uppercase text-lg group-hover:text-[var(--accent)] transition-colors leading-tight tracking-tighter italic line-clamp-2">{cancion.titulo}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-primary/40 font-bold text-[8px] uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><Mic2 size={10} /> {cancion.cantante || "N/A"}</span>
              <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><PenTool size={10} /> {cancion.compositor || "N/A"}</span>
              <span className="flex items-center gap-2 group-hover:text-primary transition-colors"><Globe size={10} /> {cancion.idioma || "Español"}</span>
            </div>
          </div>
        </motion.div>
      </Link>
      <BtnIcon onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} variant="ghost"
        className="absolute top-4 right-4 z-50 bg-white-custom/95 shadow-2xl opacity-0 group-hover:opacity-100 backdrop-blur-sm border-primary/20">
        <Edit3 size={16} />
      </BtnIcon>
    </div>
  );
};

const CancionModal = ({ selected, isCreating, onClose, onUpdate }: {
  selected: any; isCreating: boolean; onClose: () => void; onUpdate: (data: any) => void;
}) => {
  const isOpen = !!selected || isCreating;
  const { data: listaPersonajes = [] } = useSupabaseData("personajes", { order: { campo: "nombre", asc: true } });
  const emptyForm = { titulo: "", personaje: "", estado: "BORRADOR", visible: false, portada_url: "", cantante: "", compositor: "", idioma: "Español", tema: "", emocion: "" };
  const [form, setForm]               = useState(emptyForm);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setForm(selected ? {
      titulo: selected.titulo || "", personaje: selected.personaje || "", estado: selected.estado || "BORRADOR",
      visible: selected.visible || false, portada_url: selected.portada_url || "", cantante: selected.cantante || "",
      compositor: selected.compositor || "", idioma: selected.idioma || "Español", tema: selected.tema || "", emocion: selected.emocion || "",
    } : emptyForm);
  }, [selected]);

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload = {
        titulo: form.titulo.toUpperCase(), personaje: form.personaje || null, estado: form.estado,
        visible: isCreating ? false : form.visible, portada_url: form.portada_url || "/placeholder-cover.jpg",
        cantante: form.cantante, compositor: form.compositor, idioma: form.idioma,
        tema: form.tema || null, emocion: form.emocion || null,
      };
      if (isCreating) {
        const { data, error } = await supabase.from("canciones").insert([payload]).select();
        if (error) throw error;
        if (data) onUpdate(data[0]);
      } else {
        const { data, error } = await supabase.from("canciones").update(payload).eq("id", selected.id).select();
        if (error) throw error;
        if (data) onUpdate(data[0]);
      }
      onClose();
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const handleDelete = async () => {
    if (!confirm("¿Seguro que quieres borrar este soliloquio?")) return;
    const { error } = await supabase.from("canciones").delete().eq("id", selected.id);
    if (!error) { onUpdate(null); onClose(); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white-custom w-full max-w-3xl rounded-[var(--radius-card)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 sm:p-12 overflow-y-auto">

              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-[var(--radius-btn)] shadow-lg shadow-primary/20" style={{ color: "var(--btn-text)" }}>
                    <Edit3 size={20} />
                  </div>
                  <h3 className="text-primary font-black uppercase text-[12px] tracking-[0.4em] italic">
                    {isCreating ? "Nuevo Soliloquio" : "Ajustes del Soliloquio"}
                  </h3>
                </div>
                <BtnIcon variant="ghost" onClick={onClose} className="border-none text-primary/40 hover:text-primary">
                  <X size={24} />
                </BtnIcon>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Título</label>
                    <input className={inputCls} value={form.titulo} onChange={e => set("titulo", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Personaje</label>
                    <select className={selectCls} value={form.personaje} onChange={e => set("personaje", e.target.value)}>
                      <option value="">Ninguno</option>
                      {listaPersonajes.map((p: any) => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(["cantante", "compositor"] as const).map(field => (
                    <div key={field} className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">{field}</label>
                      <input className={inputCls} value={form[field]} onChange={e => set(field, e.target.value)} />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Idioma</label>
                    <select className={selectCls} value={form.idioma} onChange={e => set("idioma", e.target.value)}>
                      {IDIOMAS_DISPONIBLES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Tema / Motivo</label>
                    <select className={selectCls} value={form.tema} onChange={e => set("tema", e.target.value)}>
                      <option value="">Sin tema</option>
                      {TEMAS_DISPONIBLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Emoción / Temple</label>
                    <select className={selectCls} value={form.emocion} onChange={e => set("emocion", e.target.value)}>
                      <option value="">Sin emoción</option>
                      {EMOCIONES_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Estado</label>
                    <div className="flex gap-2 p-1 bg-bg-main border border-primary/10 rounded-[var(--radius-btn)]">
                      {ESTADOS.map(est => (
                        <button key={est} type="button" onClick={() => set("estado", est)}
                          className={`flex-1 py-3 rounded-[var(--radius-btn)] text-[9px] font-black transition-all ${
                            form.estado === est ? "bg-primary shadow-lg" : "text-primary/40 hover:bg-primary/5"
                          }`}
                          style={form.estado === est ? { color: "var(--btn-text)" } : {}}>
                          {est}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!isCreating && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-primary/40 ml-4 tracking-widest">Visibilidad</label>
                      <button type="button" onClick={() => set("visible", !form.visible)}
                        className={`w-full flex items-center justify-between py-4 px-6 rounded-[var(--radius-btn)] border-[length:var(--border-width)] transition-all ${
                          form.visible ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "border-primary/20 bg-primary/5 text-primary/60"
                        }`}>
                        <span className="text-[10px] font-black uppercase tracking-widest">{form.visible ? "Público" : "Privado"}</span>
                        {form.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Btn type="submit" loading={isProcessing} icon={<Save size={18} />} className="flex-[2] py-5 shadow-xl shadow-primary/20" size="lg">
                    {isCreating ? "Crear Soliloquio" : "Guardar Cambios"}
                  </Btn>
                  {!isCreating && (
                    <Btn type="button" variant="danger" icon={<Trash2 size={18} />} onClick={handleDelete} loading={isProcessing} className="flex-1 py-5" size="lg">
                      Borrar
                    </Btn>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function CancionesPage() {
  return (
    <EntidadPageBase
      tabla="canciones"
      titulo="Soliloquios"
      configFiltros={["personaje", "cantante", "compositor", "idioma", "tema", "emocion"]}
      plantillaNueva={PLANTILLA_NUEVA_CANCION}
      mostrarBusqueda={true}
      campoBusqueda="titulo"
      permitirVistaFila={true}
      getCustomTags={(item) => [item.estado, item.idioma, item.tema].filter(Boolean)}
      renderModal={(selected, isCreating, onClose, onUpdate) => (
        <CancionModal selected={selected} isCreating={isCreating} onClose={onClose} onUpdate={onUpdate} />
      )}
      renderCard={(item, onClick, vistaFila) => (
        <CancionCard key={item.id} cancion={item} onClick={onClick} vistaFila={vistaFila} />
      )}
    />
  );
}