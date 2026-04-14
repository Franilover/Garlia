"use client";
import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_TS = Date.now();

interface SmartImageProps {
  src: string;
  alt?: string;
  className?: string;
  contain?: boolean;
  priority?: boolean;
  /** Fuerza recarga omitiendo caché del navegador. Usar solo cuando la imagen
   *  puede cambiar entre sesiones (ej: avatar de perfil). Por defecto false. */
  cacheBust?: boolean;
}

export const SmartImage = ({
  src,
  alt,
  className,
  contain = false,
  priority = false,
  cacheBust = false,
}: SmartImageProps) => {
  const [loaded, setLoaded] = useState(false);

  const srcFinal =
    src && cacheBust
      ? `${src}${src.includes('?') ? '&' : '?'}v=${SESSION_TS}`
      : src;

  return (
    <div className={`relative overflow-hidden bg-primary/5 ${className}`}>
      <AnimatePresence>
        {!loaded && (
          <MotionDiv
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
          />
        )}
      </AnimatePresence>

      <MotionDiv
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-full"
      >
        <img
          src={srcFinal}
          alt={alt || "Imagen de Franilover Art"}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full transition-all duration-700 ${
            contain ? 'object-contain' : 'object-cover'
          } ${loaded ? 'blur-0' : 'blur-xl'}`}
        />
      </MotionDiv>
    </div>
  );
};