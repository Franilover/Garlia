"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Sparkles, AlertCircle, Music } from 'lucide-react';
import Relaciones from '../relaciones'; 
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
    isAdmin,
    editMode,
    setEditMode,
    saving,
    handleSave,
    variantes,
    varianteActiva,
    setVarianteActiva,
    editNombre,
    setEditNombre,
    editDescripcion,
    setEditDescripcion,
    editCanciones,
    setEditCanciones,
    setEditRelaciones // <-- IMPORTANTE: Traer la función del Hook
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
        <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[500px] relative">
          
          {/* --- BOTONES DE CONTROL --- */}
          <div className="absolute top-6 right-6 z-50 flex gap-2">
            {isAdmin && (
              <button 
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`p-3 text-white rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-2 px-5 ${
                  editMode ? 'bg-green-500' : 'bg-primary'
                }`}
              >
                {editMode ? <Save size={20} /> : <Edit3 size={20} />}
                {editMode && <span className="text-[10px] font-black uppercase tracking-widest">{saving ? 'Guardando...' : 'Guardar'}</span>}
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-3 bg-bg-main text-primary rounded-full hover:bg-red-50 hover:text-red-500 transition-all shadow-md"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* --- SECCIÓN IZQUIERDA: IMAGEN --- */}
          <div className="w-full lg:w-1/2 bg-gradient-to-br from-white to-primary/5 flex items-center justify-center p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-primary/5">
            <div className="relative w-full aspect-square max-w-[400px]">
              <div className="absolute inset-0 bg-primary/5 rounded-[4rem] rotate-3 scale-105" />
              <motion.img 
                key={imagenVisual}
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                src={imagenVisual} 
                className="relative z-10 w-full h-full object-contain mix-blend-multiply rounded-[3.5rem]" 
              />
            </div>
          </div>

          {/* --- SECCIÓN DERECHA: CONTENIDO --- */}
          <div className="w-full lg:w-1/2 p-8 md:p-12 lg:pl-10 lg:pr-16 flex flex-col justify-center bg-bg-main/5">
            
            {editMode ? (
              /* --- VISTA EDICIÓN --- */
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary/40 ml-2 italic">Nombre del Sujeto</label>
                  <input 
                    value={editNombre}
                    disabled={!!varianteActiva}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="text-3xl font-black uppercase italic text-slate-900 w-full bg-white border-2 border-primary/10 p-4 rounded-2xl outline-none focus:border-primary shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary/40 ml-2 italic">Biografía / Descripción</label>
                  <textarea 
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="text-slate-800 text-base italic leading-snug w-full bg-white border-2 border-primary/10 p-4 rounded-2xl outline-none focus:border-primary min-h-[150px] shadow-sm"
                  />
                </div>

                {/* EDITAR CANCIONES */}
                {!varianteActiva && (
                  <div className="space-y-2 bg-slate-50 p-5 rounded-[2.5rem] border border-primary/10">
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <Music size={14} className="text-primary" />
                      <label className="text-[10px] font-black uppercase text-primary/60 italic">Playlist (IDs de Supabase)</label>
                    </div>
                    <textarea 
                      value={editCanciones}
                      onChange={(e) => setEditCanciones(e.target.value)}
                      placeholder="/wiki/canciones/id-aqui"
                      className="w-full text-[12px] font-mono p-4 bg-white border border-primary/10 rounded-2xl outline-none focus:border-primary text-slate-900 min-h-[80px] shadow-inner"
                    />
                  </div>
                )}

                {/* EDITAR RELACIONES (CONECTADO AL HOOK) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-primary/40 ml-2 tracking-tighter italic">Panel de Conexiones</label>
                  <div className="p-4 bg-white border-2 border-primary/5 rounded-[2rem] shadow-sm">
                    <Relaciones 
                      nombrePersonaje={data.nombre} 
                      editMode={true} 
                      onChange={setEditRelaciones} // <-- AQUÍ SE CONECTA EL GUARDADO
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* --- VISTA LECTURA --- */
              <>
                {!editMode && variantes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => setVarianteActiva(null)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${!varianteActiva ? 'bg-primary text-white border-primary shadow-md' : 'border-primary/10 text-primary/40'}`}>Original</button>
                    {variantes.map((v) => (
                      <button key={v.id} onClick={() => setVarianteActiva(v)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${varianteActiva?.id === v.id ? 'bg-primary text-white border-primary shadow-md' : 'border-primary/10 text-primary/40'}`}>
                        <Sparkles size={10} /> {v.tipo}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag, i) => tag && (
                    <span key={i} className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase rounded-lg tracking-widest">{tag}</span>
                  ))}
                </div>

                <h2 className="text-4xl md:text-6xl font-black uppercase italic text-primary leading-[0.85] tracking-tighter mb-6 break-words">
                  {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : editNombre}
                </h2>
                
                <p className="text-primary/80 text-base md:text-lg italic leading-snug mb-8 whitespace-pre-wrap">
                  {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                </p>

                <div className="mb-8">
                   <Relaciones nombrePersonaje={data.nombre} editMode={false} />
                </div>

                {mostrarMusica && (
                  <SeccionMusica listaLinks={data?.canciones || []} nombre={data.nombre} />
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}