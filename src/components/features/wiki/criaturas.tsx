"use client";
import { useState, useCallback } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { Plus } from "lucide-react"; // Asumiendo que usas lucide para iconos

// Hooks y Libs unificadas
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/useFiltrosGenericos';
import { typography } from '@/lib/config/design-system';
import { TABLAS_CONFIG, getMensaje } from '@/lib/config/constants';

export default function Criaturas() {
  const [selected, setSelected] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // 1. FETCHING
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

  // Manejador para actualizar o añadir nuevas criaturas a la lista local
  const handleUpdate = useCallback((newData) => {
    if (isCreating) {
      setCriaturas(prev => [newData, ...prev]);
      setIsCreating(false);
    } else {
      setCriaturas(prev => 
        prev.map(c => c.id === newData.id ? newData : c)
      );
    }
    setSelected(newData);
  }, [isCreating, setCriaturas]);

  const handleSelect = (c) => {
    setIsCreating(false);
    setSelected(c);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNew = () => {
    setIsCreating(true);
    setSelected({
      nombre: "",
      descripcion: "",
      habitat: opciones.habitat[0] || "",
      alma: opciones.alma[0] || "",
      pensamiento: opciones.pensamiento[0] || "",
      imagen_url: ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'criaturas')} />;
  }

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      {/* DETALLE MAESTRO: 
          Ahora 'data' puede ser un objeto vacío para creación o uno existente para edición
      */}
      <DetalleMaestro 
        isOpen={!!selected || isCreating}
        onClose={() => {
          setSelected(null);
          setIsCreating(false);
        }}
        data={selected}
        onUpdate={handleUpdate}
        isNew={isCreating} // Prop útil si el modal necesita cambiar el texto del botón de "Guardar"
        tags={isCreating ? ["Nueva Criatura"] : [
          selected?.habitat, 
          selected?.alma ? `Alma ${selected.alma}` : null
        ].filter(Boolean)}
        mostrarMusica={false} 
      />

      <GalleryGrid 
        isDetailOpen={!!selected || isCreating} 
        headerContent={
          <PageHeader titulo="Bestiario">
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleAddNew}
                className="flex items-center justify-center gap-2 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Plus size={20} />
                <span>Añadir Criatura</span>
              </button>

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
            </div>
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