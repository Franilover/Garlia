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
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] bg-emerald-50 text-emerald-600 border border-emerald-100 px-10 py-4 rounded-full shadow-sm flex items-center gap-3 font-medium tracking-tight"
          >
            <CheckCircle2 size={20} /> "Sincronizado correctamente"
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[3rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-50 relative">
        
        {/* CERRAR BOTÓN PASTEL */}
        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-4 bg-slate-50 text-slate-300 rounded-full hover:bg-white hover:text-primary transition-all border border-slate-100 shadow-sm">
          <X size={20} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          {/* SECCIÓN VISUAL (PASTEL SUAVE) */}
          <div className="w-full lg:w-[45%] bg-[#FAFAFF] p-12 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-50">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-[10px] border-white shadow-lg bg-white">
                <img src={imagenVisual} className="w-full h-full object-cover" alt="Sujeto" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-primary/60 border border-primary/5 px-6 py-2 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] shadow-sm">
                {esPersonaje ? "Categoría: Personaje" : "Categoría: Criatura"}
              </div>
            </div>
          </div>

          {/* SECCIÓN TEXTO (LIMPIO Y CLARO) */}
          <div className="w-full lg:w-[55%] p-12 lg:p-24 bg-white">
            <div className="flex items-center gap-3 mb-10 text-slate-300 font-semibold uppercase text-[9px] tracking-[0.3em]">
              {esPersonaje ? <Fingerprint size={16} /> : <Ghost size={16} />}
              <span>"Información Registrada"</span>
            </div>

            {editMode ? (
              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-4">Nombre</label>
                  <input 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="text-4xl font-bold w-full bg-slate-50/30 border border-slate-100 p-6 rounded-3xl focus:border-primary/20 outline-none text-slate-700 transition-all" 
                    placeholder="..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-4">Descripción</label>
                  <textarea 
                    value={editDescripcion} 
                    onChange={(e) => setEditDescripcion(e.target.value)} 
                    className="text-slate-500 text-lg leading-relaxed w-full bg-slate-50/30 border border-slate-100 p-8 rounded-[2rem] min-h-[300px] outline-none focus:border-primary/20 resize-none transition-all"
                    placeholder="..."
                  />
                </div>

                {esCriatura && (
                  <div className="space-y-6 pt-10 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[9px] font-bold uppercase text-slate-300 tracking-widest">Variantes</h5>
                      <button onClick={agregarVariante} className="p-2 bg-primary/5 text-primary rounded-full hover:bg-primary/10 transition-all"><Plus size={16}/></button>
                    </div>
                    {variantes.map((v, i) => (
                      <div key={i} className="p-6 bg-slate-50/20 rounded-3xl space-y-4 border border-slate-100">
                        <div className="flex gap-4">
                          <input 
                            placeholder="Nombre variante" 
                            className="flex-1 bg-white border border-slate-50 p-3 rounded-xl text-sm text-slate-600 outline-none focus:border-primary/20"
                            value={v.tipo} 
                            onChange={(e) => actualizarVariante(i, "tipo", e.target.value)}
                          />
                          <button onClick={() => eliminarVariante(i)} className="text-slate-200 hover:text-red-300"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in duration-700">
                <h2 className="text-5xl lg:text-6xl font-bold text-slate-800 leading-tight mb-8 tracking-tight">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <div className="w-12 h-1 bg-primary/10 mb-8 rounded-full" />
                <p className="text-slate-500 text-lg leading-relaxed font-light">
                  {varianteActiva ? (varianteActiva.descripcion_variante || "No hay datos") : editDescripcion}
                </p>

                {esCriatura && variantes.length > 0 && (
                  <div className="mt-16 flex flex-wrap gap-2">
                    <button 
                      onClick={() => setVarianteActiva(null)} 
                      className={`px-6 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${!varianteActiva ? "bg-primary/10 text-primary border border-primary/10" : "bg-slate-50 text-slate-300"}`}
                    >
                      "Base"
                    </button>
                    {variantes.map((v, i) => (
                      <button 
                        key={i} 
                        onClick={() => setVarianteActiva(v)} 
                        className={`px-6 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all ${varianteActiva === v ? "bg-primary/10 text-primary border border-primary/10" : "bg-slate-50 text-slate-300"}`}
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

        {/* MÓDULOS INFERIORES PASTEL */}
        {(esPersonaje || editMode) && (
          <div className="bg-slate-50/20 p-12 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-12 border-t border-slate-50">
            <div className="space-y-6">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-200 flex items-center gap-3"><Users size={14}/> "Relaciones"</h4>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm">
                <Relaciones nombrePersonaje={editNombre} datosRelaciones={data?.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />
              </div>
            </div>
            {mostrarMusica && (
              <div className="space-y-6">
                <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-200 flex items-center gap-3"><Music size={14}/> "Audio"</h4>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm">
                  {editMode ? <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} /> : <SeccionMusica listaLinks={data?.canciones || []} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BARRA DE ACCIÓN (FLOTANTE PASTEL) */}
      {isAdmin && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 bg-white/90 backdrop-blur-md p-3 rounded-full border border-slate-100 shadow-lg">
          <button onClick={() => setEditMode(!editMode)} className={`px-6 py-3 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${editMode ? "bg-slate-50 text-slate-400" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            {editMode ? <X size={14} /> : <Edit3 size={14} />}
            {editMode ? "Cerrar" : "Editar"}
          </button>
          
          {editMode && (
            <button 
              onClick={onConfirmSave} 
              disabled={saving} 
              className="px-8 py-3 bg-emerald-50 text-emerald-500 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-100 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> : <Save size={14} />}
              "Guardar"
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}