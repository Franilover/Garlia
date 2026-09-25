"use client";

/**
 * ReaccionesPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Sub-sección "Reacciones" dentro de Química, apilada debajo de Grupos de
 * Compuestos: catálogo de recetas reutilizables de consume/produce (ej.
 * "Fotosíntesis básica" = consume Luz+Agua, produce Glucosa+Oxígeno).
 *
 * Reacción es un concepto independiente de Proceso (no una etapa obligatoria
 * dentro de él, ver documentacion_sistema #1120): representa una
 * transformación material específica y puede vincularse opcionalmente desde
 * Procesos (Flora/Minerales) y Habilidades (Items) — editar la Reacción acá
 * actualiza todos los lugares que la usan, pero un Proceso sin Reacción
 * asociada es un estado normal, no incompleto.
 *
 * Mismo lenguaje visual que ProcesosPage: grid tipo "biblioteca" con
 * columnas responsivas tipo mampostería y casillas estilo tabla periódica
 * (en vez de las pills sueltas en flex-wrap que tenía antes) + panel
 * flotante centrado con el detalle (SelectorConsumeProduce +
 * BalanceProcesoPanel + notas).
 */

import { Beaker, RefreshCw, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TituloCategoria } from "../_shared/TituloCategoria";
import { useConfirm } from "@/ui/ConfirmModal";
import { type SaveStatus } from "@/ui/saveStatus";

import { SelectorConsumeProduce, type ItemProceso } from "@/domains/garlia/flora/SelectorConsumeProduce";
import { BalanceProcesoPanel } from "@/domains/garlia/_shared/BalanceProcesoPanel";
import { EditorHeaderBar } from "../_shared/EditorHeaderBar";
import { usePublishHeaderControls, type OnHeaderControlsChange } from "../_shared/useEditorHeaderControls";

import type { Compuesto, Elemento, Reaccion } from "./types";
import { persistirReaccion } from "./persistirReaccion";
import { useProcesos } from "./useProcesos";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";
import { CONFIG_PROCESO_REACCIONES, type ProcesoReaccion } from "./types";

/**
 * Cuenta cuántas columnas de `minColWidth`px (+ `gap`px entre ellas) caben en
 * el ancho actual del contenedor referenciado. Mismo helper que en
 * ProcesosPage.tsx/MaterialesPage.tsx — replicado acá para el mismo diseño.
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
 * tamaños dispares. Mismo helper que en ProcesosPage/MaterialesPage.
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

/** Casilla de una Reacción en el grid tipo tabla periódica — mismo lenguaje
 *  visual que ProcesoCasilla/EstructuraCasilla (tarjeta de grilla con
 *  bordes compartidos, sin fondo, sin rounded), en vez de la pill suelta
 *  que tenía antes. Reacción no tiene un "símbolo" corto propio, así que
 *  el nombre ocupa el lugar central, igual que en ProcesoCasilla. */
function ReaccionCasilla({
  reaccion,
  seleccionado,
  onClick,
}: {
  reaccion: Reaccion;
  seleccionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={reaccion.nombre || "(sin nombre)"}
      className={`group flex flex-col items-center justify-center gap-0.5 p-1.5 border-r border-b transition-colors text-center ${
        seleccionado
          ? "border-primary/10 bg-primary/10 ring-1 ring-inset ring-primary/40"
          : "border-primary/10 hover:bg-primary/5"
      }`}
    >
      <span className="text-sm font-black leading-tight text-primary/70 line-clamp-3">
        {reaccion.nombre || "(sin nombre)"}
      </span>
    </button>
  );
}

