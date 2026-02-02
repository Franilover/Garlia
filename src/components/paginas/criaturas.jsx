"use client";
import { useState } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import DetalleMaestro from "@/components/recursos/boxes/detalles";
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";
import PageHeader from "@/components/recursos/common/PageHeader";
import { LoadingState } from "@/components/recursos/common/StateComponents";

// Hooks y Libs unificadas
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/design-system';
import { TABLAS_CONFIG, getMensaje } from '@/lib/constants';

export default function Criaturas() {
  const [selected, setSelected] = useState(null);

  // 1. Fetching con caché y lógica centralizada
  const { data: criaturas, loading } = useSupabaseData(
    'criaturas', 
    { order: TABLAS_CONFIG.criaturas.orden }
  );

  // 2. Lógica de filtros automática (Genera opciones y filtra los items)
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(criaturas, {
    campos: TABLAS_CONFIG.criaturas.filtros // ['habitat', 'pensamiento', 'alma']
  });

  const handleSelect = (c) => {
    setSelected(c);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'criaturas')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      <DetalleMaestro 
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
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
                // Mapeo dinámico: 'Hábitat' -> 'habitat'
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