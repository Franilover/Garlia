"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Music, PlayCircle } from 'lucide-react';

/**
 * Componente rediseñado para una visualización premium de la música.
 */
export const SeccionMusica = ({ listaLinks, nombre }) => {
  if (!listaLinks || listaLinks.length === 0) return null;

  const linksLimpios = Array.isArray(listaLinks) 
    ? listaLinks.flatMap(item => typeof item === 'string' ? item.split(',') : item)
                .map(link => link.trim())
                .filter(link => link !== "" && link !== "[]")
    : [];

  if (linksLimpios.length === 0) return null;

  return (
    <div className="w-full mt-12">
      {/* CABECERA DE LA SECCIÓN */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/5 rounded-2xl text-primary">
          <Music size={20} />
        </div>
        <div className="h-[1px] flex-1 bg-primary/5 ml-4" />
      </div>

      {/* LISTA DE TRACKS ESTILO ÁLBUM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {linksLimpios.map((link, index) => (
          <Link 
            key={`${link}-${index}`} 
            href={link} 
            className="no-underline group"
          >
            <motion.div
              whileHover={{ x: 5 }}
              className="flex items-center gap-6 p-6 bg-white border border-primary/5 rounded-[2.5rem] shadow-sm group-hover:shadow-xl group-hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
            >
              {/* Número de track de fondo */}
              <span className="absolute -right-4 -bottom-6 text-7xl font-black text-primary/5 italic group-hover:text-primary/10 transition-colors">
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* Indicador de número */}
              <div className="text-2xl font-black text-primary/20 group-hover:text-primary transition-colors italic w-8">
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="flex-1 z-10">
                <span className="text-[9px] text-primary/40 font-black uppercase tracking-widest block mb-1">
                  Ver Letra 
                </span>
                <span className="text-xl font-black italic uppercase text-slate-800 group-hover:text-primary transition-colors tracking-tighter block leading-none">
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