/** Único grupo (Reacción no tiene un campo "tipo" propio para subdividir,
 *  a diferencia de Proceso) con su título y su grid — mismo patrón que
 *  ChipGrupoProcesos en ProcesosPage.tsx.
 *
 *  minmax(140px…) en vez de los 68px de Fenómenos/Materiales: Reacción
 *  también usa frases largas como nombre (ej. "Acumulación y Descarga de
 *  Energía"), que a 68px quedaban cortadas incluso con line-clamp-2 — una
 *  casilla más ancha les da lugar a esas frases sin achicar tanto el
 *  texto. Mismo ancho que ChipGrupoProcesos, para que ambas secciones se
 *  vean consistentes entre sí. */
function ChipGrupoReacciones({
  titulo,
  items,
  seleccionadoId,
  onSeleccionar,
}: {
  titulo: string;
  items: Reaccion[];
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
        {items.map((reaccion) => (
          <ReaccionCasilla
            key={reaccion.id}
            reaccion={reaccion}
            seleccionado={reaccion.id === seleccionadoId}
            onClick={() => onSeleccionar(reaccion.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface Props {
  reacciones: Reaccion[];
  compuestos: Compuesto[];
  elementos: Elemento[];
  loading?: boolean;
  creating?: boolean;
  onCreate?: () => void;
  onActualizar: (id: string, cambios: Partial<Reaccion>) => void;
  onEliminar?: (id: string) => void;
  onAbrirItem?: (item: ItemProceso) => void;
}

export function ReaccionesPage({
  reacciones,
  compuestos,
  elementos,
  loading,
  creating,
  onCreate,
  onActualizar,
  onEliminar,
  onAbrirItem,
}: Props) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  // Persiste en Supabase y recién después actualiza el estado local del
  // padre — mismo patrón que guardar() en GruposCompuestosPage.
  async function guardar(id: string, cambios: Partial<Reaccion>) {
    onActualizar(id, cambios); // optimista: refleja el cambio ya mismo
    const { error } = await persistirReaccion(id, cambios);
    if (error) {
      console.error("[ReaccionesPage] error guardando reacción:", error);
    }
  }

  const activo = useMemo(
    () => reacciones.find((r) => r.id === seleccionadoId) ?? null,
    [reacciones, seleccionadoId],
  );

  // Mismo layout tipo "biblioteca" que Procesos/Materiales/Estructuras/
  // Compuestos: un único grupo (Reacción no tiene "tipo" para subdividir)
  // repartido en columnas responsivas tipo mampostería, con un grid de
  // casillas estilo tabla periódica — reemplaza la lista plana de pills.
  const mampContainerRef = useRef<HTMLDivElement>(null);
  const numColumnas = useResponsiveColumnCount(mampContainerRef, 260, 16);
  const grupoUnico = useMemo(
    () => (reacciones.length > 0 ? [{ id: "__todas__", nombre: "Reacciones", items: reacciones }] : []),
    [reacciones],
  );
  const columnasDeGrupos = useMemo(
    () => distribuirEnColumnas(grupoUnico, numColumnas, (g) => g.items.length),
    [grupoUnico, numColumnas],
  );

  // Si se crea una reacción nueva, abrirla automáticamente — pero solo
  // después de que la carga inicial haya terminado de verdad (loading ===
  // false). Antes, idsConocidosRef arrancaba con new Set(reacciones.map(...))
  // en el primer render, cuando `reacciones` casi siempre es [] (el fetch
  // a Supabase/Dexie todavía no resolvió) — el set arrancaba vacío, así
  // que en cuanto llegaban los datos reales TODA la lista se veía "nueva"
  // contra ese set vacío y `.find()` devolvía la primera fila del array
  // (ej. la reacción más vieja, tipo "Fotosíntesis"), abriendo su panel
  // flotante solo sin que el usuario clickeara nada — y como pasa en cada
  // carga de la página, se veía como "siempre se abre Fotosíntesis".
  // Usar `loading` en vez de "primer array no vacío" además cubre el caso
  // cache-first de useSupabaseData: Dexie puede pintar una primera tanda
  // de datos reales (de una sesión anterior) mientras loading sigue true,
  // y esa tanda tampoco debe contarse como línea base todavía — recién
  // cuando loading pasa a false se fija la línea base real.
  const idsConocidosRef = React.useRef<Set<string> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (idsConocidosRef.current === null) {
      // Primera vez que la carga terminó: la tomamos como línea base,
      // sin disparar apertura automática.
      idsConocidosRef.current = new Set(reacciones.map((r) => r.id));
      return;
    }
    const nueva = reacciones.find((r) => !idsConocidosRef.current!.has(r.id));
    idsConocidosRef.current = new Set(reacciones.map((r) => r.id));
    if (nueva) setSeleccionadoId(nueva.id);
  }, [reacciones, loading]);

  return (
    <div className="p-3 flex flex-col gap-3">
      {loading && reacciones.length === 0 ? (
        <div className="py-6 text-micro text-primary/30 text-center">Cargando…</div>
      ) : reacciones.length === 0 ? (
        <div className="py-6 text-micro text-primary/25 text-center">
          Todavía no hay reacciones creadas. Una Reacción es opcional: representa una
          transformación material específica (consume/produce) y puede vincularse a un
          Proceso, pero no todo Proceso necesita una.
        </div>
      ) : (
        <div ref={mampContainerRef} className="flex w-full items-start gap-4">
          {columnasDeGrupos.map((columna, colIdx) => (
            <div key={colIdx} className="flex min-w-0 flex-1 flex-col">
              {columna.map((grupo) => (
                <div key={grupo.id} className="mb-4">
                  <ChipGrupoReacciones
                    titulo={grupo.nombre}
                    items={grupo.items}
                    seleccionadoId={seleccionadoId}
                    onSeleccionar={(id) =>
                      setSeleccionadoId((actual) => (actual === id ? null : id))
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activo && (
        <ReaccionPanelFlotante
          reaccion={activo}
          compuestos={compuestos}
          elementos={elementos}
          onCerrar={() => setSeleccionadoId(null)}
          onActualizar={guardar}
          onEliminar={
            onEliminar
              ? (id) => {
                  onEliminar(id);
                  setSeleccionadoId(null);
                }
              : undefined
          }
          onAbrirItem={onAbrirItem}
        />
      )}
    </div>
  );
}

/**
 * Panel flotante centrado del detalle de una Reacción — mismo comportamiento
 * visual que GrupoCompuestoPanelFlotante: modal centrado con backdrop blur,
 * cierra con click en el backdrop, Escape, o el botón X.
 */
const ESTADOS_REACCION = ["definida", "en_revision", "estable", "obsoleta"] as const;

export function ReaccionPanelFlotante({
  reaccion,
  compuestos,
  elementos,
  onCerrar,
  onActualizar,
  onEliminar,
  onAbrirItem,
  onHeaderControlsChange,
}: {
  reaccion: Reaccion;
  compuestos: Compuesto[];
  elementos: Elemento[];
  onCerrar: () => void;
  onActualizar: (id: string, cambios: Partial<Reaccion>) => void;
  onEliminar?: (id: string) => void;
  onAbrirItem?: (item: ItemProceso) => void;
  /** Publica los controles de header hacia el contenedor (mismo patrón que
   *  ElementoEditor/CompuestoEditor) para evitar la barra duplicada cuando
   *  este panel se monta dentro de otro que ya tiene su propia barra. Si no
   *  se pasa (uso actual desde EditorItem/GridCatalogoGrupo/ReaccionesPage),
   *  el panel sigue mostrando su propia EditorHeaderBar. */
  onHeaderControlsChange?: OnHeaderControlsChange;
}) {
  const { confirm, ConfirmModal } = useConfirm();
  const [local, setLocal] = useState(reaccion);
  const [saving, setSaving] = useState(false);

  useEffect(() => setLocal(reaccion), [reaccion]);

  // Procesos donde esta Reacción está vinculada — informativo, mismo
  // criterio que "Usado en compuestos" en ElementoEditor: la relación es
  // opcional y de solo lectura desde acá (se edita desde el editor de
  // Proceso, no desde acá — Reacción no "posee" a Proceso).
  const { items: procesosCatalogo } = useProcesos();
  const { data: vinculosProcesoReaccion } = useSupabaseData<ProcesoReaccion>(
    CONFIG_PROCESO_REACCIONES.tabla,
    { select: CONFIG_PROCESO_REACCIONES.select },
  );
  const procesosQueLaUsan = useMemo(
    () =>
      vinculosProcesoReaccion
        .filter((v) => v.reaccion_id === reaccion.id)
        .map((v) => ({
          vinculo: v,
          proceso: procesosCatalogo.find((p) => p.id === v.proceso_id),
        }))
        .filter((x): x is { vinculo: ProcesoReaccion; proceso: NonNullable<typeof x.proceso> } => !!x.proceso),
    [vinculosProcesoReaccion, procesosCatalogo, reaccion.id],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCerrar]);

  // persist() envuelve onActualizar (que en todos los callers ya hace el
  // guardado optimista + persistirReaccion) solo para mostrar el indicador
  // de guardado — mismo criterio visual que ElementoEditor/CompuestoEditor,
  // sin duplicar la lógica de persistencia real que ya vive en el caller.
  function persist(cambios: Partial<Reaccion>) {
    setSaving(true);
    onActualizar(reaccion.id, cambios);
    setSaving(false);
  }

  async function handleEliminar() {
    if (!onEliminar) return;
    const ok = await confirm({
      title: "Eliminar reacción",
      message: `¿Eliminar "${local.nombre || "(sin nombre)"}"? Esta acción no se puede deshacer.`,
    });
    if (ok) onEliminar(reaccion.id);
  }

  const status: SaveStatus = saving ? "saving" : "idle";

  const headerControls = {
    IconoFallback: Beaker,
    nombre: local.nombre ?? "",
    placeholderNombre: "Nombre de la reacción (ej: Fotosíntesis básica)…",
    onChangeNombre: (nombre: string) => {
      setLocal((p) => ({ ...p, nombre }));
      persist({ nombre });
    },
    status,
    onGuardar: () => persist({ nombre: local.nombre }),
    onEliminar: handleEliminar,
    extra: (
      <>
        {/* Reversible: toggle sí/no — mismo lenguaje visual que el toggle
            Química/Humana de ElementoEditor (botón con borde, icono +
            etiqueta corta), en vez de un checkbox nativo. */}
        <button
          type="button"
          onClick={() => {
            const reversible = !local.reversible;
            setLocal((p) => ({ ...p, reversible }));
            persist({ reversible });
          }}
          title={local.reversible ? "Reacción reversible" : "Reacción no reversible"}
          aria-pressed={local.reversible}
          className={`shrink-0 flex items-center gap-1 px-2 h-6 rounded-md border text-micro font-black uppercase tracking-widest transition-all cursor-pointer ${
            local.reversible
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-primary/15 text-primary/40 hover:text-primary hover:border-primary/35 hover:bg-primary/5"
          }`}
        >
          <RefreshCw size={11} />
          <span className="hidden sm:inline">Reversible</span>
        </button>

        {/* Estado del ciclo de vida — mismo criterio que estado_fundamento
            en Proceso: un select compacto, no un badge de solo lectura. */}
        <select
          value={local.estado ?? "definida"}
          onChange={(e) => {
            const estado = e.target.value;
            setLocal((p) => ({ ...p, estado }));
            persist({ estado });
          }}
          title="Estado"
          className="shrink-0 bg-primary/5 rounded-md px-1.5 h-6 text-micro font-bold text-primary outline-none border border-primary/10 focus:border-primary/30 capitalize"
        >
          {ESTADOS_REACCION.map((e) => (
            <option key={e} value={e} className="capitalize">
              {e.replace("_", " ")}
            </option>
          ))}
        </select>

        {/* Versión: número entero, edición directa — mismo patrón de input
            angosto que el símbolo de ElementoEditor. */}
        <input
          type="number"
          min={1}
          value={local.version ?? 1}
          onChange={(e) => setLocal((p) => ({ ...p, version: Math.max(1, Number(e.target.value)) }))}
          onBlur={() => persist({ version: local.version })}
          title="Versión"
          className="shrink-0 w-10 text-center bg-primary/5 rounded-md px-1 py-0.5 text-micro font-black text-primary outline-none border border-primary/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </>
    ),
  };

  usePublishHeaderControls(headerControls, onHeaderControlsChange);

  const body = (
    <div className="flex-1 min-h-0 overflow-y-auto p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
              Consume
            </span>
            <SelectorConsumeProduce
              label="Consume"
              items={(reaccion.consume ?? []) as ItemProceso[]}
              onChange={(consume) => onActualizar(reaccion.id, { consume })}
              elementos={elementos}
              compuestos={compuestos}
              onAbrirItem={onAbrirItem}
            />
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
              Produce
            </span>
            <SelectorConsumeProduce
              label="Produce"
              items={(reaccion.produce ?? []) as ItemProceso[]}
              onChange={(produce) => onActualizar(reaccion.id, { produce })}
              elementos={elementos}
              compuestos={compuestos}
              onAbrirItem={onAbrirItem}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
              Balance
            </span>
            <BalanceProcesoPanel
              consume={(reaccion.consume ?? []) as ItemProceso[]}
              produce={(reaccion.produce ?? []) as ItemProceso[]}
              compuestos={compuestos}
              elementos={elementos}
              onAutocompletar={(produce) => onActualizar(reaccion.id, { produce })}
            />
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
              Descripción
            </span>
            <textarea
              className="w-full min-h-[8rem] bg-transparent px-0 py-1 text-micro leading-relaxed text-primary/70 resize-none outline-none transition-colors placeholder:text-primary/25"
              placeholder="Condiciones, notas, contexto de esta reacción…"
              value={reaccion.descripcion ?? ""}
              onChange={(e) => onActualizar(reaccion.id, { descripcion: e.target.value })}
            />
          </div>

          {procesosQueLaUsan.length > 0 && (
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-micro font-black uppercase tracking-[0.2em] text-primary/30">
                Usado en procesos
              </span>
              <div className="flex flex-col gap-1">
                {procesosQueLaUsan.map(({ vinculo, proceso }) => (
                  <div
                    key={vinculo.id}
                    className="flex items-center justify-between gap-2 px-2 py-1 rounded-md border border-primary/10"
                  >
                    <span className="text-micro font-bold text-primary/70 truncate">
                      {proceso.nombre}
                    </span>
                    {vinculo.rol && (
                      <span className="text-micro text-primary/40 truncate">{vinculo.rol}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Uso embebido (onHeaderControlsChange presente, ej. dentro de un panel
  // apilado de Proceso): sin portal ni backdrop propios, el contenedor
  // padre ya resuelve eso y renderiza esta barra en la suya.
  if (onHeaderControlsChange) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ConfirmModal />
        {body}
      </div>
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{
        background: "color-mix(in srgb, var(--primary) 35%, transparent)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className="w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "var(--bg-main)",
          border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          animation: "popIn 160ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ConfirmModal />
        <div className="shrink-0 flex items-stretch">
          <div className="flex-1 min-w-0">
            <EditorHeaderBar controls={headerControls} />
          </div>
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar (Esc)"
            className="shrink-0 px-3 flex items-center justify-center text-primary/40 hover:text-primary transition-colors cursor-pointer border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <X size={16} />
          </button>
        </div>
        {body}
      </div>
    </div>,
    document.body,
  );
}
