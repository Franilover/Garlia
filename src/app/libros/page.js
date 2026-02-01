"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Book, ChevronRight, Clock, Plus, Edit3, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Biblioteca = () => {
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Estados de Formulario
  const [selectedLibro, setSelectedLibro] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkUserAndFetch = async () => {
      // Verificación robusta de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setIsAdmin(true);

      const { data, error } = await supabase
        .from('libros')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) setLibros(data);
      setLoading(false);
    };
    checkUserAndFetch();
  }, []);

  // --- ACCIONES ADMIN ---
  const openEditModal = (e, libro) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLibro(libro);
    setEditTitle(libro.titulo);
    setShowEditModal(true);
  };

  const handleUpdateLibro = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || isUpdating) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from('libros')
      .update({ titulo: editTitle.toUpperCase() })
      .eq('id', selectedLibro.id);

    if (!error) {
      setLibros(libros.map(l => l.id === selectedLibro.id ? { ...l, titulo: editTitle.toUpperCase() } : l));
      setShowEditModal(false);
    }
    setIsUpdating(false);
  };

  const handleAddLibro = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || isUpdating) return;
    setIsUpdating(true);
    const { data, error } = await supabase.from('libros').insert([{ 
      titulo: nuevoTitulo.toUpperCase(),
      sinopsis: "Nueva crónica por escribir...",
      estado: "EN PROCESO"
    }]).select();

    if (!error) {
      setLibros([data[0], ...libros]);
      setShowAddModal(false);
      setNuevoTitulo("");
    }
    setIsUpdating(false);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="animate-pulse text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
        "Abriendo Archivos..."
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20">
      
      {/* MODAL: EDITAR TÍTULO */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowEditModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8">"Modificar Título"</h3>
              <form onSubmit={handleUpdateLibro} className="space-y-6">
                <input autoFocus type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <button type="submit" className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-[#6B5E70]/20">
                  {isUpdating ? "Guardando..." : "Actualizar Registro"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AÑADIR LIBRO */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-[#6B5E70]/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative z-10 border border-[#6B5E70]/10">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-[#6B5E70]/20 hover:text-[#6B5E70]"><X size={20} /></button>
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8">"Nueva Crónica"</h3>
              <form onSubmit={handleAddLibro} className="space-y-6">
                <input autoFocus type="text" placeholder="TÍTULO DEL LIBRO..." value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <button type="submit" className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-[#6B5E70]/20">
                  {isUpdating ? "Sellando..." : "Crear Libro"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ENCABEZADO */}
      <div className="max-w-6xl mx-auto pt-16 px-6 mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#6B5E70] italic tracking-tighter flex items-center gap-3">
            <Book size={32} /> BIBLIOTECA
          </h1>
          <p className="text-[#6B5E70]/50 text-xs font-bold uppercase tracking-widest mt-2">
            Explora los relatos del mundo
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-[#6B5E70] text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-50"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {/* GRID DE LIBROS */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {libros.map((libro) => (
          <div key={libro.id} className="relative group">
            
            {/* BOTÓN EDITAR (Siempre visible para Admin) */}
            {isAdmin && (
              <button 
                onClick={(e) => openEditModal(e, libro)}
                className="absolute top-4 right-4 z-[100] bg-white text-[#6B5E70] p-4 rounded-full shadow-2xl border-2 border-[#6B5E70]/10 hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
              >
                <Edit3 size={18} />
              </button>
            )}

            <Link href={`/libros/${libro.id}`}>
              <motion.div whileHover={{ y: -10 }} className="cursor-pointer">
                {/* PORTADA */}
                <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-xl border border-[#6B5E70]/10 bg-white">
                  <img 
                    src={libro.portada_url || "/placeholder-cover.jpg"} 
                    alt={libro.titulo}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#6B5E70]/10">
                    <span className="text-[9px] font-black uppercase text-[#6B5E70] tracking-widest">
                      {libro.estado}
                    </span>
                  </div>
                </div>

                {/* TEXTO INFRA-PORTADA */}
                <div className="mt-6 px-2">
                  <h2 className="text-[#6B5E70] font-black uppercase text-base group-hover:text-[#9A89A0] transition-colors leading-tight tracking-tight">
                    {libro.titulo}
                  </h2>
                  
                  {/* SINÓPSIS ABAJO */}
                  <p className="text-[#6B5E70]/50 text-xs mt-2 line-clamp-3 italic leading-relaxed font-medium">
                    "{libro.sinopsis}"
                  </p>

                  <div className="flex items-center gap-4 mt-4 text-[#6B5E70]/30 font-bold text-[9px] uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock size={12} /> Reciente</span>
                    <span className="flex items-center gap-1.5"><ChevronRight size={12} /> Abrir</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Biblioteca;