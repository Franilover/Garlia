"use client";
import { useState } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/recursos/display/gallery";
import DetalleMaestro from "@/components/recursos/boxes/detalles";
import FiltrosMaestros from "@/components/recursos/boxes/Filtros";
import PageHeader from "@/components/recursos/common/PageHeader";
import { LoadingState } from "@/components/recursos/common/StateComponents";
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/design-system';
import { TABLAS_CONFIG, getMensaje } from '@/lib/constants';

export default function PersonajesGrid() {
  const [selected, setSelected] = useState(null);
  
  // 1. Usamos la configuración centralizada para el Fetch
  const { data: personajes, loading, setData: setPersonajes } = useSupabaseData(
    'personajes',
    { order: TABLAS_CONFIG.personajes.orden }
  );
  
  // 2. Usamos la configuración para los filtros
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(personajes, {
    campos: TABLAS_CONFIG.personajes.filtros
  });

  const handleSelect = (p) => {
    setSelected(p);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // ← NUEVO: Handler para actualizar cuando se edita
  const handleUpdate = (updatedPersonaje) => {
    // Actualiza el personaje seleccionado
    setSelected(updatedPersonaje);
    
    // Actualiza la lista completa de personajes
    setPersonajes(prevPersonajes => 
      prevPersonajes.map(p => 
        p.id === updatedPersonaje.id ? updatedPersonaje : p
      )
    );
  };

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'personajes')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main py-10 px-4 md:px-8">
      <DetalleMaestro
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        data={selected}
        tags={selected ? [selected.reino, selected.especie] : []}
        mostrarMusica={true}
        onUpdate={handleUpdate} // ← AGREGADO
      />

      <GalleryGrid
        isDetailOpen={!!selected}
        headerContent={
          <PageHeader titulo="Personajes">
            <FiltrosMaestros
              config={{
                Reinos: opciones.reino || ['todos'],
                Especies: opciones.especie || ['todos']
              }}
              filtrosActivos={{
                Reinos: filtros.reino,
                Especies: filtros.especie
              }}
              onChange={(grupo, valor) => {
                const mapaCampos = { Reinos: 'reino', Especies: 'especie' };
                actualizarFiltro(mapaCampos[grupo], valor);
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
              <p className={typography.tag + " mb-1"}>
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