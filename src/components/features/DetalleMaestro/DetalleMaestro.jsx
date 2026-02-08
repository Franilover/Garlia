"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Plus, Trash2, Music, Users, Image as ImageIcon, Zap } from 'lucide-react';
import Relaciones from './relaciones'; 
import { useDetalleMaestro } from '@/hooks/useDetalleMaestro'; 
import { SeccionMusica } from './SeccionMusica';

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
        <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl relative border border-primary/5">
          
          {/* --- CONTROLES SUPERIORES (Suavizados) --- */}
          <div className="absolute top-8 right-8 z-50 flex gap-3">
            {isAdmin && (
              <button 
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`p-4 text-white rounded-full shadow-xl hover:scale-110 transition-all flex items-center gap-3 px-7 ${
                  editMode ? 'bg-green-500' : 'bg-slate-800'
                }`}
              >
                {editMode ? <Save size={22} /> : <Edit3 size={22} />}
                {editMode && <span className="text-xs font-black uppercase tracking-widest text-white">{saving ? 'Guardando...' : 'Guardar'}</span>}
              </button>
            )}
            <button onClick={onClose} className="p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all shadow-md border border-slate-100">
              <X size={22} />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch">
            {/* --- PANEL IZQUIERDO: IMAGEN --- */}
            <div className="w-full lg:w-[45%] bg-slate-50/50 p-6 lg:p-12 flex items-center justify-center relative overflow-hidden min-h-[500px]">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none italic font-black text-[25rem] flex items-center justify-center text-slate-900 select-none">
                {data.nombre[0]}
              </div>
              <div className="relative w-full aspect-square max-w-[480px] rounded-full overflow-hidden border-8 border-white shadow-2xl bg-white group">
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
                  {/* Nombre y Bio Principal */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-4 mb-2 block italic">Nombre del Sujeto</label>
                      <input 
                        value={editNombre} 
                        onChange={(e) => setEditNombre(e.target.value)} 
                        className="text-4xl font-black uppercase italic text-slate-700 w-full bg-slate-50 border border-slate-100 p-6 rounded-[2.5rem] outline-none focus:ring-2 ring-slate-100 transition-all shadow-inner" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-4 mb-2 block italic">{esCriatura ? 'Descripción de la Especie' : 'Biografía del Personaje'}</label>
                      <textarea 
                        value={editDescripcion} 
                        onChange={(e) => setEditDescripcion(e.target.value)} 
                        className="text-slate-500 text-lg italic leading-relaxed w-full bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] outline-none min-h-[180px] resize-none focus:ring-2 ring-slate-100 transition-all shadow-inner" 
                      />
                    </div>
                  </div>

                  {/* SECCIÓN VARIANTES SUAVIZADA */}
                  {esCriatura && (
                    <div className="pt-8 border-t border-slate-50">
                      <div className="flex items-center justify-between mb-6 px-4">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-slate-300" />
                          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Variantes</h3>
                        </div>
                        <button 
                          onClick={agregarVariante}
                          className="px-5 py-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[10px] font-black uppercase hover:bg-white hover:text-slate-600 hover:shadow-md transition-all flex items-center gap-2"
                        >
                          <Plus size={14} /> Nueva
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                        {variantes.map((v, index) => (
                          <motion.div 
                            key={v.id || index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row gap-6 p-6 bg-slate-50/50 rounded-[3rem] border border-slate-100 relative group"
                          >
                            {/* Previsualización de Imagen */}
                            <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-white flex-shrink-0 border border-slate-100 shadow-sm">
                              {v.imagen_url ? (
                                <img src={v.imagen_url} className="w-full h-full object-cover" alt="preview" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                  <ImageIcon size={20} />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <input 
                                  placeholder="Nombre..." 
                                  value={v.tipo} 
                                  onChange={(e) => {
                                    const n = [...variantes]; n[index].tipo = e.target.value; setVariantes(n);
                                  }}
                                  className="bg-white px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 outline-none focus:border-slate-300"
                                />
                                <input 
                                  placeholder="URL Imagen..." 
                                  value={v.imagen_url} 
                                  onChange={(e) => {
                                    const n = [...variantes]; n[index].imagen_url = e.target.value; setVariantes(n);
                                  }}
                                  className="bg-white px-4 py-2 rounded-xl text-[10px] font-mono text-slate-400 border border-slate-100 outline-none focus:border-slate-300"
                                />
                              </div>
                              <textarea 
                                placeholder="Descripción..."
                                value={v.descripcion_variante}
                                onChange={(e) => {
                                  const n = [...variantes]; n[index].descripcion_variante = e.target.value; setVariantes(n);
                                }}
                                className="w-full bg-white p-4 rounded-2xl text-xs italic text-slate-500 border border-slate-100 outline-none min-h-[60px] resize-none"
                              />
                            </div>

                            <button 
                              onClick={() => eliminarVariante(index)}
                              className="absolute -top-1 -right-1 bg-white text-slate-200 hover:text-red-400 p-2 rounded-full shadow-sm border border-slate-100 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
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
                      <span key={i} className="px-5 py-2 bg-slate-50 text-slate-400 border border-slate-100 text-[10px] font-black uppercase rounded-full tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h2 className="text-7xl lg:text-8xl font-black uppercase italic text-slate-800 leading-[0.8] tracking-tighter mb-8">
                    {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : editNombre}
                  </h2>
                  
                  <p className="text-slate-400 text-lg lg:text-xl italic leading-relaxed whitespace-pre-wrap max-w-prose">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>
                  
                  {/* BOTONES DE VARIANTES (Gris claro/Suaves) */}
                  {variantes.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-12">
                      <button 
                        onClick={() => setVarianteActiva(null)} 
                        className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase transition-all duration-300 border ${!varianteActiva ? 'bg-white text-slate-800 border-slate-200 shadow-xl -translate-y-1' : 'bg-slate-50 text-slate-300 border-transparent hover:bg-slate-100'}`}
                      >
                        Base
                      </button>
                      {variantes.map((v, i) => (
                        <button 
                          key={v.id || i} 
                          onClick={() => setVarianteActiva(v)} 
                          className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase transition-all duration-300 border ${
                            (varianteActiva?.id === v.id && v.id) || (varianteActiva === v) 
                              ? 'bg-white text-slate-800 border-slate-200 shadow-xl -translate-y-1' 
                              : 'bg-slate-50 text-slate-300 border-transparent hover:bg-slate-100'
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

          {/* Bloque Inferior (Solo si es personaje) */}
          {tieneContenidoInferior && (
            <div className="bg-slate-50/30 p-10 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-20 items-start border-t border-slate-50">
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-200 italic flex items-center gap-2"><Users size={14} /> Vínculos</span>
                  <div className="h-[1px] flex-1 bg-slate-100" />
                </div>
                {loadingRelaciones ? <div className="h-20 bg-white rounded-[2rem] w-full animate-pulse border border-slate-50" /> : <Relaciones nombrePersonaje={data.nombre} personajeId={data.id} datosRelaciones={data.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />}
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-200 italic flex items-center gap-2"><Music size={14} /> Soliloquios</span>
                  <div className="h-[1px] flex-1 bg-slate-100" />
                </div>
                {editMode ? <textarea value={editCanciones} onChange={(e) => setEditCanciones(e.target.value)} placeholder="IDs YouTube..." className="w-full text-xs font-mono p-6 bg-white border border-slate-100 text-slate-400 rounded-[2.5rem] outline-none min-h-[120px] shadow-inner" /> : <div className="min-h-[200px]">{mostrarMusica && <SeccionMusica listaLinks={data?.canciones || []} nombre={data.nombre} />}</div>}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}