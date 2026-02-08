"use client";
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseData } from '@/hooks/useSupabaseData';

export default function FiltrosMaestros({ tabla = "criaturas", filtroActivo, onChange }) {
  // Usamos tu hook para traer los datos (aprovechando el caché y tiempo real)
  const { data: items, loading } = useSupabaseData(tabla);

  // Extraemos los tags únicos de los datos que ya tenemos en el hook
  const opciones = useMemo(() => {
    if (!items || items.length === 0) return ["Todos"];
    
    // Sacamos todos los tags de la lista de personajes/criaturas
    const todosLosTags = items.flatMap(item => item.tags || []);
    // Quitamos duplicados y ordenamos
    const unicos = [...new Set(todosLosTags)].sort();
    
    return ["Todos", ...unicos];
  }, [items]);

  if (loading && opciones.length <= 1) {
    return (
      <div className="max-w-5xl mx-auto mb-16 px-6 flex justify-center gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 w-24 bg-primary/5 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mb-16 px-6">
      <div className="flex flex-col items-center space-y-6">
        {/* Título sutil con estética morada */}
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className="h-[1px] flex-1 bg-primary/10" />
          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/30 italic">
            Explorar {tabla}
          </span>
          <div className="h-[1px] flex-1 bg-primary/10" />
        </div>

        {/* Botonera estilo 'Variante' */}
        <div className="flex flex-wrap justify-center gap-3">
          <AnimatePresence mode="popLayout">
            {opciones.map((tag) => {
              const isActive = (filtroActivo || "Todos").toLowerCase() === tag.toLowerCase();

              return (
                <motion.button
                  layout
                  key={tag}
                  onClick={() => onChange(tag)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border ${
                    isActive 
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 border-primary -translate-y-1' 
                    : 'bg-primary/5 text-primary/50 border-primary/5 hover:bg-primary/10 hover:text-primary hover:border-primary/20'
                  }`}
                >
                  {tag}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}