"use client";

/**
 * OrisEditor.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Detalle editable de un Oris: nombre, familia, dominio y descripción,
 * más la composición de Iums (solo lectura, se edita a mano en la base de
 * datos). Mismo patrón de guardado que ElementoEditor (debounce al perder
 * foco / al cambiar selects, update directo a Supabase).
 */

import { ChevronLeft, Save, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { useConfirm } from "@/ui/ConfirmModal";

import { OrisTopologiaVisual } from "./OrisTopologiaVisual";
import { IumVisual } from "./ParticulaVisual";
import {
  ORIS_CONFIG,
  ORIS_FAMILIAS,
  iumAFilaIum,
  particulasDeIum,
  particulasDeOris,
  type Oris,
  type OrisFamilia,
} from "./types";
import { useGeometriaIums } from "./useGeometriaIums";
import { useIumsConParticulas } from "./useIumsConParticulas";
import { useOrisGrafo } from "./useOrisGrafo";

interface Props {
  oris: Oris;
  onBack: () => void;
  onActualizar: (id: string, cambios: Partial<Oris>) => void;
  onEliminar?: (id: string) => void;
  /** Cuando se renderiza dentro de la vista de familia (varios apilados):
   *  oculta el botón "volver" individual, ya que ahí se vuelve una sola vez
   *  desde el header de la familia. */
  embedded?: boolean;
  /** Oculta la barra propia de nombre/guardar/borrar — usado cuando el
   *  contenedor (p. ej. OrisPanelFlotante) ya renderiza esos controles en
   *  su propia barra superior, para no duplicarlos abajo. */
  hideHeader?: boolean;
  /** Nombre gestionado externamente (por el contenedor que oculta el
   *  header) — se usa en vez de `local.nombre` para que el resto del
   *  editor (p. ej. el mensaje de confirmación de borrado) refleje lo que
   *  el usuario está escribiendo en la barra superior externa. */
  nombreExterno?: string;
}

export function OrisEditor({
  oris,
  onBack,
  onActualizar,
  onEliminar,
  embedded,
  hideHeader,
  nombreExterno,
}: Props) {
  const { confirm, ConfirmModal } = useConfirm();
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(oris);

  useEffect(() => setLocal(oris), [oris]);

  // Cuando el header vive afuera (hideHeader), el nombre se edita en la
  // barra externa — reflejarlo acá para que quede consistente en lo que
  // este editor usa (p. ej. el mensaje de confirmación de borrado).
  useEffect(() => {
    if (hideHeader && nombreExterno !== undefined) {
      setLocal((p) => (p.nombre === nombreExterno ? p : { ...p, nombre: nombreExterno }));
    }
  }, [hideHeader, nombreExterno]);

  const { items: iums } = useIumsConParticulas();
  const iumPorId = useMemo(
    () => Object.fromEntries(iums.map((i) => [i.id, iumAFilaIum(i)])),
    [iums],
  );

  // Topología real del Oris (nodos + uniones) y geometría real de cada Ium —
  // ambas vienen de vistas derivadas de Supabase (v_oris_grafo_canonico,
  // v_iums_geometria_canonica_v1), no de tablas base.
  const { grafoDe, loading: cargandoGrafo } = useOrisGrafo();
  const { geometriaDe } = useGeometriaIums();
  const grafoOris = grafoDe(oris.id);
  // Solo se usa si trae nodos: un grafo vacío no dibuja nada útil.
  const grafo = grafoOris && grafoOris.nodos.length > 0 ? grafoOris : null;

  /** Partículas reales (expandidas) de un Ium por su id — las que dibuja
   *  cada nodo del grafo del Oris. */
  const particulasDePorIum = (iumId: string) => {
    const fila = iumPorId[iumId];
    return fila ? particulasDeIum(fila) : [];
  };

  const iumsComposicion = local.iums_composicion ?? {};
  const particulasOris = useMemo(
    () => particulasDeOris(iumsComposicion, iumPorId),
    [iumsComposicion, iumPorId],
  );
  // Lista de solo-lectura de los Iums presentes en la composición (con su
  // cantidad) — ya no hay selectores +/- para editarla a mano: la fuente
  // de verdad es la Fórmula de texto, iums_composicion se sincroniza desde
  // ahí (ver migración de Oris). Ordenados por cantidad desc, luego nombre.
  const iumsPresentes = useMemo(
    () =>
      Object.entries(iumsComposicion)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([iumId, cantidad]) => ({ ium: iumPorId[iumId], cantidad }))
        .filter((x) => x.ium)
        .sort((a, b) => b.cantidad - a.cantidad || a.ium.nombre.localeCompare(b.ium.nombre)),
    [iumsComposicion, iumPorId],
  );

  async function persist(cambios: Partial<Oris>) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from(ORIS_CONFIG.tabla)
        .update(cambios)
        .eq("id", oris.id);
      if (error) throw error;
      onActualizar(oris.id, cambios);
    } catch (e) {
      console.error("[OrisEditor] error guardando:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />
      {!hideHeader && (
        <div
          style={{ background: "var(--bg-main)" }}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 border-b border-primary/10"
        >
          {!embedded && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer"
            >
              <ChevronLeft size={12} />
            </button>
          )}

          <input
            value={local.nombre ?? ""}
            onChange={(e) => setLocal((p) => ({ ...p, nombre: e.target.value }))}
            onBlur={() => persist({ nombre: local.nombre })}
            placeholder="Nombre del Oris"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />

          <div className="shrink-0 flex items-center gap-1">
            {onEliminar && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Eliminar Oris",
                    message: `¿Eliminar "${local.nombre}"? Esta acción no se puede deshacer.`,
                  });
                  if (ok) onEliminar(oris.id);
                }}
                className="flex items-center justify-center w-6 h-6 rounded-md border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
                title="Eliminar"
              >
                <Trash2 size={11} />
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                persist({
                  nombre: local.nombre,
                  familia: local.familia,
                  dominio: local.dominio,
                  descripcion: local.descripcion,
                })
              }
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wide bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save size={10} />
              {saving ? "…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 min-h-0 flex flex-row gap-3 overflow-y-auto ${embedded ? "p-2" : "p-2.5"}`}>
        {/* Columna izquierda: gráfico + composición de Iums */}
        <div className={`shrink-0 flex flex-col items-center gap-3 p-3 ${grafo ? "w-[460px]" : "w-[280px]"}`}>
          {grafo ? (
            // Topología real: cada nodo es un Ium con sus Partículas sobre su
            // geometría, unidos como define v_oris_grafo_canonico.
            <OrisTopologiaVisual grafo={grafo} particulasDe={particulasDePorIum} geometriaDe={geometriaDe} />
          ) : cargandoGrafo ? (
            // Mientras useOrisGrafo resuelve (Dexie/Supabase en vuelo) NO se
            // dibuja el gráfico genérico: eso es lo que causaba el "flash"
            // visual (primero IumVisual, después la topología real) apenas
            // esta vista carga sin cache de módulo todavía. Se espera con un
            // placeholder neutro del mismo tamaño en vez de saltar entre dos
            // gráficos distintos.
            <div
              className="w-[240px] h-[240px] rounded-xl animate-pulse"
              style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
            />
          ) : (
            // Ya se confirmó (Dexie + Supabase resolvieron) que este Oris no
            // tiene topología asignada: gráfico anterior, sin más flashes.
            <IumVisual particulas={particulasOris} size={240} />
          )}

          {grafo ? null : cargandoGrafo ? null : iumsPresentes.length === 0 ? (
            <span className="text-micro text-primary/30 text-center">Sin Iums en la composición</span>
          ) : (
            <div className="flex flex-wrap justify-center gap-1.5">
              {iumsPresentes.map(({ ium, cantidad }) => (
                <span
                  key={ium.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-primary/15 bg-primary/5 text-micro font-bold text-primary"
                >
                  {cantidad > 1 && <span className="text-primary/40">{cantidad}×</span>}
                  {ium.nombre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: título/selectores + descripción — estilo
            minimalista (mismo lenguaje que Elementos): sin fondo relleno
            en inputs/selects/textarea, solo un borde fino; texto grande y
            liviano, labels chicos y discretos, sin bold/tracking pesado. */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex flex-row gap-3">
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <label className="text-micro uppercase tracking-wide text-primary/35">
                Familia
              </label>
              <select
                value={local.familia}
                onChange={(e) => {
                  const familia = e.target.value as OrisFamilia;
                  setLocal((p) => ({ ...p, familia }));
                  persist({ familia });
                }}
                className="bg-transparent rounded-md px-2 py-1.5 text-sm text-primary outline-none border border-primary/15 focus:border-primary/40 transition-colors"
              >
                {ORIS_FAMILIAS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <label className="text-micro uppercase tracking-wide text-primary/35">
                Dominio
              </label>
              <input
                value={local.dominio ?? ""}
                onChange={(e) => setLocal((p) => ({ ...p, dominio: e.target.value }))}
                onBlur={() => persist({ dominio: local.dominio })}
                placeholder="ej. Peso y gravedad"
                className="bg-transparent rounded-md px-2 py-1.5 text-sm text-primary outline-none border border-primary/15 focus:border-primary/40 transition-colors placeholder:text-primary/25"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-1">
            <label className="text-micro uppercase tracking-wide text-primary/35">
              Descripción
            </label>
            <textarea
              value={local.descripcion ?? ""}
              onChange={(e) => setLocal((p) => ({ ...p, descripcion: e.target.value }))}
              onBlur={() => persist({ descripcion: local.descripcion })}
              rows={6}
              placeholder="Notas adicionales sobre este Oris…"
              className="flex-1 min-h-0 bg-transparent rounded-md px-2 py-1.5 text-sm text-primary outline-none border border-primary/15 focus:border-primary/40 transition-colors resize-none placeholder:text-primary/25"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
