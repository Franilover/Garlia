"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FiltrosMaestros({ config, filtrosActivos, onChange, loading = false }) {
  
  // Skeleton de carga para cuando loading es true
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mb-16 px-6 flex justify-center gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 bg-primary/5 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mb-16 px-6 space-y-8">
      {Object.entries(config).map(([grupo, opciones]) => {
        
        // Ordenar opciones: "Todos" siempre primero, luego alfabético
        const opcionesOrdenadas = [...opciones].sort((a, b) => {
          const valA = (typeof a === 'string' ? a : a.label).toLowerCase();
          const valB = (typeof b === 'string' ? b : b.label).toLowerCase();
          if (valA === 'todos') return -1;
          if (valB === 'todos') return 1;
          return valA.localeCompare(valB);
        });

        return (
          <div key={grupo} className="flex flex-col items-center space-y-4">
            {Object.keys(config).length > 1 && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 italic">
                {grupo}
              </span>
            )}
            
            <div className="flex flex-wrap justify-center gap-2">
              <AnimatePresence mode="popLayout">
                {opcionesOrdenadas.map(opt => {
                  // Manejo flexible de strings o objetos {id, label}
                  const id = typeof opt === 'string' ? opt : opt.id;
                  const label = typeof opt === 'string' ? opt : opt.label;
                  
                  const isActive = filtrosActivos[grupo]?.toLowerCase() === id.toLowerCase();

                  return (
                    <motion.button
                      layout
                      key={id}
                      onClick={() => onChange(grupo, id)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                        isActive 
                        ? 'bg-primary text-white shadow-lg border-primary' 
                        : 'bg-white/50 text-primary/60 border-transparent hover:border-primary/20'
                      }`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}