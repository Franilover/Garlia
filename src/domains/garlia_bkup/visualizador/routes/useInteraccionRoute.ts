"use client";

/**
 * useInteraccionRoute.ts
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-05 — Interacción (visualizador_estado, orden 5): "¿Qué ocurre cuando
 * dos entidades interactúan?" — cadena visual
 * evento → interacción → efecto → nuevo estado/nuevo evento, conectada al
 * motor real.
 *
 * Fase 2026-09 (pedido explícito): Interacción pasa a ser el hub único del
 * Sandbox — absorbe TODO lo que antes vivía en SandboxPage.tsx como tab
 * aparte (crear/cargar/descartar simulación, agregar entidad desde
 * catálogo, snapshots) más el motor físico nuevo (temperatura, fuerza,
 * daño, transferencias, información, Eterium, contexto gravitacional).
 * SandboxPage.tsx y su código NO se borran (mismo criterio que "oris"/
 * "elementos_ruta" retirados del nav antes) — solo se retira "sandbox" de
 * navGroups porque ahora Interacción cubre el mismo terreno.
 *
 * Igual que antes: este archivo NO calcula nada nuevo, envuelve tal cual el
 * dominio Sandbox ya existente (sandbox/useSandbox.ts,
 * sandbox/sandboxService.ts, sandbox/types.ts), que ya habla directo con
 * las RPCs canónicas y con las tablas sandbox_simulaciones /
 * sandbox_entidades / sandbox_eventos / sandbox_snapshots.
 *
 * Lo que agrega esta ruta, específico de VIS-05:
 *   - Selección de simulación activa, y ahora también CREAR una simulación
 *     nueva (antes solo SandboxPage podía) — useListaSandboxes + useCrearSandbox.
 *   - Agregar entidad desde el catálogo real de Elementos/Compuestos —
 *     mismo criterio de estadoInicialDeElemento/DeCompuesto que ya usaba
 *     SandboxPage, copiado tal cual (no se reinventa qué copiar).
 *   - `cadena`: por cada sandbox_evento, arma los 4 nodos que pide el docx
 *     (Evento → Interacción → Efecto → Nuevo estado) a partir de datos
 *     reales: el evento_id resuelto contra el catálogo interaccion_eventos,
 *     el sujeto/objetivo resueltos contra sandbox_entidades, y el estado
 *     resultante leído de estado_actual de la entidad sujeto. Ningún campo
 *     se inventa: si el evento está "pendiente", el nodo "Efecto" y
 *     "Nuevo estado" se marcan sin dato (title: null) en vez de simular un
 *     resultado que el motor todavía no calculó.
 *   - `cadenaCausal`: sigue evento_origen_id hacia atrás (docx "trace
 *     causal") — un evento puede haber sido disparado por otro evento
 *     procesado, formando una cadena real, no solo el par sujeto/objetivo.
 *   - Selección de un evento de la timeline para fijar cuál cadena se
 *     muestra en el Inspector/TraceView (mismo patrón que
 *     nodoSelId/vecinoSel en CompatibilidadSection).
 *
 * No se persiste ni deriva ningún dato de interacción en el frontend: play/
 * pause/step/reset y "disparar evento" siguen yendo tal cual a
 * control_sandbox / encolar_evento_sandbox vía useSandbox(). Lo mismo para
 * las acciones del motor físico: cada una es un wrapper 1:1 sobre la RPC
 * real, nunca una aproximación calculada acá.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useCompuestos } from "@/domains/garlia/elementos/useCompuestos";
import { useElementos } from "@/domains/garlia/elementos/useElementos";
import type { Compuesto, Elemento } from "@/domains/garlia/elementos/types";

import { useCrearSandbox, useListaSandboxes, useSandbox } from "@/domains/garlia/sandbox/useSandbox";
import { estadoInicialDeCompuesto, estadoInicialDeElemento } from "@/domains/garlia/sandbox/estadoInicial";
import type {
  InteraccionEventoCatalogo,
  SandboxEntidad,
  SandboxEvento,
} from "@/domains/garlia/sandbox/types";

/** Un nodo de la cadena causal (docx: Evento → Interacción → Efecto →
 *  Nuevo estado/Nuevo evento). `title: null` es explícito "sin dato
 *  todavía" — nunca se sustituye por un valor supuesto. */
