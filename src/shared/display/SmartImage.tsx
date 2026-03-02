"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_TS = Date.now();

export const SmartImage = ({ src, alt, className, contain = false, priority = false }) => {
  const [loaded, setLoaded] = useState(false);

  const srcConBust = src
    ? `${src}${src.includes('?') ? '&' : '?'}v=${SESSION_TS}`
    : src;

  return (
    <div className={`relative overflow-hidden bg-primary/5 ${className}`}>
      {/* Skeleton shimmer con Tailwind */}
      <AnimatePresence>
        {!loaded && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-full"
      >
        <Image
          src={srcConBust}
          alt={alt || "Imagen de Franilover Art"}
          fill
          priority={priority}
          unoptimized
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={() => setLoaded(true)}
          className={`transition-all duration-700 ${
            contain ? 'object-contain' : 'object-cover'
          } ${loaded ? 'blur-0' : 'blur-xl'}`}
        />
      </motion.div>
    </div>
  );
}