"use client";

/**
 * persistirOrisProceso.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Mutaciones sobre "oris_procesos" (tabla puente Oris↔Proceso — spec
 * "Actualizar frontend Procesos/Oris", sección 4): vincular un Proceso
 * existente a un Oris (o viceversa, misma tabla), editar su rol/prioridad/
 * notas dentro de esa relación, activar/desactivar sin borrar, y
 * desvincular. Mismo criterio que persistirProcesoReaccion.ts — nunca crea
 * ni edita el Proceso ni el Oris en sí, solo la fila puente.
 *
 * El "rol" (principal/secundario/compatible) es un valor real almacenado en
 * Supabase — este helper no lo interpreta ni lo transforma, solo lo persiste
 * tal cual lo entrega el frontend (spec sección 5: "no reinterpretar roles").
 */

import { supabase } from "@/infra/supabase/supabase";

const TABLA = "oris_procesos";

export async function vincularOrisAProceso(
  orisId: string,
  procesoId: string,
  extra?: { rol?: string | null; prioridad?: number | null; notas?: string | null },
) {
  const { error } = await supabase.from(TABLA).insert({
    oris_id: orisId,
    proceso_id: procesoId,
    rol: extra?.rol ?? null,
    prioridad: extra?.prioridad ?? null,
    activo: true,
    notas: extra?.notas ?? null,
  });
  if (error) console.error("[vincularOrisAProceso] error:", error);
  return !error;
}

export async function actualizarOrisProceso(
  orisProcesoId: string,
  cambios: { rol?: string | null; prioridad?: number | null; activo?: boolean; notas?: string | null },
) {
  const { error } = await supabase.from(TABLA).update(cambios).eq("id", orisProcesoId);
  if (error) console.error("[actualizarOrisProceso] error:", error);
  return !error;
}

export async function desvincularOrisDeProceso(orisProcesoId: string) {
  const { error } = await supabase.from(TABLA).delete().eq("id", orisProcesoId);
  if (error) console.error("[desvincularOrisDeProceso] error:", error);
  return !error;
}
