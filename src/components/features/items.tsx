"use client";
import { useState, useCallback } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState, EmptyState } from "@/components/shared/feedback/StateComponents";

// Hooks y Libs
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/config/design-system';
import { getMensaje } from '@/lib/config/constants';

export default function Inventario() {
  const [selected, setSelected] = useState(null);

  // 1. Fetching con setData para actualizaciones reactivas
  const { 
    data: items, 
    setData: setItems, 
    loading 
  } = useSupabaseData('items', {
    order: { campo: 'created_at', asc: false }
  });

  // 2. Filtros automáticos
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(items, {
    campos: ['categoria'],
    inicial: { categoria: 'TODOS' }
  });

  // 3. Handler de actualización local (Punto #2 del checklist)
  const handleUpdate = useCallback((updatedItem) => {
    // Actualizamos el objeto en el panel de detalle
    setSelected(updatedItem);
    
    // Sincronizamos la lista global de items
    setItems(prev => 
      prev.map(i => i.id === updatedItem.id ? updatedItem : i)
    );
  }, [setItems]);

  const handleSelect = (item) => {
    setSelected(item);
    // Cambiado a smooth para una mejor experiencia de usuario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'items')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      {/* PANEL DE DETALLE */}
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        onUpdate={handleUpdate} 
        tags={[selected?.categoria].filter(Boolean)}
        mostrarMusica={false}
      />

      <GalleryGrid 
        isDetailOpen={!!selected} 
        headerContent={
          <PageHeader titulo="Inventario" subtitulo="Objetos recopilados por Liam">
            <FiltrosMaestros 
              config={{ Categorías: opciones.categoria }}
              filtrosActivos={{ Categorías: filtros.categoria }}
              onChange={(grupo, valor) => {
                // Mantenemos la consistencia con el resto de la app
                actualizarFiltro('categoria', valor);
              }}
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
            <p className={typography.tag + " mb-1"}>
              {item.categoria}
            </p>
            <h3 className={typography.cardTitle}>
              {item.nombre}
            </h3>
          </GalleryItem>
        ))}
        
        {itemsFiltrados.length === 0 && (
          <div className="col-span-full py-20">
            <EmptyState mensaje={getMensaje('EMPTY', 'items')} />
          </div>
        )}
      </GalleryGrid>
    </main>
  );
}