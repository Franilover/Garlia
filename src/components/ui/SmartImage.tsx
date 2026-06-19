"use client";
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';

import { MotionDiv, MotionMain, MotionH1, MotionH2, MotionButton, MotionLi, MotionSpan, MotionP, MotionSection, MotionArticle, MotionImg } from "@/components/ui/Motion";

const SESSION_TS = Date.now();

interface SmartImageProps {
  src: string;
  alt?: string;
  className?: string;
  contain?: boolean;
  priority?: boolean;
  
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
            className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
            exit={{ opacity: 0 }}
            initial={{ opacity: 1 }}
          />
        )}
      </AnimatePresence>

      <MotionDiv
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.05 }}
        className="w-full h-full"
        initial={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <img
          alt={alt || "Imagen de Franilover Art"}
          className={`w-full h-full transition-all duration-700 ${
            contain ? 'object-contain' : 'object-cover'
          } ${loaded ? 'blur-0' : 'blur-xl'}`}
          loading={priority ? "eager" : "lazy"}
          src={srcFinal}
          onLoad={() => setLoaded(true)}
        />
      </MotionDiv>
    </div>
  );
};