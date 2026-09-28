"use client";

/**
 * BiomaFlotante.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Editor de Bioma para PanelFlotanteGlobal (vista rápida centrada, mismo
 * comportamiento que Flora/Mineral/Criatura). Reusa PanelBioma tal cual, pero
 * con su barra interna oculta (`headerExterno`) y publicando sus controles al
 * header único del panel global vía usePublishHeaderControls — sin barra
 * duplicada.
 *
 * Navegación interna: un Reino/Ecosistema elegido desde este panel REEMPLAZA
 * el contenido del mismo panel (usePanelFlotante.abrir), nunca apila otro.
 */

import { Compass } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { PanelBioma } from "@/domains/garlia/biologia/PanelBioma";
import type { PanelHeaderExterno } from "@/domains/garlia/biologia/panelHeaderExterno";
import type { Bioma } from "@/domains/garlia/biologia/types";
import { useBiomas, useBiomaReinos, useEcosistemas } from "@/domains/garlia/biologia/useBiologia";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";
import type { SaveStatus } from "@/ui/saveStatus";

export function BiomaFlotante({
  bioma,
  onHeaderControlsChange,
}: {
  bioma: Bioma;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const abrirPanel = usePanelFlotante((s) => s.abrir);
  const cerrar = usePanelFlotante((s) => s.cerrar);

  const { actualizar, eliminar } = useBiomas();
  const { reinoIdsDe, setReinosDeBioma } = useBiomaReinos();
  const {
    ecosistemas,
    creating: creandoEcosistema,
    crear: crearEcosistema,
    actualizar: actualizarEcosistema,
  } = useEcosistemas();

  const ecosistemasDelBioma = ecosistemas.filter((e) => e.bioma_id === bioma.id);

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
      IconoFallback: Compass,
      nombre: header?.nombre ?? bioma.nombre ?? "",
      placeholderNombre: "Nombre del bioma…",
      onChangeNombre: (n: string) => headerRef.current?.setNombre(n),
      onBlurNombre: () => headerRef.current?.guardar(),
      status,
      onGuardar: guardar,
      onEliminar: () => {
        void eliminar(bioma.id);
        cerrar();
      },
    },
    onHeaderControlsChange,
  );

  return (
    <div className="p-4">
      <PanelBioma
        bioma={bioma}
        reinoIds={reinoIdsDe(bioma.id)}
        onChangeReinos={(ids) => void setReinosDeBioma(bioma.id, ids)}
        ecosistemas={ecosistemasDelBioma}
        onSave={(updates) => void actualizar(bioma.id, updates)}
        onDelete={() => {
          void eliminar(bioma.id);
          cerrar();
        }}
        onVolver={cerrar}
        onSelectReino={(id) => abrirPanel("reino", id)}
        onSelectEcosistema={(id) => abrirPanel("ecosistema", id)}
        creandoEcosistema={creandoEcosistema}
        onCrearEcosistema={async () => {
          const nuevo = await crearEcosistema("Nuevo ecosistema");
          if (nuevo?.id) {
            await actualizarEcosistema(nuevo.id, { bioma_id: bioma.id });
            abrirPanel("ecosistema", nuevo.id);
          }
        }}
        headerExterno={recibirHeader}
      />
    </div>
  );
}
