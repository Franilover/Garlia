"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';

export const SeccionMusica = ({ listaLinks }) => {
  const linksLimpios = React.useMemo(() => {
    if (!listaLinks) return [];
    
    const base = Array.isArray(listaLinks) ? listaLinks : [listaLinks];
    
    return base
      .flatMap(item => (typeof item === 'string' ? item.split(',') : item))
      .map(link => (typeof link === 'string' ? link.trim() : link))
      .filter(link => link && link.length > 0)
      .map(link => {
        if (typeof link === 'string' && !link.startsWith('http')) {
          return `https://www.youtube.com/watch?v=${link}`;
        }
        return link;
      });
  }, [listaLinks]);

  if (linksLimpios.length === 0) return null;

  return (
    <div className="w-full mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
        {linksLimpios.map((link, index) => (
          <Link 
            key={`${link}-${index}`} 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
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

              {/* Indicador de número frontal (Principal) */}
              <div className="relative z-10 text-4xl font-black text-primary/20 group-hover:text-primary transition-colors italic select-none mb-2">
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* Icono Play centrado */}
              <div className="relative z-20 flex items-center justify-center p-2 rounded-full text-primary/30 group-hover:text-primary transition-all">
                <PlayCircle size={32} strokeWidth={2.5} />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};