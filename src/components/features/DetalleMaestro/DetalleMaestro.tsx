"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Edit3, Save, Plus, CheckCircle2, Trash2 
} from "lucide-react";
import Relaciones from "./relaciones"; 
import { useDetalleMaestro, type Variante } from "@/hooks/useDetalleMaestro"; 
import { SeccionMusica, SelectorMusicaAdmin } from "./SeccionMusica";
import { SelectorVariantes } from "./SelectorVariantes";

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

  // Optimización: Memoización de flags para evitar re-renders costosos
  const esPersonaje = useMemo(() => 
    ("sobre" in data) || tags.some((t: string) => t.toLowerCase().includes("personaje")),
  [data, tags]);

  const especie = data?.especie || "Humano";
  const alma = data?.alma || "Desconocida";

  useEffect(() => {
    if (isNew) setEditMode(true);
  }, [isNew, setEditMode]);

  const agregarVariante = () => {
    const nueva: Variante = {
      id: Date.now(), 
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

  // Optimización de carga de imagen (Prioridad alta)
  const imagenVisual = (varianteActiva?.imagen_url) || (data?.img_url || data?.imagen_url) || "/placeholder.png";

  return (
    <div className="w-full max-w-[96%] xl:max-w-screen-2xl mx-auto relative pt-10 px-4 pb-32 space-y-8">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -50, opacity: 0 }} 
            className="fixed top-10 left-1/2 -translate-x-1/2 z-3000 bg-accent text-primary px-10 py-5 rounded-full shadow-lg flex items-center gap-3 font-bold border border-primary/20"
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
          {/* LADO IZQUIERDO: VISUAL */}
          <div className="w-full lg:w-112.5 xl:w-125 shrink-0 bg-bg-main p-12 lg:p-16 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-primary/10">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-12 border-white-custom shadow-xl bg-white-custom">
                <img 
                  src={imagenVisual} 
                  className="w-full h-full object-cover" 
                  alt="Visualización" 
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white-custom px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-md whitespace-nowrap min-w-45 text-center">
                {esPersonaje ? especie : alma}
              </div>
            </div>
          </div>

          {/* LADO DERECHO: CONTENIDO */}
          <div className="flex-1 p-8 lg:p-16 bg-white-custom/30 overflow-hidden flex flex-col justify-center">
            {editMode ? (
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Nombre</label>
                  <input 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="input-brand text-3xl! lg:text-4xl! p-5! bg-white/50! w-full" 
                    placeholder="Nombre..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest ml-4">Descripción</label>
                  <textarea 
                    value={editDescripcion} 
                    onChange={(e) => setEditDescripcion(e.target.value)} 
                    className="input-brand text-lg! leading-relaxed! p-6! min-h-60 resize-none bg-white/50! w-full"
                    placeholder="Escribe la historia..."
                  />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-full">
                <h2 className="text-4xl lg:text-6xl font-black text-primary leading-[1.1] mb-6 tracking-tighter uppercase italic break-words">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <div className="w-16 h-1.5 bg-accent mb-8 rounded-full" />
                
                {!esPersonaje && variantes.length > 0 && (
                   <div className="mb-8">
                    <SelectorVariantes 
                      variantes={variantes} 
                      varianteActiva={varianteActiva} 
                      onSeleccionar={setVarianteActiva} 
                    />
                   </div>
                )}

                <p className="text-primary/80 text-lg lg:text-xl leading-relaxed font-medium break-words">
                  {varianteActiva ? (varianteActiva.descripcion_variante || "Sin registros descriptivos.") : editDescripcion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GESTIÓN DE VARIANTES (Solo Admin y Criaturas) */}
      {editMode && !esPersonaje && (
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-primary/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Variantes del Registro</h3>
            <button onClick={agregarVariante} className="btn-brand bg-accent! text-primary!">
              <Plus size={20} /> Nueva Variante
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {variantes.map((v, idx) => (
              <div key={v.id || idx} className="p-6 bg-bg-main rounded-2xl border border-primary/5 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <input 
                      placeholder="Tipo (Ej: Fuego)" 
                      className="input-brand p-3! text-sm!"
                      value={v.tipo}
                      onChange={(e) => actualizarVariante(idx, "tipo", e.target.value)}
                    />
                    <input 
                      placeholder="URL Imagen" 
                      className="input-brand p-3! text-xs!"
                      value={v.imagen_url}
                      onChange={(e) => actualizarVariante(idx, "imagen_url", e.target.value)}
                    />
                  </div>
                  <button onClick={() => eliminarVariante(idx)} className="p-2 text-red-400 hover:scale-110 transition-transform">
                    <Trash2 size={20} />
                  </button>
                </div>
                <textarea 
                  placeholder="Descripción específica..."
                  className="input-brand p-4! text-sm! min-h-25 resize-none"
                  value={v.descripcion_variante}
                  onChange={(e) => actualizarVariante(idx, "descripcion_variante", e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIONES INFERIORES: RELACIONES Y MÚSICA */}
      {(esPersonaje || editMode) && (
        <div className="bg-white rounded-[3rem] p-12 lg:p-20 shadow-2xl border border-primary/10">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
            <Relaciones 
              nombrePersonaje={editNombre} 
              datosRelaciones={data?.relaciones || []} 
              editMode={editMode} 
              onChange={setEditRelaciones} 
            />
            {mostrarMusica && (
              <div>
                {editMode ? (
                  <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} />
                ) : (
                  <SeccionMusica listaLinks={data?.canciones || []} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARRA FLOTANTE DE ACCIONES ADMIN */}
      {isAdmin && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-1100 flex items-center gap-4 bg-white/90 backdrop-blur-md p-4 rounded-full border border-primary/20 shadow-2xl"
        >
          <button onClick={() => setEditMode(!editMode)} className={`btn-brand px-6! ${editMode ? "bg-accent! text-primary!" : ""}`}>
            {editMode ? <X size={20} /> : <Edit3 size={20} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{editMode ? "Cerrar" : "Editar"}</span>
          </button>
          
          {editMode && (
            <button 
              onClick={onConfirmSave} 
              disabled={saving} 
              className="btn-brand bg-primary! text-white-custom! px-10!"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizar</span>
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}