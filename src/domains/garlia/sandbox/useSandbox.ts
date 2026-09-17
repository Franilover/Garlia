"use client";

/**
 * useSandbox.ts — dominio Sandbox
 *
 * Orquestación del Sandbox:
 * Frontend → useSandbox() → sandboxService → RPC Supabase → motor → estado
 *
 * IMPORTANTE:
 * Este hook no contiene reglas de simulación.
 * Solo prepara datos, llama RPCs y vuelve a cargar el estado.
 *
 * Fase 2026-09: se agrega acá el motor físico (acciones puntuales sobre una
 * entidad ya existente — temperatura, fuerza, daño, transferencias,
 * información, Eterium) más snapshots/descarte/contexto gravitacional.
 * Mismo patrón que ya usaban dispararEvento/agregarEntidad: cada acción
 * llama a sandboxService, y si aplica (mutó algo) refetch() para traer el
 * estado_actual real que escribió el motor — nunca se optimiza la UI
 * local por delante de lo que Supabase realmente guardó.
 */

import { useCallback, useEffect, useState } from "react";

import * as sandboxService from "./sandboxService";
import type {
  AccionControlSandbox,
  ContextoGravitacional,
  InteraccionEventoCatalogo,
  ResultadoAccionFisicaSandbox,
  SandboxEntidad,
  SandboxEvento,
  SandboxSimulacion,
  SandboxSnapshot,
  Vector3,
} from "./types";

interface UseSandboxState {
  simulacion: SandboxSimulacion | null;
  entidades: SandboxEntidad[];
  eventos: SandboxEvento[];
  catalogoEventos: InteraccionEventoCatalogo[];
  snapshots: SandboxSnapshot[];
  contextosGravitacionales: ContextoGravitacional[];
  loading: boolean;
  error: string | null;
  ejecutandoAccion: boolean;
}

