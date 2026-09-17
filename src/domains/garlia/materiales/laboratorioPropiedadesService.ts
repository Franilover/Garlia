/**
 * laboratorioPropiedadesService.ts — dominio Materiales/Compuestos
 * ───────────────────────────────────────────────────────────────────────────
 * Capa fina sobre `supabase.rpc(...)`, mismo patrón que sandbox/sandboxService.ts:
 * este archivo NO decide qué es "buena" dureza ni pondera nada — solo llama
 * a las RPC ya existentes en Supabase y normaliza su respuesta.
 *
 * RPC usadas (confirmadas existentes en el proyecto, no se crean acá):
 *   - sugerir_compuestos_por_propiedades(p_requisitos jsonb, p_limite int)
 *   - sugerir_materiales_por_propiedades_v3(p_requisitos jsonb, p_limite int)
 *
 * Ambas devuelven TABLE(id/material_id, nombre, puntuacion, propiedades,
 * coincidencias) ordenada por puntuacion desc. p_requisitos tiene la forma:
 *   { "<clave_propiedad>": { "min"?: number, "max"?: number } }
 * (el backend también acepta "objetivo", pero la UI de este slice solo
 * ofrece min/max — no se expone "objetivo" porque no hay un caso de uso
 * claro para él en el Lab todavía).
 */

import { supabase } from "@/infra/supabase/supabase";

import type {
  CoincidenciaPropiedadLab,
  EntidadLab,
  RequisitoPropiedadLab,
  SugerenciaPropiedadLab,
} from "./laboratorioPropiedades.types";

function assertNoError<T>(data: T, error: { message: string } | null, contexto: string): T {
  if (error) {
    throw new Error(`[laboratorioPropiedadesService] ${contexto}: ${error.message}`);
  }
  return data;
}

/** Arma el jsonb p_requisitos a partir de los requisitos armados en la UI.
 *  Descarta requisitos sin clave o sin ningún límite seteado — la RPC los
 *  ignoraría igual (no matchean contra `bounds`), pero es más claro no
 *  mandarlos. */
function armarRequisitosJson(requisitos: RequisitoPropiedadLab[]): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const r of requisitos) {
    if (!r.clave) continue;
    if (r.min === null && r.max === null) continue;
    const rango: Record<string, number> = {};
    if (r.min !== null) rango.min = r.min;
    if (r.max !== null) rango.max = r.max;
    salida[r.clave] = rango;
  }
  return salida;
}

/** Normaliza una fila cruda de cualquiera de las dos RPC (difieren solo en
 *  el nombre de la columna id) al tipo SugerenciaPropiedadLab compartido. */
function normalizarFila(
  fila: Record<string, unknown>,
  campoId: "id" | "material_id",
): SugerenciaPropiedadLab {
  return {
    id: String(fila[campoId]),
    nombre: String(fila.nombre ?? ""),
    puntuacion: Number(fila.puntuacion ?? 0),
    propiedades: (fila.propiedades as Record<string, number>) ?? {},
    coincidencias: (fila.coincidencias as CoincidenciaPropiedadLab[]) ?? [],
  };
}

/** Pide al backend qué Compuestos o Materiales del catálogo real cumplen
 *  mejor los requisitos de propiedad armados en la UI. `limite` acota
 *  cuántas filas trae la RPC (ambas RPC clampean 1..100 igual, esto es
 *  solo el valor que se les pasa). */
export async function sugerirPorPropiedades(
  entidad: EntidadLab,
  requisitos: RequisitoPropiedadLab[],
  limite = 20,
): Promise<SugerenciaPropiedadLab[]> {
  const pRequisitos = armarRequisitosJson(requisitos);

  // Sin ningún requisito con límite real, no tiene sentido pegarle a la
  // RPC (devolvería el catálogo entero con puntuación 0/no diferenciada).
  // La UI ya evita este estado, pero se guarda acá también por si algún
  // caller nuevo no lo hace.
  if (Object.keys(pRequisitos).length === 0) return [];

  if (entidad === "compuesto") {
    const { data, error } = await supabase.rpc("sugerir_compuestos_por_propiedades", {
      p_requisitos: pRequisitos,
      p_limite: limite,
    });
    const filas = assertNoError(data as Record<string, unknown>[] | null, error, "sugerirCompuestos") ?? [];
    return filas.map((f) => normalizarFila(f, "id"));
  }

  const { data, error } = await supabase.rpc("sugerir_materiales_por_propiedades_v3", {
    p_requisitos: pRequisitos,
    p_limite: limite,
  });
  const filas = assertNoError(data as Record<string, unknown>[] | null, error, "sugerirMateriales") ?? [];
  return filas.map((f) => normalizarFila(f, "material_id"));
}
