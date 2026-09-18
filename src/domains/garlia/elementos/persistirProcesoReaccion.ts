"use client";

/**
 * persistirProcesoReaccion.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Mutaciones sobre "proceso_reacciones" (tabla puente Proceso↔Reacción):
 * vincular una Reacción existente a un Proceso, editar su orden/rol dentro
 * de ese proceso, y desvincularla. Mismo criterio que
 * agregarEnlaceACompuesto/quitarEnlaceDeCompuesto en useCompuestoEnlaces.ts
 * — nunca crea ni edita la Reacción en sí, solo la fila puente.
 */

import { supabase } from "@/infra/supabase/supabase";

export async function vincularReaccionAProceso(
  procesoId: string,
  reaccionId: string,
  extra?: { orden?: number | null; rol?: string | null },
) {
  const { error } = await supabase.from("proceso_reacciones").insert({
    proceso_id: procesoId,
    reaccion_id: reaccionId,
    orden: extra?.orden ?? null,
    rol: extra?.rol ?? null,
  });
  if (error) console.error("[vincularReaccionAProceso] error:", error);
  return !error;
}

export async function actualizarProcesoReaccion(
  procesoReaccionId: string,
  cambios: { orden?: number | null; rol?: string | null },
) {
  const { error } = await supabase
    .from("proceso_reacciones")
    .update(cambios)
    .eq("id", procesoReaccionId);
  if (error) console.error("[actualizarProcesoReaccion] error:", error);
  return !error;
}

export async function desvincularReaccionDeProceso(procesoReaccionId: string) {
  const { error } = await supabase
    .from("proceso_reacciones")
    .delete()
    .eq("id", procesoReaccionId);
  if (error) console.error("[desvincularReaccionDeProceso] error:", error);
  return !error;
}
