"use client";

/**
 * PlanetaEditor
 * ───────────────────────────────────────────────────────────────────────────
 * Editor de un Planeta (cuerpo celeste tipo "planeta").
 * Sigue el mismo patrón que BiomaEditor / EcosistemaEditor:
 *  - Dentro de PanelFlotanteGlobal (kind "planeta"): recibe
 *    onHeaderControlsChange y publica nombre/guardar a la barra superior.
 *  - (En el futuro) a pantalla completa: sin onHeaderControlsChange,
 *    dibuja su propia cabecera.
 */

import React from "react";

import { supabase } from "@/infra/supabase/supabase";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";
import { type OnHeaderControlsChange } from "@/domains/garlia/_shared/useEditorHeaderControls";

import { PanelPlaneta } from "./PanelPlaneta";

type Planeta = {
  id: string;
  nombre: string;
  tipo_cuerpo: string | null;
  descripcion: string | null;
  canon: boolean | null;
};

export function PlanetaEditor({
  planeta,
  onHeaderControlsChange,
}: {
  planeta: Planeta;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const cerrarPanel = usePanelFlotante((s) => s.cerrar);
  const enPanelFlotante = !!onHeaderControlsChange;
  const salir = enPanelFlotante ? cerrarPanel : () => {};

  const handleSave = async (updates: Partial<Planeta>) => {
    await supabase
      .from("cuerpos_celestes_v1")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", planeta.id);
  };

  const panel = (
    <PanelPlaneta
      planeta={planeta}
      onSave={(updates) => void handleSave(updates)}
      onVolver={salir}
      onHeaderControlsChange={onHeaderControlsChange}
    />
  );

  return enPanelFlotante ? panel : <div className="p-4">{panel}</div>;
}
