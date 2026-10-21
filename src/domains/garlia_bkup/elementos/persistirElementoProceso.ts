"use client";

/**
 * persistirElementoProceso.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Mutaciones sobre "elemento_procesos" (tabla puente Elemento↔Proceso —
 * spec sección 3: "relaciones con elementos" en la ficha del proceso).
 * Mismo criterio que persistirProcesoReaccion.ts/persistirOrisProceso.ts —
 * nunca crea ni edita el Elemento ni el Proceso en sí, solo la fila puente.
 */

import { supabase } from "@/infra/supabase/supabase";

const TABLA = "elemento_procesos";

export async function vincularElementoAProceso(
  procesoId: string,
  elementoId: string,
  extra?: { rol?: string | null },
) {
  const { error } = await supabase.from(TABLA).insert({
    proceso_id: procesoId,
    elemento_id: elementoId,
    rol: extra?.rol ?? null,
  });
  if (error) console.error("[vincularElementoAProceso] error:", error);
  return !error;
}

export async function actualizarElementoProceso(
  elementoProcesoId: string,
  cambios: { rol?: string | null },
) {
  const { error } = await supabase.from(TABLA).update(cambios).eq("id", elementoProcesoId);
  if (error) console.error("[actualizarElementoProceso] error:", error);
  return !error;
}

export async function desvincularElementoDeProceso(elementoProcesoId: string) {
  const { error } = await supabase.from(TABLA).delete().eq("id", elementoProcesoId);
  if (error) console.error("[desvincularElementoDeProceso] error:", error);
  return !error;
}
