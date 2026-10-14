"use client";

/**
 * useConjuracionConfiguracionIum.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Espejo de useProcesoConfiguracionIum.ts pero orientado a conjuraciones.
 * Usa las dos vistas de Supabase:
 *
 *   - v_conjuracion_config_ium_activa_v1 : config IUM activa por conjuración
 *   - v_conjuracion_config_ium_flujo_v1  : enlaces IUM de esa configuración
 *     (vista creada en migración conjuracion_config_ium_flujo_view)
 *
 * El tipo ConjuracionConfigIumFlujo es idéntico a ProcesoConfiguracionIumFlujo
 * para reutilizar ConfiguracionIumGrafo de ProcesosPage sin cambios.
 */

import { useMemo } from "react";
import { useSupabaseData } from "@/infra/sync/useSupabaseData";

/** Fila de v_conjuracion_config_ium_activa_v1 */
export interface ConjuracionConfigIumActiva {
  conjuracion_id: string;
  conjuracion_nombre: string;
  oris_id: string | null;
  oris_nombre: string | null;
  proceso_id: string | null;
  proceso_nombre: string | null;
  dominio_fisico: string | null;
  config_id: string;
  config_nombre: string | null;
  config_estado: string;
  config_version: string;
  fundamento: string | null;
  componentes: string | null;
  enlaces: string | null;
}

/** Fila de v_conjuracion_config_ium_flujo_v1 — misma forma que
 *  ProcesoConfiguracionIumFlujo para que ConfiguracionIumGrafo lo acepte
 *  sin cambios. */
export interface ConjuracionConfigIumFlujo {
  configuracion_id: string;
  conjuracion_id: string;
  conjuracion: string;
  ium_origen_id: string;
  ium_origen: string;
  ium_destino_id: string;
  ium_destino: string;
  tipo_union: string | null;
  participacion_origen: string | null;
  participacion_destino: string | null;
  salida_origen: string | null;
  orden_origen: number | null;
  orden_destino: number | null;
  orden_union: number;
}

const CONFIG_ACTIVA = {
  tabla: "v_conjuracion_config_ium_activa_v1",
  select:
    "conjuracion_id, conjuracion_nombre, oris_id, oris_nombre, proceso_id, proceso_nombre, " +
    "dominio_fisico, config_id, config_nombre, config_estado, config_version, " +
    "fundamento, componentes, enlaces",
};

const CONFIG_FLUJO = {
  tabla: "v_conjuracion_config_ium_flujo_v1",
  select:
    "configuracion_id, conjuracion_id, conjuracion, ium_origen_id, ium_origen, " +
    "ium_destino_id, ium_destino, tipo_union, participacion_origen, participacion_destino, " +
    "salida_origen, orden_origen, orden_destino, orden_union",
};

/** Config IUM activa + flujo de enlaces de UNA conjuración. */
export function useConjuracionConfiguracionIum(conjuracionId: string | null) {
  const { data: activas, loading: loadingActiva } =
    useSupabaseData<ConjuracionConfigIumActiva>(CONFIG_ACTIVA.tabla, {
      select: CONFIG_ACTIVA.select,
      order: { campo: "conjuracion_nombre" },
    });

  const { data: flujos, loading: loadingFlujo } =
    useSupabaseData<ConjuracionConfigIumFlujo>(CONFIG_FLUJO.tabla, {
      select: CONFIG_FLUJO.select,
      order: { campo: "orden_union" },
    });

  const configuracion = useMemo(
    () =>
      conjuracionId
        ? (activas.find((c) => c.conjuracion_id === conjuracionId) ?? null)
        : null,
    [activas, conjuracionId],
  );

  const flujoDeConfiguracion = useMemo(
    () =>
      configuracion
        ? flujos.filter((f) => f.configuracion_id === configuracion.config_id)
        : [],
    [flujos, configuracion],
  );

  return {
    configuracion,
    flujo: flujoDeConfiguracion,
    loading: loadingActiva || loadingFlujo,
  };
}
