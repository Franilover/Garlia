"use client";
import { useState, useCallback } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState } from "@/components/shared/feedback/StateComponents";

// Hooks y Libs unificadas
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/config/design-system';
import { TABLAS_CONFIG, getMensaje } from '@/lib/config/constants';

export default function Criaturas() {
  const [selected, setSelected] = useState(null);

  // 1. FETCHING (Punto #7): Usando el hook centralizado con orden de constantes
  const { 
    data: criaturas, 
    setData: setCriaturas, 
    loading 
  } = useSupabaseData(
    'criaturas', 
    { order: TABLAS_CONFIG.criaturas.orden }
  );

  // 2. FILTROS (Punto #3): Lógica automática basada en la configuración de la tabla
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(criaturas, {
    campos: TABLAS_CONFIG.criaturas.filtros 
  });

  // 3. HANDLER DE ACTUALIZACIÓN (Punto #2 y #5): Estabilidad total
  const handleUpdate = useCallback((updatedCriatura) => {
    // Actualizamos el modal para que los cambios se vean reflejados inmediatamente
    setSelected(updatedCriatura);
    
    // Actualización local de la lista para que el grid cambie sin parpadeos de red
    setCriaturas(prev => 
      prev.map(c => c.id === updatedCriatura.id ? updatedCriatura : c)
    );
  }, [setCriaturas]);

  const handleSelect = (c) => {
    setSelected(c);
    // Scroll suave al inicio del detalle para mejorar UX en móvil
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'criaturas')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      {/* PANEL DE DETALLE (Puntos #2, #5) */}
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        onUpdate={handleUpdate}
        tags={[
          selected?.habitat, 
          selected?.alma ? `Alma ${selected.alma}` : null
        ].filter(Boolean)}
        mostrarMusica={false} 
      />

      {/* GRID DE GALERÍA (Punto #4) */}
      <GalleryGrid 
        isDetailOpen={!!selected} 
        headerContent={
          <PageHeader titulo="Bestiario" subtitulo="Descubre criaturas unicas">
            <FiltrosMaestros 
              config={{
                Hábitat: opciones.habitat,
                Pensamiento: opciones.pensamiento,
                Alma: opciones.alma
              }}
              filtrosActivos={{
                Hábitat: filtros.habitat,
                Pensamiento: filtros.pensamiento,
                Alma: filtros.alma
              }}
              onChange={(grupo, valor) => {
                // Normalización de etiquetas para coincidir con campos de DB
                const campo = grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                actualizarFiltro(campo, valor);
              }}
            />
          </PageHeader>
        }
      >
        {itemsFiltrados.map(c => (
          <GalleryItem 
            key={c.id} 
            src={c.imagen_url} 
            onClick={() => handleSelect(c)}
          >
            <p className={typography.tag + " mb-1"}>
              {c.habitat} • {c.alma}
            </p>
            <h3 className={typography.cardTitle}>
              {c.nombre}
            </h3>
          </GalleryItem>
        ))}
      </GalleryGrid>
    </main>
  );
}