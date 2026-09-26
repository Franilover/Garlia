"use client";

/**
 * ProcesosPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Catálogo de Procesos (tabla "procesos"): antes solo lectura (pills +
 * panel de detalle sin edición), ahora editor completo con el mismo patrón
 * visual y de guardado que Elemento/Compuesto/Reacción — EditorHeaderBar +
 * usePublishHeaderControls + useConfirm para eliminar.
 *
 * Un Proceso describe una receta entrada→transformación→salida en lenguaje
 * natural (regla_clave/entrada/transformacion/salida/conservacion) y puede,
 * opcionalmente, vincularse a una o más Reacciones concretas (tabla puente
 * proceso_reacciones) — ver ReaccionesPage.tsx: Reacción es un concepto
 * independiente, no una etapa obligatoria de Proceso.
 */

import { Activity, Atom, Beaker, Cpu, Loader2, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { createPortal } from "react-dom";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { TituloCategoria } from "../_shared/TituloCategoria";
import { supabase } from "@/infra/supabase/supabase";
import { useConfirm } from "@/ui/ConfirmModal";
import { type SaveStatus } from "@/ui/saveStatus";

import { EditorHeaderBar } from "../_shared/EditorHeaderBar";
import { usePublishHeaderControls, type OnHeaderControlsChange } from "../_shared/useEditorHeaderControls";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

import { useProcesos } from "./useProcesos";
import { useReacciones } from "./useReacciones";
import { useElementos } from "./useElementos";
import { useFenomenos } from "./useFenomenos";
import { useOris } from "@/domains/garlia/fisica/useFisica";
import type { Oris } from "@/domains/garlia/fisica/types";
import { ReaccionPanelFlotante } from "./ReaccionesPage";
import {
  vincularReaccionAProceso,
  actualizarProcesoReaccion,
  desvincularReaccionDeProceso,
} from "./persistirProcesoReaccion";
import {
  vincularOrisAProceso,
  actualizarOrisProceso,
  desvincularOrisDeProceso,
} from "./persistirOrisProceso";
import {
  vincularElementoAProceso,
  actualizarElementoProceso,
  desvincularElementoDeProceso,
} from "./persistirElementoProceso";
import {
  vincularFenomenoAProceso,
  actualizarFenomenoProceso,
  desvincularFenomenoDeProceso,
} from "./persistirFenomenoProceso";
import { useProcesoConfiguracionIum } from "./useProcesoConfiguracionIum";
import {
  CONFIG_ELEMENTO_PROCESOS,
  CONFIG_FENOMENO_PROCESOS,
  CONFIG_ORIS_PROCESOS,
  CONFIG_PROCESO_REACCIONES,
  type Elemento,
  type ElementoProceso,
  type Fenomeno,
  type FenomenoProceso,
  type OrisProceso,
  type Proceso,
  type ProcesoReaccion,
  type Reaccion,
} from "./types";

const ESTADOS_FUNDAMENTO = ["definida", "en_revision", "estable", "obsoleta"] as const;

/**
 * Cuenta cuántas columnas de `minColWidth`px (+ `gap`px entre ellas) caben en
 * el ancho actual del contenedor referenciado. Mismo helper que en
 * MaterialesPage.tsx/EstructurasPage.tsx (biblioteca con columnas tipo
 * mampostería) — replicado acá para que Procesos comparta el mismo diseño.
 */
function useResponsiveColumnCount(
  ref: React.RefObject<HTMLElement | null>,
  minColWidth: number,
  gap: number,
): number {
  const [columnas, setColumnas] = useState(3);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const calcular = (ancho: number) => {
      const n = Math.max(1, Math.floor((ancho + gap) / (minColWidth + gap)));
      setColumnas(n);
    };

    calcular(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const ancho = entries[0]?.contentRect.width;
      if (ancho != null) calcular(ancho);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, minColWidth, gap]);

  return columnas;
}

/**
 * Reparte una lista de secciones en `numColumnas` columnas con un algoritmo
 * greedy (cada sección va a la columna con menor "altura" acumulada) — evita
 * los huecos grandes que dejaría CSS columns/grid auto-fit con grupos de
 * tamaños dispares. Mismo helper que en MaterialesPage/EstructurasPage.
 */
function distribuirEnColumnas<T>(
  secciones: T[],
  numColumnas: number,
  getPeso: (s: T) => number,
): T[][] {
  const columnas: T[][] = Array.from({ length: numColumnas }, () => []);
  const alturas = new Array(numColumnas).fill(0);
  const OVERHEAD = 2;

  for (const seccion of secciones) {
    let colMenor = 0;
    for (let i = 1; i < numColumnas; i++) {
      if (alturas[i] < alturas[colMenor]) colMenor = i;
    }
    columnas[colMenor].push(seccion);
    alturas[colMenor] += getPeso(seccion) + OVERHEAD;
  }

  return columnas;
}

/** Agrupa los Procesos por su campo "tipo" (equivalente a "categoria" en
 *  Material/Estructura) — sin enum fijo documentado, se agrupa por el valor
 *  tal cual viene de Supabase, en el orden en que aparece, con un bloque
 *  final para los procesos sin tipo asignado. Mismo criterio que
 *  gruposPorCategoria en MaterialesPage.tsx. */
function agruparPorTipo(items: Proceso[]): { id: string; nombre: string; items: Proceso[] }[] {
  const orden: string[] = [];
  const mapa = new Map<string, Proceso[]>();
  const sinTipo: Proceso[] = [];

  for (const p of items) {
    const tipo = p.tipo;
    if (!tipo) {
      sinTipo.push(p);
      continue;
    }
    if (!mapa.has(tipo)) {
      mapa.set(tipo, []);
      orden.push(tipo);
    }
    mapa.get(tipo)!.push(p);
  }

  const grupos = orden.map((tipo) => ({ id: tipo, nombre: tipo, items: mapa.get(tipo)! }));
  if (sinTipo.length > 0) {
    grupos.push({ id: "__sin-tipo__", nombre: "Sin tipo", items: sinTipo });
  }
  return grupos;
}

