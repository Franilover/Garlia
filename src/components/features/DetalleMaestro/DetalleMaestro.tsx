"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Edit3, Save, Plus, Trash2, Music, Users, 
  Binary 
} from "lucide-react";
import Relaciones from "./relaciones"; 
import { useDetalleMaestro, type Variante } from "@/hooks/useDetalleMaestro"; 
import { SeccionMusica, SelectorMusicaAdmin } from "./SeccionMusica";

interface DetalleMaestroProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  tags?: string[];
  mostrarMusica?: boolean;
  onUpdate?: () => Promise<void>;
  isNew?: boolean; 
}

export default function DetalleMaestro({ 
  isOpen, onClose, data, tags = [], onUpdate, isNew = false 
}: DetalleMaestroProps) {
  const [internalData, setInternalData] = useState(data);

  useEffect(() => {
    if (isNew) {
      setInternalData(data || {});
    } else if (data && data.id) {
      setInternalData(data);
    }
  }, [data?.id, isNew, data]);

  if (!isOpen || (!isNew && (!internalData || !internalData.id))) return null;

  return (
    <DetalleContenido 
      data={internalData} 
      onClose={onClose} 
      tags={tags} 
      onUpdate={onUpdate}
      isNew={isNew}
    />
  );
}

function DetalleContenido({ data, onClose, tags, onUpdate, isNew }: any) {
  const {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones, setEditRelaciones
  } = useDetalleMaestro(data, onUpdate);

  // Activar edición automáticamente si es un registro nuevo
  useEffect(() => {
    if (isNew) setEditMode(true);
  }, [isNew, setEditMode]);

  const esPersonaje = data && typeof data === "object" && "sobre" in data;
  const esCriatura = data && !esPersonaje;
  
  const tieneContenidoInferior = !esCriatura && (
    editMode || 
    (data?.relaciones && data.relaciones.length > 0) || 
    (data?.canciones && data.canciones.length > 0)
  );

  const [loadingRelaciones, setLoadingRelaciones] = useState(true);

  useEffect(() => {
    if (isNew) {
      setLoadingRelaciones(false);
    } else if (data?.id) {
      setLoadingRelaciones(true);
      const timer = setTimeout(() => setLoadingRelaciones(false), 400);
      return () => clearTimeout(timer);
    }
  }, [data?.id, isNew]);

  const agregarVariante = () => {
    const nueva: Variante = { 
      tipo: "Nueva Variante", 
      descripcion_variante: "", 
      imagen_url: "", 
      criatura_id: data?.id ? Number(data.id) : 0
    };
    setVariantes([...variantes, nueva]);
  };

  const imagenVisual = (varianteActiva?.imagen_url) || (data?.img_url || data?.imagen_url) || "/placeholder.png";

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="max-w-7xl mx-auto relative pt-10 px-4 pb-20"
      >
        <div className="bg-white rounded-[4rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] relative border border-slate-200">
          
          {/* BOTONERA FLOTANTE SUPERIOR */}
          <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
            {isAdmin && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`group p-5 text-white rounded-full shadow-2xl transition-all flex items-center gap-4 px-10 ${
                  editMode ? "bg-green-600 hover:bg-green-700 ring-4 ring-green-600/20" : "bg-primary hover:bg-primary/90"
                }`}
              >
                {editMode ? <Save size={24} className={saving ? "animate-spin" : ""} /> : <Edit3 size={24} />}
                <span className="text-[12px] font-black uppercase tracking-widest">
                  {saving ? "Procesando..." : (editMode ? (isNew ? "GUARDAR NUEVO" : "CONFIRMAR") : "EDITAR")}
                </span>
              </motion.button>
            )}
            <button onClick={onClose} className="p-5 bg-slate-100 text-slate-800 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg border border-slate-200">
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch">
            {/* SECCIÓN IMAGEN */}
            <div className="w-full lg:w-[45%] bg-slate-50 p-10 flex items-center justify-center relative min-h-[500px]">
              <div className="relative w-full aspect-square max-w-md">
                <div className="w-full h-full rounded-full overflow-hidden border-[12px] border-white shadow-2xl">
                  <img src={imagenVisual} className="w-full h-full object-cover" alt="Visual" />
                </div>
              </div>
            </div>

            {/* SECCIÓN TEXTOS */}
            <div className="w-full lg:w-[55%] p-12 lg:p-20 flex flex-col justify-center bg-white">
              {editMode ? (
                <div className="space-y-10 w-full">
                  <div className="flex items-center gap-3 text-slate-900 font-bold uppercase text-xs tracking-[0.3em]">
                    <Binary size={18} /> <span>{isNew ? "Creando Registro" : "Modificando Registro"}</span>
                  </div>
                  <div className="space-y-6">
                    <input 
                      placeholder="Escribe el nombre aquí..."
                      value={editNombre || ""} 
                      onChange={(e) => setEditNombre(e.target.value)} 
                      className="text-4xl font-black uppercase text-slate-900 w-full bg-slate-50 border-2 border-slate-200 p-6 rounded-3xl outline-none focus:border-primary/40 transition-all placeholder:text-slate-400" 
                    />
                    <textarea 
                      placeholder="Escribe la descripción detallada..."
                      value={editDescripcion || ""} 
                      onChange={(e) => setEditDescripcion(e.target.value)} 
                      className="text-slate-800 text-lg leading-relaxed w-full bg-slate-50 border-2 border-slate-200 p-8 rounded-[2rem] outline-none min-h-[350px] resize-none focus:border-primary/40 transition-all placeholder:text-slate-400" 
                    />
                  </div>
                  
                  {/* Variantes en modo edición para criaturas */}
                  {esCriatura && (
                    <div className="pt-6 border-t border-slate-100">
                      <button onClick={agregarVariante} className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider hover:opacity-70 transition-opacity">
                        <Plus size={18} /> Añadir Variante / Cepa
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="flex flex-wrap gap-3 mb-8">
                    {tags?.map((tag, i) => (
                      <span key={i} className="px-5 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-full tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-black uppercase italic text-slate-900 leading-none mb-10 tracking-tighter">
                    {varianteActiva ? (varianteActiva as Variante).tipo : editNombre}
                  </h2>
                  <p className="text-slate-800 text-xl leading-relaxed whitespace-pre-wrap border-l-4 border-primary/30 pl-8">
                    {varianteActiva ? ((varianteActiva as Variante).descripcion_variante || "Sin descripción") : editDescripcion}
                  </p>
                  
                  {esCriatura && variantes.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-12">
                      <button onClick={() => setVarianteActiva(null)} className={`px-8 py-4 rounded-2xl text-[11px] font-bold uppercase transition-all ${!varianteActiva ? "bg-primary text-white shadow-xl" : "bg-slate-100 text-slate-600"}`}>Base</button>
                      {variantes.map((v: Variante, i: number) => (
                        <button key={i} onClick={() => setVarianteActiva(v)} className={`px-8 py-4 rounded-2xl text-[11px] font-bold uppercase transition-all ${varianteActiva === v ? "bg-primary text-white shadow-xl" : "bg-slate-100 text-slate-600"}`}>{v.tipo}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN INFERIOR */}
          {tieneContenidoInferior && (
            <div className="bg-slate-50 p-12 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-16 border-t border-slate-200">
              <div className="space-y-8">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4">
                  <Users size={20} /> Relaciones
                </h4>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                  <Relaciones 
                    nombrePersonaje={editNombre} 
                    datosRelaciones={data?.relaciones || []} 
                    editMode={editMode} 
                    onChange={setEditRelaciones} 
                  />
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4">
                  <Music size={20} /> Soliloquios
                </h4>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                  {editMode ? (
                    <SelectorMusicaAdmin idsSeleccionados={editCanciones || []} onChange={setEditCanciones} />
                  ) : (
                    <SeccionMusica listaLinks={data?.canciones || []} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}