"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { supabase } from '@/lib/api/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Check, ChevronsUpDown, X, Music } from 'lucide-react';

/**
 * COMPONENTE: SelectorMusicaAdmin
 * Mantiene la lógica de selección de IDs para el panel de administración.
 */
export const SelectorMusicaAdmin = ({ idsSeleccionados = [], onChange }) => {
  const [todas, setTodas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await supabase.from('canciones').select('id, titulo').order('titulo');
        if (data) setTodas(data);
      } catch (err) {
        console.error("Error cargando canciones para selector:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const handleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const safeIds = useMemo(() => {
    if (!Array.isArray(idsSeleccionados)) return [];
    return idsSeleccionados.map(id => typeof id === 'object' ? id.id : Number(id));
  }, [idsSeleccionados]);
  
  const toggle = (id) => {
    const numericId = Number(id);
    const nuevos = safeIds.includes(numericId) 
      ? safeIds.filter(i => i !== numericId) 
      : [...safeIds, numericId];
    onChange(nuevos);
  };

  if (loading) return <div className="h-14 bg-primary/5 animate-pulse rounded-[2rem] w-full" />;

  return (
    <div className="relative w-full">
      <div 
        ref={buttonRef}
        onClick={handleOpen} 
        className={`w-full p-5 bg-white border ${isOpen ? 'border-primary' : 'border-primary/10'} rounded-[2rem] flex items-center justify-between cursor-pointer shadow-inner transition-all hover:border-primary/30`}
      >
        <div className="flex flex-wrap gap-2">
          {safeIds.length > 0 ? (
            safeIds.map(id => {
              const item = todas.find(c => c.id === id);
              return (
                <span key={id} className="bg-primary text-white text-[9px] font-black px-4 py-2 rounded-full flex items-center gap-2 uppercase italic tracking-wider shadow-sm border border-white/10">
                  {item?.titulo || `ID: ${id}`}
                  <X 
                    size={12} 
                    onClick={(e) => { e.stopPropagation(); toggle(id); }} 
                    className="hover:text-red-300 transition-colors" 
                  />
                </span>
              );
            })
          ) : (
            <span className="text-primary/30 text-[10px] font-black uppercase italic tracking-[0.2em] ml-2">Seleccionar registros sonoros...</span>
          )}
        </div>
        <ChevronsUpDown size={18} className="text-primary/30" />
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            style={{ 
              position: 'absolute', 
              top: coords.top + 10, 
              left: coords.left, 
              width: coords.width, 
              zIndex: 9999 
            }}
            className="bg-white border border-primary/10 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.2)] max-h-72 overflow-y-auto p-4 custom-scrollbar"
          >
            {todas.length === 0 ? (
              <div className="p-6 text-center text-[10px] font-black uppercase italic text-primary/20">Base de datos vacía</div>
            ) : (
              todas.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => toggle(c.id)} 
                  className={`p-4 rounded-2xl cursor-pointer mb-1.5 flex justify-between items-center transition-all ${
                    safeIds.includes(c.id) 
                      ? 'bg-primary text-white shadow-lg translate-x-1' 
                      : 'hover:bg-primary/5 text-primary/60 hover:translate-x-1'
                  }`}
                >
                  <span className="text-[11px] font-black uppercase italic tracking-tight">{c.titulo}</span>
                  {safeIds.includes(c.id) && <Check size={16} />}
                </div>
              ))
            )}
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
};

/**
 * COMPONENTE: SeccionMusica (ACTUALIZADO PARA RUTAS INTERNAS)
 * Ahora navega a /wiki/canciones/{id} usando objetos completos de la DB.
 */
export const SeccionMusica = ({ listaLinks = [] }) => {
  const cancionesValidas = useMemo(() => {
    if (!listaLinks || !Array.isArray(listaLinks)) return [];

    return listaLinks
      .map(item => {
        // Si es un objeto (viniendo de la nueva query de personajes)
        if (typeof item === 'object' && item !== null && item.id) {
          return {
            id: item.id,
            titulo: item.titulo || "Registro Sonoro"
          };
        }
        return null;
      })
      .filter(c => c !== null); // Solo permitimos objetos con ID
  }, [listaLinks]);

  if (cancionesValidas.length === 0) return (
    <div className="p-16 border-4 border-dashed border-primary/5 rounded-[4rem] flex flex-col items-center justify-center opacity-20 italic">
       <Music size={40} className="mb-4 text-primary" />
       <span className="text-[12px] font-black uppercase tracking-[0.5em]">Sin registros</span>
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
      {cancionesValidas.map((cancion, index) => (
        // CAMBIO: Navegación interna sin target="_blank"
        <Link key={cancion.id} href={`/wiki/canciones/${cancion.id}`} className="group no-underline">
          <motion.div 
            whileHover={{ scale: 1.05, y: -8 }} 
            className="relative flex flex-col items-center justify-center p-10 bg-white border border-primary/5 rounded-[3rem] aspect-square overflow-hidden shadow-sm"
          >
            {/* Número de fondo gigante */}
            <span className="absolute inset-0 flex items-center justify-center text-[10rem] font-black text-primary/5 italic select-none translate-y-4 group-hover:scale-110 transition-transform">
              {String(index + 1).padStart(2, '0')}
            </span>
            
            {/* Título de la canción y número frontal */}
            <div className="relative z-10 flex flex-col items-center text-center w-full">
              <span className="text-[10px] font-black text-primary/40 group-hover:text-primary uppercase mb-1 truncate w-full transition-colors">
                {cancion.titulo}
              </span>
              <div className="text-5xl font-black text-primary/10 group-hover:text-primary transition-colors italic mb-2">
                {String(index + 1).padStart(2, '0')}
              </div>
              <PlayCircle size={40} className="relative z-20 text-primary/20 group-hover:text-primary transition-all" />
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
};