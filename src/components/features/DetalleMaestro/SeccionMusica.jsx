"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';

export const SeccionMusica = ({ listaLinks, nombre }) => {
  const linksLimpios = React.useMemo(() => {
    if (!listaLinks) return [];
    
    // Convertimos a array si viene como string
    const base = Array.isArray(listaLinks) ? listaLinks : [listaLinks];
    
    return base
      .flatMap(item => (typeof item === 'string' ? item.split(',') : item))
      .map(link => (typeof link === 'string' ? link.trim() : link))
      .filter(link => link && link.length > 0) // Quitamos el startsWith('http') por ahora para debuggear
      .map(link => {
        // Si no es una URL completa, asumimos que es un ID de YouTube y la construimos
        if (typeof link === 'string' && !link.startsWith('http')) {
          return `https://www.youtube.com/watch?v=${link}`;
        }
        return link;
      });
  }, [listaLinks]);

  if (linksLimpios.length === 0) return (
    <div className="p-8 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-primary/10">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/20">No hay canciones registradas</p>
    </div>
  );

  return (
    <div className="w-full mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[100px]">
        {linksLimpios.map((link, index) => (
          <Link 
            key={`${link}-${index}`} 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline group"
          >
            <motion.div
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-6 p-6 bg-white border border-primary/5 rounded-[2.5rem] shadow-sm group-hover:shadow-xl group-hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
            >
              <span className="absolute -right-4 -bottom-6 text-7xl font-black text-primary/5 italic group-hover:text-primary/10 transition-colors select-none">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="text-2xl font-black text-primary/20 group-hover:text-primary transition-colors italic w-8 select-none">
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="flex-1 z-10">
                <span className="text-[9px] text-primary/40 font-black uppercase tracking-widest block mb-1">
                  Escuchar Soliloquio
                </span>
                <span className="text-xl font-black italic uppercase text-slate-800 group-hover:text-primary transition-colors tracking-tighter block leading-none truncate pr-4">
                  {nombre} <span className="text-primary/20">/</span> {index + 1}
                </span>
              </div>

              <div className="relative z-10 p-3 rounded-full bg-slate-50 text-primary/30 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                <PlayCircle size={24} />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};