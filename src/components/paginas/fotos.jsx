"use client";
import { useMemo } from 'react';
import { useLightbox } from "@/components/recursos/boxes/lightbox"; 
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";
import PageHeader from "@/components/recursos/common/PageHeader";
import { LoadingState, EmptyState } from "@/components/recursos/common/StateComponents";

// Hooks y Libs
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/design-system';
import { CATEGORIAS, getMensaje } from '@/lib/constants';

export default function Diario() {
  const { openLightbox } = useLightbox();

  // 1. Fetching de fotos (Usando el hook unificado)
  const { data: entradas, loading } = useSupabaseData('diario_fotos', {
    order: { campo: 'id', asc: false }
  });

  const {
    filtros,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(entradas, {
    campos: ['categoria'],
    inicial: { categoria: 'todos' }
  });

  // 3. Preparar data para el Lightbox basada en los items filtrados
  const lbData = useMemo(() => 
    itemsFiltrados.map(e => ({ src: e.url_imagen, alt: e.fecha })), 
    [itemsFiltrados]
  );

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'fotos')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main py-10 px-4 md:px-8">
      
      <GalleryGrid 
        headerContent={
          <PageHeader titulo="Diario">
            <FiltrosMaestros 
              config={{ Categorías: CATEGORIAS.FOTOS }}
              filtrosActivos={{ Categorías: filtros.categoria }}
              onChange={(grupo, valor) => actualizarFiltro('categoria', valor)}
            />
          </PageHeader>
        }
      >
        {itemsFiltrados.map((e, i) => (
          <GalleryItem 
            key={e.id} 
            src={e.url_imagen} 
            onClick={() => openLightbox(i, lbData)}
          >
            <p className={typography.tag + " mb-1"}>
              {e.categoria}
            </p>
            <h3 className={typography.cardTitle}>
              {e.fecha}
            </h3>
          </GalleryItem>
        ))}
        
        {itemsFiltrados.length === 0 && (
          <EmptyState mensaje={getMensaje('EMPTY', 'fotos')} />
        )}
      </GalleryGrid>
    </main>
  );
}