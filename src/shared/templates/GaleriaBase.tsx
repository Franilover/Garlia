"use client";
import { useState } from "react";
import { LayoutGrid, AlignJustify, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { GalleryGrid } from "@/shared/layout/gallery";
import DetalleMaestro from "@/shared/display/detalles";
import FiltrosMaestros from "@/shared/layout/Filtros";
import PageHeader from "@/shared/layout/PageHeader";
import { LoadingState, EmptyState } from "@/shared/feedback/StateComponents";
import { AdminAddButton } from "@/shared/forms/AdminAddButton";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { useFiltrosGenericos } from "@/hooks/features/useFiltros";
import { useAdminItem } from "@/hooks/features/useAdminItem";
import { TABLAS_CONFIG, getMensaje } from "@/lib/config/constants";
import { useIsAdmin } from "@/hooks/auth/useIsAdmin";

interface EntidadPageBaseProps {
  tabla: string;
  titulo: string;
  configFiltros: string[];
  renderCard: (
    item: any,
    onClick: () => void,
    vistaFila: boolean,
    index: number,
    allItems: any[]
  ) => React.ReactNode;
  // --- Nuevas props opcionales ---
  renderModal?: (
    selected: any,
    isCreating: boolean,
    onClose: () => void,
    onUpdate: (data: any) => void
  ) => React.ReactNode;
  mostrarBusqueda?: boolean;
  campoBusqueda?: string; // qué campo del item usar para buscar, default "nombre"
  permitirVistaFila?: boolean;
  // --- Props ya existentes ---
  mostrarMusica?: boolean;
  getCustomTags?: (item: any) => (string | null | undefined)[];
  plantillaNueva?: any;
}

export default function EntidadPageBase({
  tabla,
  titulo,
  configFiltros,
  renderCard,
  renderModal,
  mostrarBusqueda = false,
  campoBusqueda = "nombre",
  permitirVistaFila = false,
  mostrarMusica = false,
  getCustomTags,
  plantillaNueva,
}: EntidadPageBaseProps) {

    const isAdminSession = useIsAdmin();

    const { data, loading, setData } = useSupabaseData(
      isAdminSession !== undefined ? tabla : "__skip__", // espera a saber la sesión
      { 
        order: TABLAS_CONFIG[tabla]?.orden || { campo: "nombre", asc: true },
        isAdmin: isAdminSession 
      }
    );

  const { filtros, opciones, itemsFiltrados, actualizarFiltro, resetearFiltros } =
    useFiltrosGenericos(data, { campos: configFiltros });

  const {
    selected,
    isCreating,
    isAdmin,
    handleUpdate,
    handleSelect,
    handleAddNew,
    handleClose,
  } = useAdminItem(setData, { plantilla: plantillaNueva });

  // --- Estado de búsqueda ---
  const [busqueda, setBusqueda] = useState("");

  // --- Estado de vista ---
  const [vistaGrid, setVistaGrid] = useState(true);

  if (loading) return <LoadingState mensaje={getMensaje("LOADING", tabla as any)} />;

  // Filtro adicional por búsqueda de texto
  const itemsFinales = mostrarBusqueda
    ? itemsFiltrados.filter((item: any) =>
        String(item[campoBusqueda] ?? "")
          .toLowerCase()
          .includes(busqueda.toLowerCase())
      )
    : itemsFiltrados;

  const hayFiltrosActivos =
    Object.values(filtros).some((v) => v !== "todos") || busqueda !== "";

  const vistaFila = permitirVistaFila && !vistaGrid;

  return (
    <main className="min-h-screen bg-bg-main pb-20 overflow-x-hidden">

      {renderModal ? (
        renderModal(selected, isCreating, handleClose, handleUpdate)
      ) : (
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
      )}

      <GalleryGrid
        headerContent={
          <PageHeader titulo={titulo}>
            <div className="flex flex-col gap-4">
              {isAdmin && plantillaNueva && (
                <AdminAddButton onClick={handleAddNew} label={`Añadir ${titulo}`} />
              )}

              {/* BÚSQUEDA */}
              {mostrarBusqueda && (
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder={`Buscar por ${campoBusqueda}...`}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full bg-bg-main border-2 border-primary/10 py-4 pl-12 pr-12 rounded-[1.5rem] text-sm font-black text-primary uppercase outline-none focus:border-primary/30 transition-all placeholder:text-primary/20 placeholder:normal-case placeholder:font-normal"
                  />
                  <AnimatePresence>
                    {busqueda && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setBusqueda("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors p-1"
                      >
                        <X size={16} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <FiltrosMaestros
                config={Object.fromEntries(
                  configFiltros.map((f) => [
                    f === "conFoto" ? "conFoto" : f.charAt(0).toUpperCase() + f.slice(1),
                    opciones[f] || [],
                  ])
                )}
                filtrosActivos={filtros}
                onChange={(grupo, valor) => {
                  const campo =
                    grupo === "conFoto"
                      ? "conFoto"
                      : grupo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  actualizarFiltro(campo, valor);
                }}
              />

              {/* FILA INFERIOR: limpiar filtros + toggle vista */}
              <div className="flex items-center justify-between">
                {hayFiltrosActivos ? (
                  <button
                    onClick={() => { resetearFiltros(); setBusqueda(""); }}
                    className="text-primary/40 hover:text-red-500 transition-colors text-[9px] font-black uppercase tracking-widest flex items-center gap-2 px-4"
                  >
                    <X size={14} /> Limpiar filtros
                  </button>
                ) : (
                  <span />
                )}

                {permitirVistaFila && (
                  <div className="flex items-center gap-1 bg-white-custom border-2 border-primary/5 rounded-full p-1">
                    <button
                      onClick={() => setVistaGrid(true)}
                      className={`p-2 rounded-full transition-all ${vistaGrid ? "bg-primary text-white shadow-md" : "text-primary/40 hover:text-primary"}`}
                      title="Vista cuadrícula"
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      onClick={() => setVistaGrid(false)}
                      className={`p-2 rounded-full transition-all ${!vistaGrid ? "bg-primary text-white shadow-md" : "text-primary/40 hover:text-primary"}`}
                      title="Vista fila"
                    >
                      <AlignJustify size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </PageHeader>
        }
      >
        {itemsFinales.length > 0 ? (
          itemsFinales.map((item: any, index: number) =>
            renderCard(item, () => handleSelect(item), vistaFila, index, itemsFinales)
          )
        ) : (
          <div className="col-span-full py-20">
            <EmptyState mensaje={getMensaje("EMPTY", tabla as any)} />
          </div>
        )}
      </GalleryGrid>
    </main>
  );
}