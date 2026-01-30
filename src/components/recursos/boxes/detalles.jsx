"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Edit3, Save, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Relaciones from './relaciones';

export default function DetalleMaestro({ 
  isOpen, 
  onClose, 
  data, 
  tags = [], 
  mostrarMusica = true 
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Variantes
  const [variantes, setVariantes] = useState([]);
  const [varianteActiva, setVarianteActiva] = useState(null);

  // Estados campos editables
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");

  // Verificar admin
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // Cargar Variantes con validación de ID actual
  const fetchVariantes = async (id) => {
    if (!id) return;
    const { data: vars, error } = await supabase
      .from('criatura_variantes')
      .select('*')
      .eq('criatura_id', id);
    
    // Solo actualizamos si el ID solicitado sigue siendo el ID actual del componente
    if (!error && data?.id === id) {
      setVariantes(vars || []);
    }
  };

  // Reset al cambiar de item o cerrar
  useEffect(() => {
    if (data) {
      setEditNombre(data.nombre || "");
      setEditDescripcion(data.sobre || data.descripcion || "");
      setEditMode(false);
      setVarianteActiva(null);
      
      // FIX: Limpiar las variantes anteriores inmediatamente al cambiar de criatura
      setVariantes([]); 
      
      // Solo buscamos variantes si no es un personaje con imagen directa
      if (!data.img_url) {
        fetchVariantes(data.id);
      }
    }
  }, [data]);

  // Sincronizar edición según selección
  useEffect(() => {
    if (editMode || !data) return;
    if (varianteActiva) {
      setEditNombre(data.nombre || ""); 
      setEditDescripcion(varianteActiva.descripcion_variante || "");
    } else {
      setEditNombre(data.nombre || "");
      setEditDescripcion(data.sobre || data.descripcion || "");
    }
  }, [varianteActiva, editMode, data]);

  // Si no hay data o está cerrado, no renderizamos nada
  if (!data || !isOpen) return null;

  const tablaPrincipal = data.img_url ? 'personajes' : 'criaturas';
  const imagenVisual = (varianteActiva?.imagen_url) || (data.img_url || data.imagen_url);

  // Música con validación de nulidad
  const listaLinks = Array.isArray(data?.canciones) 
    ? data.canciones.flatMap(item => typeof item === 'string' ? item.split(',') : item)
                   .map(link => link.trim())
                   .filter(link => link !== "")
    : [];

  const handleSave = async () => {
    setSaving(true);
    try {
      if (varianteActiva) {
        const { error } = await supabase
          .from('criatura_variantes')
          .update({ descripcion_variante: editDescripcion })
          .eq('id', varianteActiva.id);
        if (error) throw error;
        setVariantes(prev => prev.map(v => v.id === varianteActiva.id ? {...v, descripcion_variante: editDescripcion} : v));
      } else {
        const updates = {
          nombre: editNombre,
          [data.sobre ? 'sobre' : 'descripcion']: editDescripcion
        };
        const { error } = await supabase.from(tablaPrincipal).update(updates).eq('id', data.id);
        if (error) throw error;
        
        // Actualización local
        data.nombre = editNombre;
        if (data.sobre) data.sobre = editDescripcion; else data.descripcion = editDescripcion;
      }
      setEditMode(false);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          key={data.id}
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -20 }}
          className="max-w-7xl mx-auto mb-16 relative pt-4 px-4"
        >
          <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[500px] relative">
            
            {/* BOTONES CONTROL */}
            <div className="absolute top-6 right-6 z-50 flex gap-2">
              {isAdmin && !editMode && (
                <button onClick={() => setEditMode(true)} className="p-3 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Edit3 size={20} />
                </button>
              )}
              {editMode && (
                <button onClick={handleSave} disabled={saving} className="p-3 bg-green-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-2 px-5">
                  <Save size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{saving ? '...' : 'Guardar'}</span>
                </button>
              )}
              <button onClick={onClose} className="p-3 bg-bg-main text-primary rounded-full hover:bg-red-50 hover:text-red-500 transition-all shadow-md">
                <X size={20} />
              </button>
            </div>
            
            {/* SECCIÓN IZQUIERDA: IMAGEN */}
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

            {/* SECCIÓN DERECHA: CONTENIDO */}
            <div className="w-full lg:w-1/2 p-8 md:p-12 lg:pl-10 lg:pr-16 flex flex-col justify-center bg-bg-main/5">
              
              {/* SELECTOR VARIANTES */}
              {!editMode && variantes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <button 
                    onClick={() => setVarianteActiva(null)} 
                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${!varianteActiva ? 'bg-primary text-white border-primary shadow-md' : 'border-primary/10 text-primary/40'}`}
                  >
                    Original
                  </button>
                  {variantes.map((v) => (
                    <button 
                      key={v.id} 
                      onClick={() => setVarianteActiva(v)} 
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${varianteActiva?.id === v.id ? 'bg-primary text-white border-primary shadow-md' : 'border-primary/10 text-primary/40'}`}
                    >
                      <Sparkles size={10} /> {v.tipo}
                    </button>
                  ))}
                </div>
              )}

              {editMode ? (
                <div className="space-y-4 mb-6">
                  {varianteActiva && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 mb-2">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-black uppercase">Modo Variante: {varianteActiva.tipo}</span>
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
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tags.map((tag, i) => tag && (
                      <span key={i} className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase rounded-lg tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-4xl md:text-6xl font-black uppercase italic text-primary leading-[0.85] tracking-tighter mb-6 break-words">
                    {varianteActiva 
                    ? `${data?.nombre || 'Cargando...'} de ${varianteActiva.tipo?.trim()}` 
                    : editNombre}
                  </h2>
                  
                  <p className="text-primary/80 text-base md:text-lg italic leading-snug mb-8 whitespace-pre-wrap">
                    {varianteActiva ? varianteActiva.descripcion_variante : editDescripcion}
                  </p>

                  <div className="mb-8">
                    {data?.nombre && <Relaciones nombrePersonaje={data.nombre} />}
                  </div>

                  {mostrarMusica && listaLinks.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-primary/30 mb-2">
                        <Music size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Archivos Sonoros</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {listaLinks.map((link, index) => (
                          <motion.a
                            key={index} href={link} target="_blank" rel="noopener noreferrer"
                            whileHover={{ y: -3 }} className="flex items-center gap-3 bg-white border-2 border-primary/10 px-6 py-3 rounded-2xl shadow-sm"
                          >
                            <span className="text-sm font-black italic uppercase text-primary tracking-tighter">
                              {data?.nombre} Audio {index + 1}
                            </span>
                            <Music size={16} className="text-primary/40" />
                          </motion.a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}