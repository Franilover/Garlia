"use client";
import { useState, useCallback } from 'react';
import { GalleryGrid } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState, EmptyState } from "@/components/shared/feedback/StateComponents";
import { AdminAddButton } from "@/components/shared/ui/AdminAddButton";
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/features/useFiltros';
import { useAdminItem } from '@/hooks/features/useAdminItem';
import { TABLAS_CONFIG, getMensaje } from '@/lib/config/constants';

interface EntidadPageBaseProps {
  tabla: string;
  titulo: string;
  configFiltros: string[];
  renderCard: (item: any, onClick: () => void) => React.ReactNode;
  mostrarMusica?: boolean;
  getCustomTags?: (item: any) => (string | null | undefined)[];
  plantillaNueva?: any; 
}

export default function EntidadPageBase({
  tabla,
  titulo,
  configFiltros,
  renderCard,
  mostrarMusica = false,
  getCustomTags,
  plantillaNueva
}: EntidadPageBaseProps) {
  
  // 1. Fetching de datos
  const { data, loading, setData } = useSupabaseData(
    tabla, 
    { order: TABLAS_CONFIG[tabla]?.orden || { campo: 'nombre', asc: true } }
  );

  // 2. Lógica de filtros
  const { filtros, opciones, itemsFiltrados, actualizarFiltro } = useFiltrosGenericos(data, {
    campos: configFiltros
  });

  // 3. Lógica de Administración (usando tu hook existente)
  const { 
    selected, 
    isCreating, 
    isAdmin, 
    handleUpdate, 
    handleSelect, 
    handleAddNew, 
    handleClose 
  } = useAdminItem(setData, { plantilla: plantillaNueva });

  if (loading) return <LoadingState mensaje={getMensaje('LOADING', tabla as any)} />;

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      {/* MODAL DE DETALLES */}
      <DetalleMaestro
        isOpen={!!selected || isCreating}
        onClose={handleClose}
        data={selected}
        onUpdate={handleUpdate}
        isNew={isCreating}
        tags={
          isCreating 
            ? ["Nueva Entrada"] 
            : getCustomTags 
              ? getCustomTags(selected) 
              : []
        }
        mostrarMusica={mostrarMusica}
      />

      <GalleryGrid
        headerContent={
          <PageHeader titulo={titulo}>
            <div className="flex flex-col gap-4">
              {/* Solo muestra el botón si el usuario es Admin y hay una plantilla */}
              {isAdmin && plantillaNueva && (
                <AdminAddButton onClick={handleAddNew} label={`Añadir ${titulo}`} />
              )}
              
              <FiltrosMaestros
                config={Object.fromEntries(
                  configFiltros.map(f => [
                    f.charAt(0).toUpperCase() + f.slice(1), 
                    opciones[f] || []
                  ])
                )}
                filtrosActivos={Object.fromEntries(
                  configFiltros.map(f => [
                    f.charAt(0).toUpperCase() + f.slice(1), 
                    filtros[f] || 'todos'
                  ])
                )}
                onChange={(grupo, valor) => {
                  const campo = grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  actualizarFiltro(campo, valor);
                }}
              />
            </div>
          </PageHeader>
        }
      >
        {itemsFiltrados.length > 0 ? (
          itemsFiltrados.map((item) => renderCard(item, () => handleSelect(item)))
        ) : (
          <div className="col-span-full py-20">
            <EmptyState mensaje={getMensaje('EMPTY', tabla as any)} />
          </div>
        )}
      </GalleryGrid>
    </main>
  );
}