export interface NodoCadenaInteraccion {
  id: string;
  levelLabel: string;
  title: string | null;
  subtitle?: string | null;
}

export interface EventoConEntidades {
  evento: SandboxEvento;
  catalogo: InteraccionEventoCatalogo | null;
  sujeto: SandboxEntidad | null;
  objetivo: SandboxEntidad | null;
  /** Evento que disparó este (si evento_origen_id apunta a uno ya conocido
   *  en esta simulación) — para pintar la cadena causal en la timeline. */
  origen: SandboxEvento | null;
}

function labelEntidad(e: SandboxEntidad | null): string | null {
  if (!e) return null;
  return e.entidad_tipo;
}

/** Resume estado_actual.estados en algo mostrable sin inventar semántica:
 *  cuenta cuántos "estados" están activos ahora mismo. Los valores
 *  concretos (intensidad, datos) quedan para el Inspector, no para el
 *  título del nodo. */
function resumenEstado(e: SandboxEntidad | null): string | null {
  if (!e) return null;
  const activos = Object.entries(e.estado_actual?.estados ?? {}).filter(([, v]) => v?.activo);
  if (activos.length === 0) return "Sin estados activos";
  return activos.map(([clave]) => clave).join(", ");
}

export interface InteraccionRouteState {
  loading: boolean;
  empty: boolean;
  error: string | null;

  // ─── Simulación activa ──────────────────────────────────────────────────
  simulaciones: ReturnType<typeof useListaSandboxes>["simulaciones"];
  simulacionId: string | null;
  setSimulacionId: (id: string | null) => void;

  /** Crea una simulación nueva y la selecciona — antes solo SandboxPage
   *  podía hacer esto. */
  crearSimulacion: (nombre: string) => Promise<string | null>;
  creandoSimulacion: boolean;
  /** Marca la simulación activa como descartada y limpia la selección. */
  descartarSimulacion: () => Promise<boolean>;

  entidades: SandboxEntidad[];
  eventos: SandboxEvento[];
  catalogoEventos: InteraccionEventoCatalogo[];
  tiempoSimulado: number | null;
  simulacionActiva: ReturnType<typeof useSandbox>["simulacion"];

  // ─── Catálogo real (Elemento/Compuesto) para agregar entidades ─────────
  elementos: Elemento[];
  compuestos: Compuesto[];
  loadingCatalogoElementos: boolean;
  loadingCatalogoCompuestos: boolean;
  /** Copia un Elemento o Compuesto del catálogo al Sandbox — mismo
   *  criterio que ya usaba SandboxPage (estadoInicialDeElemento/
   *  DeCompuesto, ver sandbox/estadoInicial.ts): copia valores ya
   *  calculados, no recalcula nada. */
  agregarEntidadDesdeCatalogo: (params: {
    entidadTipo: "elemento" | "compuesto";
    entidadOrigenId: string;
  }) => Promise<string | null>;

  /** Todos los sandbox_eventos de la simulación activa, ya resueltos
   *  contra entidades/catálogo — para pintar la timeline (docx: "timeline,
   *  nodos causales, log"). Ordenados por tiempo_programado (mismo orden
   *  que sandboxService.listarEventos ya devuelve). */
  eventosResueltos: EventoConEntidades[];

  /** Evento fijado por click en la timeline. null = ninguno seleccionado
   *  todavía (se autoselecciona el más reciente si existe, igual que el
   *  resto de secciones autoseleccionan el primer ítem). */
  eventoSelId: string | null;
  setEventoSelId: (id: string | null) => void;
  eventoSel: EventoConEntidades | null;

  /** Cadena Evento → Interacción → Efecto → Nuevo estado del evento
   *  seleccionado — lista para pasar directo a <TraceView steps={...}/>. */
  cadena: NodoCadenaInteraccion[];

