"use client";

/**
 * MineralEditor.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Editor de una entidad Mineral: nombre, imagen, descripción rica y
 * ecosistemas — mismo molde visual que FloraEditor.tsx — más Procesos:
 *
 * - Procesos: eventos geológicos de formación/transformación, nombre libre
 *   (ej: "Cristalización", "Oxidación"…) con consume/produce — mismo shape
 *   que los Procesos de Flora, pero sin orden/secuencia: los procesos
 *   geológicos de un mineral no tienen un orden narrativo único.
 *
 * NOTA: la sección de Formaciones (partes del mineral con fórmula propia
 * vía Veta/Grano/Compuesto) fue removida junto con toda la lógica de
 * Granos/Vetas/Formación del proyecto — decisión explícita del usuario.
 *
 * Reutiliza SelectorFormulaOrgano y SelectorConsumeProduce de Flora tal cual
 * (son genéricos, sin nada específico de planta).
 */

import { Gem, Leaf } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { RichEditor } from "@/editor/lexical";
import { SeccionEntidad } from "@/ui/SeccionEntidad";
import { type SaveStatus } from "@/ui/saveStatus";

import { useCompuestosConElementos } from "@/domains/garlia/elementos/useCompuestosConElementos";
import { useElementos } from "@/domains/garlia/elementos/useElementos";
import { useReacciones } from "@/domains/garlia/elementos/useReacciones";
import { CompuestoPanelFlotante } from "@/domains/garlia/elementos/CompuestosPage";
import { type Compuesto, type Elemento, type Reaccion } from "@/domains/garlia/elementos/types";
import { SelectorImagen } from "@/domains/garlia/_shared/UIComponents";
import { EditorHeaderBar } from "@/domains/garlia/_shared/EditorHeaderBar";
import { SeccionReaccionVinculada } from "@/domains/garlia/_shared/SeccionReaccionVinculada";
import { useEntidadVinculoReaccion } from "@/domains/garlia/_shared/useEntidadVinculoReaccion";
import {
  usePublishHeaderControls,
  type OnHeaderControlsChange,
} from "@/domains/garlia/_shared/useEditorHeaderControls";

import { useMinerales } from "./useMinerales";
import { useMineralFormacionesProcesos } from "./useMineralFormacionesProcesos";
import { type Mineral, type MineralProceso } from "./types";
import { useEcosistemas } from "@/domains/garlia/biologia/useBiologia";
import { usePanelFlotante } from "@/domains/garlia/_shared/usePanelFlotanteStore";

