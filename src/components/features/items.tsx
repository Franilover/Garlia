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

  // 1. Fetching de datos (Tabla 'items')
  const { 
    data: items, 
    setData: setItems, 
    loading 
  } = useSupabaseData('items', {
    order: { campo: 'created_at', asc: false }
  });

  // 2. Lógica de filtros
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(items, {
    campos: ['categoria'],
    inicial: { categoria: 'Todos' }
  });

  // 3. Manejadores de estado
  const handleUpdate = useCallback((updatedItem) => {
    setSelected(updatedItem);
    setItems(prev => 
      prev.map(i => i.id === updatedItem.id ? updatedItem : i)
    );
  }, [setItems]);

  const handleSelect = (item) => {
    setSelected(item);
    // Scroll suave al inicio para ver el detalle si es necesario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <LoadingState mensaje={getMensaje('LOADING', 'items')} />;

  return (
    <main className="min-h-screen bg-white pb-20 overflow-x-hidden">
      
      {/* DETALLE DEL ITEM */}
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        onUpdate={handleUpdate} 
        tags={[selected?.categoria].filter(Boolean)}
        mostrarMusica={false} // El inventario usualmente no lleva música
      />

      <GalleryGrid 
        isDetailOpen={!!selected} 
        headerContent={
          <PageHeader titulo="Inventario">
            {/* CORRECCIÓN AQUÍ: Agregamos el "_" para saltar el nombre del grupo */}
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
            contain={true} // Los items suelen verse mejor sin recortar
            onClick={() => handleSelect(item)}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 mb-1 italic">
              {item.categoria}
            </p>
            <h3 className="text-sm font-bold text-slate-800 uppercase italic leading-tight">
              {item.nombre}
            </h3>
          </GalleryItem>
        ))}
        
        {/* ESTADO VACÍO */}
        {itemsFiltrados.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <EmptyState mensaje={getMensaje('EMPTY', 'items')} />
          </div>
        )}
      </GalleryGrid>
    </main>
  );
}