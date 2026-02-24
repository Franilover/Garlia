"use client";
import { useMemo } from 'react';
import { 
  useLightbox,
  LightboxProvider,
  LightboxVisual
} from "@/components/shared/modal/lightbox";
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState, EmptyState } from "@/components/shared/feedback/StateComponents";
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/features/useFiltros';
import { CATEGORIAS, getMensaje } from '@/lib/config/constants';

function DiarioContent() {
  const { openLightbox } = useLightbox();
  
  const { data: entradas, loading, error } = useSupabaseData('diario_fotos', {
    order: { campo: 'id', asc: false }
  });
  
  const { filtros, opciones, itemsFiltrados, actualizarFiltro } = useFiltrosGenericos(entradas, {
    campos: ['categoria']
  });
  
  const lbData = useMemo(() => 
    itemsFiltrados.map(e => ({ 
      src: e.url_imagen, 
      alt: e.fecha,
      id: e.id 
    })), 
    [itemsFiltrados]
  );
  
  if (error) return (
    <main className="min-h-screen flex items-center justify-center bg-bg-main">
      <p className="text-red-500 font-black uppercase text-xs tracking-widest">
        Error de Sincronización: {error}
      </p>
    </main>
  );
  if (loading) return <LoadingState mensaje={getMensaje('LOADING', 'fotos')} />;
  
  return (
    <main className="min-h-screen bg-bg-main py-10 px-4 md:px-8">
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
          />
        ))}
        
        {itemsFiltrados.length === 0 && (
          <div className="col-span-full py-10">
            <EmptyState mensaje={getMensaje('EMPTY', 'fotos')} />
          </div>
        )}
      </GalleryGrid>
      <LightboxVisual />
    </main>
  );
}

export default function Diario() {
  return (
    <LightboxProvider>
      <DiarioContent />
    </LightboxProvider>
  );
}