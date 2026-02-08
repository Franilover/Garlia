"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/api/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';

// --- COMPONENTE 1: EL SELECTOR (Para el modo edición) ---
export const SelectorMusicaAdmin = ({ idsSeleccionados = [], onChange }) => {
  const [todas, setTodas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      // Cargamos id y título de tu tabla 'canciones'
      const { data } = await supabase.from('canciones').select('id, titulo').order('titulo');
      if (data) setTodas(data);
      setLoading(false);
    };
    cargar();
  }, []);

  // Aseguramos que sea un array de strings (IDs)
  const safeIds = Array.isArray(idsSeleccionados) ? idsSeleccionados : [];

  const toggle = (id) => {
    const nuevos = safeIds.includes(id) 
      ? safeIds.filter(i => i !== id) 
      : [...safeIds, id];
    onChange(nuevos);
  };

  if (loading) return <div className="h-12 bg-[#6B5E70]/5 animate-pulse rounded-2xl w-full" />;

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full p-4 bg-white border border-[#6B5E70]/10 rounded-[2rem] flex items-center justify-between cursor-pointer shadow-inner min-h-[60px]"
      >
        <div className="flex flex-wrap gap-2">
          {safeIds.length > 0 ? safeIds.map(id => (
            <span key={id} className="bg-[#6B5E70] text-white text-[9px] font-black px-3 py-1.5 rounded-full flex items-center gap-2 uppercase italic">
              {todas.find(c => c.id === id)?.titulo || 'ID: ' + id.slice(0,5)}
              <X size={12} onClick={(e) => { e.stopPropagation(); toggle(id); }} className="cursor-pointer hover:text-red-300" />
            </span>
          )) : <span className="text-[#6B5E70]/30 text-[10px] font-black uppercase italic ml-2">Seleccionar canciones del catálogo...</span>}
        </div>
        <ChevronsUpDown size={16} className="text-[#6B5E70]/30" />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="absolute z-[150] w-full mt-2 bg-white border border-[#6B5E70]/10 rounded-[2rem] shadow-2xl max-h-60 overflow-y-auto p-3 custom-scrollbar"
          >
            {todas.map(c => (
              <div 
                key={c.id} 
                onClick={() => toggle(c.id)} 
                className={`p-3 rounded-xl cursor-pointer mb-1 flex justify-between items-center transition-colors ${
                  safeIds.includes(c.id) ? 'bg-[#6B5E70]/10 text-[#6B5E70]' : 'hover:bg-[#6B5E70]/5 text-[#6B5E70]/60'
                }`}
              >
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

// --- COMPONENTE 2: LA VISTA (Los círculos con números) ---
export const SeccionMusica = ({ listaLinks = [] }) => {
  const [cancionesData, setCancionesData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarInfo = async () => {
      if (!listaLinks || listaLinks.length === 0) return;
      setLoading(true);
      
      // Filtramos si vienen links de la wiki o solo IDs
      const ids = listaLinks.map(link => {
        if (typeof link === 'string' && link.includes('/')) {
            return link.split('/').pop(); // Saca el ID del final del link
        }
        return link;
      });

      const { data } = await supabase
        .from('canciones')
        .select('id, titulo')
        .in('id', ids);
      
      if (data) setCancionesData(data);
      setLoading(false);
    };
    cargarInfo();
  }, [listaLinks]);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#6B5E70]/20" /></div>;
  if (!listaLinks || listaLinks.length === 0) return null;

  return (
    <div className="w-full mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
        {listaLinks.map((link, index) => {
          const id = typeof link === 'string' && link.includes('/') ? link.split('/').pop() : link;
          const info = cancionesData.find(c => c.id === id);
          
          return (
            <Link 
              key={`${id}-${index}`} 
              href={`/wiki/canciones/${id}`} 
              className="no-underline group block"
            >
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }} 
                className="relative flex flex-col items-center justify-center p-8 bg-white border border-[#6B5E70]/5 rounded-[2.5rem] shadow-sm aspect-square overflow-hidden"
              >
                <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-[#6B5E70]/5 italic select-none translate-y-2 uppercase text-center px-2">
                  {info?.titulo || '...'}
                </span>
                <div className="relative z-10 text-4xl font-black text-[#6B5E70]/20 group-hover:text-[#6B5E70] transition-colors italic mb-2">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <PlayCircle size={32} className="relative z-20 text-[#6B5E70]/30 group-hover:text-[#6B5E70] transition-all" />
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};