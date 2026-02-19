"use client";
import { useState, useMemo } from 'react';
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
import { typography } from '@/lib/config/design-system';
import { cn } from "@/lib/utils";

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
  
  const [soloConFoto, setSoloConFoto] = useState(false);

  // Separamos los filtros de base de datos del filtro visual de fotos
  const filtrosDB = configFiltros.filter(f => f !== 'conFoto');

  const { data, loading, setData } = useSupabaseData(
    tabla, 
    { order: TABLAS_CONFIG[tabla]?.orden || { campo: 'nombre', asc: true } }
  );

  const { filtros, opciones, itemsFiltrados, actualizarFiltro } = useFiltrosGenericos(data, {
    campos: filtrosDB
  });

  const { 
    selected, 
    isCreating, 
    isAdmin, 
    handleUpdate, 
    handleSelect, 
    handleAddNew, 
    handleClose 
  } = useAdminItem(setData, { plantilla: plantillaNueva });

  const itemsFinales = useMemo(() => {
    if (!soloConFoto) return itemsFiltrados;
    return itemsFiltrados.filter(item => !!item.img_url && item.img_url !== "");
  }, [itemsFiltrados, soloConFoto]);

  if (loading) return <LoadingState mensaje={getMensaje('LOADING', tabla as any)} />;

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
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
              {isAdmin && plantillaNueva && (
                <AdminAddButton onClick={handleAddNew} label={`Añadir ${titulo}`} />
              )}
              
              {/* Renderizado de filtros de Base de Datos */}
              {filtrosDB.length > 0 && (
                <FiltrosMaestros
                  config={Object.fromEntries(
                    filtrosDB.map(f => [
                      f.charAt(0).toUpperCase() + f.slice(1), 
                      opciones[f] || []
                    ])
                  )}
                  filtrosActivos={Object.fromEntries(
                    filtrosDB.map(f => [
                      f.charAt(0).toUpperCase() + f.slice(1), 
                      filtros[f] || 'todos'
                    ])
                  )}
                  onChange={(grupo, valor) => {
                    const campo = grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    actualizarFiltro(campo, valor);
                  }}
                />
              )}

              {/* Checkbox de Fotos - Se muestra si 'conFoto' está en el array */}
              {configFiltros.includes('conFoto') && (
                <div className="flex items-center gap-3 px-2 py-1 bg-white/5 rounded-lg border border-white/10 self-start">
                  <input 
                    type="checkbox"
                    id="foto-filter"
                    checked={soloConFoto}
                    onChange={(e) => setSoloConFoto(e.target.checked)}
                    className="w-4 h-4 rounded border-accent-gold/40 bg-transparent text-accent-gold focus:ring-accent-gold cursor-pointer"
                  />
                  <label 
                    htmlFor="foto-filter" 
                    className={cn(typography.tag, "cursor-pointer select-none text-xs uppercase tracking-wider opacity-90 hover:opacity-100")}
                  >
                    "Solo mostrar con imagen"
                  </label>
                </div>
              )}
            </div>
          </PageHeader>
        }
      >
        {itemsFinales.length > 0 ? (
          itemsFinales.map((item) => renderCard(item, () => handleSelect(item)))
        ) : (
          <div className="col-span-full py-20">
            <EmptyState mensaje={getMensaje('EMPTY', tabla as any)} />
          </div>
        )}
      </GalleryGrid>
    </main>
  );
}