"use client";
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { AdminAddButton } from "@/components/shared/ui/AdminAddButton"; // 👈
import { cn } from "@/lib/utils";
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/features/useFiltros';
import { useAdminItem } from '@/hooks/features/useAdminItem';
import { typography } from '@/lib/config/design-system';
import { TABLAS_CONFIG, getMensaje } from '@/lib/config/constants';

export default function Criaturas() {
  const { data: criaturas, setData: setCriaturas, loading } = useSupabaseData(
    'criaturas',
    { order: TABLAS_CONFIG.criaturas.orden }
  );

  const { filtros, opciones, itemsFiltrados, actualizarFiltro } = useFiltrosGenericos(criaturas, {
    campos: TABLAS_CONFIG.criaturas.filtros
  });

  const { selected, isCreating, isAdmin, handleUpdate, handleSelect, handleAddNew, handleClose } = useAdminItem(
    setCriaturas,
    {
      plantilla: {
        nombre: "",
        descripcion: "",
        habitat: opciones.habitat?.[0] || "",
        alma: opciones.alma?.[0] || "",
        pensamiento: opciones.pensamiento?.[0] || "",
        imagen_url: ""
      }
    }
  );

  if (loading) return <LoadingState mensaje={getMensaje('LOADING', 'criaturas')} />;

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      <DetalleMaestro
        isOpen={!!selected || isCreating}
        onClose={handleClose}
        data={selected}
        onUpdate={handleUpdate}
        isNew={isCreating}
        tags={isCreating ? ["Nueva Criatura"] : [
          selected?.habitat,
          selected?.alma ? `Alma ${selected.alma}` : null
        ].filter(Boolean)}
        mostrarMusica={false}
      />

      <GalleryGrid
        headerContent={
          <PageHeader titulo="Bestiario">
            <div className="flex flex-col gap-4">
              {isAdmin && (
                <AdminAddButton onClick={handleAddNew} label="Añadir Criatura" /> // 👈
              )}
              <FiltrosMaestros
                config={{
                  Hábitat: opciones.habitat || [],
                  Pensamiento: opciones.pensamiento || [],
                  Alma: opciones.alma || []
                }}
                filtrosActivos={{
                  Hábitat: filtros.habitat || 'todos',
                  Pensamiento: filtros.pensamiento || 'todos',
                  Alma: filtros.alma || 'todos'
                }}
                onChange={(grupo, valor) => {
                  const campo = grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  actualizarFiltro(campo, valor);
                }}
              />
            </div>
          </PageHeader>
        }
      >
        {itemsFiltrados.map(c => (
          <GalleryItem key={c.id} src={c.imagen_url} onClick={() => handleSelect(c)}>
            <p className={cn(typography.tag, "mb-1 opacity-60")}>{c.habitat} • {c.alma}</p>
            <h3 className={typography.cardTitle}>{c.nombre}</h3>
          </GalleryItem>
        ))}
      </GalleryGrid>
    </main>
  );
}