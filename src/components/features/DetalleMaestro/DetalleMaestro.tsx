"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Edit3, Save, Plus, Trash2, Music, Users, 
  Binary 
} from "lucide-react";
import Relaciones from "./relaciones"; 
// Importamos useDetalleMaestro y sus interfaces exportadas
import { useDetalleMaestro, type Variante } from "@/hooks/useDetalleMaestro"; 
import { SeccionMusica, SelectorMusicaAdmin } from "./SeccionMusica";

// --- YA NO NECESITAMOS DECLARAR LAS INTERFACES AQUÍ, LAS TRAEMOS DEL HOOK ---

interface DetalleMaestroProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  tags?: string[];
  mostrarMusica?: boolean;
  onUpdate?: () => Promise<void>;
}

export default function DetalleMaestro({ 
  isOpen, onClose, data, tags = [], onUpdate 
}: DetalleMaestroProps) {
  const [internalData, setInternalData] = useState(data);

  useEffect(() => {
    if (data && data.id) {
      setInternalData(data);
    }
  }, [data?.id]);

  if (!isOpen || !internalData || !internalData.id) return null;

  return (
    <DetalleContenido 
      data={internalData} 
      onClose={onClose} 
      tags={tags} 
      onUpdate={onUpdate} 
    />
  );
}

