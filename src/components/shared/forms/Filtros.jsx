"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// He añadido "?" a las props para que TypeScript no se queje si faltan
export default function FiltrosMaestros({ 
  config,           // opcional
  filtrosActivos,   // opcional
  opciones,         // opcional
  filtroActivo,     // opcional
  onChange 
}) {
  // Normalizamos la entrada de datos
  const grupos = config 
    ? Object.entries(config) 
    : [["Categoría", opciones || []]];

  const estaActivo = (nombreGrupo, tag) => {
    if (filtrosActivos) return filtrosActivos[nombreGrupo] === tag;
    return filtroActivo === tag;
  };

  return (
    <div className="max-w-5xl mx-auto mb-16 px-6 space-y-10">
      {grupos.map(([nombreGrupo, listaOpciones]) => (
        <div key={nombreGrupo} className="flex flex-col items-center space-y-5">
          <div className="flex items-center gap-4 w-full max-w-xs">
            <div className="h-px flex-1 bg-primary/10" /> {/* Actualizado a h-px por Tailwind v4 */}
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/30 italic">
              {nombreGrupo}
            </span>
            <div className="h-px flex-1 bg-primary/10" />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <AnimatePresence mode="popLayout">
              {listaOpciones?.map((tag) => (
                <motion.button
                  layout
                  key={tag}
                  onClick={() => onChange(nombreGrupo, tag)}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-7 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    estaActivo(nombreGrupo, tag)
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 border-primary -translate-y-1' 
                    : 'bg-primary/5 text-primary/50 border-primary/5 hover:bg-primary/10 hover:text-primary hover:border-primary/20'
                  }`}
                >
                  {tag}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}