export function MineralEditor({
  mineral: mineralProp,
  onDeleted,
  onHeaderControlsChange,
}: {
  mineral: Mineral;
  onDeleted?: (id: string) => void;
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const { items: elementos } = useElementos();
  const { items: compuestos, setItems: setCompuestos } = useCompuestosConElementos();
  const { items: reacciones, setItems: setReacciones } = useReacciones();
  const { actualizar, eliminar } = useMinerales();
  const { ecosistemas, loading: loadingEcosistemas, actualizar: actualizarEcosistema } =
    useEcosistemas();

  const [form, setForm] = useState<Mineral>(mineralProp);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [editandoCompuestoId, setEditandoCompuestoId] = useState<string | null>(null);
  // Click en un Ecosistema de la barra lateral → panel flotante global
  // (reemplaza en vez de apilar — ver usePanelFlotanteStore).
  const abrirPanelGlobal = usePanelFlotante((st) => st.abrir);

  // Ecosistemas donde aparece este mineral — vínculo inverso: vive en
  // Ecosistema.mineral_ids, no en Mineral. Mismo patrón que FloraEditor.
  const ecosistemaIds = useMemo(
    () => ecosistemas.filter((e) => (e.mineral_ids ?? []).includes(form.id)).map((e) => e.id),
    [ecosistemas, form.id],
  );
  const handleToggleEcosistema = (ecosistemaId: string, add: boolean) => {
    const eco = ecosistemas.find((e) => e.id === ecosistemaId);
    if (!eco) return;
    const actuales = eco.mineral_ids ?? [];
    void actualizarEcosistema(ecosistemaId, {
      mineral_ids: add ? [...actuales, form.id] : actuales.filter((id) => id !== form.id),
    });
  };

  // Procesos geológicos del mineral (mineral_reacciones) — ver
  // useMineralFormacionesProcesos.ts. La parte de Formaciones que este hook
  // manejaba antes fue removida junto con Grano/Veta/Formación.
  const {
    procesos,
    loading: loadingProcesos,
    crearProceso,
    actualizarProceso,
    eliminarProceso,
  } = useMineralFormacionesProcesos(mineralProp.id);

  const [tabActiva] = useState<"info">("info");

  useEffect(() => {
    setForm(mineralProp);
    setStatus("idle");
  }, [mineralProp.id]);

  async function guardar(updates: Partial<Mineral>) {
    setStatus("saving");
    try {
      await actualizar(form.id, updates);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  // Confirmación inline en el header compartido — ver EditorHeaderBar.
  async function eliminarMineral() {
    await eliminar(form.id);
    onDeleted?.(form.id);
  }

  const headerControls = {
    imagenUrl: form.imagen_url,
    IconoFallback: Gem,
    nombre: form.nombre ?? "",
    placeholderNombre: "Nombre del mineral",
    onChangeNombre: (nombre: string) => setForm((f) => ({ ...f, nombre })),
    onBlurNombre: () => guardar({ nombre: form.nombre }),
    status,
    onGuardar: () => guardar({ nombre: form.nombre, descripcion: form.descripcion }),
    onEliminar: eliminarMineral,
  };
  usePublishHeaderControls(headerControls, onHeaderControlsChange);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {!onHeaderControlsChange && <EditorHeaderBar controls={headerControls} />}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-5 mb-6">
            {/* Columna izquierda: imagen */}
            <div className="w-full sm:w-72 sm:shrink-0">
              <SelectorImagen
                aspect="square"
                label="Imagen"
                value={form.imagen_url ?? ""}
                onChange={(url) => {
                  setForm((f) => ({ ...f, imagen_url: url }));
                  void guardar({ imagen_url: url });
                }}
              />
            </div>

            {/* Columna derecha */}
            <div className="flex-1 min-w-0">
              <div className="flex gap-4 items-stretch">
                  <div className="flex-1 min-w-0">
                    <RichEditor
                      minHeight="8rem"
                      placeholder="Qué es, dónde se encuentra, propiedades, apariencia…"
                      value={form.descripcion ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
                    />
                  </div>

                  {/* Ecosistemas — barra vertical lateral, mismo patrón que
                      SeccionEntidad en FloraEditor/EditorCriatura/PanelBioma. */}
                  <aside
                    className="shrink-0 w-44 flex flex-col border-l overflow-y-auto"
                    style={{
                      borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
                    }}
                  >
                    <SeccionEntidad
                      allEntities={ecosistemas.map((e) => ({ id: e.id, nombre: e.nombre }))}
                      emptyLabel="Sin ecosistemas"
                      fallbackIcon={<Leaf size={14} strokeWidth={1} />}
                      fill={false}
                      icon={<Leaf size={9} />}
                      label="Ecosistemas"
                      loading={loadingEcosistemas}
                      saving={false}
                      selectedIds={ecosistemaIds}
                      onEntityClick={(id) => abrirPanelGlobal("ecosistema", id)}
                      onToggle={handleToggleEcosistema}
                    />
                  </aside>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editandoCompuestoId && (
        <CompuestoPanelFlotante
          compuesto={compuestos.find((c) => c.id === editandoCompuestoId)!}
          elementos={elementos}
          todosLosCompuestos={compuestos}
          onCerrar={() => setEditandoCompuestoId(null)}
          onActualizar={(id, cambios) =>
            setCompuestos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)))
          }
        />
      )}
    </div>
  );
}

// ── Componente auxiliar: Tarjeta de proceso geológico ──────────────────────
// Ahora un proceso es solo un evento geológico (descripcion) que vincula
// 1:1 una Reacción del catálogo global de Química vía reaccion_id — la
// Reacción vinculada trae su propio nombre/consume/produce/balance (ver
// TarjetaReaccionVinculada).
function ProcesoMineralCard({
  proceso,
  onUpdate,
  onDelete,
  compuestos,
  elementos,
  reacciones,
  onUpdateReaccion,
}: {
  proceso: MineralProceso;
  onUpdate: (id: string, updates: Partial<MineralProceso>) => void;
  onDelete: () => void;
  compuestos: Compuesto[];
  elementos: Elemento[];
  reacciones: Reaccion[];
  onUpdateReaccion: (id: string, updates: Partial<Reaccion>) => void;
}) {
  const vinculo = useEntidadVinculoReaccion({
    tabla: "mineral_reacciones",
    entidadId: proceso.id,
    reaccionIdActual: proceso.reaccion_id,
    catalogo: reacciones,
    onReaccionIdCambiado: (reaccionId) => onUpdate(proceso.id, { reaccion_id: reaccionId }),
  });

  return (
    <div className="group py-3">
      <SeccionReaccionVinculada
        reaccion={vinculo.reaccion}
        catalogo={reacciones}
        compuestos={compuestos}
        elementos={elementos}
        onCrearNuevo={() => void vinculo.crearYVincular()}
        onUsarExistente={(id) => void vinculo.vincularExistente(id)}
        onUpdate={(id, updates) => {
          onUpdateReaccion(id, updates);
          void vinculo.actualizar(updates);
        }}
        onQuitar={onDelete}
      />
    </div>
  );
}
