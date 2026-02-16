"use client";
import React, { useState, useMemo } from 'react';
import { 
  useLightbox, 
  LightboxProvider, 
  LightboxVisual 
} from "@/components/shared/modal/lightbox"; 
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import Newsletter from "@/components/features/newsletter";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import { typography, components } from '@/lib/config/design-system';

function DrawingsContent() {
  const { openLightbox } = useLightbox();
  const [filtro, setFiltro] = useState('todos');

  const { data: dibujos, loading, error } = useSupabaseData('dibujos', {
    order: { campo: 'id', asc: false }
  });

  const categorias = ['todos', 'fanart', 'original', 'bocetos'];

  const filtrados = useMemo(() => (
    filtro === 'todos' ? dibujos : dibujos.filter(d => d.categoria === filtro)
  ), [dibujos, filtro]);

  const lbData = useMemo(() => (
    filtrados.map(d => ({ src: d.url_imagen, alt: d.titulo, id: d.id }))
  ), [filtrados]);

  // Cabecera limpia sin comillas literales visibles
  const MiCabecera = (
    <header className="mb-12 text-center px-4 pt-16">
      <h1 className={typography.pageTitle}>Galería</h1>
      <div className={components.dividerThick} />
      
      <div className="mt-12">
        <FiltrosMaestros 
          config={{ categorias: categorias }}
          filtrosActivos={{ categorias: filtro }}
          onChange={(grupo, valor) => setFiltro(valor)}
        />
      </div>
    </header>
  );

  if (error) return (
    <div className={typography.emptyState}>
      Error al conectar con el archivo: {error}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F0F0F0] pb-20 font-sans">
      {loading ? (
        <div className={typography.loading}>
          Sincronizando Archivos...
        </div>
      ) : (
        <GalleryGrid headerContent={MiCabecera}>
          {filtrados.map((dibujo, index) => (
            <GalleryItem
              key={dibujo.id}
              src={dibujo.url_imagen}
              alt={dibujo.titulo}
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
              El lienzo está vacío por ahora
            </div>
          )}
        </GalleryGrid>
      )}

      <div className="mt-32">
        <Newsletter />
      </div>

      <LightboxVisual />
    </main>
  );
}

export default function Drawings() {
  return (
    <LightboxProvider>
      <DrawingsContent />
    </LightboxProvider>
  );
}