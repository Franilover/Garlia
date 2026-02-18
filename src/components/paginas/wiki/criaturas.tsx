"use client";
import { useState, useCallback, useEffect } from 'react';
import { GalleryGrid, GalleryItem } from "@/components/shared/display/gallery";
import DetalleMaestro from "@/components/shared/modal/detalles";
import FiltrosMaestros from "@/components/shared/forms/Filtros";
import PageHeader from "@/components/shared/layout/PageHeader";
import { LoadingState } from "@/components/shared/feedback/StateComponents";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Hooks y Libs
import { useSupabaseData } from '@/hooks/data/useSupabaseData';
import { useFiltrosGenericos } from '@/hooks/features/useFiltros';
import { typography } from '@/lib/config/design-system';
import { TABLAS_CONFIG, getMensaje } from '@/lib/config/constants';
import { supabase } from "@/lib/api/client/supabase"; // 👈 agrega este import

export default function Criaturas() {
  const [selected, setSelected] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // 👈 nuevo estado

  // 👇 Verificar sesión al montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session);
    });
  }, []);
  
  // 1. FETCHING
  const { 
    data: criaturas, 
    setData: setCriaturas, 
    loading 
  } = useSupabaseData(
    'criaturas', 
    { order: TABLAS_CONFIG.criaturas.orden }
  );
  
  // 2. FILTROS
  const {
    filtros,
    opciones,
    itemsFiltrados,
    actualizarFiltro
  } = useFiltrosGenericos(criaturas, {
    campos: TABLAS_CONFIG.criaturas.filtros 
  });
  
  // 3. HANDLERS
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
  };
  
  const handleAddNew = () => {
    setIsCreating(true);
    setSelected({
      nombre: "",
      descripcion: "",
      habitat: opciones.habitat?.[0] || "",
      alma: opciones.alma?.[0] || "",
      pensamiento: opciones.pensamiento?.[0] || "",
      imagen_url: ""
    });
  };
  
  if (loading) {
    return <LoadingState mensaje={getMensaje('LOADING', 'criaturas')} />;
  }
  
  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">
      
      {/* DETALLE MAESTRO */}
      <DetalleMaestro 
        isOpen={!!selected || isCreating}
        onClose={() => {
          setSelected(null);
          setIsCreating(false);
        }}
        data={selected}
        onUpdate={handleUpdate}
        isNew={isCreating}
        tags={isCreating ? ["Nueva Criatura"] : [
          selected?.habitat, 
          selected?.alma ? `Alma ${selected.alma}` : null
        ].filter(Boolean)}
        mostrarMusica={false} 
      />
      
      {/* GALLERY GRID */}
      <GalleryGrid 
        headerContent={
          <PageHeader titulo="Bestiario">
            <div className="flex flex-col gap-4">

              {/* Botón Añadir — solo para admins 👇 */}
              {isAdmin && (
                <button 
                  onClick={handleAddNew}
                  className="flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Añadir Criatura</span>
                </button>
              )}
              
              {/* Filtros Dropdown */}
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
          <GalleryItem 
            key={c.id} 
            src={c.imagen_url} 
            onClick={() => handleSelect(c)}
          >
            <p className={cn(typography.tag, "mb-1 opacity-60")}>
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