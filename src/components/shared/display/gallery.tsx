"use client";
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Sparkles } from 'lucide-react'; 
import { SmartImage } from './SmartImage'; // <--- Importamos tu nuevo componente

// --- DEFINICIÓN DE TIPOS ---

interface GalleryGridProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  className?: string;
  isDetailOpen?: boolean;
}

interface GalleryItemProps {
  src?: string;
  alt?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  onExpand?: () => void;
  color?: string;
  contain?: boolean;
}

// --- COMPONENTE GALLERY GRID ---

export const GalleryGrid = ({ 
  children, 
  headerContent, 
  className,
  isDetailOpen: isDetailOpenExternal 
}: GalleryGridProps) => {
  const [isDetailOpenInternal, setIsDetailOpenInternal] = useState(false);
  const isDetailOpen = isDetailOpenExternal !== undefined ? isDetailOpenExternal : isDetailOpenInternal;

  const handleOpenDetail = useCallback(() => {
    setIsDetailOpenInternal(true);
  }, []);

  const childrenWithProps = useMemo(() => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, { 
          onExpand: handleOpenDetail 
        });
      }
      return child;
    });
  }, [children, handleOpenDetail]);

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
        <AnimatePresence mode="popLayout">
          {childrenWithProps}
        </AnimatePresence>
      </section>

      {isDetailOpenInternal && (
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsDetailOpenInternal(false)}
          className="fixed top-6 right-6 z-[60] bg-[#4a4458] text-[#f4f2f7] px-5 py-2 rounded-full uppercase text-[9px] font-black tracking-widest hover:bg-black transition-all shadow-lg"
        >
          "Mostrar Filtros"
        </motion.button>
      )}
    </div>
  );
};

// --- GALLERY ITEM (Optimizado con SmartImage) ---

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
    if (onExpand) onExpand();
    if (onClick) onClick();
  }, [onExpand, onClick]);

  return (
    <motion.div 
      layout
      onClick={handleInteraction}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "relative aspect-[3/4] overflow-hidden rounded-[2.2rem] cursor-pointer transition-all duration-700 hover:-translate-y-2 hover:shadow-xl group",
        tieneImagen ? "bg-white" : "bg-[#f0edf5]" 
      )}
    >
      {tieneImagen ? (
        <SmartImage 
          src={src as string} 
          alt={alt || "Archivo Visual"} 
          contain={contain}
          className={cn(
            "w-full h-full transition-all duration-700 group-hover:scale-110",
            contain ? "p-8 mix-blend-multiply" : "grayscale-[0.2] group-hover:grayscale-0"
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

      {/* Overlay gradiente para legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity z-20 pointer-events-none" />

      <div className="absolute bottom-7 left-7 right-7 transition-all duration-500 z-30 text-white">
        <div className="group-hover:translate-y-[-2px] transition-transform duration-500">
          {children}
        </div>
      </div>

      {color && (
        <div 
          className="absolute top-0 w-full h-1.5 opacity-30 z-40" 
          style={{ backgroundColor: color }} 
        />
      )}
    </motion.div>
  );
});

GalleryItem.displayName = 'GalleryItem';