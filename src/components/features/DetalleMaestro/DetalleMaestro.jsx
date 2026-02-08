"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Save, Sparkles, Music, Users } from 'lucide-react';
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
  // Extraemos la lógica del hook personalizado
  const {
    isAdmin, editMode, setEditMode, saving, handleSave,
    variantes, varianteActiva, setVarianteActiva,
    editNombre, setEditNombre, editDescripcion, setEditDescripcion,
    editCanciones, setEditCanciones, setEditRelaciones
  } = useDetalleMaestro(data, onUpdate);

  /**
   * 1. LÓGICA DE DETECCIÓN Y VISIBILIDAD
   * esCriatura: Determina si el objeto actual es una criatura basándose en campos únicos.
   * tieneContenidoInferior: Si es criatura, ocultamos el bloque de vínculos y música (salvo en editMode).
   */
  const esCriatura = data && (!data.hasOwnProperty('canciones') || 'puntos_vida' in data);
  const tieneContenidoInferior = (!esCriatura && (data?.relaciones?.length > 0 || data?.canciones?.length > 0)) || editMode;

  /**
   * 2. GESTIÓN DEL ESTADO DE CARGA
   * Evitamos el esqueleto de carga infinito en criaturas ya que no poseen relaciones.
   */
  const [loadingRelaciones, setLoadingRelaciones] = useState(!esCriatura && !data?.relaciones);

  useEffect(() => {
    if (isOpen) {
      if (esCriatura || data?.relaciones) {
        setLoadingRelaciones(false);
      } else {
        // Pequeño fallback por si la data tarda un poco en propagarse
        const timer = setTimeout(() => setLoadingRelaciones(false), 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, data, esCriatura]);

  if (!data || !isOpen) return null;

  // Priorizamos la imagen de la variante activa si existe
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
          
          {/* --- CONTROLES SUPERIORES (Edit/Save/Close) --- */}
          <div className="absolute top-8 right-8 z-50 flex gap-3">
            {isAdmin && (
              <button 
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`p-4 text-white rounded-full shadow-xl hover:scale-110 transition-all flex items-center gap-3 px-7 ${
                  editMode ? 'bg-green-500' : 'bg-primary'
                }`}
              >
                {editMode ? <Save size={22} /> : <Edit3 size={22} />}
                {editMode && (
                  <span className="text-xs font-black uppercase tracking-widest">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </span>
                )}
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-4 bg-slate-100 text-primary rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              <X size={22} />
            </button>
          </div>

          {/* --- CABECERA: IMAGEN Y BIOGRAFÍA --- */}
          <div className="flex flex-col lg:flex-row items-stretch border-b border-slate-50">
            {/* Contenedor Visual */}
            <div className="w-full lg:w-[45%] bg-gradient-to-br from-slate-50 to-primary/5 p-6 lg:p-12 flex items-center justify-center relative overflow-hidden min-h-[500px]">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none italic font-black text-[25rem] flex items-center justify-center text-primary select-none">
                {data.nombre[0]}
              </div>
              <div className="relative w-full aspect-square max-w-[480px] rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white group">
                <motion.img 
                  key={imagenVisual}
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  src={imagenVisual} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
              </div>
            </div>

            {/* Contenedor Información */}
            <div className="w-full lg:w-[55%] p-10 lg:p-16 flex flex-col justify-center bg-white">
              {editMode ? (
                <div className="space-y-6">
                  <input 
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="text-5xl font-black uppercase italic text-slate-900 w-full bg-slate-50 border-none p-6 rounded-[2rem] outline-none focus:ring-4 ring-primary/5"
                  />
                  <textarea 
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="text-slate-600 text-lg italic leading-relaxed w-full bg-slate-50 border-none p-8 rounded-[2rem] outline-none min-h-[250px] resize-none"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="flex flex-wrap gap-3 mb-6">
                    {tags.map((tag, i) => tag && (
                      <span key={i} className="px-5 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-7xl lg:text-8xl font-black uppercase italic text-primary leading-[0.8] tracking-tighter mb-8">
                    {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : editNombre}
                  </h2>
                  <div className="h-[2px] w-16 bg-primary/10 mb-8" />
                  <p className="text-slate-500 text-lg lg:text-xl italic leading-relaxed whitespace-pre-wrap max-w-prose">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>
                  
                  {/* SELECTOR DE VARIANTES: Priorizamos data.variantes para evitar lag de carga */}
                  {(variantes.length > 0 || data.variantes?.length > 0) && (
                    <div className="flex flex-wrap gap-2 mt-10">
                      <button 
                        onClick={() => setVarianteActiva(null)} 
                        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${!varianteActiva ? 'bg-primary text-white shadow-lg scale-105' : 'bg-slate-100 text-primary/40 hover:bg-slate-200'}`}
                      >Base</button>
                      {(variantes.length > 0 ? variantes : data.variantes).map((v) => (
                        <button 
                          key={v.id} 
                          onClick={() => setVarianteActiva(v)} 
                          className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${varianteActiva?.id === v.id ? 'bg-primary text-white shadow-lg scale-105' : 'bg-slate-100 text-primary/40 hover:bg-slate-200'}`}
                        >
                          <Sparkles size={12} /> {v.tipo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- BLOQUE INFERIOR: VÍNCULOS Y MÚSICA --- */}
          {tieneContenidoInferior && (
            <div className="bg-slate-50/50 p-10 lg:p-20 grid grid-cols-1 xl:grid-cols-2 gap-20 items-start">
              
              {/* VÍNCULOS */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/30 italic flex items-center gap-2">
                     <Users size={14} /> Vinculos
                  </span>
                  <div className="h-[1px] flex-1 bg-primary/10" />
                </div>

                {loadingRelaciones ? (
                  <div className="space-y-4 animate-pulse p-4">
                    <div className="h-20 bg-white/50 rounded-[2rem] w-full border border-primary/5" />
                  </div>
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

              {/* MÚSICA (SOLILOQUIOS) */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/30 italic flex items-center gap-2">
                    <Music size={14} /> Soliloquios
                  </span>
                  <div className="h-[1px] flex-1 bg-primary/10" />
                </div>
                {editMode ? (
                  <textarea 
                    value={editCanciones}
                    onChange={(e) => setEditCanciones(e.target.value)}
                    placeholder="IDs de YouTube separados por comas..."
                    className="w-full text-sm font-mono p-6 bg-white border-2 border-primary/5 rounded-[2.5rem] outline-none min-h-[150px] shadow-inner focus:ring-4 ring-primary/5"
                  />
                ) : (
                  <div className="min-h-[200px]">
                    {mostrarMusica && <SeccionMusica listaLinks={data?.canciones || []} nombre={data.nombre} />}
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