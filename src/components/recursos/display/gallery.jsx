"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Sparkles } from 'lucide-react'; 

export const GalleryGrid = ({ children, headerContent, className }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { 
        onExpand: () => setIsDetailOpen(true) 
      });
    }
    return child;
  });

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!isDetailOpen && (
          <motion.div 
            key="header-section"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="overflow-hidden"
          >
            {headerContent}
          </motion.div>
        )}
      </AnimatePresence>

      <section className={cn(
        "mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 p-4 md:p-8 max-w-[1600px]",
        className
      )}>
        {childrenWithProps}
      </section>

      {isDetailOpen && (
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsDetailOpen(false)}
          className="fixed top-6 right-6 z-[60] bg-[#4a4458] text-[#f4f2f7] px-5 py-2 rounded-full uppercase text-[9px] font-black tracking-widest hover:bg-black transition-all shadow-lg"
        >
          "Mostrar Filtros"
        </motion.button>
      )}
    </div>
  );
};

export const GalleryItem = ({ src, alt, children, onClick, onExpand, color, contain }) => {
  const tieneImagen = src && src.trim() !== "";

  const handleInteraction = () => {
    if (onExpand) onExpand();
    if (onClick) onClick();
  };

  return (
    <motion.div 
      layout
      onClick={handleInteraction}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-[2.2rem] cursor-pointer transition-all duration-700 hover:-translate-y-2 hover:shadow-xl group",
        tieneImagen ? "bg-white" : "bg-[#f0edf5]" 
      )}
    >
      {/* CAPA 1: FONDO (IMAGEN O ICONO) */}
      {tieneImagen ? (
        <Image 
          src={src} 
          alt={alt || "Archivo Visual"} 
          fill 
          sizes="(max-width: 768px) 50vw, 20vw"
          className={cn(
            "transition-all duration-700 group-hover:scale-105",
            contain ? "object-contain p-8 mix-blend-multiply" : "object-cover grayscale-[0.2] group-hover:grayscale-0"
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute w-16 h-16 rounded-full bg-[#d0cde1] blur-xl opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center border border-[#d0cde1] relative z-10">
              <Sparkles className="w-5 h-5 text-[#6b6681]" />
            </div>
          </div>
          <p className="text-[8px] font-black text-[#6b6681]/60 uppercase tracking-[0.4em]">
            "Inédito"
          </p>
        </div>
      )}

      {/* CAPA 2: DEGRADADO MAESTRO (UNIVERSAL) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 z-20" />

      {/* CAPA 3: TEXTOS (FORZADOS A BLANCO POR EL DEGRADADO) */}
      <div className="absolute bottom-7 left-7 right-7 transition-all duration-500 z-30 text-white">
        <div className="group-hover:translate-y-[-2px] transition-transform duration-500">
          {children}
        </div>
      </div>

      {/* CAPA 4: DETALLE DE COLOR */}
      {color && (
        <div 
          className="absolute top-0 w-full h-1.5 opacity-30 z-40" 
          style={{ backgroundColor: color }} 
        />
      )}
    </motion.div>
  );
};