"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';

export const SeccionMusica = ({ listaLinks, nombre }) => {
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

  if (linksLimpios.length === 0) return (
    <div className="p-8 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-primary/10">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/20">No hay canciones registradas</p>
    </div>
  );

  return (
    <div className="w-full mt-4">
      {/* Añadimos un pequeño padding lateral para evitar que las sombras se corten en los bordes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[100px] p-1">
        {linksLimpios.map((link, index) => (
          <Link 
            key={`${link}-${index}`} 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="no-underline group block"
          >
            <motion.div
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-6 bg-white border border-primary/5 rounded-[2.5rem] shadow-sm group-hover:shadow-xl group-hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden min-h-[110px]"
            >
              {/* 1. Z-INDEX: Forzamos el fondo al nivel más bajo para que no tape el icono */}
              <span className="absolute -right-2 -bottom-4 text-7xl font-black text-primary/5 italic group-hover:text-primary/10 transition-colors select-none z-0">
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* 2. NUMERO FRONTAL: Con z-10 para estar sobre el fondo */}
              <div className="relative z-10 text-2xl font-black text-primary/20 group-hover:text-primary transition-colors italic w-10 select-none">
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* 3. CONTENIDO: Con min-w-0 para permitir que el truncate funcione */}
              <div className="flex-1 z-10 min-w-0">
                <span className="text-[9px] text-primary/40 font-black uppercase tracking-widest block mb-1">
                  Escuchar Soliloquio
                </span>
                <span className="text-lg font-black italic uppercase text-slate-800 group-hover:text-primary transition-colors tracking-tighter block leading-none truncate pr-2">
                  {nombre} <span className="text-primary/20">/</span> {index + 1}
                </span>
              </div>

              {/* 4. ICONO PLAY: Con shrink-0 para que nunca se deforme ni se corte */}
              <div className="relative z-20 shrink-0 flex items-center justify-center p-3 rounded-full bg-slate-50 text-primary/30 group-hover:bg-primary group-hover:text-white transition-all shadow-inner w-12 h-12">
                <PlayCircle size={24} />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};