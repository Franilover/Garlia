"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Sparkles, AlertCircle } from 'lucide-react';
import Relaciones from '../relaciones'; // Ajusta según tu estructura
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
  // Conectamos con el "Cerebro" (Hook)
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
    setEditDescripcion
  } = useDetalleMaestro(data, onUpdate);

  if (!data || !isOpen) return null;

  // Lógica visual: ¿Qué imagen mostramos?
  const imagenVisual = (varianteActiva?.imagen_url) || (data.img_url || data.imagen_url);

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={data.id}
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: -20 }}
        className="max-w-7xl mx-auto mb-16 relative pt-4 px-4"
      >
        <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[500px] relative">
          
          {/* --- BOTONES DE CONTROL (TOP RIGHT) --- */}
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
                {editMode && <span className="text-[10px] font-black uppercase tracking-widest">{saving ? '...' : 'Guardar'}</span>}
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
                alt={editNombre}
                className="relative z-10 w-full h-full object-contain mix-blend-multiply rounded-[3.5rem]" 
              />
            </div>
          </div>

          {/* --- SECCIÓN DERECHA: CONTENIDO --- */}
          <div className="w-full lg:w-1/2 p-8 md:p-12 lg:pl-10 lg:pr-16 flex flex-col justify-center bg-bg-main/5">
            
            {/* SELECTOR DE VARIANTES */}
            {!editMode && variantes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button 
                  onClick={() => setVarianteActiva(null)} 
                  className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${
                    !varianteActiva ? 'bg-primary text-white border-primary shadow-md' : 'border-primary/10 text-primary/40'
                  }`}
                >
                  Original
                </button>
                {variantes.map((v) => (
                  <button 
                    key={v.id} 
                    onClick={() => setVarianteActiva(v)} 
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${
                      varianteActiva?.id === v.id ? 'bg-primary text-white border-primary shadow-md' : 'border-primary/10 text-primary/40'
                    }`}
                  >
                    <Sparkles size={10} /> {v.tipo}
                  </button>
                ))}
              </div>
            )}

            {editMode ? (
              /* --- VISTA EDICIÓN --- */
              <div className="space-y-4 mb-6">
                {varianteActiva && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 mb-2">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-black uppercase">Editando Variante: {varianteActiva.tipo}</span>
                  </div>
                )}
                <input 
                  value={editNombre}
                  disabled={!!varianteActiva}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="text-4xl md:text-5xl font-black uppercase italic text-primary w-full bg-white border-2 border-primary/20 p-4 rounded-2xl outline-none focus:border-primary disabled:opacity-50"
                />
                <textarea 
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  className="text-primary/80 text-base italic leading-snug w-full bg-white border-2 border-primary/20 p-4 rounded-2xl outline-none focus:border-primary min-h-[200px]"
                />
              </div>
            ) : (
              /* --- VISTA LECTURA --- */
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag, i) => tag && (
                    <span key={i} className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase rounded-lg tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase italic text-primary leading-[0.85] tracking-tighter mb-6 break-words">
                  {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : editNombre}
                </h2>
                
                <p className="text-primary/80 text-base md:text-lg italic leading-snug mb-8 whitespace-pre-wrap">
                  {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                </p>

                <div className="mb-8">
                   <Relaciones nombrePersonaje={data.nombre} />
                </div>

                {/* Llamamos al sub-componente de música */}
                {mostrarMusica && (
                  <SeccionMusica 
                    listaLinks={data?.canciones || []} 
                    nombre={data.nombre} 
                  />
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}