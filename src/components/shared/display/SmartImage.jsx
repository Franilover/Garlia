"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SmartImage = ({ src, alt, className, contain = false }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-primary/5 ${className}`}>
      {/* Skeleton / Placeholder */}
      <AnimatePresence>
        {!loaded && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent skeleton-wave"
            style={{
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 2s infinite'
            }}
          />
        )}
      </AnimatePresence>

      <motion.img
        src={src}
        alt={alt}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ 
          opacity: loaded ? 1 : 0, 
          scale: loaded ? 1 : 1.05 
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full transition-all duration-500 ${
          contain ? 'object-contain' : 'object-cover'
        } ${loaded ? 'blur-0' : 'blur-lg'}`}
        loading="lazy" // Lazy loading nativo
      />
      
      <style jsx>{`
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-wave {
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.2) 20%,
            rgba(255, 255, 255, 0.5) 60%,
            rgba(255, 255, 255, 0)
          );
        }
      `}</style>
    </div>
  );
};