"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/api/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Check, ChevronsUpDown, X } from 'lucide-react';

// --- COMPONENTE 1: EL SELECTOR (Para el modo edición) ---
export const SelectorMusicaAdmin = ({ idsSeleccionados = [], onChange }) => {
  const [todas, setTodas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('canciones').select('id, titulo').order('titulo');
      if (data) setTodas(data);
      setLoading(false);
    };
    cargar();
  }, []);

  const safeIds = Array.isArray(idsSeleccionados) ? idsSeleccionados : [];

  const toggle = (id) => {
    const nuevos = safeIds.includes(id) ? safeIds.filter(i => i !== id) : [...safeIds, id];
    onChange(nuevos);
  };

  if (loading) return <div className="h-12 bg-primary/5 animate-pulse rounded-2xl w-full" />;

  return (
    <div className="relative w-full">
      <div onClick={() => setIsOpen(!isOpen)} className="w-full p-4 bg-white border border-primary/10 rounded-[2rem] flex items-center justify-between cursor-pointer shadow-inner">
        <div className="flex flex-wrap gap-2">
          {safeIds.length > 0 ? safeIds.map(id => (
            <span key={id} className="bg-primary text-white text-[9px] font-black px-3 py-1.5 rounded-full flex items-center gap-2 uppercase italic">
              {todas.find(c => c.id === id)?.titulo || '...'}
              <X size={12} onClick={(e) => { e.stopPropagation(); toggle(id); }} className="cursor-pointer" />
            </span>
          )) : <span className="text-primary/30 text-[10px] font-black uppercase italic ml-2">Seleccionar música...</span>}
        </div>
        <ChevronsUpDown size={16} className="text-primary/30" />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-[150] w-full mt-2 bg-white border border-primary/10 rounded-[2rem] shadow-2xl max-h-60 overflow-y-auto p-3">
            {todas.map(c => (
              <div key={c.id} onClick={() => toggle(c.id)} className={`p-3 rounded-xl cursor-pointer mb-1 flex justify-between ${safeIds.includes(c.id) ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5 text-primary/60'}`}>
                <span className="text-[10px] font-black uppercase italic">{c.titulo}</span>
                {safeIds.includes(c.id) && <Check size={14} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- COMPONENTE 2: LA VISTA (Los números 01, 02 que ya tenías) ---
export const SeccionMusica = ({ listaLinks }) => {
  const linksLimpios = useMemo(() => {
    if (!listaLinks) return [];
    const base = Array.isArray(listaLinks) ? listaLinks : [listaLinks];
    return base
      .flatMap(item => (typeof item === 'string' ? item.split(',') : item))
      .map(link => (typeof link === 'string' ? link.trim() : link))
      .filter(link => link && link.length > 0)
      .map(link => (typeof link === 'string' && !link.startsWith('http') ? `https://www.youtube.com/watch?v=${link}` : link));
  }, [listaLinks]);

  if (linksLimpios.length === 0) return null;

  return (
    <div className="w-full mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
        {linksLimpios.map((link, index) => (
          <Link key={`${link}-${index}`} href={link} target="_blank" rel="noopener noreferrer" className="no-underline group block">
            <motion.div whileHover={{ scale: 1.05, y: -5 }} className="relative flex flex-col items-center justify-center p-8 bg-white border border-primary/5 rounded-[2.5rem] shadow-sm aspect-square overflow-hidden">
              <span className="absolute inset-0 flex items-center justify-center text-8xl font-black text-primary/5 italic select-none translate-y-2">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="relative z-10 text-4xl font-black text-primary/20 group-hover:text-primary transition-colors italic mb-2">
                {String(index + 1).padStart(2, '0')}
              </div>
              <PlayCircle size={32} className="relative z-20 text-primary/30 group-hover:text-primary" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};