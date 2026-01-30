"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Edit3, Save, Sparkles } from 'lucide-react';
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
  
  // Estados para variantes
  const [variantes, setVariantes] = useState([]);
  const [varianteActiva, setVarianteActiva] = useState(null);

  // Estados para los campos editables
  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setIsAdmin(true);
    };
    checkUser();
  }, []);

  // Cargar variantes cuando cambia la criatura
  useEffect(() => {
    const fetchVariantes = async () => {
      if (data && !data.img_url) { // Solo si es criatura (no personaje)
        const { data: vars } = await supabase
          .from('criatura_variantes')
          .select('*')
          .eq('criatura_id', data.id);
        setVariantes(vars || []);
      } else {
        setVariantes([]);
      }
      setVarianteActiva(null);
    };

    if (data) {
      setEditNombre(data.nombre || "");
      setEditDescripcion(data.sobre || data.descripcion || "");
      setEditMode(false);
      fetchVariantes();
    }
  }, [data]);

  if (!data) return null;

  const tabla = data.img_url ? 'personajes' : 'criaturas';
  
  // Lógica de visualización dinámica (Variante vs Base)
  const imagenVisual = (varianteActiva?.imagen_url) || (data.img_url || data.imagen_url);
  const nombreVisual = varianteActiva ? `${editNombre} [${varianteActiva.tipo}]` : editNombre;
  const descripcionVisual = varianteActiva ? varianteActiva.descripcion_variante : editDescripcion;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        nombre: editNombre,
        [data.sobre ? 'sobre' : 'descripcion']: editDescripcion
      };
      const { error } = await supabase.from(tabla).update(updates).eq('id', data.id);
      if (error) throw error;
      data.nombre = editNombre;
      if (data.sobre) data.sobre = editDescripcion; else data.descripcion = editDescripcion;
      setEditMode(false);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const listaLinks = Array.isArray(data.canciones) 
    ? data.canciones.flatMap(item => typeof item === 'string' ? item.split(',') : item)
                   .map(link => link.trim())
                   .filter(link => link !== "")
    : [];

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
            
            {/* BOTONES DE CONTROL */}
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
            
            {/* IMAGEN DINÁMICA */}
            <div className="w-full lg:w-1/2 bg-gradient-to-br from-white to-primary/5 flex items-center justify-center p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-primary/5">
              <div className="relative w-full aspect-square max-w-[400px]">
                <div className="absolute inset-0 bg-primary/5 rounded-[4rem] rotate-3 scale-105" />
                <motion.img 
                  key={imagenVisual}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={imagenVisual} 
                  alt={nombreVisual} 
                  className="relative z-10 w-full h-full object-contain mix-blend-multiply rounded-[3.5rem]" 
                />
              </div>
            </div>

            {/* CONTENIDO TEXTUAL */}
            <div className="w-full lg:w-1/2 p-8 md:p-12 lg:pl-10 lg:pr-16 flex flex-col justify-center bg-bg-main/5">
              
              {/* SELECTOR DE VARIANTES (Si existen) */}
              {!editMode && variantes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setVarianteActiva(null)}
                    className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border-2 ${!varianteActiva ? 'bg-primary text-white border-primary' : 'bg-transparent text-primary/40 border-primary/10'}`}
                  >
                    Base
                  </button>
                  {variantes.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVarianteActiva(v)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border-2 ${varianteActiva?.id === v.id ? 'bg-primary text-white border-primary shadow-lg' : 'bg-transparent text-primary/40 border-primary/10'}`}
                    >
                      <Sparkles size={10} />
                      {v.tipo}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag, i) => tag && (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-lg tracking-widest">
                    {tag}
                  </span>
                ))}
              </div>

              {editMode ? (
                <div className="space-y-4 mb-6">
                  <input 
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="text-4xl md:text-5xl font-black uppercase italic text-primary w-full bg-white border-2 border-primary/20 p-4 rounded-2xl outline-none"
                  />
                  <textarea 
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    className="text-primary/80 text-base italic leading-snug w-full bg-white border-2 border-primary/20 p-4 rounded-2xl outline-none min-h-[150px]"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-4xl md:text-6xl font-black uppercase italic text-primary leading-[0.85] tracking-tighter mb-6 break-words">
                    {nombreVisual}
                  </h2>
                  <p className="text-primary/80 text-base md:text-lg italic leading-snug mb-4 whitespace-pre-wrap">
                    {descripcionVisual}
                  </p>
                </>
              )}

              {!editMode && (
                <>
                  <div className="mb-8">
                    <Relaciones nombrePersonaje={editNombre} />
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
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ y: -3, scale: 1.02 }}
                            className="flex items-center gap-3 bg-white border-2 border-primary/10 px-6 py-3 rounded-2xl shadow-sm"
                          >
                            <span className="text-sm font-black italic uppercase text-primary tracking-tighter">
                              {editNombre} Track {index + 1}
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