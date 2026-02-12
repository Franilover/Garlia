"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Edit3, Save, Plus, Music, Users, 
  Binary, CheckCircle2, Fingerprint, Ghost, Trash2
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

  // --- MÉTODOS DE VARIANTES ---
  const agregarVariante = () => {
    const nueva: Variante = {
      tipo: "Nueva Cepa",
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
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] bg-emerald-50 text-emerald-700 border border-emerald-200 px-10 py-4 rounded-full shadow-lg flex items-center gap-3 font-bold uppercase tracking-tight"
          >
            <CheckCircle2 size={24} className="text-emerald-500" /> Registro Actualizado
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-slate-100 relative">
        
        {/* BOTÓN CERRAR PASTEL */}
        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100">
          <X size={20} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          {/* LADO IMAGEN - FONDO PASTEL SUAVE */}
          <div className="w-full lg:w-[45%] bg-[#FDFDFF] p-12 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-50">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-[12px] border-white shadow-xl bg-white">
                <img src={imagenVisual} className="w-full h-full object-cover" alt="Sujeto" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-primary border border-primary/10 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-sm">
                {esPersonaje ? "Dato: Humano" : "Dato: Entidad"}
              </div>
            </div>
          </div>

          {/* LADO TEXTO - LIMPIO Y PASTEL */}
          <div className="w-full lg:w-[55%] p-12 lg:p-24 bg-white">
            <div className="flex items-center gap-3 mb-10 text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">
              {esPersonaje ? <Fingerprint size={18} /> : <Ghost size={18} />}
              <span>Expediente {esPersonaje ? "Biográfico" : "Criatura"}</span>
            </div>

            {editMode ? (
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Nombre</label>
                  <input 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="text-4xl font-bold w-full bg-slate-50/50 border border-slate-100 p-6 rounded-3xl focus:border-primary/30 outline-none text-slate-800 transition-all shadow-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Descripción</label>
                  <textarea 
                    value={editDescripcion} 
                    onChange={(e) => setEditDescripcion(e.target.value)} 
                    className="text-slate-600 text-lg leading-relaxed w-full bg-slate-50/50 border border-slate-100 p-8 rounded-[2rem] min-h-[300px] outline-none focus:border-primary/30 shadow-sm resize-none transition-all"
                  />
                </div>

                {esCriatura && (
                  <div className="space-y-6 pt-8 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Variantes</h5>
                      <button onClick={agregarVariante} className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-all"><Plus size={16}/></button>
                    </div>
                    {variantes.map((v, i) => (
                      <div key={i} className="p-6 bg-slate-50/30 rounded-3xl space-y-4 border border-slate-100">
                        <div className="flex gap-4">
                          <input 
                            placeholder="Tipo..." 
                            className="flex-1 bg-white border border-slate-100 p-3 rounded-xl text-sm font-bold outline-none focus:border-primary/30"
                            value={v.tipo} 
                            onChange={(e) => actualizarVariante(i, "tipo", e.target.value)}
                          />
                          <button onClick={() => eliminarVariante(i)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={20}/></button>
                        </div>
                        <textarea 
                          placeholder="Descripción..." 
                          className="w-full bg-white border border-slate-100 p-4 rounded-xl text-sm min-h-[100px] outline-none focus:border-primary/30"
                          value={v.descripcion_variante} 
                          onChange={(e) => actualizarVariante(i, "descripcion_variante", e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in duration-700">
                <h2 className="text-5xl lg:text-7xl font-bold text-slate-800 leading-tight mb-8 tracking-tight">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <p className="text-slate-500 text-xl leading-relaxed border-l-4 border-primary/10 pl-8 font-light">
                  {varianteActiva ? (varianteActiva.descripcion_variante || "Sin datos") : editDescripcion}
                </p>

                {esCriatura && variantes.length > 0 && (
                  <div className="mt-16 flex flex-wrap gap-2">
                    <button 
                      onClick={() => setVarianteActiva(null)} 
                      className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${!varianteActiva ? "bg-primary/10 text-primary border border-primary/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                    >
                      Original
                    </button>
                    {variantes.map((v, i) => (
                      <button 
                        key={i} 
                        onClick={() => setVarianteActiva(v)} 
                        className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${varianteActiva === v ? "bg-primary/10 text-primary border border-primary/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
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

        {/* SECCIONES INFERIORES PASTEL */}
        {(esPersonaje || editMode) && (
          <div className="bg-slate-50/30 p-12 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-12 border-t border-slate-50">
            <div className="space-y-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300 flex items-center gap-3"><Users size={16}/> Nexos</h4>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <Relaciones nombrePersonaje={editNombre} datosRelaciones={data?.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />
              </div>
            </div>
            {mostrarMusica && (
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300 flex items-center gap-3"><Music size={16}/> Audio</h4>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  {editMode ? <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} /> : <SeccionMusica listaLinks={data?.canciones || []} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BARRA ACCIONES PASTEL/FLOTANTE */}
      {isAdmin && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 bg-white/80 backdrop-blur-xl p-3 rounded-full border border-slate-200 shadow-xl">
          <button onClick={() => setEditMode(!editMode)} className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${editMode ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-primary text-white hover:opacity-90 shadow-md shadow-primary/10"}`}>
            {editMode ? <X size={16} /> : <Edit3 size={16} />}
            {editMode ? "Cancelar" : "Editar"}
          </button>
          
          {editMode && (
            <button 
              onClick={onConfirmSave} 
              disabled={saving} 
              className="px-8 py-3 bg-emerald-500 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 flex items-center gap-2 transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {isNew ? "Crear" : "Guardar"}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}