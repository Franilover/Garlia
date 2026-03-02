"use client";
import { GalleryGrid } from "@/shared/layout/gallery";
import DetalleMaestro from "@/shared/display/detalles";
import FiltrosMaestros from "@/shared/layout/Filtros";
import PageHeader from "@/shared/layout/PageHeader";
import { LoadingState, EmptyState } from "@/shared/feedback/StateComponents";
import { AdminAddButton } from "@/shared/forms/AdminAddButton";
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/features/useFiltros';
import { useAdminItem } from '@/hooks/forms/useAdminItem';
import { TABLAS_CONFIG, getMensaje } from '@/lib/config/constants';

interface EntidadPageBaseProps {
  tabla: string;
  titulo: string;
  configFiltros: string[];
  renderCard: (item: any, onClick: () => void, index?: number, allItems?: any[]) => React.ReactNode;
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
  
  // 1. Fetching de datos desde Supabase
  const { data, loading, setData } = useSupabaseData(
    tabla, 
    { order: TABLAS_CONFIG[tabla]?.orden || { campo: 'nombre', asc: true } }
  );

  // 2. Lógica de filtros (Ahora incluye 'conFoto' si se pasa en configFiltros)
  const { filtros, opciones, itemsFiltrados, actualizarFiltro } = useFiltrosGenericos(data, {
    campos: configFiltros
  });

  // 3. Lógica de Administración
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
              {/* Botón de Administración */}
              {isAdmin && plantillaNueva && (
                <AdminAddButton onClick={handleAddNew} label={`Añadir ${titulo}`} />
              )}
              
              {/* Componente de Filtros Unificado */}
              <FiltrosMaestros
                config={Object.fromEntries(
                  configFiltros.map(f => [
                    // Si es conFoto lo dejamos tal cual para el componente Filtros, si no, Capitalizamos
                    f === 'conFoto' ? 'conFoto' : f.charAt(0).toUpperCase() + f.slice(1), 
                    opciones[f] || []
                  ])
                )}
                filtrosActivos={filtros}
                onChange={(grupo, valor) => {
                  // Normalizamos el nombre del grupo para el hook
                  const campo = grupo === 'conFoto' 
                    ? 'conFoto' 
                    : grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  actualizarFiltro(campo, valor);
                }}
              />
            </div>
          </PageHeader>
        }
      >
        {/* Renderizado de Cards Filtradas */}
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