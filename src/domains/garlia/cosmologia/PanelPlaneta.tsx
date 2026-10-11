"use client";

/**
 * PanelPlaneta.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Panel de detalle de un Planeta (cuerpo celeste tipo "planeta").
 * Muestra nombre, descripción y los biomas asociados vía cuerpo_celeste_biomas_v1.
 * Sigue el mismo patrón que PanelBioma / PanelEcosistema.
 */

import { Globe, Compass, ArrowLeft, X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { SeccionEntidad } from "@/ui/SeccionEntidad";
import { type SaveStatus } from "@/ui/saveStatus";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";
import { useBiomas } from "@/domains/garlia/biologia/useBiologia";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";

type Planeta = {
  id: string;
  nombre: string;
  tipo_cuerpo: string | null;
  descripcion: string | null;
  canon: boolean | null;
};

export function PanelPlaneta({
  planeta,
  onSave,
  onVolver,
  onHeaderControlsChange,
}: {
  planeta: Planeta;
  onSave: (updates: Partial<Planeta>) => void;
  onVolver: () => void;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const [nombre, setNombre] = useState(planeta.nombre);
  const [descripcion, setDescripcion] = useState(planeta.descripcion ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Biomas del planeta (vía cuerpo_celeste_biomas_v1)
  const { biomas } = useBiomas();
  const [biomaIds, setBiomaIds] = useState<string[]>([]);
  const abrirPanel = usePanelFlotante((s) => s.abrir);

  useEffect(() => {
    setNombre(planeta.nombre);
    setDescripcion(planeta.descripcion ?? "");
  }, [planeta.id]);

  // Carga los biomas asignados a este planeta
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data } = await supabase
        .from("cuerpo_celeste_biomas_v1")
        .select("bioma_id")
        .eq("cuerpo_celeste_id", planeta.id);
      if (!cancelado) setBiomaIds((data ?? []).map((r: any) => r.bioma_id));
    })();
    return () => { cancelado = true; };
  }, [planeta.id]);

  const guardar = () => {
    setStatus("saving");
    try {
      onSave({ nombre: nombre.trim() || planeta.nombre, descripcion });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const enPanelFlotante = !!onHeaderControlsChange;

  // Publica controles a la barra superior del panel flotante global
  usePublishHeaderControls(
    {
      nombre,
      placeholderNombre: "Nombre del planeta",
      onChangeNombre: setNombre,
      onBlurNombre: guardar,
      status,
      onGuardar: guardar,
    },
    onHeaderControlsChange,
  );

  const biomasDelPlaneta = biomas.filter((b) => biomaIds.includes(b.id));
  const allBiomasEntidad = biomasDelPlaneta.map((b) => ({
    id: b.id,
    nombre: b.nombre,
    onClick: () => abrirPanel("bioma", b.id),
  }));

  const contenido = (
    <div className="flex flex-col gap-6 p-4">

      {/* Cabecera propia (solo cuando no está en panel flotante) */}
      {!enPanelFlotante && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="p-1.5 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <Globe size={14} className="text-primary/40 shrink-0" />
          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
            placeholder="Nombre del planeta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardar}
          />
          <button
            type="button"
            onClick={guardar}
            className="shrink-0 px-3 py-1 rounded-lg text-micro font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all"
          >
            Guardar
          </button>
        </div>
      )}

      {/* Descripción */}
      <div className="flex flex-col gap-1.5">
        <p className="text-micro font-black uppercase tracking-[0.12em] text-primary/35">
          Descripción
        </p>
        <textarea
          className="w-full resize-none rounded-xl px-3 py-2.5 text-sm font-light leading-relaxed outline-none transition-colors"
          rows={5}
          style={{
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
          placeholder="Descripción del planeta…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          onBlur={guardar}
        />
      </div>

      {/* Biomas */}
      <div className="flex flex-col gap-1.5">
        <p className="text-micro font-black uppercase tracking-[0.12em] text-primary/35">
          Biomas
        </p>
        {biomasDelPlaneta.length === 0 ? (
          <p className="text-micro text-primary/25">Sin biomas asignados</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {biomasDelPlaneta.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => abrirPanel("bioma", b.id)}
                className="px-2.5 py-0.5 rounded-full text-micro font-bold tracking-wide transition-colors bg-primary/8 hover:bg-primary/15 text-primary/60 border border-primary/12"
              >
                <Compass size={9} className="inline mr-1 opacity-60" />
                {b.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Datos del canon */}
      <div className="flex flex-col gap-1.5">
        <p className="text-micro font-black uppercase tracking-[0.12em] text-primary/35">
          Tipo
        </p>
        <p className="text-micro text-primary/50 capitalize">
          {planeta.tipo_cuerpo ?? "—"}
          {planeta.canon && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/40 border border-primary/10">
              Canon
            </span>
          )}
        </p>
      </div>
    </div>
  );

  return contenido;
}
