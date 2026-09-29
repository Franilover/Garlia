"use client";
import { AnimatePresence } from 'framer-motion';
import { ImageOff } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { MotionDiv } from "@/ui/Motion";

const SESSION_TS = Date.now();

interface SmartImageProps {
  src: string;
  alt?: string;
  className?: string;
  contain?: boolean;
  priority?: boolean;
  cacheBust?: boolean;
  // Ícono a mostrar si la imagen no carga (URL rota, borrada, portada
  // faltante, etc.). Antes esto no existía: cuando el <img> fallaba, el
  // navegador caía a su propio manejo nativo de imagen rota, que muestra
  // el texto `alt` — y como este componente siempre lo mete en una caja
  // chica con `overflow-hidden`, lo único que quedaba visible era la
  // primera letra del `alt`, gigante. Con esto mostramos un ícono en vez
  // de dejar que el navegador improvise.
  fallbackIcon?: React.ReactNode;
}

export const SmartImage = ({
  src,
  alt,
  className,
  contain = false,
  priority = false,
  cacheBust = false,
  fallbackIcon,
}: SmartImageProps) => {
  const srcFinal =
    src && cacheBust
      ? `${src}${src.includes('?') ? '&' : '?'}v=${SESSION_TS}`
      : src;

  // Estado "derivado del src": en vez de booleanos que hay que resetear con
  // un useEffect cuando cambia el src, guardamos QUÉ src cargó / falló.
  // Así, si el src cambia (ej. otro libro/canción), `loaded` y `errored`
  // pasan a false solos y la nueva URL tiene otra chance.
  //
  // Antes había un useEffect([srcFinal]) que hacía setLoaded(false) al
  // montar. Con imágenes ya cacheadas (volver a una lista, o abrir el
  // detalle de un libro cuya portada se acaba de ver en la lista), el
  // evento `load` puede dispararse ANTES de que corra ese efecto: onLoad
  // ponía loaded=true, el efecto lo pisaba con false, y como el navegador
  // no vuelve a disparar `load`, la imagen quedaba invisible (opacity 0)
  // con el skeleton para siempre. Con imágenes NO cacheadas (primera
  // carga) el `load` llega después del efecto y todo andaba bien.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const loaded = loadedSrc === srcFinal;
  const errored = erroredSrc === srcFinal;

  const imgRef = useRef<HTMLImageElement>(null);

  // Red de seguridad: si la imagen ya estaba completa cuando montó (y el
  // evento `load` se perdió), la marcamos como cargada.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoadedSrc(srcFinal);
    }
  }, [srcFinal]);

  if (!src || errored) {
    return (
      <div
        className={`relative overflow-hidden bg-primary/5 flex items-center justify-center ${className}`}
      >
        <span className="text-primary/20">
          {fallbackIcon ?? <ImageOff size={18} />}
        </span>
      </div>
    );
  }

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
          ref={imgRef}
          alt={alt || "Imagen de Franilover Art"}
          className={`w-full h-full transition-all duration-700 ${
            contain ? 'object-contain' : 'object-cover'
          } ${loaded ? 'blur-0' : 'blur-xl'}`}
          loading={priority ? "eager" : "lazy"}
          src={srcFinal}
          onError={() => setErroredSrc(srcFinal)}
          onLoad={() => setLoadedSrc(srcFinal)}
        />
      </MotionDiv>
    </div>
  );
};
