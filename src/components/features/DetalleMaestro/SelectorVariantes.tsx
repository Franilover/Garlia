"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, Shield, Flame, Droplets, 
  Sun, Moon, Zap, Leaf, Skull 
} from "lucide-react";

const ICONOS_TIPO: Record<string, React.ReactNode> = {
  "Hielo": <Droplets size={14} />,
  "Fuego": <Flame size={14} />,
  "Protector": <Shield size={14} />,
  "Luz": <Sun size={14} />,
  "Oscuridad": <Moon size={14} />,
  "Rayo": <Zap size={14} />,
  "Naturaleza": <Leaf size={14} />,
  "Muerte": <Skull size={14} />,
  "default": <Sparkles size={14} />
};

export const SelectorVariantes = ({ variantes = [], varianteActiva, onSeleccionar }: any) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!variantes || variantes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-10">
      <button
        onClick={() => onSeleccionar(null)}
        className={`relative px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden ${
          !varianteActiva 
            ? "bg-primary text-white shadow-[0_10px_20px_-5px_rgba(var(--primary-rgb),0.4)]" 
            : "bg-slate-100 text-primary/40 hover:bg-slate-200"
        }`}
      >
        <span className="relative z-10">Original</span>
        {!varianteActiva && mounted && (
          <motion.div 
            layoutId="activeTab" 
            className="absolute inset-0 bg-primary"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </button>

      {variantes.map((v: any) => {
        if (!v || !v.id) return null;
        const isActive = varianteActiva?.id === v.id;

        return (
          <button
            key={v.id}
            onClick={() => onSeleccionar(v)}
            className={`group relative flex items-center gap-2 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              isActive 
                ? "bg-primary text-white shadow-[0_10px_20px_-5px_rgba(var(--primary-rgb),0.4)]" 
                : "bg-slate-100 text-primary/40 hover:bg-slate-200"
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
};;