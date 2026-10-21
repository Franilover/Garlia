/**
 * laboratorioOrisService.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Fetch directo (no Dexie, mismo criterio que useOrisGrafo.ts /
 * v_iums_geometria_canonica_v1) contra:
 *   - v_oris_demanda_eterium_v1: catálogo de Oris con su demanda de Eterium
 *     ya calculada por Supabase en 4 puntos de intensidad (25/50/75/100%).
 *   - v_estado_eterium_organismos_v1: estado real de Eterium por organismo
 *     (cantidad_s_libre, coherencia, intensidad, estado_flujo).
 * Ningún número se recalcula acá — se leen tal cual vienen de las vistas.
 */

import { supabase } from "@/infra/supabase/supabase";

import type { OrganismoEstadoEterium, OrisDemandaEterium } from "./laboratorioOris.types";

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

export async function listarOrisDemandaEterium(): Promise<OrisDemandaEterium[]> {
  const { data, error } = await supabase
    .from("v_oris_demanda_eterium_v1")
    .select(
      "oris_id, orden, nombre, dominio, formula, tarea, n_iums, n_uniones, unidades_organizacion, demanda_eterium_25, demanda_eterium_50, demanda_eterium_75, demanda_eterium_100, unidad_eterium, formula_demanda",
    )
    .order("orden", { ascending: true });

  if (error) throw new Error(`listarOrisDemandaEterium: ${error.message}`);

  return (data ?? []).map((r) => ({
    orisId: r.oris_id as string,
    orden: num(r.orden),
    nombre: r.nombre as string,
    dominio: r.dominio as string,
    formula: r.formula as string,
    tarea: r.tarea as string,
    nIums: num(r.n_iums),
    nUniones: num(r.n_uniones),
    unidadesOrganizacion: num(r.unidades_organizacion),
    demanda25: num(r.demanda_eterium_25),
    demanda50: num(r.demanda_eterium_50),
    demanda75: num(r.demanda_eterium_75),
    demanda100: num(r.demanda_eterium_100),
    unidadEterium: r.unidad_eterium as string,
    formulaDemanda: r.formula_demanda as string,
  }));
}

export async function listarOrganismosEterium(): Promise<OrganismoEstadoEterium[]> {
  const { data, error } = await supabase
    .from("v_estado_eterium_organismos_v1")
    .select(
      "organismo_id, organismo, clado_id, clado, puede_canalizar_eterium, cantidad_s_libre, estado_concentracion, coherencia, intensidad, estado_flujo",
    )
    .order("organismo", { ascending: true });

  if (error) throw new Error(`listarOrganismosEterium: ${error.message}`);

  return (data ?? []).map((r) => ({
    organismoId: r.organismo_id as string,
    organismo: r.organismo as string,
    cladoId: (r.clado_id as string) ?? null,
    clado: (r.clado as string) ?? null,
    puedeCanalizarEterium: Boolean(r.puede_canalizar_eterium),
    cantidadSLibre: numOrNull(r.cantidad_s_libre),
    estadoConcentracion: (r.estado_concentracion as string) ?? null,
    coherencia: numOrNull(r.coherencia),
    intensidad: numOrNull(r.intensidad),
    estadoFlujo: (r.estado_flujo as string) ?? null,
  }));
}
