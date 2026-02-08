"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Sparkles, Music, Users, Plus, Trash2 } from 'lucide-react';
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
            <button onClick={onClose} className="p-4 bg-slate-100 text-slate-700 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg">
              <X size={22} />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch border-b border-slate-50">
            {/* Imagen Izquierda */}
            <div className="w-full lg:w-[45%] bg-gradient-to-br from-slate-100 to-slate-200 p-6 lg:p-12 flex items-center justify-center relative overflow-hidden min-h-[500px]">
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none italic font-black text-[25rem] flex items-center justify-center text-primary select-none">
                {data.nombre[0]}
              </div>
              <div className="relative w-full aspect-square max-w-[480px] rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white group">
                <motion.img key={imagenVisual} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={imagenVisual} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
            </div>

            {/* Información Derecha */}
            <div className="w-full lg:w-[55%] p-10 lg:p-16 flex flex-col justify-center bg-white">
              {editMode ? (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block italic">Nombre del Sujeto</label>
                    <input 
                      value={editNombre} 
                      onChange={(e) => setEditNombre(e.target.value)} 
                      className="text-4xl font-black uppercase italic text-slate-900 w-full bg-slate-50 border border-slate-200 p-6 rounded-[2rem] outline-none focus:ring-4 ring-primary/5 shadow-inner" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block italic">{esCriatura ? 'Descripción de la Especie' : 'Biografía del Personaje'}</label>
                    <textarea 
                      value={editDescripcion} 
                      onChange={(e) => setEditDescripcion(e.target.value)} 
                      className="text-slate-700 text-lg italic leading-relaxed w-full bg-slate-50 border border-slate-200 p-8 rounded-[2rem] outline-none min-h-[200px] resize-none focus:ring-4 ring-primary/5 shadow-inner" 
                    />
                  </div>

                  {/* EDICIÓN DE VARIANTES (Solo Criaturas) */}
                  {esCriatura && (
                    <div className="mt-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase italic text-primary flex items-center gap-2">
                          <Sparkles size={16} /> Variantes Genéticas
                        </h3>
                        <button 
                          onClick={agregarVariante}
                          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                        >
                          <Plus size={14} /> Añadir Variante
                        </button>
                      </div>

                      <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {variantes.map((v, index) => (
                          <div key={v.id || index} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 relative group">
                            <button 
                              onClick={() => eliminarVariante(index)}
                              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <input 
                                placeholder="Tipo (ej: Fuego)" 
                                value={v.tipo} 
                                onChange={(e) => {
                                  const n = [...variantes]; n[index].tipo = e.target.value; setVariantes(n);
                                }}
                                className="bg-white p-3 rounded-xl text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-primary/40 shadow-sm"
                              />
                              <input 
                                placeholder="URL Imagen" 
                                value={v.imagen_url} 
                                onChange={(e) => {
                                  const n = [...variantes]; n[index].imagen_url = e.target.value; setVariantes(n);
                                }}
                                className="bg-white p-3 rounded-xl text-[10px] font-mono text-slate-500 outline-none border border-slate-200 focus:border-primary/40 shadow-sm"
                              />
                            </div>
                            <textarea 
                              placeholder="Descripción de la variante..."
                              value={v.descripcion_variante}
                              onChange={(e) => {
                                const n = [...variantes]; n[index].descripcion_variante = e.target.value; setVariantes(n);
                              }}
                              className="w-full bg-white p-4 rounded-xl text-xs italic text-slate-600 outline-none border border-slate-200 focus:border-primary/40 min-h-[80px] resize-none shadow-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="flex flex-wrap gap-3 mb-6">
                    {tags.map((tag, i) => tag && <span key={i} className="px-5 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-md">{tag}</span>)}
                  </div>
                  <h2 className="text-7xl lg:text-8xl font-black uppercase italic text-primary leading-[0.8] tracking-tighter mb-8">
                    {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : editNombre}
                  </h2>
                  <p className="text-slate-500 text-lg lg:text-xl italic leading-relaxed whitespace-pre-wrap max-w-prose">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>
                  
                  {/* Selector Variantes */}
                  {variantes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-10">
                      <button onClick={() => setVarianteActiva(null)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${!varianteActiva ? 'bg-primary text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Base</button>
                      {variantes.map((v, i) => (
                        <button key={v.id || i} onClick={() => setVarianteActiva(v)} className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${varianteActiva?.id === v.id || (varianteActiva === v) ? 'bg-primary text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                          <Sparkles size={12} /> {v.tipo || 'Nueva'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bloque Inferior */}
          {tieneContenidoInferior && (
            <div className="bg-slate-50 p-10 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-20 items-start">
              <div className="space-y-6 text-slate-800">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-300 italic flex items-center gap-2"><Users size={14} /> Vinculos</span>
                  <div className="h-[1px] flex-1 bg-slate-200" />
                </div>
                {loadingRelaciones ? <div className="h-20 bg-white rounded-[2rem] w-full animate-pulse border border-slate-100" /> : <Relaciones nombrePersonaje={data.nombre} personajeId={data.id} datosRelaciones={data.relaciones || []} editMode={editMode} onChange={setEditRelaciones} />}
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-300 italic flex items-center gap-2"><Music size={14} /> Soliloquios</span>
                  <div className="h-[1px] flex-1 bg-slate-200" />
                </div>
                {editMode ? <textarea value={editCanciones} onChange={(e) => setEditCanciones(e.target.value)} placeholder="Ej: dQw4w9WgXcQ, ..." className="w-full text-sm font-mono p-6 bg-white border border-slate-200 text-slate-700 rounded-[2.5rem] outline-none min-h-[150px] shadow-inner focus:ring-4 ring-primary/5" /> : <div className="min-h-[200px]">{mostrarMusica && <SeccionMusica listaLinks={data?.canciones || []} nombre={data.nombre} />}</div>}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}