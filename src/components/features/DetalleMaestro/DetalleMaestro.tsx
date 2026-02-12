"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Edit3, Save, Plus, Music, Users, 
  CheckCircle2, Fingerprint, Ghost, Trash2
} from "lucide-react";
import Relaciones from "./relaciones"; 
import { useDetalleMaestro, type Variante } from "@/hooks/useDetalleMaestro"; 
import { SeccionMusica, SelectorMusicaAdmin } from "./SeccionMusica";

interface DetalleMaestroProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  tags?: string[];
  onUpdate?: () => Promise<void>;
  isNew?: boolean; 
  mostrarMusica?: boolean;
}

export default function DetalleMaestro({ 
  isOpen, onClose, data, tags = [], onUpdate, isNew = false, mostrarMusica = true 
}: DetalleMaestroProps) {
  const [internalData, setInternalData] = useState(data);

  useEffect(() => {
    if (isNew) {
      const esPosiblePersonaje = tags.some(t => t.toLowerCase().includes("personaje"));
      setInternalData({ 
        nombre: "", 
        [esPosiblePersonaje ? "sobre" : "descripcion"]: "", 
        id: null 
      });
    } else {
      setInternalData(data);
    }
  }, [data, isNew, tags]);

  if (!isOpen) return null;

  return (
    <DetalleContenido 
      data={internalData} 
      onClose={onClose} 
      tags={tags} 
      onUpdate={onUpdate}
      isNew={isNew}
      mostrarMusica={mostrarMusica}
    />
  );
}

