"use client";

/**
 * OrisEditor.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Detalle editable de un Oris: nombre, familia, dominio y descripción,
 * más la composición de Iums (solo lectura, se edita a mano en la base de
 * datos). Mismo patrón de guardado que ElementoEditor (debounce al perder
 * foco / al cambiar selects, update directo a Supabase).
 */

import { ChevronLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import { useConfirm } from "@/ui/ConfirmModal";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

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
import { useProcesos } from "@/domains/garlia/elementos/useProcesos";
import {
  vincularOrisAProceso,
  actualizarOrisProceso,
  desvincularOrisDeProceso,
} from "@/domains/garlia/elementos/persistirOrisProceso";
import { CONFIG_ORIS_PROCESOS, type OrisProceso, type Proceso } from "@/domains/garlia/elementos/types";

/**
 * CompatibleProcesses(orisId) — spec sección 1/4/10: "el componente de
 * procesos compatibles debe ser genérico... consultar Supabase usando el
 * oris_id. No crear un componente separado para cada Oris".
 *
 * Lee/escribe directo contra "oris_procesos" (misma tabla y mismas
 * funciones de persistencia que OrisCompatiblesBloque en
 * elementos/ProcesosPage.tsx, que hace la operación inversa filtrando por
 * proceso_id) — un solo componente cubre ambas direcciones de la misma
 * relación, sin arrays manuales ni mapeos hardcodeados por Oris.
 */
function ProcesosCompatiblesBloque({
  orisId,
  procesos,
  onAbrirProceso,
}: {
  orisId: string;
  procesos: Proceso[];
  onAbrirProceso?: (procesoId: string) => void;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const { data: vinculos, loading, refetch } = useSupabaseData<OrisProceso>(
    CONFIG_ORIS_PROCESOS.tabla,
    { select: CONFIG_ORIS_PROCESOS.select, order: { campo: "prioridad" } },
  );
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [nuevoProcesoId, setNuevoProcesoId] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");

  const vinculosDeEsteOris = useMemo(
    () => vinculos.filter((v) => v.oris_id === orisId),
    [vinculos, orisId],
  );

  const procesosDisponibles = useMemo(
    () => procesos.filter((p) => !vinculosDeEsteOris.some((v) => v.proceso_id === p.id)),
    [procesos, vinculosDeEsteOris],
  );

  async function handlePrioridadBlur(vinculoId: string, valor: string) {
    const prioridad = valor.trim() === "" ? null : Number(valor);
    if (prioridad !== null && !Number.isFinite(prioridad)) return;
    setGuardandoId(vinculoId);
    await actualizarOrisProceso(vinculoId, { prioridad });
    setGuardandoId(null);
    refetch();
  }

  async function handleToggleActivo(vinculo: OrisProceso) {
    setGuardandoId(vinculo.id);
    await actualizarOrisProceso(vinculo.id, { activo: !vinculo.activo });
    setGuardandoId(null);
    refetch();
  }

  async function handleQuitar(vinculoId: string, nombre: string) {
    const ok = await confirm({
      title: "Desvincular proceso",
      message: `¿Desvincular "${nombre}" de este Oris? El proceso en sí no se elimina.`,
    });
    if (!ok) return;
    setGuardandoId(vinculoId);
    await desvincularOrisDeProceso(vinculoId);
    setGuardandoId(null);
    refetch();
  }

  async function handleAgregar() {
    if (!nuevoProcesoId) return;
    setGuardandoId(nuevoProcesoId);
    await vincularOrisAProceso(orisId, nuevoProcesoId, {
      rol: nuevoRol.trim() || null,
      prioridad: vinculosDeEsteOris.length,
    });
    setGuardandoId(null);
    setAgregando(false);
    setNuevoProcesoId("");
    setNuevoRol("");
    refetch();
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <ConfirmModal />
      <div className="flex items-center gap-1.5">
        <span className="text-micro uppercase tracking-wide text-primary/35">
          Procesos compatibles
        </span>
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          disabled={procesosDisponibles.length === 0}
          title="Vincular un proceso existente"
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
        >
          <Plus size={10} />
        </button>
      </div>

      {agregando && (
        <div className="flex flex-col gap-1 px-2 py-1.5 rounded-md border border-primary/10 bg-primary/5">
          <select
            value={nuevoProcesoId}
            onChange={(e) => setNuevoProcesoId(e.target.value)}
            className="bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30"
          >
            <option value="">Elegir proceso…</option>
            {procesosDisponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value)}
              placeholder="Rol (ej. principal, secundario, compatible)"
              className="flex-1 bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
            />
            <button
              type="button"
              onClick={handleAgregar}
              disabled={!nuevoProcesoId || guardandoId === nuevoProcesoId}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {guardandoId === nuevoProcesoId ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Plus size={11} />
              )}
            </button>
          </div>
        </div>
      )}

      {vinculosDeEsteOris.length === 0 && !agregando ? (
        <p className="py-1 text-micro text-primary/30">
          Sin información registrada — ningún proceso está vinculado a este Oris todavía.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {vinculosDeEsteOris.map((vinculo) => {
            const proceso = procesos.find((p) => p.id === vinculo.proceso_id);
            const ocupado = guardandoId === vinculo.id;
            return (
              <div
                key={vinculo.id}
                className={`flex flex-col gap-1 px-2 py-1.5 rounded-md border transition-colors ${
                  vinculo.activo
                    ? "border-transparent hover:border-primary/10 hover:bg-primary/[0.03]"
                    : "border-primary/10 bg-primary/[0.02] opacity-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!onAbrirProceso}
                    onClick={() => proceso && onAbrirProceso?.(proceso.id)}
                    title={onAbrirProceso ? "Ver/editar este proceso" : undefined}
                    className={`flex items-center gap-1 text-micro font-bold text-primary/70 truncate text-left ${
                      onAbrirProceso ? "cursor-pointer hover:underline hover:text-primary" : ""
                    }`}
                  >
                    {proceso?.nombre ?? vinculo.proceso_id.slice(0, 8)}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuitar(vinculo.id, proceso?.nombre ?? vinculo.proceso_id)}
                    disabled={ocupado}
                    title="Desvincular de este Oris"
                    className="ml-auto shrink-0 flex items-center justify-center w-5 h-5 rounded text-primary/25 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
                  >
                    {ocupado ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="number"
                    defaultValue={vinculo.prioridad ?? ""}
                    key={`prioridad-${vinculo.id}-${vinculo.prioridad ?? ""}`}
                    onBlur={(e) => handlePrioridadBlur(vinculo.id, e.target.value)}
                    disabled={ocupado}
                    placeholder="Prioridad"
                    title="Prioridad"
                    className="w-20 bg-primary/5 rounded px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />

                  {vinculo.rol && (
                    <span
                      title="Rol tal como está definido en Supabase"
                      className="shrink-0 px-1.5 py-0.5 rounded text-micro font-bold text-primary/60 bg-primary/5 border border-primary/10 capitalize"
                    >
                      {vinculo.rol}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleActivo(vinculo)}
                    disabled={ocupado}
                    title={vinculo.activo ? "Desactivar sin eliminar" : "Reactivar"}
                    className={`shrink-0 px-1.5 py-0.5 rounded text-micro font-bold border transition-colors ${
                      vinculo.activo
                        ? "text-primary/70 border-primary/20 bg-primary/5"
                        : "text-primary/35 border-primary/10 bg-primary/5"
                    } disabled:opacity-40`}
                  >
                    {vinculo.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  /** Si se pasa, cada nodo del grafo de Iums se vuelve clicable y esto se
   *  dispara con el ium_id — el contenedor (FisicaPage) usa esto para
   *  cerrar este panel de Oris y abrir el panel flotante de ese Ium, sin
   *  perder el contexto de "vine desde este Oris". Sin esto, el grafo
   *  queda decorativo como antes. */
  onAbrirIum?: (iumId: string) => void;
  /** Ver ProcesosCompatiblesBloque — opcional, para cuando el contenedor
   *  (FisicaPage) conecta la navegación hacia el catálogo de Procesos. */
  onAbrirProceso?: (procesoId: string) => void;
}

export function OrisEditor({
  oris,
  onBack,
  onActualizar,
  onEliminar,
  embedded,
  hideHeader,
  nombreExterno,
  onAbrirIum,
  onAbrirProceso,
}: Props) {
  const { confirm, ConfirmModal } = useConfirm();
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(oris);
  const { items: procesos } = useProcesos();

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
            <OrisTopologiaVisual
              grafo={grafo}
              particulasDe={particulasDePorIum}
              geometriaDe={geometriaDe}
              onClickNodo={onAbrirIum}
            />
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

          <ProcesosCompatiblesBloque
            orisId={oris.id}
            procesos={procesos}
            onAbrirProceso={onAbrirProceso}
          />
        </div>
      </div>
    </div>
  );
}