  /** Cadena causal completa (docx "trace causal"): sigue evento_origen_id
   *  hacia atrás desde el evento seleccionado, más recientes primero. Un
   *  único evento sin origen es una cadena de longitud 1 — no es un error. */
  cadenaCausal: SandboxEvento[];

  // ─── Entidad seleccionada para el panel de acciones físicas ────────────
  entidadSelId: string | null;
  setEntidadSelId: (id: string | null) => void;
  entidadSel: SandboxEntidad | null;

  // ─── Snapshots ──────────────────────────────────────────────────────────
  snapshots: ReturnType<typeof useSandbox>["snapshots"];
  crearSnapshot: (etiqueta?: string) => Promise<string | null>;
  restaurarSnapshot: (snapshotId: string) => Promise<boolean>;

  // ─── Contexto gravitacional ─────────────────────────────────────────────
  contextosGravitacionales: ReturnType<typeof useSandbox>["contextosGravitacionales"];
  asignarContextoGravitacional: (contextoGravitacionalId: string) => void;

  // ─── Edición manual de estado ───────────────────────────────────────────
  actualizarEstadoEntidad: ReturnType<typeof useSandbox>["actualizarEstadoEntidad"];

  // ─── Control del motor (delegado tal cual a useSandbox) ────────────────
  ejecutandoAccion: boolean;
  play: () => void;
  pause: () => void;
  step: (delta?: number) => void;
  reset: () => void;
  dispararEvento: (params: {
    eventoId: string;
    entidadId: string;
    tiempoProgramado?: number | null;
    datos?: Record<string, unknown>;
  }) => void;

  // ─── Motor físico: acciones puntuales (delegadas tal cual a useSandbox) ─
  establecerTemperatura: ReturnType<typeof useSandbox>["establecerTemperatura"];
  aplicarDeltaTemperatura: ReturnType<typeof useSandbox>["aplicarDeltaTemperatura"];
  aplicarDanioMecanico: ReturnType<typeof useSandbox>["aplicarDanioMecanico"];
  aplicarFuerza: ReturnType<typeof useSandbox>["aplicarFuerza"];
  transferirEnergia: ReturnType<typeof useSandbox>["transferirEnergia"];
  transferirCarga: ReturnType<typeof useSandbox>["transferirCarga"];
  transmitirInformacion: ReturnType<typeof useSandbox>["transmitirInformacion"];
  aplicarEterium: ReturnType<typeof useSandbox>["aplicarEterium"];
  calcularMetricasDinamicas: ReturnType<typeof useSandbox>["calcularMetricasDinamicas"];
  calcularEnergiaCinetica: ReturnType<typeof useSandbox>["calcularEnergiaCinetica"];
  resolverPeso: ReturnType<typeof useSandbox>["resolverPeso"];
}

