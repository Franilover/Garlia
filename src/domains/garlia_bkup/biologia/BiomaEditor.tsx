"use client";

/**
 * BiomaEditor
 * ───────────────────────────────────────────────────────────────────────────
 * Editor de un Bioma. Se usa en dos contextos, igual que Flora/Mineral/Reino:
 *
 *  1. Dentro de PanelFlotanteGlobal (kind "bioma"): recibe
 *     `onHeaderControlsChange`, así PanelBioma publica nombre/guardar/
 *     eliminar a la barra superior única del panel y NO dibuja la suya.
 *     Eliminar o cerrar cierra el panel global (`cerrar`), no toca la
 *     navegación de pantalla completa.
 *  2. A pantalla completa desde EntidadesPage (sin `onHeaderControlsChange`):
 *     comportamiento de siempre, con su cabecera propia y `clearSelection`.
 *
 * El diseño interno (contenido + barra lateral de Reinos/Ecosistemas) es el
 * mismo en ambos casos — lo define PanelBioma.
 */

import { PanelBioma } from "@/domains/garlia/biologia/PanelBioma";
import { useBiomas, useBiomaReinos, useEcosistemas } from "@/domains/garlia/biologia/useBiologia";
import type { Bioma } from "@/domains/garlia/biologia/types";

import { useMundoNavigation } from "@/domains/garlia/_shared/useMundoNavigationStore";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";
import { type OnHeaderControlsChange } from "@/domains/garlia/_shared/useEditorHeaderControls";

export function BiomaEditor({
  bioma,
  onHeaderControlsChange,
}: {
  bioma: Bioma;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const openEntity = useMundoNavigation((s) => s.openEntity);
  const clearSelection = useMundoNavigation((s) => s.clearSelection);
  const abrirPanel = usePanelFlotante((s) => s.abrir);
  const cerrarPanel = usePanelFlotante((s) => s.cerrar);

  // Dentro del panel flotante, "volver"/"eliminado" cierra el panel; a
  // pantalla completa, limpia la selección como antes.
  const enPanelFlotante = !!onHeaderControlsChange;
  const salir = enPanelFlotante ? cerrarPanel : clearSelection;

  const { actualizar, eliminar } = useBiomas();
  const { reinoIdsDe, setReinosDeBioma } = useBiomaReinos();
  const {
    ecosistemas,
    creating: creandoEcosistema,
    crear: crearEcosistema,
    actualizar: actualizarEcosistema,
  } = useEcosistemas();

  const ecosistemasDelBioma = ecosistemas.filter((e) => e.bioma_id === bioma.id);

  const panel = (
    <PanelBioma
      bioma={bioma}
      reinoIds={reinoIdsDe(bioma.id)}
      onChangeReinos={(ids) => void setReinosDeBioma(bioma.id, ids)}
      ecosistemas={ecosistemasDelBioma}
      onSave={(updates) => void actualizar(bioma.id, updates)}
      onDelete={() => {
        void eliminar(bioma.id);
        salir();
      }}
      onVolver={salir}
      onSelectReino={(id) => abrirPanel("reino", id)}
      // El panel flotante reemplaza en vez de apilar: abrir el ecosistema
      // desde acá cambia el contenido del mismo panel.
      onSelectEcosistema={(id) =>
        enPanelFlotante ? abrirPanel("ecosistema", id) : openEntity("ecosistemas", id)
      }
      creandoEcosistema={creandoEcosistema}
      onCrearEcosistema={async () => {
        const nuevo = await crearEcosistema("Nuevo ecosistema");
        if (nuevo?.id) {
          await actualizarEcosistema(nuevo.id, { bioma_id: bioma.id });
          if (enPanelFlotante) abrirPanel("ecosistema", nuevo.id);
          else openEntity("ecosistemas", nuevo.id);
        }
      }}
      onHeaderControlsChange={onHeaderControlsChange}
    />
  );

  // A pantalla completa mantiene el padding de siempre; el panel flotante
  // ya aplica el suyo dentro de PanelBioma.
  return enPanelFlotante ? panel : <div className="p-4">{panel}</div>;
}
