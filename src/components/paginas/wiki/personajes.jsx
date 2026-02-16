"use client";
import { useState, useCallback } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { cn } from "@/lib/utils";

// Hooks y Libs
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/features/useFiltros.tsx';
import { typography } from '@/lib/config/design-system';
import { TABLAS_CONFIG, getMensaje } from '@/lib/config/constants';

export default function PersonajesGrid() {
  const [selected, setSelected] = useState(null);
  
  // 1. Fetching centralizado
  const { 
    data: personajes, 
    loading, 
    setData: setPersonajes 
  } = useSupabaseData(
    'personajes',
    { order: TABLAS_CONFIG.personajes.orden }
  );
  
  // 2. Lógica de filtros automática
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(personajes, {
    campos: TABLAS_CONFIG.personajes.filtros
  });
  
  // 3. Handler de selección con scroll suave
  const handleSelect = (p) => {
    setSelected(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 4. Handler para actualización (Optimizado con useCallback)
  const handleUpdate = useCallback((updatedPersonaje) => {
    // Actualiza el modal actual
    setSelected(updatedPersonaje);
    
    // Actualiza la lista sin hacer fetch de nuevo
    setPersonajes(prev => 
      prev.map(p => p.id === updatedPersonaje.id ? updatedPersonaje : p)
    );
  }, [setPersonajes]);
  
  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'personajes')} />;
  }
  
  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      {/* PANEL DE DETALLES */}
      <DetalleMaestro
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        onUpdate={handleUpdate}
        tags={selected ? [selected.reino, selected.especie] : []}
        mostrarMusica={true}
      />
      
      <GalleryGrid
        isDetailOpen={!!selected}
        headerContent={
          <PageHeader titulo="Personajes">
            <FiltrosMaestros
              config={{
                Reino: opciones.reino || [],
                Especie: opciones.especie || []
              }}
              filtrosActivos={{
                Reino: filtros.reino || 'todos',
                Especie: filtros.especie || 'todos'
              }}
              onChange={(grupo, valor) => {
                // Normalización automática: "Reino" -> "reino"
                const campo = grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                actualizarFiltro(campo, valor);
              }}
            />
          </PageHeader>
        }
      >
        {itemsFiltrados
          .filter(p => p.img_url && p.img_url.trim() !== "")
          .map(p => (
            <GalleryItem
              key={p.id}
              src={p.img_url}
              color={p.color_hex}
              onClick={() => handleSelect(p)}
            >
              <p className={cn(typography.tag, "mb-1")}>
                {p.reino} • {p.especie}
              </p>
              <h3 className={typography.cardTitle}>
                {p.nombre}
              </h3>
            </GalleryItem>
          ))}
      </GalleryGrid>
    </main>
  );
}