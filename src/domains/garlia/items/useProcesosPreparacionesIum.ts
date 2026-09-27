"use client";

/**
 * useProcesosPreparacionesIum.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Orquesta el flujo canónico que reemplaza al mezclador de IUMs:
 *
 *   procesos del objeto → configuraciones del proceso elegido →
 *   almacenamiento del objeto → preparación
 *
 * Solo selecciona y llama RPCs/vistas (procesosPreparacionesIumService.ts).
 * No reconstruye compatibilidad ni topología en TypeScript.
 */

import { useCallback, useEffect, useState } from "react";

import {
  activarPreparacion,
  crearAlmacenamientoDelObjeto,
  crearPreparacionEnObjeto,
  evaluarPreparacion,
  listarCatalogoProcesos,
  listarConfiguracionesDeProceso,
  listarProcesosDelObjeto,
  listarSoportesAlmacenamiento,
  obtenerIumsPreparadosDelObjeto,
  vincularProcesoAlObjeto,
} from "./procesosPreparacionesIumService";
import type {
  AlmacenamientoIumObjeto,
  ConfiguracionDeProceso,
  ProcesoCatalogo,
  ProcesoDelObjeto,
  ResultadoCrearAlmacenamiento,
  ResultadoCrearPreparacion,
  RolProceso,
  SoporteAlmacenamientoIum,
} from "./procesosPreparacionesIum.types";