/** Casilla de un Proceso en el grid tipo tabla periódica — mismo lenguaje
 *  visual que ElementoCasilla/CompuestoCasilla/EstructuraCasilla (tarjeta de
 *  grilla con bordes compartidos, sin fondo, sin rounded), en vez de la pill
 *  suelta que tenía antes. Proceso no tiene un "símbolo" corto propio, así
 *  que el nombre ocupa el lugar central, igual que en EstructuraCasilla. */
function ProcesoCasilla({
  proceso,
  seleccionado,
  onClick,
}: {
  proceso: Proceso;
  seleccionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={proceso.nombre}
      className={`group flex flex-col items-center justify-center gap-0.5 p-1.5 border-r border-b transition-colors text-center ${
        seleccionado
          ? "border-primary/10 bg-primary/10 ring-1 ring-inset ring-primary/40"
          : "border-primary/10 hover:bg-primary/5"
      }`}
    >
      <span className="text-sm font-black leading-tight text-primary/70 line-clamp-3">
        {proceso.nombre}
      </span>
    </button>
  );
}

/** Un grupo de Procesos (por "tipo") con su título y su grid — mismo patrón
 *  que ChipGrupoEstructuras en EstructurasPage.tsx.
 *
 *  minmax(140px…) en vez de los 68px de Fenómenos/Materiales: Proceso usa
 *  frases largas como nombre (ej. "Acumulación y Descarga de Energía"),
 *  que a 68px quedaban cortadas incluso con line-clamp-2 — una casilla más
 *  ancha les da lugar a esas frases sin achicar tanto el texto. */
