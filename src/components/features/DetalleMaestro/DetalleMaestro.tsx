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
    <ProjectDetalleContenido 
      data={internalData} 
      onClose={onClose} 
      tags={tags} 
      onUpdate={onUpdate}
      isNew={isNew}
      mostrarMusica={mostrarMusica}
    />
  );
}

function ProjectDetalleContenido({ data, onClose, tags, onUpdate, isNew, mostrarMusica }: any) {
  const {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones, setEditRelaciones
  } = useDetalleMaestro(data, onUpdate);

  const [showSuccess, setShowSuccess] = useState(false);

  const esPersonaje = ("sobre" in data) || tags.some((t: string) => t.toLowerCase().includes("personaje"));
  
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
    /* CAMBIO CLAVE: Quitamos max-w-7xl y usamos el 98% del ancho de pantalla */
    <div className="w-[98vw] max-w-[1920px] mx-auto relative pt-10 px-6 pb-32 space-y-8">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }} 
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] bg-accent text-primary px-10 py-5 rounded-full shadow-lg flex items-center gap-3 font-bold text-lg border border-primary/20"
          >
            <CheckCircle2 size={24} /> Registro Sincronizado
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-primary/10 relative">
        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-4 bg-bg-main text-primary rounded-full hover:bg-accent transition-all border border-primary/10">
          <X size={28} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          {/* Mantenemos el tamaño fijo de la columna de imagen para que no crezca desproporcionalmente */}
          <div className="w-full lg:w-[450px] xl:w-[500px] flex-shrink-0 bg-bg-main p-12 lg:p-16 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-primary/10">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-[12px] border-white-custom shadow-xl bg-white-custom">
                <img src={imagenVisual} className="w-full h-full object-cover" alt="Sujeto" />
              </div>
              
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white-custom px-8 py-3 rounded-xl text-sm font-black uppercase tracking-[0.15em] shadow-md whitespace-nowrap min-w-[180px] text-center">
                {esPersonaje ? (
                  <span>{especie}</span>
                ) : (
                  <span>{alma}</span>
                )}
              </div>
            </div>
          </div>

          {/* Esta columna ahora ocupará todo el espacio restante (flex-grow) */}
          <div className="flex-1 p-12 lg:p-20 bg-white-custom/30">
            <div className="flex items-center gap-4 mb-8 text-primary/60 font-black uppercase text-xs tracking-[0.3em]">
              {esPersonaje ? <Fingerprint size={24} /> : <Ghost size={24} />}
              <span>{esPersonaje ? "Expediente de Individuo" : "Registro de Entidad"}</span>
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
                    className="input-brand !text-xl !leading-relaxed !p-8 min-h-[300px] resize-none !bg-white/50 w-full"
                    placeholder="..."
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                <h2 className="text-6xl lg:text-7xl font-black text-primary leading-tight mb-8 tracking-tighter uppercase italic">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <div className="w-20 h-2 bg-accent mb-10 rounded-full" />
                <p className="text-primary/80 text-xl lg:text-2xl leading-relaxed font-medium mb-12 w-full">
                  {varianteActiva ? (varianteActiva.descripcion_variante || "Sin registros.") : editDescripcion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Los bloques de abajo también se expanden */}
      {(esPersonaje || editMode) && (
        <div className="bg-white rounded-[3rem] p-12 lg:p-20 shadow-2xl border border-primary/10">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
            <div className="space-y-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center gap-4">
                <Users size={28}/> Relaciones
              </h2>
              <div className="text-primary text-xl font-bold">
                <Relaciones 
                  nombrePersonaje={editNombre} 
                  datosRelaciones={data?.relaciones || []} 
                  editMode={editMode} 
                  onChange={setEditRelaciones} 
                />
              </div>
            </div>
            
            {mostrarMusica && (
              <div className="space-y-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-primary flex items-center gap-4">
                  <Music size={28}/> Multimedia
                </h2>
                <div>
                  {editMode ? (
                    <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} />
                  ) : (
                    <SeccionMusica listaLinks={data?.canciones || []} />
                  )}
                </div>
              </div>
            )}
          </div>
          {/* ... resto del código igual ... */}
        </div>
      )}

      {/* Botones de administración fijos */}
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
              <span className="text-xs tracking-widest uppercase">Sincronizar</span>
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}