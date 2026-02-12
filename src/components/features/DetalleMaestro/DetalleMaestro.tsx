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
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] bg-[#DDD6FE] text-[#5B21B6] px-10 py-5 rounded-full shadow-lg flex items-center gap-3 font-bold text-lg border border-[#C4B5FD]"
          >
            <CheckCircle2 size={24} /> "Registro Sincronizado"
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[4rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(139,92,246,0.1)] border border-[#EDE9FE] relative">
        
        {/* BOTÓN CERRAR - MORADO PASTEL MEDIO */}
        <button onClick={onClose} className="absolute top-10 right-10 z-50 p-5 bg-[#F5F3FF] text-[#A78BFA] rounded-full hover:bg-[#DDD6FE] hover:text-[#7C3AED] transition-all border border-[#EDE9FE] shadow-sm">
          <X size={28} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          {/* SECCIÓN VISUAL (FONDO LAVANDA SUAVE) */}
          <div className="w-full lg:w-[45%] bg-[#F8F7FF] p-16 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#F3E8FF]">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-[15px] border-white shadow-2xl bg-white">
                <img src={imagenVisual} className="w-full h-full object-cover" alt="Sujeto" />
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#C4B5FD] text-[#5B21B6] px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-md">
                {esPersonaje ? "Personaje" : "Criatura"}
              </div>
            </div>
          </div>

          {/* SECCIÓN TEXTO - EQUILIBRIO DE MORADOS */}
          <div className="w-full lg:w-[55%] p-16 lg:p-24 bg-white">
            <div className="flex items-center gap-4 mb-12 text-[#A78BFA] font-black uppercase text-xs tracking-[0.4em]">
              {esPersonaje ? <Fingerprint size={24} /> : <Ghost size={24} />}
              <span>"Expediente Registrado"</span>
            </div>

            {editMode ? (
              <div className="space-y-12">
                <div className="space-y-4">
                  <label className="text-sm font-black text-[#C4B5FD] uppercase tracking-widest ml-6">Nombre</label>
                  <input 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="text-5xl font-bold w-full bg-[#FAF9FF] border-2 border-[#EDE9FE] p-8 rounded-[2.5rem] focus:border-[#C4B5FD] outline-none text-[#6D28D9] transition-all shadow-sm" 
                    placeholder="..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-black text-[#C4B5FD] uppercase tracking-widest ml-6">Descripción</label>
                  <textarea 
                    value={editDescripcion} 
                    onChange={(e) => setEditDescripcion(e.target.value)} 
                    className="text-[#7C3AED] text-xl leading-relaxed w-full bg-[#FAF9FF] border-2 border-[#EDE9FE] p-10 rounded-[3rem] min-h-[350px] outline-none focus:border-[#C4B5FD] resize-none transition-all shadow-sm"
                    placeholder="..."
                  />
                </div>

                {esCriatura && (
                  <div className="space-y-6 pt-10 border-t-2 border-[#F5F3FF]">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-black uppercase text-[#C4B5FD] tracking-widest">Variantes</h5>
                      <button onClick={agregarVariante} className="p-3 bg-[#DDD6FE] text-[#7C3AED] rounded-full hover:bg-[#C4B5FD] transition-all shadow-sm"><Plus size={24}/></button>
                    </div>
                    {variantes.map((v, i) => (
                      <div key={i} className="p-8 bg-[#FAF9FF] rounded-[2rem] space-y-4 border-2 border-[#EDE9FE]">
                        <div className="flex gap-4">
                          <input 
                            placeholder="Nombre variante" 
                            className="flex-1 bg-white border border-[#EDE9FE] p-4 rounded-2xl text-lg text-[#6D28D9] font-bold outline-none"
                            value={v.tipo} 
                            onChange={(e) => actualizarVariante(i, "tipo", e.target.value)}
                          />
                          <button onClick={() => eliminarVariante(i)} className="text-[#C4B5FD] hover:text-[#EF4444] transition-colors"><Trash2 size={24}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-6xl lg:text-8xl font-black text-[#5B21B6] leading-[1.1] mb-10 tracking-tighter">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <div className="w-24 h-3 bg-[#DDD6FE] mb-12 rounded-full" />
                <p className="text-[#6D28D9] text-2xl lg:text-3xl leading-[1.6] font-medium opacity-80">
                  {varianteActiva ? (varianteActiva.descripcion_variante || "Sin datos adicionales.") : editDescripcion}
                </p>

                {esCriatura && variantes.length > 0 && (
                  <div className="mt-20">
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => setVarianteActiva(null)} 
                        className={`px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${!varianteActiva ? "bg-[#DDD6FE] text-[#5B21B6] shadow-md shadow-purple-100" : "bg-[#F5F3FF] text-[#A78BFA] hover:bg-[#EDE9FE]"}`}
                      >
                        "Original"
                      </button>
                      {variantes.map((v, i) => (
                        <button 
                          key={i} 
                          onClick={() => setVarianteActiva(v)} 
                          className={`px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${varianteActiva === v ? "bg-[#DDD6FE] text-[#5B21B6] shadow-md shadow-purple-100" : "bg-[#F5F3FF] text-[#A78BFA] hover:bg-[#EDE9FE]"}`}
                        >
                          {v.tipo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECCIONES INFERIORES - PASTEL CON CUERPO */}
        {(esPersonaje || editMode) && (
          <div className="bg-[#FAF9FF] p-16 lg:p-24 grid grid-cols-1 xl:grid-cols-2 gap-16 border-t border-[#F3E8FF]">
            <div className="space-y-8">
              <h4 className="text-sm font-black uppercase tracking-[0.4em] text-[#C4B5FD] flex items-center gap-4"><Users size={24}/> "Relaciones"</h4>
              <div className="bg-white p-10 rounded-[3rem] border-2 border-[#EDE9FE] shadow-sm text-[#6D28D9] text-xl font-bold">
                <Relaciones nombrePersonaje={editNombre} datosRelaciones={data?.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />
              </div>
            </div>
            {mostrarMusica && (
              <div className="space-y-8">
                <h4 className="text-sm font-black uppercase tracking-[0.4em] text-[#C4B5FD] flex items-center gap-4"><Music size={24}/> "Música"</h4>
                <div className="bg-white p-10 rounded-[3rem] border-2 border-[#EDE9FE] shadow-sm">
                  {editMode ? <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} /> : <SeccionMusica listaLinks={data?.canciones || []} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BARRA DE ACCIÓN - MORADO SUAVE */}
      {isAdmin && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-4 bg-[#F5F3FF]/90 backdrop-blur-xl p-5 rounded-full border border-[#DDD6FE] shadow-2xl">
          <button onClick={() => setEditMode(!editMode)} className={`px-10 py-5 rounded-full text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all ${editMode ? "bg-white text-[#A78BFA]" : "bg-[#DDD6FE] text-[#5B21B6] hover:scale-105"}`}>
            {editMode ? <X size={20} /> : <Edit3 size={20} />}
            {editMode ? "Cerrar" : "Editar Registro"}
          </button>
          
          {editMode && (
            <button 
              onClick={onConfirmSave} 
              disabled={saving} 
              className="px-12 py-5 bg-[#C4B5FD] text-[#5B21B6] rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-[#BDB2FF] flex items-center gap-3 transition-all shadow-md disabled:opacity-50 hover:scale-105"
            >
              {saving ? <div className="w-5 h-5 border-3 border-[#5B21B6]/30 border-t-[#5B21B6] rounded-full animate-spin" /> : <Save size={20} />}
              "Guardar"
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}