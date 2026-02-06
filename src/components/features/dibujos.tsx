"use client";
import React, { useState, useMemo } from 'react';
import { useLightbox } from "@/components/shared/modal/lightbox"; 
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import { useSupabaseData } from '@/hooks/useSupabaseData';
import Newsletter from "@/components/features/newsletter";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
// Importamos el sistema de diseño
import { typography, components, layout } from '@/lib/config/design-system';

export default function Drawings() {
  const { openLightbox } = useLightbox();
  const [filtro, setFiltro] = useState('todos');

  // 1. Usamos el Hook Maestro para la tabla 'dibujos'
  const { data: dibujos, loading, error } = useSupabaseData('dibujos', {
    order: { campo: 'id', asc: false }
  });

  const categorias = ['todos', 'fanart', 'original', 'bocetos'];

  // 2. Filtrado inteligente
  const filtrados = useMemo(() => (
    filtro === 'todos' ? dibujos : dibujos.filter(d => d.categoria === filtro)
  ), [dibujos, filtro]);

  // 3. Preparación de datos para el Lightbox (Pasamos el nombre de la tabla)
  const lbData = useMemo(() => (
    filtrados.map(d => ({ src: d.url_imagen, alt: d.titulo, id: d.id }))
  ), [filtrados]);

  // --- CABECERA (Usando el Sistema de Diseño) ---
  const MiCabecera = (
    <header className="mb-12 text-center px-4 pt-16">
      <h1 className={typography.pageTitle}>Galería</h1>
      <div className={components.dividerThick} />
      
      <div className="mt-12">
        <FiltrosMaestros 
          config={{ categorias: categorias }} // Corregido: 'categooÃ­as' -> 'categorias'
          filtrosActivos={{ categorias: filtro }}
          onChange={(grupo, valor) => setFiltro(valor)}
        />
      </div>
    </header>
  );

  if (error) return (
    <div className={typography.emptyState}>
      "Error al conectar con el archivo: {error}"
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F0F0F0] pb-20 font-sans">
      
      {loading ? (
        <div className={typography.loading}>
          "Sincronizando Archivos..."
        </div>
      ) : (
        <GalleryGrid headerContent={MiCabecera}>
          {filtrados.map((dibujo, index) => (
            <GalleryItem
              key={dibujo.id}
              src={dibujo.url_imagen}
              alt={dibujo.titulo}
              // Le decimos al Lightbox que estamos en la tabla 'dibujos'
              onClick={() => openLightbox(index, lbData, 'dibujos')}
            >
              <p className={typography.tag}>
                {dibujo.categoria}
              </p>
              <h3 className={typography.cardTitle}>
                {dibujo.titulo}
              </h3>
            </GalleryItem>
          ))}
          
          {filtrados.length === 0 && (
            <div className={`col-span-full ${typography.emptyState}`}>
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