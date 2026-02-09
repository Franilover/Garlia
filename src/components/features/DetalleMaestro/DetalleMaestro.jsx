"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Edit3, Save, Plus, Trash2, Music, Users, 
  Image as ImageIcon, Zap, Info, Shield, Binary, Sparkles 
} from 'lucide-react';
import Relaciones from './relaciones'; 
import { useDetalleMaestro } from '@/hooks/useDetalleMaestro'; 
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

  // Detección de tipo de entidad
  const esCriatura = data && (!data.hasOwnProperty('sobre') || 'puntos_vida' in data);
  
  const tieneContenidoInferior = !esCriatura && (
    editMode || 
    (data?.relaciones && data.relaciones.length > 0) || 
    (data?.canciones && data.canciones.length > 0)
  );

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
        initial={{ opacity: 0, scale: 0.9, y: 30 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-7xl mx-auto mb-32 relative pt-24 px-4"
      >
        {/* EFECTO DE RESPLANDOR DE FONDO */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[80%] bg-primary/5 blur-[150px] rounded-full -z-10" />

        <div className="bg-white rounded-[5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] relative border border-primary/10">
          
          {/* --- PANEL DE ACCIONES FLOTANTE --- */}
          <div className="absolute top-10 right-10 z-50 flex items-center gap-4">
            {isAdmin && (
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={editMode ? handleSave : () => setEditMode(true)} 
                disabled={saving}
                className={`group p-5 text-white rounded-full shadow-2xl transition-all flex items-center gap-4 px-10 ${
                  editMode ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {editMode ? <Save size={24} className="animate-pulse" /> : <Edit3 size={24} />}
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
                  {saving ? 'Procesando...' : (editMode ? 'Confirmar Cambios' : 'Modificar Registro')}
                </span>
              </motion.button>
            )}
            <button 
              onClick={onClose} 
              className="p-5 bg-white/90 backdrop-blur-md text-primary rounded-full hover:bg-red-500 hover:text-white transition-all shadow-xl border border-primary/5 group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* --- SECCIÓN SUPERIOR: VISUALIZACIÓN --- */}
          <div className="flex flex-col lg:flex-row items-stretch border-b border-primary/5">
            
            {/* CONTENEDOR DE IMAGEN (IZQUIERDA) */}
            <div className="w-full lg:w-[48%] bg-slate-50 p-10 lg:p-24 flex items-center justify-center relative overflow-hidden min-h-[550px] lg:min-h-[800px]">
              {/* Marca de agua dinámica */}
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none italic font-black text-[35rem] flex items-center justify-center text-primary select-none leading-none translate-y-10">
                {data.nombre ? data.nombre[0] : 'A'}
              </div>
              
              <div className="relative w-full aspect-square max-w-140 group">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-[80px] group-hover:blur-[100px] transition-all duration-1000 opacity-60" />
                <motion.div 
                  layoutId="hero-img"
                  className="relative w-full h-full rounded-full overflow-hidden border-[16px] border-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] bg-white"
                >
                  <motion.img 
                    key={imagenVisual} 
                    initial={{ opacity: 0, scale: 1.2 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    src={imagenVisual} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out" 
                  />
                </motion.div>
                
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-12 py-5 rounded-[2rem] shadow-2xl border border-primary/5 flex items-center gap-4 whitespace-nowrap">
                  <Sparkles size={16} className="text-primary animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/70 italic">
                    {esCriatura ? 'Entidad Biológica Clasificada' : 'Registro Civil del Sujeto'}
                  </span>
                </div>
              </div>
            </div>

            {/* CONTENEDOR DE INFORMACIÓN (DERECHA) */}
            <div className="w-full lg:w-[52%] p-14 lg:p-28 flex flex-col justify-center bg-white relative">
              {editMode ? (
                <div className="space-y-12 max-w-2xl w-full">
                  <div className="flex items-center gap-4 text-primary/30">
                    <Binary size={20} />
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">Consola de Edición de Datos</span>
                  </div>

                  <div className="space-y-8">
                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 ml-8 mb-4 block italic group-focus-within:text-primary transition-colors">Descriptor Nominal</label>
                      <input 
                        value={editNombre} 
                        onChange={(e) => setEditNombre(e.target.value)} 
                        className="text-4xl font-black uppercase italic text-primary w-full bg-primary/5 border-2 border-transparent focus:border-primary/10 p-8 rounded-[3rem] outline-none transition-all shadow-inner" 
                      />
                    </div>

                    <div className="group">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 ml-8 mb-4 block italic group-focus-within:text-primary transition-colors">
                        {esCriatura ? 'Especificaciones Técnicas' : 'Archivo Histórico / Biografía'}
                      </label>
                      <textarea 
                        value={editDescripcion} 
                        onChange={(e) => setEditDescripcion(e.target.value)} 
                        className="text-slate-600 text-xl italic leading-relaxed w-full bg-primary/5 border-2 border-transparent focus:border-primary/10 p-12 rounded-[3.5rem] outline-none min-h-[400px] resize-none transition-all shadow-inner custom-scrollbar" 
                      />
                    </div>
                  </div>

                  {esCriatura && (
                    <div className="pt-12 border-t border-primary/5">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                          <Zap size={22} className="text-primary/40" />
                          <h3 className="text-[12px] font-black uppercase tracking-[0.3em] italic text-primary">Variantes Registradas</h3>
                        </div>
                        <button 
                          onClick={agregarVariante}
                          className="px-10 py-4 bg-primary text-white rounded-[1.5rem] text-[10px] font-black uppercase hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-4"
                        >
                          <Plus size={18} /> Nueva Cepa
                        </button>
                      </div>

                      <div className="space-y-8 max-h-[550px] overflow-y-auto pr-6 custom-scrollbar p-2">
                        {variantes.map((v, index) => (
                          <motion.div 
                            key={v.id || index} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-10 bg-slate-50 rounded-[3.5rem] border border-primary/5 relative group transition-all hover:bg-white hover:shadow-2xl"
                          >
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-white shrink-0 shadow-lg border-4 border-white">
                                {v.imagen_url ? (
                                  <img src={v.imagen_url} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-primary/10"><ImageIcon size={32} /></div>
                                )}
                              </div>
                              <div className="flex-1 space-y-4 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <input 
                                    placeholder="Nombre de la Forma" 
                                    value={v.tipo} 
                                    onChange={(e) => { const n = [...variantes]; n[index].tipo = e.target.value; setVariantes(n); }}
                                    className="bg-white px-6 py-4 rounded-2xl text-xs font-bold text-primary border border-primary/5"
                                  />
                                  <input 
                                    placeholder="Enlace de Imagen" 
                                    value={v.imagen_url} 
                                    onChange={(e) => { const n = [...variantes]; n[index].imagen_url = e.target.value; setVariantes(n); }}
                                    className="bg-white px-6 py-4 rounded-2xl text-[10px] font-mono text-slate-400 border border-primary/5"
                                  />
                                </div>
                                <textarea 
                                  placeholder="Descripción de la variante..."
                                  value={v.descripcion_variante}
                                  onChange={(e) => { const n = [...variantes]; n[index].descripcion_variante = e.target.value; setVariantes(n); }}
                                  className="w-full bg-white p-6 rounded-[2rem] text-xs italic text-slate-500 resize-none min-h-[100px] border border-primary/5"
                                />
                              </div>
                            </div>
                            <button 
                              onClick={() => eliminarVariante(index)} 
                              className="absolute -top-4 -right-4 bg-red-500 text-white p-4 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                            >
                              <Trash2 size={20} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {/* TAGS DE CATEGORÍA */}
                  <div className="flex flex-wrap gap-4 mb-10">
                    {tags.map((tag, i) => tag && (
                      <span key={i} className="px-7 py-3 bg-primary text-white text-[11px] font-black uppercase rounded-full tracking-[0.3em] shadow-[0_15px_30px_-5px_rgba(0,0,0,0.2)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {/* TÍTULO Y TEXTO DINÁMICO */}
                  <h2 className="text-6xl lg:text-8xl font-black uppercase italic text-primary leading-[0.85] tracking-tighter mb-12">
                    {varianteActiva ? (
                      <>
                        <span className="block text-3xl opacity-40 mb-2">{data.nombre}</span>
                        <span>{varianteActiva.tipo}</span>
                      </>
                    ) : editNombre}
                  </h2>
                  
                  <p className="text-slate-500 text-xl lg:text-2xl italic leading-relaxed whitespace-pre-wrap max-w-2xl border-l-4 border-primary/5 pl-10">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>
                  
                  {/* SELECTOR DE VARIANTES VISUAL */}
                  {variantes.length > 0 && (
                    <div className="flex flex-wrap gap-4 mt-16">
                      <button 
                        onClick={() => setVarianteActiva(null)} 
                        className={`px-10 py-5 rounded-[2rem] text-[12px] font-black uppercase transition-all duration-500 ${!varianteActiva ? 'bg-primary text-white shadow-2xl -translate-y-2' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
                      >
                        Fenotipo Base
                      </button>
                      {variantes.map((v, i) => (
                        <button 
                          key={i} 
                          onClick={() => setVarianteActiva(v)} 
                          className={`px-10 py-5 rounded-[2rem] text-[12px] font-black uppercase transition-all duration-500 ${varianteActiva === v ? 'bg-primary text-white shadow-2xl -translate-y-2' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
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

          {/* --- SECCIÓN INFERIOR: VÍNCULOS Y MÚSICA --- */}
          {tieneContenidoInferior && (
            <div className="bg-slate-50 p-12 lg:p-24 grid grid-cols-1 xl:grid-cols-2 gap-24 items-start border-t border-primary/5 relative">
              {/* Decoración central */}
              <div className="hidden xl:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[70%] bg-primary/10" />

              {/* COLUMNA RELACIONES */}
              <div className="space-y-10">
                <div className="flex items-center gap-6 mb-4">
                  <div className="p-4 bg-primary/5 rounded-2xl text-primary"><Users size={24} /></div>
                  <div>
                    <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-primary/30 italic">Red de Contactos</h4>
                    <p className="text-xs font-bold text-primary/60 uppercase">Vínculos y Lealtades</p>
                  </div>
                </div>
                {loadingRelaciones ? (
                  <div className="h-40 bg-white rounded-[3rem] w-full animate-pulse border border-primary/5" />
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
              
              {/* COLUMNA MÚSICA */}
              <div className="space-y-10">
                <div className="flex items-center gap-6 mb-4">
                  <div className="p-4 bg-primary/5 rounded-2xl text-primary"><Music size={24} /></div>
                  <div>
                    <h4 className="text-[12px] font-black uppercase tracking-[0.5em] text-primary/30 italic">Frecuencias Acústicas</h4>
                    <p className="text-xs font-bold text-primary/60 uppercase">Soliloquios Registrados</p>
                  </div>
                </div>
                
                {editMode ? (
                  <div className="bg-white p-8 rounded-[3rem] shadow-inner border border-primary/5">
                    <SelectorMusicaAdmin idsSeleccionados={editCanciones} onChange={setEditCanciones} />
                  </div>
                ) : (
                  <div className="min-h-[250px] bg-white p-8 rounded-[3rem] shadow-xl border border-primary/5">
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