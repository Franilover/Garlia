"use client";
import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Sparkles } from 'lucide-react'; 
import { SmartImage } from './SmartImage';

// --- DEFINICIÓN DE TIPOS ---

interface GalleryGridProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  className?: string;
}

interface GalleryItemProps {
  src?: string;
  alt?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  onExpand?: () => void; // Mantenemos la prop por compatibilidad, aunque no oculte nada
  color?: string;
  contain?: boolean;
}

// --- COMPONENTE GALLERY GRID ---
// Eliminamos toda la lógica de estados de apertura para evitar saltos de scroll

export const GalleryGrid = ({ 
  children, 
  headerContent, 
  className 
}: GalleryGridProps) => {
  return (
    <div className="w-full relative">
      {/* El Header se queda fijo en su posición original del DOM */}
      {headerContent && (
        <div className="w-full">
          {headerContent}
        </div>
      )}

      <section className={cn(
        "mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 p-4 md:p-8 max-w-[1600px]",
        className
      )}>
        <AnimatePresence mode="popLayout">
          {children}
        </AnimatePresence>
      </section>
    </div>
  );
};

// --- GALLERY ITEM ---

export const GalleryItem = React.memo(({ 
  src, 
  alt, 
  children, 
  onClick, 
  onExpand, 
  color, 
  contain 
}: GalleryItemProps) => {
  const tieneImagen = src && src.trim() !== "";

  const handleInteraction = useCallback(() => {
    if (onClick) onClick();
    if (onExpand) onExpand();
  }, [onClick, onExpand]);

  return (
    <motion.div 
      layout="position" // "position" asegura que solo anime su lugar, no intente re-calcular todo el layout
      onClick={handleInteraction}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-[2.2rem] cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl group",
        tieneImagen ? "bg-white" : "bg-[#f0edf5]" 
      )}
    >
      {tieneImagen ? (
        <SmartImage 
          src={src as string} 
          alt={alt || "Archivo Visual"} 
          contain={contain}
          className={cn(
            "w-full h-full transition-all duration-700 group-hover:scale-105",
            contain ? "p-8 mix-blend-multiply" : "grayscale-[0.1] group-hover:grayscale-0"
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center border border-[#d0cde1]">
            <Sparkles className="w-5 h-5 text-[#6b6681]" />
          </div>
          <p className="mt-4 text-[8px] font-black text-[#6b6681]/60 uppercase tracking-[0.4em]">
            Inédito
          </p>
        </div>
      )}

      {/* Gradiente Inferior */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity z-20 pointer-events-none" />

      <div className="absolute bottom-7 left-7 right-7 z-30 text-white">
        <div className="group-hover:translate-y-[-2px] transition-transform duration-500">
          {children}
        </div>
      </div>

      {color && (
        <div 
          className="absolute top-0 w-full h-1.5 opacity-40 z-40" 
          style={{ backgroundColor: color }} 
        />
      )}
    </motion.div>
  );
});

GalleryItem.displayName = 'GalleryItem';