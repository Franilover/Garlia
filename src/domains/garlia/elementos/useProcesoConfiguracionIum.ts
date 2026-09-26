"use client";

/**
 * useProcesoConfiguracionIum.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Fuente de la "Configuración IUM" de un Proceso (spec sección 7/9): la
 * intervención mediante IUM que manipula un proceso natural, separada
 * conceptual y visualmente de la información del proceso en sí (sección 8).
 *
 * Prioriza vistas canónicas ya preparadas para frontend, en vez de armar el
 * join a mano contra proceso_configuraciones_ium_v1 + sus 3 tablas de
 * detalle (spec sección 9: "revisar vistas existentes antes de crear
 * consultas nuevas"):
 *
 *   - v_proceso_configuracion_ium_actual_v1: UNA fila por proceso — la
 *     configuración VIGENTE (version = max(version) para ese proceso_id).
 *     Confirmado en pg_views: v_proceso_configuracion_ium_v1 trae TODO el
 *     histórico (una fila por configuracion_id); "_actual_v1" es la misma
 *     vista pero filtrada a la última versión — es la que corresponde
 *     mostrar en la ficha del proceso, no el histórico completo.
 *   - v_proceso_configuracion_ium_flujo_v1: enlaces entre componentes
 *     IUM de esa configuración (origen→destino, tipo de unión), ya
 *     resueltos a nombre — para "IUMs participantes" + "enlaces" del spec.
 *
 * No consulta proceso_configuraciones_ium_v1 / *_componentes_v1 /
 * *_enlaces_v1 / *_oris_v1 directamente: esas vistas ya hacen ese join.
 * Ninguna de las dos está en DEXIE_TABLES (son vistas derivadas, no
 * catálogo editable) — useSupabaseData las trae siempre en vivo desde
 * Supabase, sin cache local, igual que v_oris_grafo_canonico en
 * useOrisGrafo.ts.
 */

import { useMemo } from "react";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";

/** Fila de v_proceso_configuracion_ium_actual_v1 — la configuración IUM
 *  vigente de un proceso, ya con nombres resueltos (no ids crudos salvo
 *  los _id que se necesitan para navegar/filtrar). */
export interface ProcesoConfiguracionIumActual {
  configuracion_id: string;
  proceso_id: string;
  proceso: string;
  oris_principal_id: string | null;
  oris_principal: string | null;
  /** Nombre de la configuración (proceso_configuraciones_ium_v1.nombre). */
  configuracion: string | null;
  version: string;
  /** Estado real de Supabase — spec sección 7: "no presentar una
   *  configuración `propuesta` como si fuera canónica", respetar siempre
   *  el estado real. Valores esperados: propuesta / en_revision / canonica
   *  (u otros que defina el dato — no se asume un enum fijo acá). */
  estado: string;
  topologia_id: string | null;
  topologia: string | null;
  n_iums: number;
  n_uniones: number;
  demanda_eterium_organizacion: number;
  /** "posicion:nombre [rol]" concatenado en orden — ver definición SQL. */
  iums: string | null;
  /** Nombres de Oris compatibles con esta configuración, concatenados. */
  oris_compatibles: string | null;
  descripcion: string | null;
  fundamento: string | null;
}

/** Fila de v_proceso_configuracion_ium_flujo_v1 — un enlace entre dos
 *  componentes IUM dentro de una configuración, ya con nombres resueltos. */
export interface ProcesoConfiguracionIumFlujo {
  configuracion_id: string;
  proceso: string;
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

const CONFIG_ACTUAL = {
  tabla: "v_proceso_configuracion_ium_actual_v1",
  select:
    "configuracion_id, proceso_id, proceso, oris_principal_id, oris_principal, " +
    "configuracion, version, estado, topologia_id, topologia, n_iums, n_uniones, " +
    "demanda_eterium_organizacion, iums, oris_compatibles, descripcion, fundamento",
};

const CONFIG_FLUJO = {
  tabla: "v_proceso_configuracion_ium_flujo_v1",
  select:
    "configuracion_id, proceso, ium_origen_id, ium_origen, ium_destino_id, ium_destino, " +
    "tipo_union, participacion_origen, participacion_destino, salida_origen, " +
    "orden_origen, orden_destino, orden_union",
};

/**
 * Configuración IUM vigente de UN proceso puntual (uso típico: ficha de
 * Proceso en ProcesosPage.tsx). Trae ambas vistas completas (son de
 * catálogo chico — auditoría/config, no un catálogo masivo) y filtra acá
 * por proceso_id, mismo criterio que useOrisConIums/useProcesoReacciones
 * filtrando su tabla puente completa por el id del padre.
 */
export function useProcesoConfiguracionIum(procesoId: string | null) {
  const { data: actuales, loading: loadingActual } = useSupabaseData<ProcesoConfiguracionIumActual>(
    CONFIG_ACTUAL.tabla,
    { select: CONFIG_ACTUAL.select, order: { campo: "proceso" } },
  );
  const { data: flujos, loading: loadingFlujo } = useSupabaseData<ProcesoConfiguracionIumFlujo>(
    CONFIG_FLUJO.tabla,
    { select: CONFIG_FLUJO.select, order: { campo: "orden_union" } },
  );

  const configuracion = useMemo(
    () => (procesoId ? (actuales.find((c) => c.proceso_id === procesoId) ?? null) : null),
    [actuales, procesoId],
  );

  const flujoDeConfiguracion = useMemo(
    () =>
      configuracion
        ? flujos.filter((f) => f.configuracion_id === configuracion.configuracion_id)
        : [],
    [flujos, configuracion],
  );

  return {
    configuracion,
    flujo: flujoDeConfiguracion,
    loading: loadingActual || loadingFlujo,
  };
}
