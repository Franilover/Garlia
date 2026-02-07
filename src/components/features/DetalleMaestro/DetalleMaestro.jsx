"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Sparkles, Music } from 'lucide-react';
import Relaciones from './relaciones'; 
import { useDetalleMaestro } from '@/hooks/useDetalleMaestro'; 
import { SeccionMusica } from './SeccionMusica';

export default function DetalleMaestro({ 
  isOpen, 
  onClose, 
  data, 
  tags = [], 
  mostrarMusica = true, 
  onUpdate 
}) {
  const {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones, setEditRelaciones
  } = useDetalleMaestro(data, onUpdate);

  if (!data || !isOpen) return null;

  const imagenVisual = (varianteActiva?.imagen_url) || (data.img_url || data.imagen_url);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={data.id}
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: -20 }}
        className="max-w-7xl mx-auto mb-16 relative pt-24 px-4"
      >
        <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl relative border border-primary/5">
          
          {/* --- BOTONES DE CONTROL FLOTANTES --- */}
          <div className="absolute top-8 right-8 z-50 flex gap-3">
            {isAdmin && (
              <button 
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`p-4 text-white rounded-full shadow-xl hover:scale-105 transition-all flex items-center gap-3 px-7 ${
                  editMode ? 'bg-green-500' : 'bg-primary'
                }`}
              >
                {editMode ? <Save size={22} /> : <Edit3 size={22} />}
                {editMode && <span className="text-xs font-black uppercase tracking-[0.2em]">{saving ? 'Guardando...' : 'Guardar'}</span>}
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-4 bg-slate-100 text-primary rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              <X size={22} />
            </button>
          </div>

          {/* --- BLOQUE SUPERIOR: IDENTIDAD (IMAGEN + DESCRIPCIÓN) --- */}
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* IZQUIERDA: IMAGEN */}
            <div className="w-full lg:w-1/2 bg-gradient-to-br from-slate-50 to-primary/5 p-12 lg:p-24 flex items-center justify-center relative overflow-hidden">
               {/* Decoración de fondo */}
              <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none italic font-black text-[20rem] leading-none select-none">
                {data.nombre[0]}
              </div>
              
              <div className="relative w-full aspect-square max-w-[450px]">
                <div className="absolute inset-0 bg-primary/10 rounded-[5rem] rotate-6 scale-105 blur-2xl opacity-20" />
                <motion.img 
                  key={imagenVisual}
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  src={imagenVisual} 
                  className="relative z-10 w-full h-full object-contain mix-blend-multiply drop-shadow-2xl" 
                />
              </div>
            </div>

            {/* DERECHA: TEXTO PRINCIPAL */}
            <div className="w-full lg:w-1/2 p-10 lg:p-20 flex flex-col justify-center">
              {editMode ? (
                /* --- EDITOR SUPERIOR --- */
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-2">Nombre del Sujeto</label>
                    <input 
                      value={editNombre}
                      disabled={!!varianteActiva}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="text-5xl font-black uppercase italic text-slate-900 w-full bg-slate-50 border-none p-6 rounded-[2rem] outline-none focus:ring-4 ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-2">Historia / Registro</label>
                    <textarea 
                      value={editDescripcion}
                      onChange={(e) => setEditDescripcion(e.target.value)}
                      className="text-slate-600 text-xl italic leading-relaxed w-full bg-slate-50 border-none p-8 rounded-[2rem] outline-none min-h-[250px] focus:ring-4 ring-primary/5 transition-all"
                    />
                  </div>
                </div>
              ) : (
                /* --- VISTA SUPERIOR --- */
                <div className="relative">
                  {variantes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      <button onClick={() => setVarianteActiva(null)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!varianteActiva ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-primary/40'}`}>Original</button>
                      {variantes.map((v) => (
                        <button key={v.id} onClick={() => setVarianteActiva(v)} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${varianteActiva?.id === v.id ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-primary/40'}`}>
                          <Sparkles size={12} /> {v.tipo}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mb-6">
                    {tags.map((tag, i) => tag && (
                      <span key={i} className="px-5 py-1.5 bg-primary text-white text-[10px] font-black uppercase rounded-full tracking-[0.2em] shadow-sm">{tag}</span>
                    ))}
                  </div>

                  <h2 className="text-6xl lg:text-8xl font-black uppercase italic text-primary leading-[0.8] tracking-tighter mb-10 break-words">
                    {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : editNombre}
                  </h2>
                  
                  <p className="text-slate-500 text-xl lg:text-2xl italic leading-relaxed whitespace-pre-wrap max-w-prose">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* --- BLOQUE INFERIOR: CONTENIDO EXTENDIDO (ANCHO COMPLETO) --- */}
          <div className="bg-slate-50/50 p-10 lg:p-24 border-t border-slate-100 space-y-24">
            
            {/* SECCIÓN RELACIONES */}
            <div className="w-full">
               <Relaciones 
                nombrePersonaje={data.nombre} 
                editMode={editMode} 
                onChange={setEditRelaciones} 
              />
            </div>

            {/* SECCIÓN MÚSICA */}
            <div className="w-full">
              {editMode ? (
                /* Editor de Playlist */
                !varianteActiva && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Music className="text-primary" size={20} />
                      <label className="text-[12px] font-black uppercase text-primary tracking-[0.3em]">Editor de Playlist (URLs)</label>
                    </div>
                    <textarea 
                      value={editCanciones}
                      onChange={(e) => setEditCanciones(e.target.value)}
                      placeholder="/wiki/canciones/id-1, /wiki/canciones/id-2"
                      className="w-full text-sm font-mono p-8 bg-white border-2 border-primary/5 rounded-[2.5rem] outline-none focus:border-primary/20 min-h-[120px] shadow-inner"
                    />
                  </div>
                )
              ) : (
                /* Vista de Playlist */
                mostrarMusica && <SeccionMusica listaLinks={data?.canciones || []} nombre={data.nombre} />
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}