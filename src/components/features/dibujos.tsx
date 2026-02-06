"use client";
import React, { useState, useMemo } from 'react';
import { useLightbox } from "@/components/shared/modal/lightbox"; 
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import { useSupabaseData } from '@/hooks/useSupabaseData'; // Usamos el hook maestro
import Newsletter from "@/components/features/newsletter";
import FiltrosMaestros from "@/components/shared/forms/Filtros";

export default function Drawings() {
  const { openLightbox } = useLightbox();
  const [filtro, setFiltro] = useState('todos');

  // 1. Usamos el Hook Maestro para la tabla 'dibujos'
  // Esto ya gestiona el Loading, el Caché Global y el Real-time automáticamente
  const { data: dibujos, loading, error } = useSupabaseData('dibujos', {
    order: { campo: 'id', asc: false }
  });

  const categorias = ['todos', 'fanart', 'original', 'bocetos'];

  // 2. Filtrado inteligente basado en la caché
  const filtrados = useMemo(() => (
    filtro === 'todos' ? dibujos : dibujos.filter(d => d.categoria === filtro)
  ), [dibujos, filtro]);

  // 3. Preparación de datos para el Lightbox
  const lbData = useMemo(() => (
    filtrados.map(d => ({ src: d.url_imagen, alt: d.titulo }))
  ), [filtrados]);

  // --- CABECERA ---
  const MiCabecera = (
    <header className="mb-12 text-center px-4 pt-16">
      <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase leading-none">
        Galería
      </h1>
      <div className="h-1.5 w-24 bg-primary mx-auto mt-4 rounded-full opacity-20 mb-12" />
      
      <FiltrosMaestros 
        config={{ categorías: categorias }}
        filtrosActivos={{ categorías: filtro }}
        onChange={(grupo, valor) => setFiltro(valor)}
      />
    </header>
  );

  if (error) return (
    <div className="py-40 text-center text-red-500 font-black uppercase text-xs">
      "Error al conectar con el archivo: {error}"
    </div>
  );

  return (
    <main className="min-h-screen bg-bg-main pb-20 font-sans">
      
      {loading ? (
        <div className="py-40 text-center text-primary/30 font-black uppercase text-[10px] tracking-widest animate-pulse">
          "Sincronizando Archivos..."
        </div>
      ) : (
        <GalleryGrid headerContent={MiCabecera}>
          {filtrados.map((dibujo, index) => (
            <GalleryItem
              key={dibujo.id}
              src={dibujo.url_imagen}
              alt={dibujo.titulo}
              onClick={() => openLightbox(index, lbData)}
            >
              <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">
                {dibujo.categoria}
              </p>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none">
                {dibujo.titulo}
              </h3>
            </GalleryItem>
          ))}
          
          {filtrados.length === 0 && (
            <div className="col-span-full py-20 text-center text-primary/30 font-bold uppercase text-[10px] tracking-widest">
              "El lienzo está vacío por ahora"
            </div>
          )}
        </GalleryGrid>
      )}

      <div className="mt-32">
        <Newsletter />
      </div>
    </main>
  );
}