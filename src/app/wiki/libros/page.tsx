"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, ChevronRight, Clock, Plus, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/api/supabase';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { SmartImage } from '@/components/shared/display/SmartImage';

// --- INTERFACES ---
interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  estado: string;
  created_at: string;
}

const Biblioteca = () => {
  // 1. Hook Maestro: Gestiona la carga, el Realtime y la Caché global
  const { data, loading, setData: setLibros } = useSupabaseData('libros', {
    order: { campo: 'created_at', asc: false }
  });

  // Forzamos el tipado de los datos obtenidos
  const libros = data as Libro[];

  const [isAdmin, setIsAdmin] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [selectedLibro, setSelectedLibro] = useState<Libro | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Verificación de sesión
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    checkSession();
  }, []);

  // --- MANEJADORES ---
  const openEditModal = (e: React.MouseEvent, libro: Libro) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLibro(libro);
    setEditTitle(libro.titulo);
    setShowEditModal(true);
  };

  const handleUpdateLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || isUpdating || !selectedLibro) return;
    setIsUpdating(true);

    const { error } = await supabase
      .from('libros')
      .update({ titulo: editTitle.toUpperCase() })
      .eq('id', selectedLibro.id);

    if (!error) {
      // Actualización optimista en el estado y caché global
      setLibros((prev: Libro[]) => 
        prev.map(l => l.id === selectedLibro.id ? { ...l, titulo: editTitle.toUpperCase() } : l)
      );
      setShowEditModal(false);
    }
    setIsUpdating(false);
  };

  const handleAddLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || isUpdating) return;
    setIsUpdating(true);

    const { data: insertedData, error } = await supabase.from('libros').insert([{ 
      titulo: nuevoTitulo.toUpperCase(),
      sinopsis: "Nueva crónica por escribir...",
      estado: "EN PROCESO"
    }]).select();

    if (!error && insertedData) {
      setLibros((prev: Libro[]) => [insertedData[0], ...prev]);
      setShowAddModal(false);
      setNuevoTitulo("");
    }
    setIsUpdating(false);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="animate-pulse text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
        Abriendo Archivos...
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
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8">Modificar Título</h3>
              <form onSubmit={handleUpdateLibro} className="space-y-6">
                <input autoFocus type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <button type="submit" className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-[#6B5E70]/20 active:scale-95 transition-all">
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
              <h3 className="text-center text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em] mb-8">Nueva Crónica</h3>
              <form onSubmit={handleAddLibro} className="space-y-6">
                <input autoFocus type="text" placeholder="TÍTULO DEL LIBRO..." value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} className="w-full bg-[#FDFCFD] border-b-2 border-[#6B5E70]/10 py-4 text-center text-sm font-black text-[#6B5E70] outline-none focus:border-[#6B5E70] uppercase" />
                <button type="submit" className="w-full bg-[#6B5E70] text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-[#6B5E70]/20 active:scale-95 transition-all">
                  {isUpdating ? "Sellando..." : "Crear Libro"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER DE BIBLIOTECA */}
      <div className="max-w-6xl mx-auto pt-16 px-6 mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#6B5E70] italic tracking-tighter flex items-center gap-3">
            <Book size={32} /> BIBLIOTECA
          </h1>
          <p className="text-[#6B5E70]/50 text-xs font-bold uppercase tracking-widest mt-2">Explora los relatos del mundo</p>
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
            {isAdmin && (
              <button 
                onClick={(e) => openEditModal(e, libro)}
                className="absolute top-4 right-4 z-[100] bg-white text-[#6B5E70] p-4 rounded-full shadow-2xl border-2 border-[#6B5E70]/10 hover:scale-110 active:scale-90 transition-all flex items-center justify-center"
              >
                <Edit3 size={18} />
              </button>
            )}

            <Link href={`/wiki/libros/${libro.id}`}>
              <motion.div whileHover={{ y: -10 }} className="cursor-pointer">
                <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-xl border border-[#6B5E70]/10 bg-white">
                  <SmartImage 
                    src={libro.portada_url || "/placeholder-cover.jpg"} 
                    alt={libro.titulo}
                    className="w-full h-full"
                  />
                  <div className="absolute top-6 left-6 z-20 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#6B5E70]/10">
                    <span className="text-[9px] font-black uppercase text-[#6B5E70] tracking-widest">
                      {libro.estado}
                    </span>
                  </div>
                </div>

                <div className="mt-6 px-2">
                  <h2 className="text-[#6B5E70] font-black uppercase text-base group-hover:text-[#9A89A0] transition-colors leading-tight tracking-tight">
                    {libro.titulo}
                  </h2>
                  <p className="text-[#6B5E70]/50 text-xs mt-2 line-clamp-3 italic leading-relaxed font-medium">
                    &quot;{libro.sinopsis}&quot;
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