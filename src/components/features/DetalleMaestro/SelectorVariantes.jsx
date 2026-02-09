"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Flame, Droplets } from 'lucide-react';

/**
 * Mapeo de iconos opcional
 */
const ICONOS_TIPO = {
  "Hielo": <Droplets size={14} />,
  "Fuego": <Flame size={14} />,
  "Protector": <Shield size={14} />,
  "default": <Sparkles size={14} />
};

export const SelectorVariantes = ({ variantes = [], varianteActiva, onSeleccionar }) => {
  const [mounted, setMounted] = useState(false);

  // FIX: Solo activamos las animaciones cuando el cliente está listo
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!variantes || variantes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-10">
      {/* Botón para la Forma Base */}
      <button
        onClick={() => onSeleccionar(null)}
        className={`relative px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden ${
          !varianteActiva 
            ? 'bg-primary text-white shadow-[0_10px_20px_-5px_rgba(var(--primary-rgb),0.4)]' 
            : 'bg-slate-100 text-primary/40 hover:bg-slate-200'
        }`}
      >
        <span className="relative z-10">Original</span>
        {/* Solo renderizamos el layoutId si estamos montados para evitar crash en SSR */}
        {!varianteActiva && mounted && (
          <motion.div 
            layoutId="activeTab" 
            className="absolute inset-0 bg-primary"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>

      {/* Mapeo de Variantes de la BD */}
      {variantes.map((v) => {
        if (!v || !v.id) return null; // Seguridad extra contra datos corruptos
        const isActive = varianteActiva?.id === v.id;

        return (
          <button
            key={v.id}
            onClick={() => onSeleccionar(v)}
            className={`group relative flex items-center gap-2 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              isActive 
                ? 'bg-primary text-white shadow-[0_10px_20px_-5px_rgba(var(--primary-rgb),0.4)]' 
                : 'bg-slate-100 text-primary/40 hover:bg-slate-200'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {ICONOS_TIPO[v.tipo] || ICONOS_TIPO.default}
              {v.tipo}
            </span>
            
            {isActive && mounted && (
              <motion.div 
                layoutId="activeTab" 
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};