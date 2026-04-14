"use client";
import React, { useState, useEffect } from "react";
import { MotionDiv } from '@/components/ui/Motion';
import { 
  Sparkles, Shield, Flame, Droplets, 
  Sun, Moon, Zap, Leaf, Skull 
} from "lucide-react";

const ICONOS_TIPO: Record<string, React.ReactNode> = {
  "Hielo": <Droplets size={14} />,
  "Fuego": <Flame size={14} />,
  "Protector": <Shield size={14} />,
  "Estelares": <Sun size={14} />,
  "Ascechadores": <Moon size={14} />,
  "Electrico": <Zap size={14} />,
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
        className={`relative px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden border border-primary/10 ${
          !varianteActiva 
            ? "bg-primary text-btn-text shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_25%,transparent)]"
            : "text-primary/40"
        }`}
      >
        <span className="relative z-10">Original</span>
        {!varianteActiva && mounted && (
          <MotionDiv 
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
            className={`group relative flex items-center gap-2 px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all border border-primary/10 ${
              isActive 
                ? "bg-primary text-btn-text shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_25%,transparent)]"
                : "text-primary/40"
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {ICONOS_TIPO[v.tipo] || ICONOS_TIPO.default}
              {v.tipo}
            </span>
            {isActive && mounted && (
              <MotionDiv 
                layoutId="activeTab" 
                className="absolute inset-0 bg-primary" style={{borderRadius:"var(--radius-btn)"}}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};