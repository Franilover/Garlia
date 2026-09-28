"use client";

/**
 * EcosistemaFlotante.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Editor de Ecosistema para PanelFlotanteGlobal. Mismo criterio que
 * BiomaFlotante: reusa PanelEcosistema (cadenas alimenticias incluidas) con
 * su barra interna oculta y publica nombre/guardar/eliminar al header único
 * del panel global. Bioma, Criatura, Flora y Mineral clickeados desde acá
 * REEMPLAZAN el contenido del mismo panel (no apilan).
 */

import { Leaf } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { PanelEcosistema } from "@/domains/garlia/biologia/PanelEcosistema";
import type { PanelHeaderExterno } from "@/domains/garlia/biologia/panelHeaderExterno";
import type { Ecosistema } from "@/domains/garlia/biologia/types";
import {
  useBiomaReinos,
  useCadenasAlimenticias,
  useEcosistemaFlora,
  useEcosistemas,
} from "@/domains/garlia/biologia/useBiologia";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";
import type { SaveStatus } from "@/ui/saveStatus";

export function EcosistemaFlotante({
  ecosistema,
  onHeaderControlsChange,
}: {
  ecosistema: Ecosistema;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const abrirPanel = usePanelFlotante((s) => s.abrir);
  const cerrar = usePanelFlotante((s) => s.cerrar);

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

  // `header` (estado) alimenta solo el NOMBRE visible; las ACCIONES leen de
  // `headerRef`, que siempre apunta al header más reciente del panel.
  // Motivo: usePublishHeaderControls republica únicamente cuando cambian
  // nombre/status/etc., NO cuando cambian los closures — si las acciones
  // capturaran `header` por closure, quedarían atadas al `null` inicial y
  // escribir el nombre / pulsar Guardar en la barra global no haría nada.
  const [header, setHeader] = useState<PanelHeaderExterno | null>(null);
  const headerRef = useRef<PanelHeaderExterno | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Estable a propósito: el panel lo usa como dependencia de su useEffect.
  const recibirHeader = useCallback((h: PanelHeaderExterno) => {
    headerRef.current = h;
    setHeader(h);
  }, []);

  const guardar = useCallback(() => {
    const h = headerRef.current;
    if (!h) return;
    setStatus("saving");
    try {
      h.guardar();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }, []);

  usePublishHeaderControls(
    {
      IconoFallback: Leaf,
      nombre: header?.nombre ?? ecosistema.nombre ?? "",
      placeholderNombre: "Nombre del ecosistema…",
      onChangeNombre: (n: string) => headerRef.current?.setNombre(n),
      onBlurNombre: () => headerRef.current?.guardar(),
      status,
      onGuardar: guardar,
      onEliminar: () => {
        void eliminar(ecosistema.id);
        cerrar();
      },
    },
    onHeaderControlsChange,
  );

  return (
    <div className="p-4">
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
          cerrar();
        }}
        onVolver={cerrar}
        onCrearCadena={() => void crearCadena("Nueva cadena", ecosistema.id)}
        onActualizarCadena={(id, updates) => void actualizarCadena(id, updates)}
        onEliminarCadena={(id) => void eliminarCadena(id)}
        onSelectCriatura={(id) => abrirPanel("criatura", id)}
        onSelectFlora={(id) => abrirPanel("flora", id)}
        onSelectMineral={(id) => abrirPanel("mineral", id)}
        onSelectBioma={(id) => abrirPanel("bioma", id)}
        headerExterno={recibirHeader}
      />
    </div>
  );
}