function ChipGrupoProcesos({
  titulo,
  items,
  seleccionadoId,
  onSeleccionar,
}: {
  titulo: string;
  items: Proceso[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <TituloCategoria titulo={titulo} total={items.length} />
      <div
        className="grid gap-0 border-t border-l border-primary/10"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
      >
        {items.map((proceso) => (
          <ProcesoCasilla
            key={proceso.id}
            proceso={proceso}
            seleccionado={proceso.id === seleccionadoId}
            onClick={() => onSeleccionar(proceso.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Sección de Reacciones vinculadas a este Proceso — editable: agregar una
 * reacción existente del catálogo, editar su orden/rol dentro del proceso,
 * o desvincularla. Mismo lenguaje visual que ComposicionRealBloque en
 * CompuestosPage.tsx (fila + inputs con onBlur + botón agregar con select).
 * Nunca crea ni edita la Reacción en sí — solo la fila puente.
 */
function ReaccionesVinculadasBloque({
  procesoId,
  reacciones,
  onAbrirReaccion,
}: {
  procesoId: string;
  reacciones: Reaccion[];
  onAbrirReaccion?: (reaccionId: string) => void;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const { data: vinculos, loading, refetch } = useSupabaseData<ProcesoReaccion>(
    CONFIG_PROCESO_REACCIONES.tabla,
    { select: CONFIG_PROCESO_REACCIONES.select, order: { campo: "orden" } },
  );
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [nuevaReaccionId, setNuevaReaccionId] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");

  const vinculosDeEsteProceso = useMemo(
    () => vinculos.filter((v) => v.proceso_id === procesoId),
    [vinculos, procesoId],
  );

  const reaccionesDisponibles = useMemo(
    () =>
      reacciones.filter((r) => !vinculosDeEsteProceso.some((v) => v.reaccion_id === r.id)),
    [reacciones, vinculosDeEsteProceso],
  );

  async function handleOrdenBlur(vinculoId: string, valor: string) {
    const orden = valor.trim() === "" ? null : Number(valor);
    if (orden !== null && !Number.isFinite(orden)) return;
    setGuardandoId(vinculoId);
    await actualizarProcesoReaccion(vinculoId, { orden });
    setGuardandoId(null);
    refetch();
  }

  async function handleRolBlur(vinculoId: string, rol: string) {
    setGuardandoId(vinculoId);
    await actualizarProcesoReaccion(vinculoId, { rol: rol.trim() || null });
    setGuardandoId(null);
    refetch();
  }

  async function handleQuitar(vinculoId: string, nombre: string) {
    const ok = await confirm({
      title: "Desvincular reacción",
      message: `¿Desvincular "${nombre}" de este proceso? La reacción en sí no se elimina.`,
    });
    if (!ok) return;
    setGuardandoId(vinculoId);
    await desvincularReaccionDeProceso(vinculoId);
    setGuardandoId(null);
    refetch();
  }

  async function handleAgregar() {
    if (!nuevaReaccionId) return;
    setGuardandoId(nuevaReaccionId);
    await vincularReaccionAProceso(procesoId, nuevaReaccionId, {
      rol: nuevoRol.trim() || null,
      orden: vinculosDeEsteProceso.length,
    });
    setGuardandoId(null);
    setAgregando(false);
    setNuevaReaccionId("");
    setNuevoRol("");
    refetch();
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-2">
      <ConfirmModal />
      <div className="flex items-center gap-1.5">
        <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
          Reacciones
        </span>
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          disabled={reaccionesDisponibles.length === 0}
          title="Vincular una reacción existente"
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
        >
          <Plus size={10} />
        </button>
      </div>
      <p className="text-micro text-primary/35 -mt-1">
        Opcional: transformación material específica asociada a este proceso, si existe.
      </p>

      {agregando && (
        <div className="flex flex-col gap-1 px-2 py-1.5 rounded-md border border-primary/10 bg-primary/5">
          <select
            value={nuevaReaccionId}
            onChange={(e) => setNuevaReaccionId(e.target.value)}
            className="bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30"
          >
            <option value="">Elegir reacción…</option>
            {reaccionesDisponibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre || "(sin nombre)"}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value)}
              placeholder="Rol (opcional)"
              className="flex-1 bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
            />
            <button
              type="button"
              onClick={handleAgregar}
              disabled={!nuevaReaccionId || guardandoId === nuevaReaccionId}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {guardandoId === nuevaReaccionId ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Plus size={11} />
              )}
            </button>
          </div>
        </div>
      )}

      {vinculosDeEsteProceso.length === 0 && !agregando ? (
        <p className="py-1 text-micro text-primary/30">
          Sin reacción asociada — no todo proceso tiene una, y eso no es un dato faltante.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {vinculosDeEsteProceso.map((vinculo) => {
            const reaccion = reacciones.find((r) => r.id === vinculo.reaccion_id);
            const ocupado = guardandoId === vinculo.id;
            return (
              <div
                key={vinculo.id}
                className="flex flex-col gap-1 px-2 py-1.5 rounded-md border border-transparent hover:border-primary/10 hover:bg-primary/[0.03] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!onAbrirReaccion}
                    onClick={() => reaccion && onAbrirReaccion?.(reaccion.id)}
                    title={onAbrirReaccion ? "Ver/editar esta reacción" : undefined}
                    className={`flex items-center gap-1 text-micro font-bold text-primary/70 truncate text-left ${
                      onAbrirReaccion ? "cursor-pointer hover:underline hover:text-primary" : ""
                    }`}
                  >
                    <Beaker size={10} className="text-primary/40 shrink-0" />
                    {reaccion?.nombre ?? vinculo.reaccion_id.slice(0, 8)}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuitar(vinculo.id, reaccion?.nombre ?? vinculo.reaccion_id)}
                    disabled={ocupado}
                    title="Desvincular de este proceso"
                    className="ml-auto shrink-0 flex items-center justify-center w-5 h-5 rounded text-primary/25 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
                  >
                    {ocupado ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="number"
                    defaultValue={vinculo.orden ?? ""}
                    key={`orden-${vinculo.id}-${vinculo.orden ?? ""}`}
                    onBlur={(e) => handleOrdenBlur(vinculo.id, e.target.value)}
                    disabled={ocupado}
                    placeholder="#"
                    title="Orden"
                    className="w-10 bg-primary/5 rounded px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <input
                    defaultValue={vinculo.rol ?? ""}
                    key={`rol-${vinculo.id}-${vinculo.rol ?? ""}`}
                    onBlur={(e) => handleRolBlur(vinculo.id, e.target.value)}
                    disabled={ocupado}
                    placeholder="Rol"
                    title="Rol"
                    className="flex-1 min-w-0 bg-primary/5 rounded px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Sección de Oris compatibles con este Proceso (spec sección 1/4/5/6/10):
 * lee y escribe directo contra "oris_procesos" — sin listas hardcodeadas,
 * sin arrays manuales por Oris. Genérico: el mismo componente sirve para
 * la ficha del Proceso (filtrando por proceso_id, mostrando qué Oris) y,
 * parametrizado al revés, para la ficha del Oris (filtrando por oris_id,
 * mostrando qué Procesos) — ver CompatibleProcesses en fisica/OrisEditor.tsx,
 * que reutiliza este mismo bloque en su modo "desde Oris".
 *
 * El "rol" se muestra tal cual viene de Supabase (badge de solo lectura,
 * no un select que lo reinterprete — spec sección 5) mientras que
 * "prioridad" y "notas" sí son editables inline, porque son campos propios
 * de la relación sin significado narrativo fijo que cuidar.
 */
function OrisCompatiblesBloque({
  procesoId,
  oris,
  onAbrirOris,
}: {
  procesoId: string;
  oris: Oris[];
  onAbrirOris?: (orisId: string) => void;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const { data: vinculos, loading, refetch } = useSupabaseData<OrisProceso>(
    CONFIG_ORIS_PROCESOS.tabla,
    { select: CONFIG_ORIS_PROCESOS.select, order: { campo: "prioridad" } },
  );
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [nuevoOrisId, setNuevoOrisId] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");

  // Sección 6 del spec: un proceso puede aparecer vinculado a varios Oris —
  // eso NUNCA significa que existan varios procesos. Este filtro solo
  // determina qué filas puente mostrar acá; el catálogo de Procesos
  // (agruparPorTipo/useProcesos) sigue trayendo cada proceso una única vez.
  const vinculosDeEsteProceso = useMemo(
    () => vinculos.filter((v) => v.proceso_id === procesoId),
    [vinculos, procesoId],
  );

  const orisDisponibles = useMemo(
    () => oris.filter((o) => !vinculosDeEsteProceso.some((v) => v.oris_id === o.id)),
    [oris, vinculosDeEsteProceso],
  );

  async function handlePrioridadBlur(vinculoId: string, valor: string) {
    const prioridad = valor.trim() === "" ? null : Number(valor);
    if (prioridad !== null && !Number.isFinite(prioridad)) return;
    setGuardandoId(vinculoId);
    await actualizarOrisProceso(vinculoId, { prioridad });
    setGuardandoId(null);
    refetch();
  }

  async function handleNotasBlur(vinculoId: string, notas: string) {
    setGuardandoId(vinculoId);
    await actualizarOrisProceso(vinculoId, { notas: notas.trim() || null });
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
      title: "Desvincular Oris",
      message: `¿Desvincular "${nombre}" de este proceso? El Oris en sí no se elimina.`,
    });
    if (!ok) return;
    setGuardandoId(vinculoId);
    await desvincularOrisDeProceso(vinculoId);
    setGuardandoId(null);
    refetch();
  }

  async function handleAgregar() {
    if (!nuevoOrisId) return;
    setGuardandoId(nuevoOrisId);
    await vincularOrisAProceso(nuevoOrisId, procesoId, {
      rol: nuevoRol.trim() || null,
      prioridad: vinculosDeEsteProceso.length,
    });
    setGuardandoId(null);
    setAgregando(false);
    setNuevoOrisId("");
    setNuevoRol("");
    refetch();
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-2">
      <ConfirmModal />
      <div className="flex items-center gap-1.5">
        <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
          Oris compatibles
        </span>
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          disabled={orisDisponibles.length === 0}
          title="Vincular un Oris existente"
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
        >
          <Plus size={10} />
        </button>
      </div>
      <p className="text-micro text-primary/35 -mt-1">
        Qué Oris pueden ejecutar este proceso — solo aparece si Supabase indica que está
        relacionado y activo.
      </p>

      {agregando && (
        <div className="flex flex-col gap-1 px-2 py-1.5 rounded-md border border-primary/10 bg-primary/5">
          <select
            value={nuevoOrisId}
            onChange={(e) => setNuevoOrisId(e.target.value)}
            className="bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30"
          >
            <option value="">Elegir Oris…</option>
            {orisDisponibles.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre || "(sin nombre)"}
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
              disabled={!nuevoOrisId || guardandoId === nuevoOrisId}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {guardandoId === nuevoOrisId ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Plus size={11} />
              )}
            </button>
          </div>
        </div>
      )}

      {vinculosDeEsteProceso.length === 0 && !agregando ? (
        <p className="py-1 text-micro text-primary/30">
          Sin información registrada — ningún Oris está vinculado a este proceso todavía.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {vinculosDeEsteProceso.map((vinculo) => {
            const orisRelacionado = oris.find((o) => o.id === vinculo.oris_id);
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={!onAbrirOris}
                    onClick={() => orisRelacionado && onAbrirOris?.(orisRelacionado.id)}
                    title={onAbrirOris ? "Ver/editar este Oris" : undefined}
                    className={`flex items-center gap-1 text-micro font-bold text-primary/70 truncate text-left ${
                      onAbrirOris ? "cursor-pointer hover:underline hover:text-primary" : ""
                    }`}
                  >
                    <Sparkles size={10} className="text-primary/40 shrink-0" />
                    {orisRelacionado?.nombre ?? vinculo.oris_id.slice(0, 8)}
                  </button>

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
                        ? "text-emerald-500/70 border-emerald-500/20 bg-emerald-500/5"
                        : "text-primary/35 border-primary/10 bg-primary/5"
                    } disabled:opacity-40`}
                  >
                    {vinculo.activo ? "Activo" : "Inactivo"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuitar(vinculo.id, orisRelacionado?.nombre ?? vinculo.oris_id)}
                    disabled={ocupado}
                    title="Desvincular de este proceso"
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
                    placeholder="#"
                    title="Prioridad"
                    className="w-10 bg-primary/5 rounded px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <input
                    defaultValue={vinculo.notas ?? ""}
                    key={`notas-${vinculo.id}-${vinculo.notas ?? ""}`}
                    onBlur={(e) => handleNotasBlur(vinculo.id, e.target.value)}
                    disabled={ocupado}
                    placeholder="Notas"
                    title="Notas"
                    className="flex-1 min-w-0 bg-primary/5 rounded px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Sección de Elementos relacionados con este Proceso (spec sección 3:
 * "relaciones con elementos"). Mismo patrón que OrisCompatiblesBloque,
 * sobre la tabla puente "elemento_procesos" — rol libre (sin un enum
 * fijo de roles como Oris↔Proceso, ver sección 5, que solo aplica a esa
 * relación puntual).
 */
function ElementosRelacionadosBloque({
  procesoId,
  elementos,
}: {
  procesoId: string;
  elementos: Elemento[];
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const { data: vinculos, loading, refetch } = useSupabaseData<ElementoProceso>(
    CONFIG_ELEMENTO_PROCESOS.tabla,
    { select: CONFIG_ELEMENTO_PROCESOS.select, order: { campo: "created_at" } },
  );
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [nuevoElementoId, setNuevoElementoId] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");

  const vinculosDeEsteProceso = useMemo(
    () => vinculos.filter((v) => v.proceso_id === procesoId),
    [vinculos, procesoId],
  );

  const elementosDisponibles = useMemo(
    () => elementos.filter((el) => !vinculosDeEsteProceso.some((v) => v.elemento_id === el.id)),
    [elementos, vinculosDeEsteProceso],
  );

  async function handleRolBlur(vinculoId: string, rol: string) {
    setGuardandoId(vinculoId);
    await actualizarElementoProceso(vinculoId, { rol: rol.trim() || null });
    setGuardandoId(null);
    refetch();
  }

  async function handleQuitar(vinculoId: string, nombre: string) {
    const ok = await confirm({
      title: "Desvincular elemento",
      message: `¿Desvincular "${nombre}" de este proceso? El elemento en sí no se elimina.`,
    });
    if (!ok) return;
    setGuardandoId(vinculoId);
    await desvincularElementoDeProceso(vinculoId);
    setGuardandoId(null);
    refetch();
  }

  async function handleAgregar() {
    if (!nuevoElementoId) return;
    setGuardandoId(nuevoElementoId);
    await vincularElementoAProceso(procesoId, nuevoElementoId, { rol: nuevoRol.trim() || null });
    setGuardandoId(null);
    setAgregando(false);
    setNuevoElementoId("");
    setNuevoRol("");
    refetch();
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-2">
      <ConfirmModal />
      <div className="flex items-center gap-1.5">
        <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
          Elementos relacionados
        </span>
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          disabled={elementosDisponibles.length === 0}
          title="Vincular un elemento existente"
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
        >
          <Plus size={10} />
        </button>
      </div>

      {agregando && (
        <div className="flex flex-col gap-1 px-2 py-1.5 rounded-md border border-primary/10 bg-primary/5">
          <select
            value={nuevoElementoId}
            onChange={(e) => setNuevoElementoId(e.target.value)}
            className="bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30"
          >
            <option value="">Elegir elemento…</option>
            {elementosDisponibles.map((el) => (
              <option key={el.id} value={el.id}>
                {el.nombre} ({el.simbolo})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value)}
              placeholder="Rol (opcional)"
              className="flex-1 bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
            />
            <button
              type="button"
              onClick={handleAgregar}
              disabled={!nuevoElementoId || guardandoId === nuevoElementoId}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {guardandoId === nuevoElementoId ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Plus size={11} />
              )}
            </button>
          </div>
        </div>
      )}

      {vinculosDeEsteProceso.length === 0 && !agregando ? (
        <p className="py-1 text-micro text-primary/30">Sin información registrada.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {vinculosDeEsteProceso.map((vinculo) => {
            const elemento = elementos.find((el) => el.id === vinculo.elemento_id);
            const ocupado = guardandoId === vinculo.id;
            return (
              <div
                key={vinculo.id}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-transparent hover:border-primary/10 hover:bg-primary/[0.03] transition-colors"
              >
                <Atom size={10} className="text-primary/40 shrink-0" />
                <span className="text-micro font-bold text-primary/70 truncate">
                  {elemento ? `${elemento.nombre} (${elemento.simbolo})` : vinculo.elemento_id.slice(0, 8)}
                </span>
                <input
                  defaultValue={vinculo.rol ?? ""}
                  key={`rol-${vinculo.id}-${vinculo.rol ?? ""}`}
                  onBlur={(e) => handleRolBlur(vinculo.id, e.target.value)}
                  disabled={ocupado}
                  placeholder="Rol"
                  className="flex-1 min-w-0 bg-primary/5 rounded px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
                />
                <button
                  type="button"
                  onClick={() => handleQuitar(vinculo.id, elemento?.nombre ?? vinculo.elemento_id)}
                  disabled={ocupado}
                  title="Desvincular de este proceso"
                  className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-primary/25 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
                >
                  {ocupado ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Sección de Fenómenos relacionados con este Proceso (spec sección 3:
 * "relaciones con fenómenos"). Mismo patrón que ElementosRelacionadosBloque,
 * sobre la tabla puente "fenomeno_procesos".
 */
function FenomenosRelacionadosBloque({
  procesoId,
  fenomenos,
}: {
  procesoId: string;
  fenomenos: Fenomeno[];
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const { data: vinculos, loading, refetch } = useSupabaseData<FenomenoProceso>(
    CONFIG_FENOMENO_PROCESOS.tabla,
    { select: CONFIG_FENOMENO_PROCESOS.select, order: { campo: "created_at" } },
  );
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [nuevoFenomenoId, setNuevoFenomenoId] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");

  const vinculosDeEsteProceso = useMemo(
    () => vinculos.filter((v) => v.proceso_id === procesoId),
    [vinculos, procesoId],
  );

  const fenomenosDisponibles = useMemo(
    () => fenomenos.filter((f) => !vinculosDeEsteProceso.some((v) => v.fenomeno_id === f.id)),
    [fenomenos, vinculosDeEsteProceso],
  );

  async function handleRolBlur(vinculoId: string, rol: string) {
    setGuardandoId(vinculoId);
    await actualizarFenomenoProceso(vinculoId, { rol: rol.trim() || null });
    setGuardandoId(null);
    refetch();
  }

  async function handleQuitar(vinculoId: string, nombre: string) {
    const ok = await confirm({
      title: "Desvincular fenómeno",
      message: `¿Desvincular "${nombre}" de este proceso? El fenómeno en sí no se elimina.`,
    });
    if (!ok) return;
    setGuardandoId(vinculoId);
    await desvincularFenomenoDeProceso(vinculoId);
    setGuardandoId(null);
    refetch();
  }

  async function handleAgregar() {
    if (!nuevoFenomenoId) return;
    setGuardandoId(nuevoFenomenoId);
    await vincularFenomenoAProceso(procesoId, nuevoFenomenoId, { rol: nuevoRol.trim() || null });
    setGuardandoId(null);
    setAgregando(false);
    setNuevoFenomenoId("");
    setNuevoRol("");
    refetch();
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-2">
      <ConfirmModal />
      <div className="flex items-center gap-1.5">
        <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
          Fenómenos relacionados
        </span>
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          disabled={fenomenosDisponibles.length === 0}
          title="Vincular un fenómeno existente"
          className="shrink-0 flex items-center justify-center w-5 h-5 rounded border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
        >
          <Plus size={10} />
        </button>
      </div>

      {agregando && (
        <div className="flex flex-col gap-1 px-2 py-1.5 rounded-md border border-primary/10 bg-primary/5">
          <select
            value={nuevoFenomenoId}
            onChange={(e) => setNuevoFenomenoId(e.target.value)}
            className="bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30"
          >
            <option value="">Elegir fenómeno…</option>
            {fenomenosDisponibles.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value)}
              placeholder="Rol (opcional)"
              className="flex-1 bg-primary/5 rounded-md px-1.5 py-1 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
            />
            <button
              type="button"
              onClick={handleAgregar}
              disabled={!nuevoFenomenoId || guardandoId === nuevoFenomenoId}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {guardandoId === nuevoFenomenoId ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Plus size={11} />
              )}
            </button>
          </div>
        </div>
      )}

      {vinculosDeEsteProceso.length === 0 && !agregando ? (
        <p className="py-1 text-micro text-primary/30">Sin información registrada.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {vinculosDeEsteProceso.map((vinculo) => {
            const fenomeno = fenomenos.find((f) => f.id === vinculo.fenomeno_id);
            const ocupado = guardandoId === vinculo.id;
            return (
              <div
                key={vinculo.id}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-transparent hover:border-primary/10 hover:bg-primary/[0.03] transition-colors"
              >
                <Zap size={10} className="text-primary/40 shrink-0" />
                <span className="text-micro font-bold text-primary/70 truncate">
                  {fenomeno?.nombre ?? vinculo.fenomeno_id.slice(0, 8)}
                </span>
                <input
                  defaultValue={vinculo.rol ?? ""}
                  key={`rol-${vinculo.id}-${vinculo.rol ?? ""}`}
                  onBlur={(e) => handleRolBlur(vinculo.id, e.target.value)}
                  disabled={ocupado}
                  placeholder="Rol"
                  className="flex-1 min-w-0 bg-primary/5 rounded px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
                />
                <button
                  type="button"
                  onClick={() => handleQuitar(vinculo.id, fenomeno?.nombre ?? vinculo.fenomeno_id)}
                  disabled={ocupado}
                  title="Desvincular de este proceso"
                  className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-primary/25 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30"
                >
                  {ocupado ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Sección "Configuración IUM" (spec secciones 7/8): intervención mediante
 * IUM que manipula este proceso natural — visualmente separada de la
 * información propia del fenómeno. Solo lectura acá (la config en sí se
 * arma en Física/Oris — spec sección 7: no editar ni proponer valores
 * desde esta ficha, solo reflejar el estado real).
 *
 * Estados posibles, todos derivados del dato real (spec sección 11 — nunca
 * "[Pendiente]"): "Sin configuración IUM" si no hay ninguna fila en
 * proceso_configuraciones_ium_v1 para este proceso; si la hay, se muestra
 * el `estado` real de Supabase (ej. "propuesta" → "Configuración en
 * revisión", cualquier otro valor se muestra tal cual, capitalizado).
 */
function ConfiguracionIumBloque({ procesoId }: { procesoId: string }) {
  const { configuracion, flujo, loading } = useProcesoConfiguracionIum(procesoId);

  if (loading) return null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-2 rounded-md border border-primary/10 bg-primary/[0.02]">
      <div className="flex items-center gap-1.5">
        <Cpu size={11} className="text-primary/40 shrink-0" />
        <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
          Configuración IUM · Intervención
        </span>
      </div>
      <p className="text-micro text-primary/35 -mt-1">
        Manipulación intencional de este proceso mediante una arquitectura IUM — separado del
        proceso natural, que existe con sus propias reglas independientemente de esto.
      </p>

      {!configuracion ? (
        <p className="py-1 text-micro text-primary/30">Sin configuración IUM</p>
      ) : (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-micro font-bold text-primary/70">
              {configuracion.configuracion ?? "Configuración sin nombre"}
            </span>
            <span
              title="Estado real registrado en Supabase — nunca se presenta como canónica si no lo es"
              className={`px-1.5 py-0.5 rounded text-micro font-bold border capitalize ${
                configuracion.estado === "canonica"
                  ? "text-emerald-500/70 border-emerald-500/20 bg-emerald-500/5"
                  : configuracion.estado === "propuesta"
                    ? "text-amber-500/70 border-amber-500/20 bg-amber-500/5"
                    : "text-primary/50 border-primary/15 bg-primary/5"
              }`}
            >
              {configuracion.estado === "propuesta"
                ? "Configuración en revisión"
                : configuracion.estado.replace(/_/g, " ")}
            </span>
            <span className="text-micro text-primary/35">v{configuracion.version}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-micro">
            <span className="text-primary/40">Topología</span>
            <span className="text-primary/65 text-right truncate">
              {configuracion.topologia ?? "Sin información registrada"}
            </span>
            <span className="text-primary/40">Oris principal</span>
            <span className="text-primary/65 text-right truncate">
              {configuracion.oris_principal ?? "Sin información registrada"}
            </span>
            <span className="text-primary/40">Oris compatibles</span>
            <span className="text-primary/65 text-right truncate">
              {configuracion.oris_compatibles ?? "Sin información registrada"}
            </span>
            <span className="text-primary/40">IUMs / uniones</span>
            <span className="text-primary/65 text-right">
              {configuracion.n_iums} / {configuracion.n_uniones}
            </span>
          </div>

          {configuracion.iums && (
            <div className="flex flex-col gap-0.5">
              <span className="text-micro font-bold text-primary/45">IUMs participantes</span>
              <p className="text-micro text-primary/60 leading-relaxed">{configuracion.iums}</p>
            </div>
          )}

          {flujo.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-micro font-bold text-primary/45">Enlaces</span>
              <div className="flex flex-col gap-1">
                {flujo.map((f, idx) => (
                  <div
                    key={`${f.ium_origen_id}-${f.ium_destino_id}-${idx}`}
                    className="flex items-center gap-1 text-micro text-primary/60"
                  >
                    <span className="truncate">{f.ium_origen}</span>
                    <span className="text-primary/30 shrink-0">→</span>
                    <span className="truncate">{f.ium_destino}</span>
                    {f.tipo_union && (
                      <span className="ml-auto shrink-0 text-primary/35">({f.tipo_union})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {configuracion.fundamento && (
            <div className="flex flex-col gap-0.5">
              <span className="text-micro font-bold text-primary/45">Fundamento</span>
              <p className="text-micro text-primary/55 leading-relaxed whitespace-pre-wrap">
                {configuracion.fundamento}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Editor completo de un Proceso — mismo patrón que ElementoEditor/
 * CompuestoEditor/ReaccionPanelFlotante: publica sus controles de header
 * (nombre editable, guardar, eliminar) hacia el contenedor si se lo piden,
 * o muestra su propia EditorHeaderBar en uso standalone.
 */
function ProcesoEditor({
  proceso,
  onActualizar,
  onEliminar,
  onHeaderControlsChange,
  onAbrirReaccion,
  onAbrirOris,
}: {
  proceso: Proceso;
  onActualizar: (id: string, cambios: Partial<Proceso>) => void;
  onEliminar?: (id: string) => void;
  onHeaderControlsChange?: OnHeaderControlsChange;
  onAbrirReaccion?: (reaccionId: string) => void;
  onAbrirOris?: (orisId: string) => void;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [local, setLocal] = useState(proceso);
  const [saving, setSaving] = useState(false);
  const { items: reacciones } = useReacciones();
  const { items: oris } = useOris();
  const { items: elementos } = useElementos();
  const { items: fenomenos } = useFenomenos();

  useEffect(() => setLocal(proceso), [proceso]);

  async function persist(cambios: Partial<Proceso>) {
    setSaving(true);
    try {
      const { error } = await supabase.from("procesos").update(cambios).eq("id", proceso.id);
      if (error) throw error;
      onActualizar(proceso.id, cambios);
    } catch (e) {
      console.error("[ProcesoEditor] error guardando:", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar() {
    if (!onEliminar) return;
    const ok = await confirm({
      title: "Eliminar proceso",
      message: `¿Eliminar "${local.nombre}"? Esta acción no se puede deshacer.`,
    });
    if (ok) onEliminar(proceso.id);
  }

  const status: SaveStatus = saving ? "saving" : "idle";

  const headerControls = {
    IconoFallback: Activity,
    nombre: local.nombre ?? "",
    placeholderNombre: "Nombre del proceso",
    onChangeNombre: (nombre: string) => setLocal((p) => ({ ...p, nombre })),
    onBlurNombre: () => persist({ nombre: local.nombre }),
    status,
    onGuardar: () =>
      persist({
        nombre: local.nombre,
        tipo: local.tipo,
        descripcion: local.descripcion,
        condiciones: local.condiciones,
        notas: local.notas,
        regla_clave: local.regla_clave,
        entrada: local.entrada,
        transformacion: local.transformacion,
        salida: local.salida,
        conservacion: local.conservacion,
        estado_fundamento: local.estado_fundamento,
      }),
    onEliminar: handleEliminar,
    extra: (
      <>
        <input
          value={local.tipo ?? ""}
          onChange={(e) => setLocal((p) => ({ ...p, tipo: e.target.value || null }))}
          onBlur={() => persist({ tipo: local.tipo })}
          placeholder="Tipo"
          className="shrink-0 w-24 bg-primary/5 rounded-md px-1.5 py-0.5 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 placeholder:text-primary/25"
        />
        <select
          value={local.estado_fundamento ?? "definida"}
          onChange={(e) => {
            const estado_fundamento = e.target.value;
            setLocal((p) => ({ ...p, estado_fundamento }));
            persist({ estado_fundamento });
          }}
          title="Estado del fundamento"
          className="shrink-0 bg-primary/5 rounded-md px-1.5 h-6 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 capitalize"
        >
          {ESTADOS_FUNDAMENTO.map((e) => (
            <option key={e} value={e} className="capitalize">
              {e.replace("_", " ")}
            </option>
          ))}
        </select>
      </>
    ),
  };

  usePublishHeaderControls(headerControls, onHeaderControlsChange);

  const receta = [
    ["regla_clave", "Regla clave", local.regla_clave] as const,
    ["entrada", "Entrada", local.entrada] as const,
    ["transformacion", "Transformación", local.transformacion] as const,
    ["salida", "Salida", local.salida] as const,
    ["conservacion", "Conservación", local.conservacion] as const,
  ];

  function campoBlur(campo: keyof Proceso) {
    persist({ [campo]: local[campo] } as Partial<Proceso>);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />
      {!onHeaderControlsChange && <EditorHeaderBar controls={headerControls} />}

      <div className="flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-y-auto">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
            Descripción
          </span>
          <textarea
            className="w-full min-h-[5rem] bg-transparent px-0 py-1 text-micro leading-relaxed text-primary/70 resize-none outline-none transition-colors placeholder:text-primary/25"
            placeholder="Qué es este proceso, en qué contexto ocurre…"
            value={local.descripcion ?? ""}
            onChange={(e) => setLocal((p) => ({ ...p, descripcion: e.target.value }))}
            onBlur={() => campoBlur("descripcion")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
                Receta del proceso
              </span>
              <p className="text-micro text-primary/35 -mt-1">Entrada → transformación → salida</p>
              <div className="flex flex-col gap-2">
                {receta.map(([campo, label, value]) => (
                  <div key={campo} className="min-w-0">
                    <span className="text-micro font-bold text-primary/45">{label}</span>
                    <textarea
                      className="mt-0.5 w-full min-h-[3rem] bg-transparent px-0 py-0.5 text-micro leading-relaxed text-primary/65 resize-none outline-none transition-colors placeholder:text-primary/25"
                      placeholder={`${label}…`}
                      value={value ?? ""}
                      onChange={(e) =>
                        setLocal((p) => ({ ...p, [campo]: e.target.value }) as Proceso)
                      }
                      onBlur={() => campoBlur(campo)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
                Condiciones
              </span>
              <textarea
                className="w-full min-h-[6rem] bg-transparent px-0 py-1 text-micro leading-relaxed text-primary/55 resize-none outline-none transition-colors placeholder:text-primary/25 whitespace-pre-wrap"
                placeholder="Bajo qué condiciones ocurre este proceso…"
                value={local.condiciones ?? ""}
                onChange={(e) => setLocal((p) => ({ ...p, condiciones: e.target.value }))}
                onBlur={() => campoBlur("condiciones")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-0">
            <ReaccionesVinculadasBloque
              procesoId={proceso.id}
              reacciones={reacciones}
              onAbrirReaccion={onAbrirReaccion}
            />

            <OrisCompatiblesBloque procesoId={proceso.id} oris={oris} onAbrirOris={onAbrirOris} />

            <ElementosRelacionadosBloque procesoId={proceso.id} elementos={elementos} />

            <FenomenosRelacionadosBloque procesoId={proceso.id} fenomenos={fenomenos} />

            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
                Notas
              </span>
              <textarea
                className="w-full min-h-[6rem] bg-transparent px-0 py-1 text-micro leading-relaxed text-primary/50 resize-none outline-none transition-colors placeholder:text-primary/25 whitespace-pre-wrap"
                placeholder="Notas libres…"
                value={local.notas ?? ""}
                onChange={(e) => setLocal((p) => ({ ...p, notas: e.target.value }))}
                onBlur={() => campoBlur("notas")}
              />
            </div>
          </div>
        </div>

        {/* Separación visual y conceptual explícita del nivel de
            "Intervención mediante IUM" respecto al proceso natural de
            arriba (spec sección 8) — nunca mezclados en la misma columna. */}
        <ConfiguracionIumBloque procesoId={proceso.id} />
      </div>
    </div>
  );
}

/**
 * Panel flotante centrado del detalle de un Proceso — mismo comportamiento
 * visual que ReaccionPanelFlotante/CompuestoPanelFlotante: modal centrado
 * con backdrop blur, cierra con click en el backdrop, Escape, o el botón X.
 * Apila el panel flotante de una Reacción vinculada, si se abre una — mismo
 * patrón de apilado que celulaAbierta/materialAbierto en CompuestoEditor.
 */
function ProcesoPanelFlotante({
  proceso,
  onCerrar,
  onActualizar,
  onEliminar,
  onAbrirOris,
}: {
  proceso: Proceso;
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Proceso>) => void;
  onEliminar?: (id: string) => void;
  /** Ver spec sección 4/10: al abrir un Oris compatible desde acá, el
   *  caller (ElementosPage/FisicaPage, quien conecta ambos catálogos)
   *  decide cómo mostrarlo — este panel no asume esa navegación. Sin
   *  callback, el bloque de Oris compatibles queda de solo lectura para
   *  la navegación (el vínculo en sí sigue siendo editable). */
  onAbrirOris?: (orisId: string) => void;
}) {
  const [reaccionAbiertaId, setReaccionAbiertaId] = useState<string | null>(null);
  const { items: reacciones, setItems: setReacciones } = useReacciones();
  const reaccionAbierta = reacciones.find((r) => r.id === reaccionAbiertaId) ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (reaccionAbiertaId) setReaccionAbiertaId(null);
        else onCerrar();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onCerrar, reaccionAbiertaId]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
        style={{ background: "color-mix(in srgb, var(--primary) 35%, transparent)", backdropFilter: "blur(8px)" }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onCerrar();
        }}
      >
        <div
          className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: "var(--bg-main)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <ProcesoEditor
            key={proceso.id}
            proceso={proceso}
            onActualizar={onActualizar}
            onEliminar={onEliminar}
            onAbrirReaccion={setReaccionAbiertaId}
            onAbrirOris={onAbrirOris}
          />
        </div>
      </div>

      {reaccionAbierta && (
        <ReaccionPanelFlotante
          reaccion={reaccionAbierta}
          compuestos={[]}
          elementos={[]}
          onCerrar={() => setReaccionAbiertaId(null)}
          onActualizar={(id, cambios) =>
            setReacciones((prev) => prev.map((r) => (r.id === id ? { ...r, ...cambios } : r)))
          }
        />
      )}
    </>,
    document.body,
  );
}

interface ProcesosPageProps {
  /** Opcionales — mismo patrón que ReaccionesPage: si el caller (ver
   *  ElementosPage.tsx, header de sección vía CabeceraSeccionConMenu) ya
   *  conecta crear/eliminar al hook real, se usan esos. Si no se pasan,
   *  ProcesosPage sigue siendo usable standalone con sus propios handlers
   *  internos (mismo fallback que tenía antes de la migración). */
  creating?: boolean;
  onCreate?: () => void;
  onEliminar?: (id: string) => void;
  /** Ver ProcesoPanelFlotante — opcional, para cuando el caller conecta la
   *  navegación hacia el catálogo de Oris (spec sección 4/10). */
  onAbrirOris?: (orisId: string) => void;
}

export default function ProcesosPage({
  creating: creatingProp,
  onCreate,
  onEliminar: onEliminarProp,
  onAbrirOris,
}: ProcesosPageProps = {}) {
  const { items, setItems, loading } = useProcesos();
  const [selected, setSelected] = useState<Proceso | null>(null);
  const [creatingLocal, setCreatingLocal] = useState(false);
  const creating = creatingProp ?? creatingLocal;

  // Mismo layout tipo "biblioteca" que Materiales/Estructuras/Compuestos:
  // grupos por categoría (acá "tipo") repartidos en columnas responsivas
  // tipo mampostería, cada uno con un grid de casillas estilo tabla
  // periódica — reemplaza la lista plana de chips que tenía antes.
  const grupos = useMemo(() => agruparPorTipo(items), [items]);
  const mampContainerRef = useRef<HTMLDivElement>(null);
  const numColumnas = useResponsiveColumnCount(mampContainerRef, 260, 16);
  const columnasDeGrupos = useMemo(
    () => distribuirEnColumnas(grupos, numColumnas, (g) => g.items.length),
    [grupos, numColumnas],
  );

  async function handleCrearLocal() {
    setCreatingLocal(true);
    try {
      const { data, error } = await supabase
        .from("procesos")
        .insert([{ nombre: "Nuevo proceso" }])
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => [...prev, data as Proceso]);
      setSelected(data as Proceso);
    } catch (e) {
      console.error("[ProcesosPage] error creando proceso:", e);
    } finally {
      setCreatingLocal(false);
    }
  }

  async function handleEliminarLocal(id: string) {
    try {
      const { error } = await supabase.from("procesos").delete().eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((p) => p.id !== id));
      setSelected(null);
    } catch (e) {
      console.error("[ProcesosPage] error eliminando proceso:", e);
    }
  }

  const handleEliminar = onEliminarProp ?? handleEliminarLocal;

  function actualizar(id: string, cambios: Partial<Proceso>) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...cambios } : prev));
  }

  return (
    <div className="px-3 pb-4 pt-2">
      {loading ? (
        <p className="py-5 text-center text-micro text-primary/35">Cargando…</p>
      ) : grupos.length === 0 ? (
        <div className="py-6 text-micro text-primary/25 text-center">
          Todavía no hay procesos creados.
        </div>
      ) : (
        <div ref={mampContainerRef} className="flex w-full items-start gap-4">
          {columnasDeGrupos.map((columna, colIdx) => (
            <div key={colIdx} className="flex min-w-0 flex-1 flex-col">
              {columna.map((grupo) => (
                <div key={grupo.id} className="mb-4">
                  <ChipGrupoProcesos
                    titulo={grupo.nombre}
                    items={grupo.items}
                    seleccionadoId={selected?.id ?? null}
                    onSeleccionar={(id) => {
                      const proceso = items.find((p) => p.id === id) ?? null;
                      setSelected(proceso);
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Botón "Nuevo" propio solo cuando no hay onCreate del caller (uso
          standalone) — mismo criterio: si el header de sección ya ofrece
          "Añadir" (CabeceraSeccionConMenu), no lo duplicamos acá abajo. */}
      {!onCreate && (
        <button
          type="button"
          onClick={handleCrearLocal}
          disabled={creating}
          title="Nuevo proceso"
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-dashed border-primary/20 px-2.5 py-1 text-micro font-bold tracking-wide text-primary/40 transition-colors hover:border-primary/40 hover:text-primary hover:bg-primary/5 disabled:opacity-40"
        >
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Nuevo
        </button>
      )}

      {selected && (
        <ProcesoPanelFlotante
          proceso={selected}
          onCerrar={() => setSelected(null)}
          onActualizar={actualizar}
          onEliminar={handleEliminar}
          onAbrirOris={onAbrirOris}
        />
      )}
    </div>
  );
}
