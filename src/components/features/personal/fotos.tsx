"use client";
import { useMemo } from 'react';
import { useLightbox } from "@/components/shared/modal/lightbox";
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState, EmptyState } from "@/components/shared/feedback/StateComponents";

// Hooks y Libs
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/config/design-system';
import { CATEGORIAS, getMensaje } from '@/lib/config/constants';

export default function Diario() {
  const { openLightbox } = useLightbox();

  // 1. Fetching de fotos de la tabla 'diario_fotos'
  const { data: entradas, loading, error } = useSupabaseData('diario_fotos', {
    order: { campo: 'id', asc: false }
  });

  // 2. Lógica de filtros
  const {
    filtros,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(entradas, {
    campos: ['categoria'],
    inicial: { categoria: 'todos' }
  });

  // 3. Preparar data para el Lightbox
  const lbData = useMemo(() => 
    itemsFiltrados.map(e => ({ 
      src: e.url_imagen, 
      alt: e.fecha,
      id: e.id 
    })), 
    [itemsFiltrados]
  );

  // Manejo de Error sin caracteres extraños ni comillas
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F0F0F0]">
        <p className="text-red-500 font-black uppercase text-xs tracking-widest">
          Error de Sincronización: {error}
        </p>
      </main>
    );
  }

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'fotos')} />;
  }

  return (
    <main className="min-h-screen bg-[#F0F0F0] py-10 px-4 md:px-8">
      
      <GalleryGrid 
        headerContent={
          <PageHeader titulo="Diario">
            <FiltrosMaestros 
              config={{ Categorias: CATEGORIAS.FOTOS }}
              filtrosActivos={{ Categorias: filtros.categoria }}
              onChange={(grupo, valor) => actualizarFiltro('categoria', valor)}
            />
          </PageHeader>
        }
      >
        {itemsFiltrados.map((e, i) => (
          <GalleryItem 
            key={e.id} 
            src={e.url_imagen} 
            onClick={() => openLightbox(i, lbData, 'diario_fotos')}
          >
            <p className={`${typography.tag} mb-1 opacity-60`}>
              {e.categoria}
            </p>
            <h3 className={typography.cardTitle}>
              {e.fecha}
            </h3>
          </GalleryItem>
        ))}
        
        {itemsFiltrados.length === 0 && (
          <div className="col-span-full py-10">
            <EmptyState mensaje={getMensaje('EMPTY', 'fotos')} />
          </div>
        )}
      </GalleryGrid>
    </main>
  );
}