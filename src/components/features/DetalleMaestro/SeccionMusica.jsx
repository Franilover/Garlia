"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/api/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Check, ChevronsUpDown, X, Music } from 'lucide-react';

// --- COMPONENTE 1: EL SELECTOR (Para el modo edición) ---
export const SelectorMusicaAdmin = ({ idsSeleccionados = [], onChange }) => {
  const [todas, setTodas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        // Traemos todas las canciones sin filtros para que el admin siempre las vea
        const { data, error } = await supabase
          .from('canciones')
          .select('id, titulo')
          .order('titulo', { ascending: true });
        
        if (error) throw error;
        if (data) setTodas(data);
      } catch (err) {
        console.error("Error cargando canciones:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const safeIds = Array.isArray(idsSeleccionados) ? idsSeleccionados : [];

  const toggle = (id) => {
    const nuevos = safeIds.includes(id) 
      ? safeIds.filter(i => i !== id) 
      : [...safeIds, id];
    onChange(nuevos);
  };

  if (loading) return <div className="h-14 bg-primary/5 animate-pulse rounded-[2rem] w-full" />;

  return (
    <div className="relative w-full" style={{ zIndex: 100 }}>
      {/* Botón del Selector */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-full p-4 bg-white border ${isOpen ? 'border-primary' : 'border-primary/10'} rounded-[2rem] flex items-center justify-between cursor-pointer shadow-sm transition-all`}
      >
        <div className="flex flex-wrap gap-2">
          {safeIds.length > 0 ? (
            safeIds.map(id => {
              const cancion = todas.find(c => c.id === id);
              return (
                <span key={id} className="bg-primary text-white text-[9px] font-black px-3 py-1.5 rounded-full flex items-center gap-2 uppercase italic shadow-sm">
                  {cancion?.titulo || 'Cargando...'}
                  <X 
                    size={12} 
                    onClick={(e) => { e.stopPropagation(); toggle(id); }} 
                    className="hover:text-red-300 transition-colors" 
                  />
                </span>
              );
            })
          ) : (
            <span className="text-primary/30 text-[10px] font-black uppercase italic ml-2 flex items-center gap-2">
              <Music size={12} /> Seleccionar canciones para este sujeto...
            </span>
          )}
        </div>
        <ChevronsUpDown size={16} className={isOpen ? 'text-primary' : 'text-primary/30'} />
      </div>

      {/* Menú Desplegable con Z-Index Forzado */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay invisible para cerrar al hacer clic fuera */}
            <div className="fixed inset-0 z-[140]" onClick={() => setIsOpen(false)} />
            
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="absolute left-0 right-0 top-[110%] z-[150] bg-white border border-primary/10 rounded-[2rem] shadow-2xl max-h-64 overflow-y-auto p-3 custom-scrollbar"
            >
              {todas.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-black uppercase italic text-primary/30">
                  No hay canciones en la base de datos
                </div>
              ) : (
                todas.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => toggle(c.id)} 
                    className={`p-3 rounded-2xl cursor-pointer mb-1 flex justify-between items-center transition-colors ${
                      safeIds.includes(c.id) 
                        ? 'bg-primary text-white' 
                        : 'hover:bg-primary/5 text-primary/60'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase italic">{c.titulo}</span>
                    {safeIds.includes(c.id) && <Check size={14} />}
                  </div>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- COMPONENTE 2: LA VISTA ---
export const SeccionMusica = ({ listaLinks = [] }) => {
  const linksLimpios = useMemo(() => {
    if (!listaLinks) return [];
    // Maneja si viene un array de objetos (de la relación), un array de strings o un string simple
    const base = Array.isArray(listaLinks) ? listaLinks : [listaLinks];
    
    return base
      .map(item => {
        if (typeof item === 'object' && item !== null) return item.links || item.url || item.link;
        return item;
      })
      .flatMap(item => (typeof item === 'string' ? item.split(',') : item))
      .filter(link => typeof link === 'string' && link.trim().length > 0)
      .map(link => {
        const l = link.trim();
        return !l.startsWith('http') ? `https://www.youtube.com/watch?v=${l}` : l;
      });
  }, [listaLinks]);

  if (linksLimpios.length === 0) return (
    <div className="p-10 border-2 border-dashed border-primary/5 rounded-[3rem] flex flex-col items-center justify-center opacity-30 italic">
      <Music size={24} className="mb-2" />
      <span className="text-[10px] font-black uppercase">Sin registros sonoros</span>
    </div>
  );

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {linksLimpios.map((link, index) => (
          <Link key={`${link}-${index}`} href={link} target="_blank" rel="noopener noreferrer" className="no-underline group block">
            <motion.div 
              whileHover={{ scale: 1.05, y: -5 }} 
              className="relative flex flex-col items-center justify-center p-8 bg-white border border-primary/5 rounded-[2.5rem] shadow-sm aspect-square overflow-hidden group"
            >
              {/* Número de fondo */}
              <span className="absolute inset-0 flex items-center justify-center text-8xl font-black text-primary/5 italic select-none translate-y-4 group-hover:scale-110 transition-transform">
                {String(index + 1).padStart(2, '0')}
              </span>
              
              {/* Número frontal */}
              <div className="relative z-10 text-4xl font-black text-primary/10 group-hover:text-primary transition-colors italic mb-1">
                {String(index + 1).padStart(2, '0')}
              </div>
              
              <PlayCircle size={32} className="relative z-20 text-primary/20 group-hover:text-primary transition-colors" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};;