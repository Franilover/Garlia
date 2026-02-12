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

// AGREGADO: mostrarMusica a la interfaz para eliminar el error 2322
interface DetalleMaestroProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  tags?: string[];
  onUpdate?: () => Promise<void>;
  isNew?: boolean; 
  mostrarMusica?: boolean; // FIX: Ahora TS sabe qué es esto
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
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] bg-green-600 text-white px-10 py-4 rounded-full shadow-2xl flex items-center gap-3 font-black uppercase italic"
          >
            <CheckCircle2 size={24} /> Sincronización Exitosa
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border border-slate-200 relative">
        
        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-5 bg-slate-100/80 backdrop-blur-md text-slate-900 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-md">
          <X size={24} />
        </button>

        <div className="flex flex-col lg:flex-row items-stretch">
          <div className="w-full lg:w-[45%] bg-slate-50 p-12 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="w-full h-full rounded-full overflow-hidden border-[15px] border-white shadow-2xl bg-white">
                <img src={imagenVisual} className="w-full h-full object-cover" alt="Visual" />
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em]">
                {esPersonaje ? "ID: HUMANO" : "ID: ENTIDAD"}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[55%] p-12 lg:p-24 bg-white">
            <div className="flex items-center gap-4 mb-10 text-primary font-black uppercase text-[11px] tracking-[0.5em]">
              {esPersonaje ? <Fingerprint size={22} /> : <Ghost size={22} />}
              <span>{esPersonaje ? "Registro de Personaje" : "Expediente de Criatura"}</span>
            </div>

            {editMode ? (
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre</label>
                  <input 
                    value={editNombre} 
                    onChange={(e) => setEditNombre(e.target.value)} 
                    className="text-4xl font-black uppercase w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl focus:border-primary outline-none text-slate-900 shadow-inner" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción Principal</label>
                  <textarea 
                    value={editDescripcion} 
                    onChange={(e) => setEditDescripcion(e.target.value)} 
                    className="text-slate-800 text-xl leading-relaxed w-full bg-slate-50 border-2 border-slate-100 p-8 rounded-[2rem] min-h-[300px] outline-none focus:border-primary shadow-inner resize-none"
                  />
                </div>

                {esCriatura && (
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-black uppercase text-slate-900">Variantes / Cepas</h5>
                      <button onClick={agregarVariante} className="p-2 bg-primary text-white rounded-full"><Plus size={16}/></button>
                    </div>
                    {variantes.map((v, i) => (
                      <div key={i} className="p-6 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                        <div className="flex gap-4">
                          <input 
                            placeholder="Tipo de variante" 
                            className="flex-1 bg-white border p-3 rounded-xl text-sm font-bold"
                            value={v.tipo} 
                            onChange={(e) => actualizarVariante(i, "tipo", e.target.value)}
                          />
                          <button onClick={() => eliminarVariante(i)} className="text-red-500"><Trash2 size={20}/></button>
                        </div>
                        <textarea 
                          placeholder="Descripción de la variante..." 
                          className="w-full bg-white border p-4 rounded-xl text-sm"
                          value={v.descripcion_variante} 
                          onChange={(e) => actualizarVariante(i, "descripcion_variante", e.target.value)}
                        />
                        <input 
                          placeholder="URL Imagen de la variante" 
                          className="w-full bg-white border p-3 rounded-xl text-xs"
                          value={v.imagen_url} 
                          onChange={(e) => actualizarVariante(i, "imagen_url", e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-6xl lg:text-8xl font-black uppercase italic text-slate-900 leading-[0.85] mb-12 tracking-tighter">
                  {varianteActiva ? varianteActiva.tipo : editNombre}
                </h2>
                <p className="text-slate-800 text-2xl leading-relaxed border-l-[12px] border-primary/10 pl-10 italic">
                  {varianteActiva ? (varianteActiva.descripcion_variante || "Sin datos") : editDescripcion}
                </p>

                {esCriatura && variantes.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-12">
                    <button onClick={() => setVarianteActiva(null)} className={`px-8 py-4 rounded-2xl text-[11px] font-bold uppercase transition-all ${!varianteActiva ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>Base</button>
                    {variantes.map((v, i) => (
                      <button key={i} onClick={() => setVarianteActiva(v)} className={`px-8 py-4 rounded-2xl text-[11px] font-bold uppercase transition-all ${varianteActiva === v ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>{v.tipo}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Módulos Inferiores: Solo si es personaje o estamos editando */}
        {(esPersonaje || editMode) && (
          <div className="bg-slate-50/50 p-12 lg:p-24 grid grid-cols-1 xl:grid-cols-2 gap-16 border-t border-slate-100">
            <div className="space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-4"><Users /> Nexos</h4>
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
                <Relaciones nombrePersonaje={editNombre} datosRelaciones={data?.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />
              </div>
            </div>
            
            {/* AGREGADO: Lógica de mostrarMusica */}
            {mostrarMusica && (
              <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-4"><Music /> Audio</h4>
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
                  {editMode ? <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} /> : <SeccionMusica listaLinks={data?.canciones || []} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONSOLA DE ACCIONES */}
      {isAdmin && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl p-5 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <button onClick={() => setEditMode(!editMode)} className="px-8 py-4 rounded-full text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 flex items-center gap-3 transition-all">
            {editMode ? <X size={18} /> : <Edit3 size={18} />}
            {editMode ? "Cancelar" : "Editar"}
          </button>
          {editMode && (
            <button onClick={onConfirmSave} disabled={saving} className="px-12 py-4 bg-green-500 text-slate-950 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-green-400 flex items-center gap-3 shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all">
              {saving ? <div className="w-5 h-5 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : <Save size={18} />}
              {isNew ? "Crear Nuevo" : "Guardar"}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}