export function useInteraccionRoute(): InteraccionRouteState {
  const { simulaciones, loading: loadingSimulaciones, refetch: refetchSimulaciones } = useListaSandboxes();
  const [simulacionId, setSimulacionIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!simulacionId && simulaciones.length > 0) {
      setSimulacionIdState(simulaciones[0].id);
    }
  }, [simulaciones, simulacionId]);

  function setSimulacionId(id: string | null) {
    setSimulacionIdState(id);
  }

  const sandbox = useSandbox(simulacionId);

  // ─── Crear / descartar simulación (antes solo en SandboxPage) ──────────
  const { crear, creando: creandoSimulacion } = useCrearSandbox();

  const crearSimulacion = useCallback(
    async (nombre: string) => {
      const id = await crear(nombre);
      if (id) {
        await refetchSimulaciones();
        setSimulacionIdState(id);
      }
      return id;
    },
    [crear, refetchSimulaciones],
  );

  const descartarSimulacion = useCallback(async () => {
    const ok = await sandbox.descartar();
    if (ok) {
      await refetchSimulaciones();
      setSimulacionIdState(null);
    }
    return ok;
  }, [sandbox, refetchSimulaciones]);

  // ─── Catálogo real de Elementos/Compuestos, para "agregar entidad" ─────
  const { items: elementos, loading: loadingCatalogoElementos } = useElementos();
  const { items: compuestos, loading: loadingCatalogoCompuestos } = useCompuestos();

  const agregarEntidadDesdeCatalogo = useCallback(
    async (params: { entidadTipo: "elemento" | "compuesto"; entidadOrigenId: string }) => {
      const origen =
        params.entidadTipo === "elemento"
          ? elementos.find((e) => e.id === params.entidadOrigenId)
          : compuestos.find((c) => c.id === params.entidadOrigenId);
      if (!origen) return null;

      const estadoInicial =
        params.entidadTipo === "elemento"
          ? estadoInicialDeElemento(origen as Elemento)
          : estadoInicialDeCompuesto(origen as Compuesto);

      return sandbox.agregarEntidadDesdeCatalogo({
        entidadTipo: params.entidadTipo,
        entidadOrigenId: params.entidadOrigenId,
        estadoInicial,
      });
    },
    [elementos, compuestos, sandbox],
  );

  const [eventoSelId, setEventoSelIdState] = useState<string | null>(null);
  const [entidadSelId, setEntidadSelIdState] = useState<string | null>(null);

  // Cambiar de simulación invalida cualquier selección previa — un evento
  // de otra simulación no tiene sentido acá (mismo criterio que
  // CompatibilidadSection resetea nodoSelId al cambiar tipoActivo).
  useEffect(() => {
    setEventoSelIdState(null);
    setEntidadSelIdState(null);
  }, [simulacionId]);

  const entidadSel = useMemo(
    () => sandbox.entidades.find((e) => e.id === entidadSelId) ?? null,
    [sandbox.entidades, entidadSelId],
  );

  const entidadesPorId = useMemo(() => {
    const mapa = new Map<string, SandboxEntidad>();
    for (const e of sandbox.entidades) mapa.set(e.id, e);
    return mapa;
  }, [sandbox.entidades]);

  const catalogoPorId = useMemo(() => {
    const mapa = new Map<string, InteraccionEventoCatalogo>();
    for (const c of sandbox.catalogoEventos) mapa.set(c.id, c);
    return mapa;
  }, [sandbox.catalogoEventos]);

  const eventosPorId = useMemo(() => {
    const mapa = new Map<string, SandboxEvento>();
    for (const ev of sandbox.eventos) mapa.set(ev.id, ev);
    return mapa;
  }, [sandbox.eventos]);

  const eventosResueltos = useMemo<EventoConEntidades[]>(
    () =>
      sandbox.eventos.map((evento) => ({
        evento,
        catalogo: catalogoPorId.get(evento.evento_id) ?? null,
        sujeto: entidadesPorId.get(evento.sujeto_sandbox_id) ?? null,
        objetivo: evento.objetivo_sandbox_id ? entidadesPorId.get(evento.objetivo_sandbox_id) ?? null : null,
        origen: evento.evento_origen_id ? eventosPorId.get(evento.evento_origen_id) ?? null : null,
      })),
    [sandbox.eventos, catalogoPorId, entidadesPorId, eventosPorId],
  );


  // Autoselección: el evento más reciente por tiempo_programado (docx
  // punto por defecto — mismo patrón que orisSel/materialSel en
  // VisualizadorPage, "si no hay selección, tomar el primero disponible").
  useEffect(() => {
    if (eventosResueltos.length === 0) {
      if (eventoSelId !== null) setEventoSelIdState(null);
      return;
    }
    if (!eventoSelId || !eventosResueltos.some((e) => e.evento.id === eventoSelId)) {
      setEventoSelIdState(eventosResueltos[eventosResueltos.length - 1].evento.id);
    }
  }, [eventosResueltos, eventoSelId]);

  const eventoSel = useMemo(
    () => eventosResueltos.find((e) => e.evento.id === eventoSelId) ?? null,
    [eventosResueltos, eventoSelId],
  );

  const cadena = useMemo<NodoCadenaInteraccion[]>(() => {
    if (!eventoSel) {
      return [
        { id: "n-evento", levelLabel: "Evento", title: null },
        { id: "n-interaccion", levelLabel: "Interacción", title: null },
        { id: "n-efecto", levelLabel: "Efecto", title: null },
        { id: "n-estado", levelLabel: "Nuevo estado", title: null },
      ];
    }
    const { evento, catalogo, sujeto, objetivo } = eventoSel;
    const procesado = evento.estado === "procesado";
    return [
      {
        id: "n-evento",
        levelLabel: "Evento",
        title: catalogo?.nombre ?? evento.evento_id,
        subtitle: `t=${evento.tiempo_programado}`,
      },
      {
        id: "n-interaccion",
        levelLabel: "Interacción",
        title: labelEntidad(sujeto),
        subtitle: objetivo ? `→ ${labelEntidad(objetivo)}` : "sin objetivo (evento propio)",
      },
      {
        id: "n-efecto",
        levelLabel: "Efecto",
        title: procesado ? "Aplicado" : null,
        subtitle: procesado ? evento.ejecutado_at != null ? `en t=${evento.ejecutado_at}` : undefined : "pendiente de procesar",
      },
      {
        id: "n-estado",
        levelLabel: "Nuevo estado",
        title: procesado ? resumenEstado(sujeto) : null,
      },
    ];
  }, [eventoSel]);

  const cadenaCausal = useMemo<SandboxEvento[]>(() => {
    if (!eventoSel) return [];
    const cadena: SandboxEvento[] = [eventoSel.evento];
    const vistos = new Set([eventoSel.evento.id]);
    let actual: SandboxEvento | null = eventoSel.evento;
    while (actual?.evento_origen_id) {
      const anterior = eventosPorId.get(actual.evento_origen_id);
      if (!anterior || vistos.has(anterior.id)) break;
      cadena.push(anterior);
      vistos.add(anterior.id);
      actual = anterior;
    }
    return cadena;
  }, [eventoSel, eventosPorId]);

  const loading = loadingSimulaciones || sandbox.loading;

  return {
    loading,
    empty: !loading && simulaciones.length === 0,
    error: sandbox.error,

    simulaciones,
    simulacionId,
    setSimulacionId,
    crearSimulacion,
    creandoSimulacion,
    descartarSimulacion,

    entidades: sandbox.entidades,
    eventos: sandbox.eventos,
    catalogoEventos: sandbox.catalogoEventos,
    tiempoSimulado: sandbox.simulacion?.tiempo_simulado ?? null,
    simulacionActiva: sandbox.simulacion,

    elementos,
    compuestos,
    loadingCatalogoElementos,
    loadingCatalogoCompuestos,
    agregarEntidadDesdeCatalogo,

    eventosResueltos,
    eventoSelId,
    setEventoSelId: setEventoSelIdState,
    eventoSel,
    cadena,
    cadenaCausal,

    entidadSelId,
    setEntidadSelId: setEntidadSelIdState,
    entidadSel,

    snapshots: sandbox.snapshots,
    crearSnapshot: sandbox.crearSnapshot,
    restaurarSnapshot: sandbox.restaurarSnapshot,

    contextosGravitacionales: sandbox.contextosGravitacionales,
    asignarContextoGravitacional: sandbox.asignarContextoGravitacional,

    actualizarEstadoEntidad: sandbox.actualizarEstadoEntidad,

    ejecutandoAccion: sandbox.ejecutandoAccion,
    play: sandbox.play,
    pause: sandbox.pause,
    step: sandbox.step,
    reset: sandbox.reset,
    dispararEvento: sandbox.dispararEvento,

    establecerTemperatura: sandbox.establecerTemperatura,
    aplicarDeltaTemperatura: sandbox.aplicarDeltaTemperatura,
    aplicarDanioMecanico: sandbox.aplicarDanioMecanico,
    aplicarFuerza: sandbox.aplicarFuerza,
    transferirEnergia: sandbox.transferirEnergia,
    transferirCarga: sandbox.transferirCarga,
    transmitirInformacion: sandbox.transmitirInformacion,
    aplicarEterium: sandbox.aplicarEterium,
    calcularMetricasDinamicas: sandbox.calcularMetricasDinamicas,
    calcularEnergiaCinetica: sandbox.calcularEnergiaCinetica,
    resolverPeso: sandbox.resolverPeso,
  };
}
