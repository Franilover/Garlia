"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SmartImage: Unifica Next.js Image con animaciones de carga premium.
 */
export const SmartImage = ({ src, alt, className, contain = false, priority = false }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-primary/5 ${className}`}>
      {/* 1. Skeleton / Placeholder con Shimmer */}
      <AnimatePresence>
        {!loaded && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-primary/5 to-transparent skeleton-wave"
            style={{
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 2s infinite'
            }}
          />
        )}
      </AnimatePresence>

      {/* 2. Imagen Optimizada de Next.js */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ 
          opacity: loaded ? 1 : 0, 
          scale: loaded ? 1 : 1.05 
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-full"
      >
        <Image
          src={src}
          alt={alt || "Imagen de Franilover Art"}
          fill // Rellena el contenedor padre
          priority={priority} // Usar true para imágenes arriba del fold (Hero)
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={() => setLoaded(true)}
          className={`transition-all duration-700 ${
            contain ? 'object-contain' : 'object-cover'
          } ${loaded ? 'blur-0' : 'blur-xl'}`}
        />
      </motion.div>
      
      <style jsx>{`
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-wave {
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.1) 20%,
            rgba(255, 255, 255, 0.3) 60%,
            rgba(255, 255, 255, 0)
          );
        }
      `}</style>
    </div>
  );
}