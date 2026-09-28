"use client";

/**
 * EcosistemaEditor
 * ───────────────────────────────────────────────────────────────────────────
 * Editor de un Ecosistema (cadenas alimenticias incluidas). Mismo criterio
 * dual que BiomaEditor:
 *
 *  1. Dentro de PanelFlotanteGlobal (kind "ecosistema"): con
 *     `onHeaderControlsChange`, la barra superior es la única del panel y
 *     cerrar/eliminar cierra el panel global. Las entidades relacionadas
 *     (criatura, flora, mineral, bioma) reemplazan el contenido del mismo
 *     panel en vez de apilar otro.
 *  2. A pantalla completa desde EntidadesPage: igual que antes.
 */

import { PanelEcosistema } from "@/domains/garlia/biologia/PanelEcosistema";
import {
  useCadenasAlimenticias,
  useEcosistemas,
  useEcosistemaFlora,
  useBiomaReinos,
} from "@/domains/garlia/biologia/useBiologia";
import type { Ecosistema } from "@/domains/garlia/biologia/types";

import { useMundoNavigation } from "@/domains/garlia/_shared/useMundoNavigationStore";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";
import { type OnHeaderControlsChange } from "@/domains/garlia/_shared/useEditorHeaderControls";

export function EcosistemaEditor({
  ecosistema,
  onHeaderControlsChange,
}: {
  ecosistema: Ecosistema;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const openEntity = useMundoNavigation((s) => s.openEntity);
  const clearSelection = useMundoNavigation((s) => s.clearSelection);
  const abrirPanel = usePanelFlotante((s) => s.abrir);
  const cerrarPanel = usePanelFlotante((s) => s.cerrar);

  const enPanelFlotante = !!onHeaderControlsChange;
  const salir = enPanelFlotante ? cerrarPanel : clearSelection;

  const { actualizar, eliminar } = useEcosistemas();
  const { floraIdsDe, setFloraDeEcosistema } = useEcosistemaFlora();
  const { reinoIdsDe } = useBiomaReinos();
  const {
    cadenas,
    creating: creandoCadena,
    crear: crearCadena,
    actualizar: actualizarCadena,
    eliminar: eliminarCadena,
  } = useCadenasAlimenticias();

  const cadenasDelEcosistema = cadenas.filter((c) => c.ecosistema_id === ecosistema.id);

  const panel = (
    <PanelEcosistema
      ecosistema={ecosistema}
      floraIds={floraIdsDe(ecosistema.id)}
      onChangeFlora={(ids) => void setFloraDeEcosistema(ecosistema.id, ids)}
      reinoIdsPorBioma={reinoIdsDe}
      cadenas={cadenasDelEcosistema}
      creandoCadena={creandoCadena}
      onSave={(updates) => void actualizar(ecosistema.id, updates)}
      onDelete={() => {
        void eliminar(ecosistema.id);
        salir();
      }}
      onVolver={salir}
      onCrearCadena={() => void crearCadena("Nueva cadena", ecosistema.id)}
      onActualizarCadena={(id, updates) => void actualizarCadena(id, updates)}
      onEliminarCadena={(id) => void eliminarCadena(id)}
      onSelectCriatura={(id) => abrirPanel("criatura", id)}
      onSelectFlora={(id) => abrirPanel("flora", id)}
      onSelectMineral={(id) => abrirPanel("mineral", id)}
      onSelectBioma={(id) =>
        enPanelFlotante ? abrirPanel("bioma", id) : openEntity("biomas", id)
      }
      onHeaderControlsChange={onHeaderControlsChange}
    />
  );

  return enPanelFlotante ? panel : <div className="p-4">{panel}</div>;
}
