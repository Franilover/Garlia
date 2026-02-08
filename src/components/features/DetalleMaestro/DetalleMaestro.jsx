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
          
          {/* --- BOTONES DE CONTROL --- */}
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
                {editMode && <span className="text-xs font-black uppercase tracking-widest">{saving ? 'Guardando...' : 'Guardar'}</span>}
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-4 bg-slate-100 text-primary rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              <X size={22} />
            </button>
          </div>

          {/* --- SECCIÓN SUPERIOR: IDENTIDAD --- */}
          <div className="flex flex-col lg:flex-row min-h-[650px] items-stretch">
            
            {/* IZQUIERDA: EL MEDALLÓN */}
            <div className="w-full lg:w-5/12 bg-gradient-to-br from-slate-50 to-primary/5 p-12 lg:p-20 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none italic font-black text-[25rem] flex items-center justify-center text-primary select-none">
                {data.nombre[0]}
              </div>
              
              <div className="relative w-full aspect-square max-w-[420px] rounded-full overflow-hidden border-[16px] border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] bg-white group">
                <div className="absolute inset-0 z-20 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.1)] rounded-full" />
                <motion.img 
                  key={imagenVisual}
                  initial={{ opacity: 0, scale: 1.15 }} 
                  animate={{ opacity: 1, scale: 1.05 }}
                  src={imagenVisual} 
                  className="relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute inset-0 z-30 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
              </div>
            </div>

            {/* DERECHA: BIO Y NOMBRE */}
            <div className="w-full lg:w-7/12 p-10 lg:p-24 flex flex-col justify-center bg-white">
              {editMode ? (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-2">Identificación</label>
                    <input 
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="text-5xl font-black uppercase italic text-slate-900 w-full bg-slate-50 border-none p-6 rounded-[2rem] outline-none focus:ring-4 ring-primary/5 transition-all"
                    />
                  </div>
                  <textarea 
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="text-slate-600 text-xl italic leading-relaxed w-full bg-slate-50 border-none p-8 rounded-[2rem] outline-none min-h-[300px]"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="flex flex-wrap gap-3 mb-8">
                    {tags.map((tag, i) => tag && (
                      <span key={i} className="px-5 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-full tracking-widest shadow-md">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-7xl lg:text-9xl font-black uppercase italic text-primary leading-[0.75] tracking-tighter mb-12">
                    {varianteActiva ? `${data.nombre} ${varianteActiva.tipo}` : data.nombre}
                  </h2>
                  
                  <div className="h-[2px] w-24 bg-primary/10 mb-10" />

                  <p className="text-slate-500 text-xl lg:text-2xl italic leading-relaxed whitespace-pre-wrap max-w-[90%]">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>

                  {variantes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-12">
                      <button onClick={() => setVarianteActiva(null)} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${!varianteActiva ? 'bg-primary text-white' : 'bg-slate-100 text-primary/40 hover:bg-slate-200'}`}>Base</button>
                      {variantes.map((v) => (
                        <button key={v.id} onClick={() => setVarianteActiva(v)} className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${varianteActiva?.id === v.id ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-primary/40 hover:bg-slate-200'}`}>
                          <Sparkles size={12} /> {v.tipo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- SECCIÓN INFERIOR: GRID DE CONTENIDO --- */}
          <div className="bg-slate-50/50 p-10 lg:p-20 border-t border-slate-100 grid grid-cols-1 xl:grid-cols-2 gap-20">
            
            {/* COLUMNA 1: RELACIONES */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-[1px] flex-1 bg-primary/10" />
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/30 italic">Círculo Social</span>
                <div className="h-[1px] flex-1 bg-primary/10" />
              </div>
              <Relaciones 
                nombrePersonaje={data.nombre} 
                editMode={editMode} 
                onChange={setEditRelaciones} 
              />
            </div>

            {/* COLUMNA 2: MÚSICA */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-[1px] flex-1 bg-primary/10" />
                <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/30 italic">Playlist Oficial</span>
                <div className="h-[1px] flex-1 bg-primary/10" />
              </div>
              {editMode && !varianteActiva ? (
                <textarea 
                  value={editCanciones}
                  onChange={(e) => setEditCanciones(e.target.value)}
                  className="w-full text-sm font-mono p-8 bg-white border-2 border-primary/5 rounded-[2.5rem] outline-none min-h-[150px] shadow-inner"
                  placeholder="URL de canciones separadas por coma..."
                />
              ) : (
                mostrarMusica && <SeccionMusica listaLinks={data?.canciones || []} nombre={data.nombre} />
              )}
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}