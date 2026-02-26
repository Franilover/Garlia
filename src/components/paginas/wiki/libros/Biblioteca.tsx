"use client";

import React, { useState } from 'react'; // 👈 quitar useEffect
import Link from 'next/link';
import { Book, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/api/client/supabase';
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { useIsAdmin } from '@/hooks/auth/useIsAdmin'; // 👈
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
  const isAdmin = useIsAdmin(); // 👈

  // 👇 Un solo estado, sin librosLocal duplicado
  const { data: libros = [], loading, error, setData: setLibros } = useSupabaseData('libros', {
    order: { campo: 'created_at', asc: false }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAddLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || isUpdating) return;
    
    setIsUpdating(true);
    const { data: insertedData, error: insertError } = await supabase
      .from('libros')
      .insert([{ 
        titulo: nuevoTitulo.toUpperCase(),
        sinopsis: "Nueva crónica por escribir...",
        estado: "EN PROCESO",
        portada_url: "" 
      }])
      .select();

    if (!insertError && insertedData) {
      setLibros(prev => [insertedData[0], ...prev]); // 👈 directo al hook
      setNuevoTitulo("");
      setShowAddModal(false);
    } else {
      alert("Error al sellar el nuevo libro.");
    }
    setIsUpdating(false);
  };

  if (loading && libros.length === 0) return (
    <div className="h-screen flex items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        <div className="text-primary font-black uppercase text-[10px] tracking-[0.3em]">
          Abriendo Archivos...
        </div>
      </div>
    </div>
  );

  if (!loading && libros.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary/40">
      <Book size={48} className="mb-4 opacity-20" />
      <p className="font-black uppercase text-[10px] tracking-[0.3em]">La biblioteca está vacía</p>
      {isAdmin && (
        <button onClick={() => setShowAddModal(true)} className="mt-6 text-primary font-bold text-xs underline">
          Escribir el primer tomo
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <div className="max-w-6xl mx-auto pt-16 px-6 mb-12 flex justify-between items-end">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-4xl font-black text-primary italic tracking-tighter flex items-center gap-3 leading-none">
            <Book size={32} /> BIBLIOTECA
          </h1>
          <p className="text-primary/50 text-xs font-bold uppercase tracking-widest mt-2">
            Explora los relatos del mundo
          </p>
        </motion.div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-50"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {(libros as Libro[]).map((libro, index) => (
          <motion.div
            key={libro.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
          >
            <Link href={`/wiki/paginas/libros/${libro.id}`}>
              <div className="cursor-pointer">
                <motion.div whileHover={{ y: -10 }} className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-xl border border-primary/10 bg-white-custom">
                  <SmartImage
                    src={libro.portada_url || "/placeholder-cover.jpg"}
                    alt={libro.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-6 left-6 z-20 bg-white-custom/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/10">
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">
                      {libro.estado}
                    </span>
                  </div>
                </motion.div>

                <div className="mt-6 px-2">
                  <h2 className="text-primary font-black uppercase text-base group-hover:text-[#9A89A0] transition-colors leading-tight tracking-tight">
                    {libro.titulo}
                  </h2>
                  <p className="text-primary/50 text-xs mt-2 line-clamp-3 italic leading-relaxed font-medium">
                    &quot;{libro.sinopsis}&quot;
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Modal añadir */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white-custom rounded-[3rem] p-10 w-full max-w-sm shadow-2xl border border-primary/10">
            <h3 className="text-center text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-8 italic">
              Nuevo Tomo
            </h3>
            <form onSubmit={handleAddLibro} className="space-y-6">
              <input
                autoFocus
                type="text"
                placeholder="TÍTULO..."
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                className="w-full bg-bg-main border-b-2 border-primary/10 py-4 text-center text-sm font-black text-primary outline-none focus:border-primary uppercase"
              />
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-transform disabled:opacity-50"
              >
                {isUpdating ? "Sellando..." : "Crear"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Biblioteca;