/**
 * laboratorioOris.types.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Tipos del slice "Oris" del grupo Lab (Worldbuilder) — simulador de
 * demanda de Eterium para activar un Oris, contra v_oris_demanda_eterium_v1
 * y v_estado_eterium_organismos_v1 (Supabase). Ningún cálculo se inventa
 * acá: la fórmula E_req = (N_IUM + N_uniones) × intensidad y los cuatro
 * puntos (25/50/75/100% intensidad) ya vienen calculados por la vista.
 */

export interface OrisDemandaEterium {
  orisId: string;
  orden: number;
  nombre: string;
  dominio: string;
  formula: string;
  tarea: string;
  nIums: number;
  nUniones: number;
  unidadesOrganizacion: number;
  demanda25: number;
  demanda50: number;
  demanda75: number;
  demanda100: number;
  unidadEterium: string;
  formulaDemanda: string;
}

export type EstadoConcentracionEterium = string;

export interface OrganismoEstadoEterium {
  organismoId: string;
  organismo: string;
  cladoId: string | null;
  clado: string | null;
  puedeCanalizarEterium: boolean;
  cantidadSLibre: number | null;
  estadoConcentracion: EstadoConcentracionEterium | null;
  coherencia: number | null;
  intensidad: number | null;
  estadoFlujo: string | null;
}

/** Resultado de la simulación: cuánto Eterium pide el Oris a la intensidad
 *  elegida vs. cuánto tiene libre el organismo elegido (si hay uno
 *  seleccionado). `factible` es null cuando no hay organismo seleccionado —
 *  nunca se asume "sí" por default. */
export interface SimulacionDemandaOris {
  oris: OrisDemandaEterium;
  intensidadPct: 25 | 50 | 75 | 100;
  demandaEterium: number;
  organismo: OrganismoEstadoEterium | null;
  factible: boolean | null;
  faltante: number | null;
}
