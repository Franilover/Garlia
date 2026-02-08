"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlayCircle, Music } from 'lucide-react';

export const SeccionMusica = ({ listaLinks }) => {
  const idsLimpios = React.useMemo(() => {
    if (!listaLinks) return [];
    
    // Convertimos cualquier entrada (string con comas o array) en un array de IDs limpios
    const base = Array.isArray(listaLinks) ? listaLinks : [listaLinks];
    
    return base
      .flatMap(item => (typeof item === 'string' ? item.split(',') : item))
      .map(id => (typeof id === 'string' ? id.trim() : id))
      .filter(id => id && id.length > 0);
  }, [listaLinks]);

  if (idsLimpios.length === 0) return null;

  return (
    <div className="w-full mt-4">
      {/* Título opcional para contexto */}
      <div className="flex items-center gap-2 mb-6 ml-2">
        <Music size={16} className="text-primary/40" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 italic">
          Cancionero Interno
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
        {idsLimpios.map((id, index) => (
          <Link 
            key={`${id}-${index}`} 
            href={`/wiki/canciones/${id}`} // "Redirige a la ruta interna"
            className="no-underline group block"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center justify-center p-8 bg-white border border-primary/5 rounded-[2.5rem] shadow-sm group-hover:shadow-xl group-hover:border-primary/20 transition-all cursor-pointer overflow-hidden aspect-square"
            >
              {/* Número de track de fondo gigante */}
              <span className="absolute inset-0 flex items-center justify-center text-8xl font-black text-primary/5 italic select-none z-0 translate-y-2">
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* Indicador de número frontal */}
              <div className="relative z-10 text-4xl font-black text-primary/20 group-hover:text-primary transition-colors italic select-none mb-2">
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* Icono Play centrado */}
              <div className="relative z-20 flex items-center justify-center p-2 rounded-full text-primary/30 group-hover:text-primary transition-all">
                <PlayCircle size={32} strokeWidth={2.5} />
              </div>

              {/* Tag opcional: Leer Letra */}
              <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[7px] font-black uppercase tracking-widest text-primary italic">Leer Letra</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};