export function useProcesosPreparacionesIum(itemId: string) {
  const [error, setError] = useState<string | null>(null);

  // ── Procesos del objeto ────────────────────────────────────────────
  const [procesos, setProcesos] = useState<ProcesoDelObjeto[]>([]);
  const [loadingProcesos, setLoadingProcesos] = useState(true);
  const [catalogoProcesos, setCatalogoProcesos] = useState<ProcesoCatalogo[]>([]);
  const [loadingCatalogoProcesos, setLoadingCatalogoProcesos] = useState(false);

  const cargarProcesos = useCallback(async () => {
    setLoadingProcesos(true);
    try {
      setProcesos(await listarProcesosDelObjeto(itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingProcesos(false);
    }
  }, [itemId]);

  const cargarCatalogoProcesos = useCallback(async () => {
    setLoadingCatalogoProcesos(true);
    try {
      setCatalogoProcesos(await listarCatalogoProcesos());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingCatalogoProcesos(false);
    }
  }, []);

  const agregarProceso = useCallback(
    async (params: { procesoId: string; rol: RolProceso; descripcion?: string | null }) => {
      await vincularProcesoAlObjeto({
        itemId,
        procesoId: params.procesoId,
        rol: params.rol,
        descripcion: params.descripcion,
      });
      await cargarProcesos();
    },
    [itemId, cargarProcesos],
  );

  // ── Configuraciones del proceso seleccionado ───────────────────────
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoDelObjeto | null>(null);
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionDeProceso[]>([]);
  const [loadingConfiguraciones, setLoadingConfiguraciones] = useState(false);

  useEffect(() => {
    if (!procesoSeleccionado) {
      setConfiguraciones([]);
      return;
    }
    let cancelado = false;
    setLoadingConfiguraciones(true);
    listarConfiguracionesDeProceso({ itemId, procesoId: procesoSeleccionado.procesoId })
      .then((rows) => {
        if (!cancelado) setConfiguraciones(rows);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelado) setLoadingConfiguraciones(false);
      });
    return () => {
      cancelado = true;
    };
  }, [itemId, procesoSeleccionado]);

  // ── Almacenamientos + preparaciones (todo anidado en una llamada) ──
  const [almacenamientos, setAlmacenamientos] = useState<AlmacenamientoIumObjeto[]>([]);
  const [loadingPreparados, setLoadingPreparados] = useState(true);

  const cargarPreparados = useCallback(async () => {
    setLoadingPreparados(true);
    try {
      setAlmacenamientos(await obtenerIumsPreparadosDelObjeto(itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingPreparados(false);
    }
  }, [itemId]);

  useEffect(() => {
    let cancelado = false;
    setError(null);
    (async () => {
      if (cancelado) return;
      await Promise.all([cargarProcesos(), cargarPreparados()]);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // ── Almacenamiento: crear si el objeto todavía no tiene ─────────────
  const [soportesObjeto, setSoportesObjeto] = useState<SoporteAlmacenamientoIum[]>([]);
  const [loadingSoportes, setLoadingSoportes] = useState(false);
  // Error propio: un fallo acá NUNCA debe tumbar todo el panel (que usa
  // `error` global para un early-return total). Antes reusaba setError()
  // y un fallo en esta llamada colapsaba "Procesos" + "IUMs preparados"
  // enteros, dando la sensación de que el botón "no hacía nada".
  const [errorSoportes, setErrorSoportes] = useState<string | null>(null);

  const cargarSoportesObjeto = useCallback(async () => {
    setLoadingSoportes(true);
    setErrorSoportes(null);
    try {
      setSoportesObjeto(await listarSoportesAlmacenamiento({ tipo: "objeto" }));
    } catch (e) {
      setErrorSoportes(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingSoportes(false);
    }
  }, []);

  const crearAlmacenamiento = useCallback(
    async (params: { soporteTipoId: string; nombre?: string }): Promise<ResultadoCrearAlmacenamiento> => {
      const resultado = await crearAlmacenamientoDelObjeto({
        itemId,
        soporteTipoId: params.soporteTipoId,
        nombre: params.nombre,
      });
      if (resultado.estado === "creado") await cargarPreparados();
      return resultado;
    },
    [itemId, cargarPreparados],
  );

  // ── Preparar la configuración seleccionada ──────────────────────────
  const crearPreparacion = useCallback(
    async (params: {
      almacenamientoId: string;
      configuracion: ConfiguracionDeProceso;
      nombre: string;
      calidadPreparacion: number;
      modoActivacion: "reutilizable" | "consumible";
      personajeId?: string | null;
    }): Promise<ResultadoCrearPreparacion> => {
      // oris_id sale siempre de la configuración seleccionada — nunca lo
      // elige el usuario aparte.
      const resultado = await crearPreparacionEnObjeto({
        itemId,
        personajeId: params.personajeId ?? null,
        orisId: params.configuracion.orisId,
        almacenamientoId: params.almacenamientoId,
        configuracionId: params.configuracion.configuracionId,
        nombre: params.nombre,
        calidadPreparacion: params.calidadPreparacion,
        modoActivacion: params.modoActivacion,
      });
      if (resultado.estado === "preparada") await cargarPreparados();
      return resultado;
    },
    [itemId, cargarPreparados],
  );

  const reevaluarPreparacion = useCallback(
    async (preparacionId: string) => {
      await evaluarPreparacion(preparacionId);
      await cargarPreparados();
    },
    [cargarPreparados],
  );

  const activarPreparacionExistente = useCallback(
    async (params: { preparacionId: string; ordenId: string }) => {
      const resultado = await activarPreparacion(params);
      await cargarPreparados();
      return resultado;
    },
    [cargarPreparados],
  );

  return {
    loading: loadingProcesos || loadingPreparados,
    error,

    procesos,
    catalogoProcesos,
    loadingCatalogoProcesos,
    cargarCatalogoProcesos,
    agregarProceso,

    procesoSeleccionado,
    setProcesoSeleccionado,
    configuraciones,
    loadingConfiguraciones,

    almacenamientos,
    soportesObjeto,
    loadingSoportes,
    errorSoportes,
    cargarSoportesObjeto,
    crearAlmacenamiento,

    crearPreparacion,
    reevaluarPreparacion,
    activarPreparacion: activarPreparacionExistente,

    recargar: cargarPreparados,
  };
}
