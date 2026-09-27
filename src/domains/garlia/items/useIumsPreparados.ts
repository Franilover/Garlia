"use client";

/**
 * useIumsPreparados.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Sección "IUMs preparados" del Editor de Objetos. Orquesta:
 *   - almacenamientos IUM del objeto (almacenamientos_ium_v1)
 *   - preparaciones almacenadas en cada uno (preparaciones_ium_v1)
 *   - catálogo de configuraciones/Oris disponibles para crear una nueva
 *     preparación (v_proceso_configuracion_ium_v1 + oris)
 *
 * No recalcula nada: solo selecciona, lista y llama a las RPC canónicas
 * (iumsPreparadosService.ts). El estado de "vacío" vs "con datos" siempre
 * refleja lo que Supabase devolvió, nunca un placeholder local.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  activarPreparacionIum,
  crearAlmacenamientoIumObjeto,
  crearPreparacionIum,
  evaluarPreparacionIum,
  listarAlmacenamientosDelObjeto,
  listarConfiguracionesDisponibles,
  listarOrisCatalogo,
  listarPreparacionesDeAlmacenamiento,
  listarSoportesAlmacenamiento,
} from "./iumsPreparadosService";
import type {
  AlmacenamientoIumObjeto,
  ConfiguracionIumDisponible,
  PreparacionIum,
  ResultadoCrearAlmacenamientoIum,
  ResultadoCrearPreparacionIum,
  SoporteAlmacenamientoIum,
} from "./iumsPreparados.types";

export function useIumsPreparados(itemId: string) {
  const [almacenamientos, setAlmacenamientos] = useState<AlmacenamientoIumObjeto[]>([]);
  const [loadingAlmacenamientos, setLoadingAlmacenamientos] = useState(true);
  const [preparacionesPorAlmacenamiento, setPreparacionesPorAlmacenamiento] = useState<
    Record<string, PreparacionIum[]>
  >({});
  const [loadingPreparaciones, setLoadingPreparaciones] = useState(false);
  const [orisCatalogo, setOrisCatalogo] = useState<{ id: string; nombre: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargarAlmacenamientos = useCallback(async () => {
    setLoadingAlmacenamientos(true);
    try {
      const rows = await listarAlmacenamientosDelObjeto(itemId);
      setAlmacenamientos(rows);
      return rows;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return [];
    } finally {
      setLoadingAlmacenamientos(false);
    }
  }, [itemId]);

  const cargarPreparacionesDe = useCallback(async (almacenamientoId: string) => {
    try {
      const rows = await listarPreparacionesDeAlmacenamiento(almacenamientoId);
      setPreparacionesPorAlmacenamiento((prev) => ({ ...prev, [almacenamientoId]: rows }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const cargarTodo = useCallback(async () => {
    setError(null);
    const rows = await cargarAlmacenamientos();
    if (rows.length === 0) return;
    setLoadingPreparaciones(true);
    try {
      await Promise.all(rows.map((a) => cargarPreparacionesDe(a.id)));
    } finally {
      setLoadingPreparaciones(false);
    }
  }, [cargarAlmacenamientos, cargarPreparacionesDe]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (cancelado) return;
      await cargarTodo();
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useEffect(() => {
    let cancelado = false;
    listarOrisCatalogo()
      .then((rows) => {
        if (!cancelado) setOrisCatalogo(rows);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const todasLasPreparaciones = useMemo(
    () => Object.values(preparacionesPorAlmacenamiento).flat(),
    [preparacionesPorAlmacenamiento],
  );

  // ── Crear almacenamiento IUM del objeto ──────────────────────────────
  const [soportesObjeto, setSoportesObjeto] = useState<SoporteAlmacenamientoIum[]>([]);
  const [loadingSoportes, setLoadingSoportes] = useState(false);

  const cargarSoportesObjeto = useCallback(async () => {
    setLoadingSoportes(true);
    try {
      const rows = await listarSoportesAlmacenamiento({ tipo: "objeto" });
      setSoportesObjeto(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingSoportes(false);
    }
  }, []);

  const crearAlmacenamiento = useCallback(
    async (params: {
      soporteTipoId: string;
      nombre?: string;
      personajeId?: string | null;
    }): Promise<ResultadoCrearAlmacenamientoIum> => {
      const resultado = await crearAlmacenamientoIumObjeto({
        itemId,
        soporteTipoId: params.soporteTipoId,
        nombre: params.nombre,
        personajeId: params.personajeId,
      });
      if (resultado.estado === "creado") {
        await cargarAlmacenamientos();
      }
      return resultado;
    },
    [itemId, cargarAlmacenamientos],
  );

  // ── Selector "Añadir preparación" ────────────────────────────────────
  const [orisSelId, setOrisSelId] = useState<string | null>(null);
  const [configuracionesDisponibles, setConfiguracionesDisponibles] = useState<
    ConfiguracionIumDisponible[]
  >([]);
  const [loadingConfiguraciones, setLoadingConfiguraciones] = useState(false);

  useEffect(() => {
    if (!orisSelId) {
      setConfiguracionesDisponibles([]);
      return;
    }
    let cancelado = false;
    setLoadingConfiguraciones(true);
    listarConfiguracionesDisponibles({ orisId: orisSelId })
      .then((rows) => {
        if (!cancelado) setConfiguracionesDisponibles(rows);
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
  }, [orisSelId]);

  const crearPreparacion = useCallback(
    async (params: {
      personajeId: string | null;
      almacenamientoId: string;
      configuracionId: string;
      nombre: string;
      calidadPreparacion: number;
      modoActivacion: "reutilizable" | "consumible";
    }): Promise<ResultadoCrearPreparacionIum> => {
      if (!orisSelId) {
        return { estado: "error", razon: "oris_no_seleccionado" };
      }
      const resultado = await crearPreparacionIum({
        personajeId: params.personajeId,
        orisId: orisSelId,
        almacenamientoId: params.almacenamientoId,
        configuracionId: params.configuracionId,
        nombre: params.nombre,
        calidadPreparacion: params.calidadPreparacion,
        modoActivacion: params.modoActivacion,
      });
      if (resultado.estado === "preparada") {
        await cargarPreparacionesDe(params.almacenamientoId);
      }
      return resultado;
    },
    [orisSelId, cargarPreparacionesDe],
  );

  const reevaluarPreparacion = useCallback(
    async (preparacionId: string, almacenamientoId: string) => {
      await evaluarPreparacionIum(preparacionId);
      await cargarPreparacionesDe(almacenamientoId);
    },
    [cargarPreparacionesDe],
  );

  const activarPreparacion = useCallback(
    async (params: { preparacionId: string; ordenId: string; almacenamientoId: string }) => {
      const resultado = await activarPreparacionIum({
        preparacionId: params.preparacionId,
        ordenId: params.ordenId,
      });
      await cargarPreparacionesDe(params.almacenamientoId);
      return resultado;
    },
    [cargarPreparacionesDe],
  );

  return {
    loading: loadingAlmacenamientos || loadingPreparaciones,
    error,

    almacenamientos,
    preparacionesPorAlmacenamiento,
    todasLasPreparaciones,

    soportesObjeto,
    loadingSoportes,
    cargarSoportesObjeto,
    crearAlmacenamiento,

    orisCatalogo,
    orisSelId,
    setOrisSelId,
    configuracionesDisponibles,
    loadingConfiguraciones,

    crearPreparacion,
    reevaluarPreparacion,
    activarPreparacion,
    recargar: cargarTodo,
  };
}
