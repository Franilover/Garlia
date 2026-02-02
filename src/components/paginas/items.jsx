"use client";
import { useState } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import DetalleMaestro from "@/components/recursos/boxes/detalles";
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";
import PageHeader from "@/components/recursos/common/PageHeader";
import { LoadingState, EmptyState } from "@/components/recursos/common/StateComponents";

// Hooks y Libs
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/design-system';
import { getMensaje } from '@/lib/constants';

export default function Inventario() {
  const [selected, setSelected] = useState(null);

  // 1. Fetching (Ordenado por fecha de creación como tenías antes)
  const { data: items, loading } = useSupabaseData('items', {
    order: { campo: 'created_at', asc: false }
  });

  // 2. Filtros (Extrae automáticamente las categorías de la columna 'categoria')
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(items, {
    campos: ['categoria'],
    inicial: { categoria: 'TODOS' }
  });

  const handleSelect = (item) => {
    setSelected(item);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'items')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main pb-20">
      
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        tags={[selected?.categoria]}
        mostrarMusica={false}
      />

      <GalleryGrid 
        isDetailOpen={!!selected} 
        headerContent={
          <PageHeader titulo="Inventario">
            <FiltrosMaestros 
              // Usamos las opciones generadas automáticamente por el Hook
              config={{ Categorías: opciones.categoria }}
              filtrosActivos={{ Categorías: filtros.categoria }}
              onChange={(grupo, valor) => actualizarFiltro('categoria', valor)}
            />
          </PageHeader>
        }
      >
        {itemsFiltrados.map(item => (
          <GalleryItem 
            key={item.id} 
            src={item.imagen_url} 
            contain={true} // Mantenemos el ajuste para items
            onClick={() => handleSelect(item)}
          >
            <p className={typography.tag + " mb-1"}>
              {item.categoria}
            </p>
            <h3 className={typography.cardTitle}>
              {item.nombre}
            </h3>
          </GalleryItem>
        ))}
        
        {itemsFiltrados.length === 0 && (
          <EmptyState mensaje={getMensaje('EMPTY', 'items')} />
        )}
      </GalleryGrid>
    </main>
  );
}