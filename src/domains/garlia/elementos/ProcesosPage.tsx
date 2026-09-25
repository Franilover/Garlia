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

import { Activity, Beaker, Loader2, Plus, Trash2 } from "lucide-react";
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
import { ReaccionPanelFlotante } from "./ReaccionesPage";
import {
  vincularReaccionAProceso,
  actualizarProcesoReaccion,
  desvincularReaccionDeProceso,
} from "./persistirProcesoReaccion";
import { CONFIG_PROCESO_REACCIONES, type Proceso, type ProcesoReaccion, type Reaccion } from "./types";

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
      <span className="text-sm font-black leading-tight text-primary/70 line-clamp-2">
        {proceso.nombre}
      </span>
    </button>
  );
}

/** Un grupo de Procesos (por "tipo") con su título y su grid — mismo patrón
 *  que ChipGrupoEstructuras en EstructurasPage.tsx. */
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
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))" }}
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
}: {
  proceso: Proceso;
  onActualizar: (id: string, cambios: Partial<Proceso>) => void;
  onEliminar?: (id: string) => void;
  onHeaderControlsChange?: OnHeaderControlsChange;
  onAbrirReaccion?: (reaccionId: string) => void;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [local, setLocal] = useState(proceso);
  const [saving, setSaving] = useState(false);
  const { items: reacciones } = useReacciones();

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

      <div className="flex-1 min-h-0 p-2.5 flex flex-col gap-3 overflow-y-auto">
        <div className="flex flex-col gap-1.5 min-w-0 p-2">
          <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
            Descripción
          </span>
          <textarea
            className="w-full min-h-[3.5rem] bg-transparent px-0 py-1 text-micro leading-relaxed text-primary/70 resize-none outline-none transition-colors placeholder:text-primary/25"
            placeholder="Qué es este proceso, en qué contexto ocurre…"
            value={local.descripcion ?? ""}
            onChange={(e) => setLocal((p) => ({ ...p, descripcion: e.target.value }))}
            onBlur={() => campoBlur("descripcion")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-start">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0 p-2">
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
                Receta del proceso
              </span>
              <p className="text-micro text-primary/35 -mt-1">Entrada → transformación → salida</p>
              <div className="flex flex-col gap-1">
                {receta.map(([campo, label, value]) => (
                  <div key={campo} className="px-2 py-1">
                    <span className="text-micro font-bold text-primary/45">{label}</span>
                    <textarea
                      className="mt-0.5 w-full min-h-[2rem] bg-transparent px-0 py-0.5 text-micro leading-relaxed text-primary/65 resize-none outline-none transition-colors placeholder:text-primary/25"
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

            <div className="flex flex-col gap-1.5 min-w-0 p-2">
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
                Condiciones
              </span>
              <textarea
                className="w-full min-h-[4rem] bg-transparent px-0 py-1 text-micro leading-relaxed text-primary/55 resize-none outline-none transition-colors placeholder:text-primary/25 whitespace-pre-wrap"
                placeholder="Bajo qué condiciones ocurre este proceso…"
                value={local.condiciones ?? ""}
                onChange={(e) => setLocal((p) => ({ ...p, condiciones: e.target.value }))}
                onBlur={() => campoBlur("condiciones")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-0">
            <ReaccionesVinculadasBloque
              procesoId={proceso.id}
              reacciones={reacciones}
              onAbrirReaccion={onAbrirReaccion}
            />

            <div className="flex flex-col gap-1.5 min-w-0 p-2">
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
                Notas
              </span>
              <textarea
                className="w-full min-h-[4rem] bg-transparent px-0 py-1 text-micro leading-relaxed text-primary/50 resize-none outline-none transition-colors placeholder:text-primary/25 whitespace-pre-wrap"
                placeholder="Notas libres…"
                value={local.notas ?? ""}
                onChange={(e) => setLocal((p) => ({ ...p, notas: e.target.value }))}
                onBlur={() => campoBlur("notas")}
              />
            </div>
          </div>
        </div>
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
}: {
  proceso: Proceso;
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Proceso>) => void;
  onEliminar?: (id: string) => void;
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
}

export default function ProcesosPage({ creating: creatingProp, onCreate, onEliminar: onEliminarProp }: ProcesosPageProps = {}) {
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
        />
      )}
    </div>
  );
}
