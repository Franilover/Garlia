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

  // 1. Fetching de fotos (Sincronizado con el Punto #13)
  // Ahora manejamos también el 'error' por si falla la conexión
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
    itemsFiltrados.map(e => ({ src: e.url_imagen, alt: e.fecha })), 
    [itemsFiltrados]
  );

  // Manejo de Error (Nuevo)
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg-main">
        <p className="text-red-500 font-black uppercase text-xs tracking-widest">
          "Error de Sincronización: {error}"
        </p>
      </main>
    );
  }

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