function DetalleContenido({ data, onClose, tags, onUpdate }: any) {
  const {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones, setEditRelaciones
  } = useDetalleMaestro(data, onUpdate);

  const esPersonaje = data && typeof data === "object" && "sobre" in data;
  const esCriatura = data && !esPersonaje;
  
  const tieneContenidoInferior = !esCriatura && (
    editMode || 
    (data?.relaciones && data.relaciones.length > 0) || 
    (data?.canciones && data.canciones.length > 0)
  );

  const [loadingRelaciones, setLoadingRelaciones] = useState(true);

  useEffect(() => {
    if (data?.id) {
      setLoadingRelaciones(true);
      if (esCriatura || (data?.relaciones && data.relaciones.length > 0)) {
        setLoadingRelaciones(false);
      } else {
        const timer = setTimeout(() => setLoadingRelaciones(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [data?.id, esCriatura]);

  const agregarVariante = () => {
    if (!data?.id) return;
    // Usamos la interfaz Variante importada
    const nueva: Variante = { 
      tipo: "Nueva Variante", 
      descripcion_variante: "", 
      imagen_url: "", 
      criatura_id: Number(data.id) 
    };
    setVariantes([...variantes, nueva]);
  };

  const imagenVisual = (varianteActiva?.imagen_url) || (data.img_url || data.imagen_url);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={data.id}
        initial={{ opacity: 0, scale: 0.9, y: 30 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="max-w-7xl mx-auto mb-32 relative pt-24 px-4"
      >
        <div className="bg-white rounded-[5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] relative border border-primary/10">
          
          <div className="absolute top-10 right-10 z-50 flex items-center gap-4">
            {isAdmin && (
              <motion.button 
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`group p-5 text-white rounded-full shadow-2xl transition-all flex items-center gap-4 px-10 ${
                  editMode ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                }`}
              >
                {editMode ? <Save size={24} className={saving ? "animate-spin" : "animate-pulse"} /> : <Edit3 size={24} />}
                <span className="text-[11px] font-black uppercase tracking-[0.25em]">
                  {saving ? "Procesando..." : (editMode ? "Confirmar Cambios" : "Modificar Registro")}
                </span>
              </motion.button>
            )}
            <button onClick={onClose} className="p-5 bg-white/90 text-primary rounded-full hover:bg-red-500 hover:text-white transition-all shadow-xl border border-primary/5">
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch">
            <div className="w-full lg:w-[48%] bg-slate-50 p-10 lg:p-24 flex items-center justify-center relative overflow-hidden min-h-[550px] lg:min-h-[800px]">
              <div className="relative w-full aspect-square max-w-140 group">
                <motion.div className="relative w-full h-full rounded-full overflow-hidden border-[16px] border-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)]">
                  <motion.img 
                    key={imagenVisual} 
                    src={imagenVisual} 
                    className="w-full h-full object-cover" 
                    alt={editNombre || "Visual"}
                  />
                </motion.div>
              </div>
            </div>

            <div className="w-full lg:w-[52%] p-14 lg:p-28 flex flex-col justify-center bg-white">
              {editMode ? (
                <div className="space-y-12 w-full">
                  <div className="flex items-center gap-4 text-primary/30">
                    <Binary size={20} />
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">Consola de Edición</span>
                  </div>
                  <div className="space-y-8">
                    <input 
                      value={editNombre || ""} 
                      onChange={(e) => setEditNombre(e.target.value)} 
                      className="text-4xl font-black uppercase italic text-primary w-full bg-primary/5 p-8 rounded-[3rem] outline-none" 
                    />
                    <textarea 
                      value={editDescripcion || ""} 
                      onChange={(e) => setEditDescripcion(e.target.value)} 
                      className="text-slate-600 text-xl italic leading-relaxed w-full bg-primary/5 p-12 rounded-[3.5rem] outline-none min-h-[400px] resize-none" 
                    />
                  </div>
                  {esCriatura && (
                    <div className="pt-12 border-t border-primary/5">
                      <button onClick={agregarVariante} className="px-10 py-4 bg-primary text-white rounded-[1.5rem] text-[10px] font-black uppercase flex items-center gap-4 mb-8">
                        <Plus size={18} /> Nueva Cepa
                      </button>
                      <div className="space-y-8 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        {variantes && variantes.map((v: Variante, index: number) => (
                          <div key={v.id || index} className="p-8 bg-slate-50 rounded-[3rem] relative">
                            <input 
                              placeholder="Nombre Forma" 
                              value={v.tipo || ""} 
                              onChange={(e) => { 
                                const n = [...variantes]; 
                                n[index].tipo = e.target.value; 
                                setVariantes(n); 
                              }} 
                              className="w-full mb-4 p-4 rounded-xl border border-primary/10" 
                            />
                            <textarea 
                              placeholder="Descripción..." 
                              value={v.descripcion_variante || ""} 
                              onChange={(e) => { 
                                const n = [...variantes]; 
                                n[index].descripcion_variante = e.target.value; 
                                setVariantes(n); 
                              }} 
                              className="w-full p-4 rounded-xl border border-primary/10 resize-none h-24" 
                            />
                            <button 
                              onClick={() => setVariantes(variantes.filter((_, i) => i !== index))} 
                              className="absolute -top-3 -right-3 bg-red-500 text-white p-3 rounded-full"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="flex flex-wrap gap-4 mb-10">
                    {tags?.map((tag, i) => tag && (
                      <span key={i} className="px-7 py-3 bg-primary text-white text-[11px] font-black uppercase rounded-full tracking-[0.3em]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-6xl lg:text-8xl font-black uppercase italic text-primary leading-[0.85] tracking-tighter mb-12">
                    {varianteActiva ? (varianteActiva as Variante).tipo : editNombre}
                  </h2>
                  <p className="text-slate-500 text-xl lg:text-2xl italic leading-relaxed whitespace-pre-wrap border-l-4 border-primary/5 pl-10">
                    {varianteActiva ? ((varianteActiva as Variante).descripcion_variante || "Sin descripción") : editDescripcion}
                  </p>
                  {esCriatura && variantes && variantes.length > 0 && (
                    <div className="flex flex-wrap gap-4 mt-16">
                      <button onClick={() => setVarianteActiva(null)} className={`px-10 py-5 rounded-[2rem] text-[12px] font-black uppercase transition-all ${!varianteActiva ? "bg-primary text-white shadow-2xl" : "bg-primary/5 text-primary"}`}>Fenotipo Base</button>
                      {variantes.map((v: Variante, i: number) => (
                        <button key={i} onClick={() => setVarianteActiva(v)} className={`px-10 py-5 rounded-[2rem] text-[12px] font-black uppercase transition-all ${varianteActiva === v ? "bg-primary text-white shadow-2xl" : "bg-primary/5 text-primary"}`}>{v.tipo}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {tieneContenidoInferior && (
            <div className="bg-slate-50 p-12 lg:p-24 grid grid-cols-1 xl:grid-cols-2 gap-24 border-t border-primary/5">
              <div className="space-y-10">
                <div className="flex items-center gap-6">
                  <span className="text-primary/30"><Users size={24} /></span>
                  <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-primary/30">Relaciones</h4>
                </div>
                {loadingRelaciones ? (
                  <div className="h-40 bg-white rounded-[3rem] animate-pulse" />
                ) : (
                  <Relaciones 
                    nombrePersonaje={data.nombre} 
                    datosRelaciones={data.relaciones || []} 
                    editMode={editMode} 
                    onChange={setEditRelaciones} 
                  />
                )}
              </div>
              <div className="space-y-10">
                <div className="flex items-center gap-6">
                  <span className="text-primary/30"><Music size={24} /></span>
                  <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-primary/30">Soliloquios</h4>
                </div>
                {editMode ? (
                  <SelectorMusicaAdmin idsSeleccionados={editCanciones || []} onChange={setEditCanciones} />
                ) : (
                  <SeccionMusica listaLinks={data?.canciones || []} />
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}