export function useSandbox(simulacionId: string | null) {
  const [state, setState] = useState<UseSandboxState>({
    simulacion: null,
    entidades: [],
    eventos: [],
    catalogoEventos: [],
    snapshots: [],
    contextosGravitacionales: [],
    loading: false,
    error: null,
    ejecutandoAccion: false,
  });

  const refetch = useCallback(async () => {
    if (!simulacionId) {
      setState((s) => ({
        ...s,
        simulacion: null,
        entidades: [],
        eventos: [],
        snapshots: [],
        loading: false,
        error: null,
      }));
      return;
    }

    setState((s) => ({
      ...s,
      loading: true,
      error: null,
    }));

    try {
      const [simulacion, entidades, eventos, snapshots] = await Promise.all([
        sandboxService.obtenerSimulacion(simulacionId),
        sandboxService.listarEntidades(simulacionId),
        sandboxService.listarEventos(simulacionId),
        sandboxService.listarSnapshots(simulacionId),
      ]);

      setState((s) => ({
        ...s,
        simulacion,
        entidades,
        eventos,
        snapshots,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [simulacionId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    sandboxService
      .listarCatalogoEventos()
      .then((catalogoEventos) =>
        setState((s) => ({
          ...s,
          catalogoEventos,
        })),
      )
      .catch((err) =>
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : String(err),
        })),
      );
    sandboxService
      .listarContextosGravitacionales()
      .then((contextosGravitacionales) =>
        setState((s) => ({
          ...s,
          contextosGravitacionales,
        })),
      )
      .catch((err) =>
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : String(err),
        })),
      );
  }, []);

  const ejecutarControl = useCallback(
    async (accion: AccionControlSandbox, delta?: number) => {
      if (!simulacionId) return;

      setState((s) => ({
        ...s,
        ejecutandoAccion: true,
        error: null,
      }));

      try {
        await sandboxService.controlSandbox(simulacionId, accion, delta);
        await refetch();
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : String(err),
        }));
      } finally {
        setState((s) => ({
          ...s,
          ejecutandoAccion: false,
        }));
      }
    },
    [simulacionId, refetch],
  );

  const dispararEvento = useCallback(
    async (params: {
      eventoId: string;
      entidadId: string;
      tiempoProgramado?: number | null;
      datos?: Record<string, unknown>;
    }) => {
      if (!simulacionId) return;

      setState((s) => ({
        ...s,
        error: null,
      }));

      try {
        await sandboxService.encolarEventoSandbox({
          simulacionId,
          eventoId: params.eventoId,
          entidadId: params.entidadId,
          tiempoProgramado: params.tiempoProgramado,
          datos: params.datos,
        });

        await refetch();
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [simulacionId, refetch],
  );

  const agregarEntidad = useCallback(
    async (params: {
      entidadTipo: string;
      entidadOrigenId?: string | null;
      estadoInicial?: Record<string, unknown>;
    }) => {
      if (!simulacionId) return null;

      setState((s) => ({
        ...s,
        error: null,
      }));

      try {
        const id = await sandboxService.agregarEntidadSandbox({
          simulacionId,
          ...params,
        });

        await refetch();

        return id;
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : String(err),
        }));

        return null;
      }
    },
    [simulacionId, refetch],
  );

  /**
   * Agrega un Elemento o Compuesto del catálogo al Sandbox.
   *
   * No crea una RPC nueva:
   * utiliza agregar_entidad_sandbox existente.
   *
   * El catálogo conserva la identidad mediante entidadOrigenId.
   * estadoInicial contiene únicamente el estado experimental inicial.
   */
  const agregarEntidadDesdeCatalogo = useCallback(
    async (params: {
      entidadTipo: "elemento" | "compuesto";
      entidadOrigenId: string;
      estadoInicial: Record<string, unknown>;
    }) => {
      return agregarEntidad({
        entidadTipo: params.entidadTipo,
        entidadOrigenId: params.entidadOrigenId,
        estadoInicial: params.estadoInicial,
      });
    },
    [agregarEntidad],
  );

  // ─── Descarte / snapshots ────────────────────────────────────────────────

  const descartar = useCallback(async () => {
    if (!simulacionId) return false;
    setState((s) => ({ ...s, ejecutandoAccion: true, error: null }));
    try {
      await sandboxService.descartarSandbox(simulacionId);
      return true;
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
      return false;
    } finally {
      setState((s) => ({ ...s, ejecutandoAccion: false }));
    }
  }, [simulacionId]);

  const crearSnapshot = useCallback(
    async (etiqueta?: string) => {
      if (!simulacionId) return null;
      setState((s) => ({ ...s, error: null }));
      try {
        const id = await sandboxService.crearSnapshotSandbox(simulacionId, etiqueta);
        await refetch();
        return id;
      } catch (err) {
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
        return null;
      }
    },
    [simulacionId, refetch],
  );

  const restaurarSnapshot = useCallback(
    async (snapshotId: string) => {
      setState((s) => ({ ...s, error: null }));
      try {
        await sandboxService.restaurarSnapshotSandbox(snapshotId);
        await refetch();
        return true;
      } catch (err) {
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
        return false;
      }
    },
    [refetch],
  );

  // ─── Contexto gravitacional ─────────────────────────────────────────────

  const asignarContextoGravitacional = useCallback(
    async (contextoGravitacionalId: string) => {
      if (!simulacionId) return null;
      setState((s) => ({ ...s, error: null }));
      try {
        const res = await sandboxService.asignarContextoGravitacionalSandbox({
          simulacionId,
          contextoGravitacionalId,
        });
        await refetch();
        return res;
      } catch (err) {
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
        return null;
      }
    },
    [simulacionId, refetch],
  );

  // ─── Edición manual de estado ───────────────────────────────────────────

  const actualizarEstadoEntidad = useCallback(
    async (params: { entidadId: string; patch: Record<string, unknown>; tiempo?: number | null }) => {
      setState((s) => ({ ...s, error: null }));
      try {
        const res = await sandboxService.actualizarEstadoEntidadSandbox(params);
        await refetch();
        return res;
      } catch (err) {
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
        return null;
      }
    },
    [refetch],
  );

  // ─── Motor físico: acciones puntuales sobre una entidad ────────────────
  // Todas siguen el mismo patrón: llaman al service, refetch si el motor
  // devolvió `aplicado`/mutó algo, y siempre devuelven el jsonb crudo — la
  // UI decide cómo mostrar un estado "informacion_insuficiente" sin que
  // este hook lo trate como excepción.

  const runAccionFisica = useCallback(
    async (fn: () => Promise<ResultadoAccionFisicaSandbox>) => {
      setState((s) => ({ ...s, ejecutandoAccion: true, error: null }));
      try {
        const resultado = await fn();
        await refetch();
        return resultado;
      } catch (err) {
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
        return null;
      } finally {
        setState((s) => ({ ...s, ejecutandoAccion: false }));
      }
    },
    [refetch],
  );

  const establecerTemperatura = useCallback(
    (params: { entidadId: string; temperatura: number; tiempoActual?: number | null; origen?: string }) =>
      runAccionFisica(() => sandboxService.establecerTemperaturaSandbox(params)),
    [runAccionFisica],
  );

  const aplicarDeltaTemperatura = useCallback(
    (params: { entidadId: string; deltaEnergia: number; tiempoActual?: number | null }) =>
      runAccionFisica(() => sandboxService.aplicarDeltaTemperaturaSandbox(params)),
    [runAccionFisica],
  );

  const aplicarDanioMecanico = useCallback(
    (params: { entidadId: string; fraccion: number; tiempoActual?: number | null }) =>
      runAccionFisica(() => sandboxService.aplicarDanioMecanicoSandbox(params)),
    [runAccionFisica],
  );

  const aplicarFuerza = useCallback(
    (params: { entidadId: string; fuerza: Vector3; tiempoActual: number }) =>
      runAccionFisica(() => sandboxService.aplicarFuerzaSandbox(params)),
    [runAccionFisica],
  );

  const transferirEnergia = useCallback(
    (params: { origenId: string; destinoId: string; cantidad: number; tiempoActual?: number | null }) =>
      runAccionFisica(() => sandboxService.transferirEnergiaSandbox(params)),
    [runAccionFisica],
  );

  const transferirCarga = useCallback(
    (params: { origenId: string; destinoId: string; cantidad: number; tiempoActual: number }) =>
      runAccionFisica(() => sandboxService.transferirCargaSandbox(params)),
    [runAccionFisica],
  );

  const transmitirInformacion = useCallback(
    (params: {
      origenId: string;
      destinoId: string;
      contenido: Record<string, unknown>;
      intensidad?: number;
      fidelidad?: number;
      alcance?: number | null;
      modeloAtenuacion?: "lineal" | "inverso" | "cuadratico";
      tiempoActual?: number | null;
    }) => runAccionFisica(() => sandboxService.transmitirInformacionSandbox(params)),
    [runAccionFisica],
  );

  const aplicarEterium = useCallback(
    (params: { entidadId: string; intensidad: number; origen?: string; tiempoActual?: number | null }) =>
      runAccionFisica(() => sandboxService.aplicarEteriumSandbox(params)),
    [runAccionFisica],
  );

  // ─── Motor físico: lecturas/cómputo, sin refetch (no mutan nada) ───────

  const calcularMetricasDinamicas = useCallback(
    (entidadId: string) => sandboxService.calcularMetricasDinamicasSandbox(entidadId),
    [],
  );

  const calcularEnergiaCinetica = useCallback(
    (entidadId: string) => sandboxService.calcularEnergiaCineticaSandbox(entidadId),
    [],
  );

  const resolverPeso = useCallback(
    (entidadId: string) => sandboxService.resolverPesoSandbox(entidadId),
    [],
  );

  return {
    ...state,
    refetch,
    play: () => ejecutarControl("play"),
    pause: () => ejecutarControl("pause"),
    step: (delta?: number) => ejecutarControl("step", delta),
    reset: () => ejecutarControl("reset"),
    dispararEvento,
    agregarEntidad,
    agregarEntidadDesdeCatalogo,
    descartar,
    crearSnapshot,
    restaurarSnapshot,
    asignarContextoGravitacional,
    actualizarEstadoEntidad,
    establecerTemperatura,
    aplicarDeltaTemperatura,
    aplicarDanioMecanico,
    aplicarFuerza,
    transferirEnergia,
    transferirCarga,
    transmitirInformacion,
    aplicarEterium,
    calcularMetricasDinamicas,
    calcularEnergiaCinetica,
    resolverPeso,
  };
}

export function useListaSandboxes() {
  const [simulaciones, setSimulaciones] = useState<SandboxSimulacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await sandboxService.listarSimulaciones();
      setSimulaciones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    simulaciones,
    loading,
    error,
    refetch,
  };
}

export function useCrearSandbox() {
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (
      nombre: string,
      contexto?: Record<string, unknown>,
    ) => {
      setCreando(true);
      setError(null);

      try {
        const id = await sandboxService.crearSandbox(
          nombre,
          contexto,
        );

        return id;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : String(err),
        );

        return null;
      } finally {
        setCreando(false);
      }
    },
    [],
  );

  return {
    crear,
    creando,
    error,
  };
}
