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

  // Lógica para determinar el tipo
  const esPersonaje = ("sobre" in data) || tags.some((t: string) => t.toLowerCase().includes("personaje"));
  
  // Extraer información específica
  const especie = data?.especie || "Humano";
  const alma = data?.alma || "Desconocida";

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
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] bg-accent text-primary px-10 py-5 rounded-full shadow-lg flex items-center gap-3 font-bold text-lg border border-primary/20"
          >
            <CheckCircle2 size={24} /> "Registro Sincronizado"
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-primary/10 relative">
        
        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-4 bg-bg-main text-primary rounded-full hover:bg-accent transition-all border border-primary/10">
          <X size={28} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          {/* SECCIÓN VISUAL */}
          <div className="w-full lg:w-[45%] bg-bg-main p-12 lg:p-16 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-primary/10">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-[12px] border-white-custom shadow-xl bg-white-custom">
                <img src={imagenVisual} className="w-full h-full object-cover" alt="Sujeto" />
              </div>
              
              {/* ETIQUETA DINÁMICA: ESPECIE O ALMA */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white-custom px-8 py-3 rounded-xl text-sm font-black uppercase tracking-[0.15em] shadow-md whitespace-nowrap min-w-[180px] text-center">
                {esPersonaje ? (
                  <span>"Especie: {especie}"</span>
                ) : (
                  <span>"Alma: {alma}"</span>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN TEXTO */}
          <div className="w-full lg:w-[55%] p-12 lg:p-20 bg-white-custom/30">
            <div className="flex items-center gap-4 mb-8 text-primary/60 font-black uppercase text-xs tracking-[0.3em]">
              {esPersonaje ? <Fingerprint size={24} /> : <Ghost size={24} />}
              <span>{esPersonaje ? "\"Expediente de Individuo\"" : "\"Registro de Entidad\""}</span>
            </div>

            {editMode ? (
              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="text-xs font-black text-primary/50 uppercase tracking-widest ml-4">Nombre</label>
                  <input 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="input-brand !text-4xl font-bold !p-6 !bg-white/50" 
                    placeholder="..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-primary/50 uppercase tracking-widest ml-4">Descripción</label>
                  <textarea 
                    value={editDescripcion} 
                    onChange={(e) => setEditDescripcion(e.target.value)} 
                    className="input-brand !text-xl !leading-relaxed !p-8 min-h-[300px] resize-none !bg-white/50"
                    placeholder="..."
                  />
                </div>

                {!esPersonaje && (
                  <div className="space-y-6 pt-8 border-t border-primary/10">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black uppercase text-primary/40 tracking-widest">Variantes Registradas</h5>
                      <button onClick={agregarVariante} className="p-3 bg-accent text-primary rounded-xl hover:scale-110 transition-all shadow-sm"><Plus size={24}/></button>
                    </div>
                    {variantes.map((v, i) => (
                      <div key={i} className="p-6 bg-white/40 rounded-2xl space-y-4 border border-primary/5">
                        <div className="flex gap-4">
                          <input 
                            placeholder="Nombre variante" 
                            className="input-brand !bg-white/60 !py-3"
                            value={v.tipo} 
                            onChange={(e) => actualizarVariante(i, "tipo", e.target.value)}
                          />
                          <button onClick={() => eliminarVariante(i)} className="text-primary/40 hover:text-red-400 p-2"><Trash2 size={24}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-6xl lg:text-7xl font-black text-primary leading-tight mb-8 tracking-tighter">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <div className="w-20 h-2 bg-accent mb-10 rounded-full" />
                <p className="text-primary/80 text-2xl lg:text-3xl leading-relaxed font-medium mb-12">
                  {varianteActiva ? (varianteActiva.descripcion_variante || "Sin registros.") : editDescripcion}
                </p>

                {!esPersonaje && variantes.length > 0 && (
                  <div className="mt-16">
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => setVarianteActiva(null)} 
                        className={`px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!varianteActiva ? "bg-primary text-white shadow-lg" : "bg-accent/30 text-primary hover:bg-accent/50"}`}
                      >
                        "Forma Base"
                      </button>
                      {variantes.map((v, i) => (
                        <button 
                          key={i} 
                          onClick={() => setVarianteActiva(v)} 
                          className={`px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${varianteActiva === v ? "bg-primary text-white shadow-lg" : "bg-accent/30 text-primary hover:bg-accent/50"}`}
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

        {/* MÓDULOS INFERIORES */}
        {(esPersonaje || editMode) && (
          <div className="bg-bg-main/50 p-12 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-12 border-t border-primary/10">
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-4"><Users size={20}/> "Relaciones"</h4>
              <div className="bg-white/60 p-8 rounded-[2rem] border border-primary/10 shadow-sm text-primary text-xl font-bold">
                <Relaciones nombrePersonaje={editNombre} datosRelaciones={data?.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />
              </div>
            </div>
            {mostrarMusica && (
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-4"><Music size={20}/> "Multimedia"</h4>
                <div className="bg-white/60 p-8 rounded-[2rem] border border-primary/10 shadow-sm">
                  {editMode ? <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} /> : <SeccionMusica listaLinks={data?.canciones || []} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BARRA DE ACCIÓN */}
      {isAdmin && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-[2rem] border border-primary/20 shadow-2xl">
          <button onClick={() => setEditMode(!editMode)} className={`btn-brand !px-6 ${editMode ? "!bg-accent !text-primary" : ""}`}>
            {editMode ? <X size={20} /> : <Edit3 size={20} />}
            <span className="text-xs tracking-widest uppercase">{editMode ? "Cerrar" : "Editar"}</span>
          </button>
          
          {editMode && (
            <button 
              onClick={onConfirmSave} 
              disabled={saving} 
              className="btn-brand !bg-primary !text-white-custom !px-10"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
              <span className="text-xs tracking-widest uppercase">"Sincronizar"</span>
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}