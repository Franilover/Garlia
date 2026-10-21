"use client";

/**
 * HabitatEditor
 * ───────────────────────────────────────────────────────────────────────────
 * Vista del panel flotante global (kind "habitat") para un HÁBITAT. Mismo
 * contrato que el resto de los editores de entidad: publica los controles
 * de la barra superior con `usePublishHeaderControls` y el contenedor
 * (PanelFlotanteGlobal) los dibuja — así hay UNA sola barra, no la cabecera
 * propia que traía el popover.
 *
 * SOLO LECTURA a propósito: el hábitat sale de la vista canónica
 * v_habitats_ecosistemas_v1 y en la app no se renombra ni se elimina
 * (lo único editable es qué criaturas/organismos están presentes, y eso lo
 * gestiona el cuerpo — HabitatPopoverContent — sobre las tablas de
 * presencia). Por eso no se publican onChangeNombre / onGuardar /
 * onEliminar: el contenedor muestra el nombre como texto y omite los
 * botones Guardar/Eliminar en vez de mostrar acciones que no hacen nada.
 *
 * Resuelve el hábitat por id contra useMapaEcologico() (vista, no tabla
 * sincronizada), así el llamador solo necesita pasar `habitatId`.
 */

import { Layers } from "lucide-react";

import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";

import { HabitatPopoverContent } from "./HabitatPopoverContent";
import { useMapaEcologico, type HabitatEcologico } from "./useMapaEcologico";
import { BreadcrumbJerarquia } from "./BreadcrumbJerarquia";
import { useHabitatJerarquia } from "./useHabitatJerarquia";

/** Texto corto bajo el nombre: "Tipo · dentro de X · Bioma › Ecosistema". */
function subtituloDe(h: HabitatEcologico): string {
  const partes: string[] = [h.tipo_habitat_nombre ?? "Hábitat"];
  if (h.habitat_padre) partes.push(`dentro de ${h.habitat_padre}`);
  const ruta = [h.bioma, h.ecosistema].filter(Boolean).join(" › ");
  if (ruta) partes.push(ruta);
  return partes.join(" · ");
}

export function HabitatEditor({
  habitatId,
  onHeaderControlsChange,
}: {
  habitatId: string;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const abrirPanel = usePanelFlotante((s) => s.abrir);
  const cerrarPanel = usePanelFlotante((s) => s.cerrar);
  const invalidarMapaEcologico = usePanelFlotante((s) => s.invalidarMapaEcologico);
  const { habitats, refrescar } = useMapaEcologico();

  const jerarquia = useHabitatJerarquia(habitatId);

  const habitat = habitats.find((h) => h.habitat_id === habitatId) ?? null;

  // Hooks siempre incondicionales: si el hábitat aún no cargó, se publica
  // un header vacío y se devuelve null más abajo.
  usePublishHeaderControls(
    {
      IconoFallback: Layers,
      nombre: habitat?.habitat ?? "",
      placeholderNombre: "Hábitat",
      subtitulo: habitat ? subtituloDe(habitat) : undefined,
      status: "idle",
      // Sin onChangeNombre / onGuardar / onEliminar → solo lectura.
    },
    onHeaderControlsChange,
  );

  if (!habitat) return null;

  return (
    <div className="p-4 flex-1 min-h-0 flex flex-col">
      {/* ── Breadcrumb jerarquía completa ──────────────────────────────────── */}
      <div className="mb-3">
        <BreadcrumbJerarquia
          niveles={[
            {
              label: "Planeta",
              activo: false,
              items: jerarquia.planetas,
              loading: jerarquia.loading,
              onNavegar: (id) => abrirPanel("planeta", id),
            },
            {
              label: "Bioma",
              activo: false,
              items: jerarquia.biomas,
              loading: jerarquia.loading,
              onNavegar: (id) => abrirPanel("bioma", id),
            },
            {
              label: "Ecosistema",
              activo: false,
              items: jerarquia.ecosistemas,
              loading: jerarquia.loading,
              onNavegar: (id) => abrirPanel("ecosistema", id),
            },
            { label: "Hábitat", activo: true },
            {
              label: "Criatura",
              activo: false,
              items: jerarquia.criaturas,
              loading: jerarquia.loading,
              onNavegar: (id) => abrirPanel("criatura", id),
            },
          ]}
        />
      </div>
      <HabitatPopoverContent
        habitat={habitat}
        onClose={cerrarPanel}
        onCambio={() => {
          // Refresca la copia local Y avisa a la vista dueña del mapa
          // (EntidadesPage) para que los chips del fondo se actualicen.
          void refrescar();
          invalidarMapaEcologico();
        }}
        onSelectCriatura={(id) => abrirPanel("criatura", id)}
        sinCabecera
      />
    </div>
  );
}
