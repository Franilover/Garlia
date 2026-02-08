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

  // 1. FETCHING: Ahora traerá el objeto "profundo" (con relaciones/variantes) 
  // siempre que hayas actualizado el archivo personajes.js o el hook useSupabaseData
  const { 
    data: criaturas, 
    setData: setCriaturas, 
    loading 
  } = useSupabaseData(
    'criaturas', 
    { order: TABLAS_CONFIG.criaturas.orden }
  );

  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(criaturas, {
    campos: TABLAS_CONFIG.criaturas.filtros 
  });

  const handleUpdate = useCallback((updatedCriatura) => {
    setSelected(updatedCriatura);
    setCriaturas(prev => 
      prev.map(c => c.id === updatedCriatura.id ? updatedCriatura : c)
    );
  }, [setCriaturas]);

  const handleSelect = (c) => {
    setSelected(c);
    // Nota: window.scrollTo puede ser un poco agresivo al abrir un modal, 
    // pero si lo prefieres para la UX, lo mantenemos.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'criaturas')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      {/* DETALLE MAESTRO: 
          Al pasarle 'selected', y como 'selected' ahora viene de una query 
          que trae relaciones y variantes, el modal se llenará al instante.
      */}
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected} // <-- Este objeto ahora es "pesado" y completo
        onUpdate={handleUpdate}
        tags={[
          selected?.habitat, 
          selected?.alma ? `Alma ${selected.alma}` : null
        ].filter(Boolean)}
        mostrarMusica={false} 
      />

      <GalleryGrid 
        isDetailOpen={!!selected} 
        headerContent={
          <PageHeader titulo="Bestiario">
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