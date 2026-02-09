"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Plus, Trash2, Music, Users, Image as ImageIcon, Zap } from 'lucide-react';
import Relaciones from './relaciones'; 
import { useDetalleMaestro } from '@/hooks/useDetalleMaestro'; 

// IMPORTANTE: Importamos ambos componentes del mismo archivo
import { SeccionMusica, SelectorMusicaAdmin } from './SeccionMusica';

export default function DetalleMaestro({ 
  isOpen, onClose, data, tags = [], mostrarMusica = true, onUpdate 
}) {
  const {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, setVariantes,
    varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones, setEditRelaciones
  } = useDetalleMaestro(data, onUpdate);

  const esCriatura = data && (!data.hasOwnProperty('canciones') || 'puntos_vida' in data);
  const tieneContenidoInferior = !esCriatura && (editMode || data?.relaciones?.length > 0 || data?.canciones?.length > 0);
  const [loadingRelaciones, setLoadingRelaciones] = useState(!esCriatura && !data?.relaciones);

  useEffect(() => {
    if (isOpen) {
      if (esCriatura || data?.relaciones) {
        setLoadingRelaciones(false);
      } else {
        const timer = setTimeout(() => setLoadingRelaciones(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, data, esCriatura]);

  const agregarVariante = () => {
    const nueva = {
      tipo: "Nueva Variante",
      descripcion_variante: "",
      imagen_url: "",
      criatura_id: data.id 
    };
    setVariantes([...variantes, nueva]);
  };

  const eliminarVariante = (index) => {
    const nuevas = variantes.filter((_, i) => i !== index);
    setVariantes(nuevas);
  };

  if (!data || !isOpen) return null;

  const imagenVisual = (varianteActiva?.imagen_url) || (data.img_url || data.imagen_url);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={data.id}
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-7xl mx-auto mb-16 relative pt-24 px-4"
      >
        <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl relative border border-primary/10">
          
          {/* --- CONTROLES SUPERIORES --- */}
          <div className="absolute top-8 right-8 z-50 flex gap-3">
            {isAdmin && (
              <button 
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`p-4 text-white rounded-full shadow-xl hover:scale-110 transition-all flex items-center gap-3 px-7 ${
                  editMode ? 'bg-green-600' : 'bg-primary'
                }`}
              >
                {editMode ? <Save size={22} /> : <Edit3 size={22} />}
                {editMode && <span className="text-xs font-black uppercase tracking-widest text-white">{saving ? 'Guardando...' : 'Guardar'}</span>}
              </button>
            )}
            <button onClick={onClose} className="p-4 bg-primary/5 text-primary rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg border border-primary/10">
              <X size={22} />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch border-b border-primary/5">
            {/* --- PANEL IZQUIERDO: IMAGEN CON INICIAL --- */}
            <div className="w-full lg:w-[45%] bg-linear-to-br from-primary/5 to-white p-6 lg:p-12 flex items-center justify-center relative overflow-hidden min-h-125">
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none italic font-black text-[25rem] flex items-center justify-center text-primary select-none">
                {data.nombre[0]}
              </div>
              <div className="relative w-full aspect-square max-w-120 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white group">
                <motion.img 
                  key={imagenVisual} 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  src={imagenVisual} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
              </div>
            </div>

            {/* --- PANEL DERECHO: INFO/EDITOR --- */}
            <div className="w-full lg:w-[55%] p-10 lg:p-16 flex flex-col justify-center bg-white">
              {editMode ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 ml-4 mb-2 block italic">Nombre del Sujeto</label>
                      <input 
                        value={editNombre} 
                        onChange={(e) => setEditNombre(e.target.value)} 
                        className="text-2xl font-black uppercase italic text-primary w-full bg-primary/5 border border-primary/10 p-5 rounded-4xl outline-none focus:ring-4 ring-primary/5 shadow-inner" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 ml-4 mb-2 block italic">{esCriatura ? 'Descripción de la Especie' : 'Biografía del Personaje'}</label>
                      <textarea 
                        value={editDescripcion} 
                        onChange={(e) => setEditDescripcion(e.target.value)} 
                        className="text-slate-600 text-lg italic leading-relaxed w-full bg-primary/5 border border-primary/10 p-8 rounded-4xl outline-none min-h-45 resize-none focus:ring-4 ring-primary/5 shadow-inner" 
                      />
                    </div>
                  </div>

                  {/* SECCIÓN VARIANTES EN MODO EDICIÓN */}
                  {esCriatura && (
                    <div className="pt-6 border-t border-primary/10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <Zap size={16} className="text-primary" fill="currentColor" />
                          <h3 className="text-sm font-black uppercase tracking-widest italic text-primary">Variantes Genéticas</h3>
                        </div>
                        <button 
                          onClick={agregarVariante}
                          className="px-6 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all shadow-md flex items-center gap-2"
                        >
                          <Plus size={14} /> Nueva Variante
                        </button>
                      </div>

                      <div className="space-y-4 max-h-125 overflow-y-auto pr-4 custom-scrollbar">
                        {variantes.map((v, index) => (
                          <motion.div 
                            key={v.id || index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row gap-6 p-6 bg-primary/5 rounded-[2.5rem] border border-primary/10 relative group"
                          >
                            <div className="w-full md:w-32 h-32 rounded-3xl overflow-hidden bg-white shrink-0 border-2 border-white shadow-md">
                              {v.imagen_url ? (
                                <img src={v.imagen_url} className="w-full h-full object-cover" alt="preview" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary/20">
                                  <ImageIcon size={24} />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input 
                                  placeholder="Tipo de Variante" 
                                  value={v.tipo} 
                                  onChange={(e) => {
                                    const n = [...variantes]; n[index].tipo = e.target.value; setVariantes(n);
                                  }}
                                  className="bg-white px-4 py-2 rounded-xl text-xs font-bold text-primary border border-primary/10 outline-none focus:ring-2 ring-primary/5"
                                />
                                <input 
                                  placeholder="URL Imagen" 
                                  value={v.imagen_url} 
                                  onChange={(e) => {
                                    const n = [...variantes]; n[index].imagen_url = e.target.value; setVariantes(n);
                                  }}
                                  className="bg-white px-4 py-2 rounded-xl text-[10px] font-mono text-slate-400 border border-primary/10 outline-none focus:ring-2 ring-primary/5"
                                />
                              </div>
                              <textarea 
                                placeholder="Descripción..."
                                value={v.descripcion_variante}
                                onChange={(e) => {
                                  const n = [...variantes]; n[index].descripcion_variante = e.target.value; setVariantes(n);
                                }}
                                className="w-full bg-white p-4 rounded-2xl text-xs italic text-slate-500 border border-primary/10 outline-none min-h-20 resize-none"
                              />
                            </div>

                            <button 
                              onClick={() => eliminarVariante(index)}
                              className="md:absolute md:-top-2 md:-right-2 bg-white text-primary/20 hover:text-red-500 p-2 rounded-full shadow-md border border-primary/5 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* --- VISTA NORMAL --- */
                <div className="relative">
                  <div className="flex flex-wrap gap-3 mb-6">
                    {tags.map((tag, i) => tag && (
                      <span key={i} className="px-5 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h2 className="text-5xl lg:text-6xl font-black uppercase italic text-primary leading-[0.9] tracking-tighter mb-8">
                    {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : editNombre}
                  </h2>
                  
                  <p className="text-slate-500 text-lg lg:text-xl italic leading-relaxed whitespace-pre-wrap max-w-prose">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>
                  
                  {/* SELECTOR DE VARIANTES VISUAL */}
                  {variantes.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-12">
                      <button 
                        onClick={() => setVarianteActiva(null)} 
                        className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase transition-all duration-300 ${!varianteActiva ? 'bg-primary text-white shadow-xl -translate-y-1' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
                      >
                        Forma Base
                      </button>
                      {variantes.map((v, i) => (
                        <button 
                          key={v.id || i} 
                          onClick={() => setVarianteActiva(v)} 
                          className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[11px] font-black uppercase transition-all duration-300 ${
                            (varianteActiva?.id === v.id && v.id) || (varianteActiva === v) 
                              ? 'bg-primary text-white shadow-xl -translate-y-1' 
                              : 'bg-primary/5 text-primary hover:bg-primary/10'
                          }`}
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

          {/* Bloque Inferior: Vínculos y Música */}
          {tieneContenidoInferior && (
            <div className="bg-primary/2 p-10 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-20 items-start border-t border-primary/5">
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/20 italic flex items-center gap-2">
                    <Users size={14} /> Vínculos
                  </span>
                  <div className="h-px flex-1 bg-primary/10" />
                </div>
                {loadingRelaciones ? (
                  <div className="h-20 bg-white rounded-4xl w-full animate-pulse border border-primary/5" />
                ) : (
                  <Relaciones 
                    nombrePersonaje={data.nombre} 
                    personajeId={data.id} 
                    datosRelaciones={data.relaciones || []} 
                    editMode={editMode} 
                    onChange={setEditRelaciones} 
                  />
                )}
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/20 italic flex items-center gap-2">
                    <Music size={14} /> Soliloquios
                  </span>
                  <div className="h-px flex-1 bg-primary/10" />
                </div>
                
                {editMode ? (
                  <SelectorMusicaAdmin 
                    idsSeleccionados={editCanciones} 
                    onChange={setEditCanciones} 
                  />
                ) : (
                  <div className="min-h-50">
                    {mostrarMusica && <SeccionMusica listaLinks={data?.canciones || []} />}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}