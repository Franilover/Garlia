"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, ChevronRight, Clock, Plus, Edit3, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/client/supabase';
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { SmartImage } from '@/components/shared/display/SmartImage';

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  estado: string;
  created_at: string;
}

const Biblioteca = () => {
  // 1. Asegúrate de que el hook 'useSupabaseData' esté devolviendo los datos correctamente.
  // He añadido una pequeña validación por si 'data' viene envuelto en otro objeto.
  const { data, loading, error, setData: setLibros } = useSupabaseData('libros', {
    order: { campo: 'created_at', asc: false }
  });

  const [libros, setLibrosLocal] = useState<Libro[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLibro, setSelectedLibro] = useState<Libro | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sincronizar data del hook con estado local para actualizaciones optimistas
  useEffect(() => {
    if (data) setLibrosLocal(data as Libro[]);
  }, [data]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);
    };
    checkSession();
  }, []);

  const handleAddLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || isUpdating) return;
    
    setIsUpdating(true);
    const tituloNuevo = nuevoTitulo.toUpperCase();

    const { data: insertedData, error: insertError } = await supabase.from('libros').insert([{ 
      titulo: tituloNuevo,
      sinopsis: "Nueva crónica por escribir...",
      estado: "EN PROCESO",
      // Si usas portadas por defecto, asegúrate de que no sea null si la base lo requiere
      portada_url: "" 
    }]).select();

    if (!insertError && insertedData) {
      setLibrosLocal(prev => [insertedData[0], ...prev]);
      setNuevoTitulo("");
      setShowAddModal(false);
    } else {
      console.error(insertError);
      alert("Error al sellar el nuevo libro. Revisa los permisos RLS.");
    }
    setIsUpdating(false);
  };

  // --- RENDERS DE ESTADO ---

  if (loading && libros.length === 0) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#6B5E70]/10 border-t-[#6B5E70] rounded-full animate-spin" />
        <div className="text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
          Abriendo Archivos...
        </div>
      </div>
    </div>
  );

  if (!loading && libros.length === 0 && !error) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFD] text-[#6B5E70]/40">
       <Book size={48} className="mb-4 opacity-20" />
       <p className="font-black uppercase text-[10px] tracking-[0.3em]">La biblioteca está vacía</p>
       {isAdmin && (
         <button onClick={() => setShowAddModal(true)} className="mt-6 text-[#6B5E70] font-bold text-xs underline">
           Escribir el primer tomo
         </button>
       )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] pb-20">
      {/* ... (Modales se mantienen igual) ... */}
      
      <div className="max-w-6xl mx-auto pt-16 px-6 mb-12 flex justify-between items-end">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-4xl font-black text-[#6B5E70] italic tracking-tighter flex items-center gap-3 leading-none">
            <Book size={32} /> BIBLIOTECA
          </h1>
          <p className="text-[#6B5E70]/50 text-xs font-bold uppercase tracking-widest mt-2">Explora los relatos del mundo</p>
        </motion.div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="bg-[#6B5E70] text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-50"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {libros.map((libro, index) => (
          <motion.div 
            key={libro.id} 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
          >
            <Link href={`/wiki/paginas/libros/${libro.id}`}>
              <div className="cursor-pointer">
                <motion.div whileHover={{ y: -10 }} className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-xl border border-[#6B5E70]/10 bg-white">
                  <SmartImage 
                    src={libro.portada_url || "/placeholder-cover.jpg"} 
                    alt={libro.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-6 left-6 z-20 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#6B5E70]/10">
                    <span className="text-[9px] font-black uppercase text-[#6B5E70] tracking-widest">
                      {libro.estado}
                    </span>
                  </div>
                </motion.div>

                <div className="mt-6 px-2">
                  <h2 className="text-[#6B5E70] font-black uppercase text-base group-hover:text-[#9A89A0] transition-colors leading-tight tracking-tight">
                    {libro.titulo}
                  </h2>
                  <p className="text-[#6B5E70]/50 text-xs mt-2 line-clamp-3 italic leading-relaxed font-medium">
                    &quot;{libro.sinopsis}&quot;
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Biblioteca;