function DetalleContenido({ data, onClose, tags, onUpdate, isNew, mostrarMusica }: any) {
  const {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones, setEditRelaciones
  } = useDetalleMaestro(data, onUpdate);

  const [showSuccess, setShowSuccess] = useState(false);

  const esPersonaje = ("sobre" in data) || tags.some((t: string) => t.toLowerCase().includes("personaje"));
  const esCriatura = !esPersonaje;

  useEffect(() => {
    if (isNew) setEditMode(true);
  }, [isNew, setEditMode]);

  const agregarVariante = () => {
    const nueva: Variante = {
      tipo: "Nueva Variante",
      descripcion_variante: "",
      imagen_url: "",
      criatura_id: data?.id || null
    };
    setVariantes([...variantes, nueva]);
  };

  const eliminarVariante = (index: number) => {
    const nuevas = variantes.filter((_, i) => i !== index);
    setVariantes(nuevas);
    if (varianteActiva === variantes[index]) setVarianteActiva(null);
  };

  const actualizarVariante = (index: number, campo: keyof Variante, valor: string) => {
    const nuevas = [...variantes];
    nuevas[index] = { ...nuevas[index], [campo]: valor };
    setVariantes(nuevas);
  };

  const onConfirmSave = async () => {
    const ok = await handleSave();
    if (ok) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (isNew) onClose();
      }, 2000);
    }
  };

  const imagenVisual = (varianteActiva?.imagen_url) || (data?.img_url || data?.imagen_url) || "/placeholder.png";

  return (
    <div className="max-w-7xl mx-auto relative pt-10 px-4 pb-32">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }} 
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] bg-emerald-50 text-emerald-600 border border-emerald-100 px-10 py-5 rounded-full shadow-md flex items-center gap-3 font-semibold text-lg"
          >
            <CheckCircle2 size={24} /> "Cambios guardados con éxito"
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-slate-100 relative">
        
        {/* BOTÓN CERRAR MÁS GRANDE */}
        <button onClick={onClose} className="absolute top-10 right-10 z-50 p-5 bg-slate-50 text-slate-400 rounded-full hover:bg-white hover:text-primary transition-all border border-slate-100 shadow-sm">
          <X size={28} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          {/* SECCIÓN VISUAL */}
          <div className="w-full lg:w-[45%] bg-[#FAFAFF] p-16 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-50">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-[15px] border-white shadow-2xl bg-white">
                <img src={imagenVisual} className="w-full h-full object-cover" alt="Visual" />
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white text-primary/60 border border-primary/10 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">
                {esPersonaje ? "Especie: Humano" : "Especie: Entidad"}
              </div>
            </div>
          </div>

          {/* SECCIÓN TEXTO LEGILE */}
          <div className="w-full lg:w-[55%] p-16 lg:p-24 bg-white">
            <div className="flex items-center gap-4 mb-12 text-primary/40 font-bold uppercase text-xs tracking-[0.3em]">
              {esPersonaje ? <Fingerprint size={24} /> : <Ghost size={24} />}
              <span>"Expediente Oficial"</span>
            </div>

            {editMode ? (
              <div className="space-y-12">
                <div className="space-y-4">
                  <label className="text-sm font-bold text-primary/40 uppercase tracking-widest ml-6">Nombre del Sujeto</label>
                  <input 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="text-5xl font-bold w-full bg-slate-50/50 border border-slate-100 p-8 rounded-[2.5rem] focus:border-primary/30 outline-none text-primary transition-all shadow-inner" 
                    placeholder="Escribe el nombre..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-6">Descripción Detallada</label>
                  <textarea 
                    value={editDescripcion} 
                    onChange={(e) => setEditDescripcion(e.target.value)} 
                    className="text-slate-600 text-xl leading-relaxed w-full bg-slate-50/50 border border-slate-100 p-10 rounded-[3rem] min-h-[350px] outline-none focus:border-primary/30 resize-none transition-all shadow-inner"
                    placeholder="Escribe la historia o detalles..."
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-6xl lg:text-8xl font-black text-primary leading-[1.1] mb-10 tracking-tighter">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <div className="w-20 h-2 bg-primary/10 mb-12 rounded-full" />
                <p className="text-slate-500 text-2xl lg:text-3xl leading-[1.6] font-light italic">
                  "{varianteActiva ? (varianteActiva.descripcion_variante || "Sin registros") : editDescripcion}"
                </p>

                {esCriatura && variantes.length > 0 && (
                  <div className="mt-20 flex flex-wrap gap-4">
                    <button 
                      onClick={() => setVarianteActiva(null)} 
                      className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${!varianteActiva ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                    >
                      "Forma Base"
                    </button>
                    {variantes.map((v, i) => (
                      <button 
                        key={i} 
                        onClick={() => setVarianteActiva(v)} 
                        className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${varianteActiva === v ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                      >
                        {v.tipo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECCIONES INFERIORES */}
        {(esPersonaje || editMode) && (
          <div className="bg-slate-50/30 p-16 lg:p-24 grid grid-cols-1 xl:grid-cols-2 gap-16 border-t border-slate-100">
            <div className="space-y-8">
              <h4 className="text-sm font-black uppercase tracking-[0.4em] text-primary/30 flex items-center gap-4"><Users size={24}/> "Relaciones Directas"</h4>
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-xl">
                <Relaciones nombrePersonaje={editNombre} datosRelaciones={data?.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />
              </div>
            </div>
            {mostrarMusica && (
              <div className="space-y-8">
                <h4 className="text-sm font-black uppercase tracking-[0.4em] text-primary/30 flex items-center gap-4"><Music size={24}/> "Ambiente Sonoro"</h4>
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  {editMode ? <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} /> : <SeccionMusica listaLinks={data?.canciones || []} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BARRA DE ACCIÓN FLOTANTE GIGANTE */}
      {isAdmin && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-4 bg-white/90 backdrop-blur-xl p-4 rounded-full border border-slate-200 shadow-2xl">
          <button onClick={() => setEditMode(!editMode)} className={`px-10 py-5 rounded-full text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all ${editMode ? "bg-slate-100 text-slate-500" : "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105"}`}>
            {editMode ? <X size={20} /> : <Edit3 size={20} />}
            {editMode ? "Cancelar Edición" : "Modificar Expediente"}
          </button>
          
          {editMode && (
            <button 
              onClick={onConfirmSave} 
              disabled={saving} 
              className="px-12 py-5 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-600 flex items-center gap-3 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 hover:scale-105"
            >
              {saving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
              "Guardar Cambios"
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}