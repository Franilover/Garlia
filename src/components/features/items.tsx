"use client";
import { useState, useCallback } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState, EmptyState } from "@/components/shared/feedback/StateComponents";

// Hooks y Libs unificadas
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/config/design-system';
import { getMensaje } from '@/lib/config/constants';

export default function Inventario() {
  const [selected, setSelected] = useState(null);

  // 1. FETCHING: Sincronizado con tu config global
  const { 
    data: items, 
    setData: setItems, 
    loading 
  } = useSupabaseData('items', {
    order: { campo: 'nombre', asc: true } // O el orden que prefieras
  });

  // 2. FILTROS: Usando la lógica genérica
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(items, {
    campos: ['categoria'],
    inicial: { categoria: 'Todos' }
  });

  const handleUpdate = useCallback((updatedItem) => {
    setSelected(updatedItem);
    setItems(prev => 
      prev.map(i => i.id === updatedItem.id ? updatedItem : i)
    );
  }, [setItems]);

  const handleSelect = (item) => {
    setSelected(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <LoadingState mensaje={getMensaje('LOADING', 'items')} />;

  return (
    // CAMBIO: bg-bg-main para la estética unificada
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        onUpdate={handleUpdate} 
        tags={[
          selected?.categoria,
          selected?.rareza // Si tienes rareza en la DB, aparecerá como tag
        ].filter(Boolean)}
        mostrarMusica={false}
      />

      <GalleryGrid 
        isDetailOpen={!!selected} 
        headerContent={
          <PageHeader titulo="Almacén de Objetos">
            <FiltrosMaestros 
              opciones={opciones.categoria} 
              filtroActivo={filtros.categoria}
              onChange={(_, valor) => actualizarFiltro('categoria', valor)}
            />
          </PageHeader>
        }
      >
        {itemsFiltrados.map(item => (
          <GalleryItem 
            key={item.id} 
            src={item.imagen_url} 
            contain={true} 
            onClick={() => handleSelect(item)}
          >
            {/* CAMBIO: Usando typography.tag y typography.cardTitle para consistencia */}
            <p className={typography.tag + " mb-1"}>
              {item.categoria}
            </p>
            <h3 className={typography.cardTitle}>
              {item.nombre}
            </h3>
          </GalleryItem>
        ))}
        
        {itemsFiltrados.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <EmptyState mensaje={getMensaje('EMPTY', 'items')} />
          </div>
        )}
      </GalleryGrid>
    </main>
  );
}