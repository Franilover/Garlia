"use client";

/**
 * persistirFenomenoProceso.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Mutaciones sobre "fenomeno_procesos" (tabla puente Fenómeno↔Proceso —
 * spec sección 3: "relaciones con fenómenos" en la ficha del proceso).
 * Mismo criterio que persistirProcesoReaccion.ts/persistirOrisProceso.ts —
 * nunca crea ni edita el Fenómeno ni el Proceso en sí, solo la fila puente.
 */

import { supabase } from "@/infra/supabase/supabase";

const TABLA = "fenomeno_procesos";

export async function vincularFenomenoAProceso(
  procesoId: string,
  fenomenoId: string,
  extra?: { rol?: string | null },
) {
  const { error } = await supabase.from(TABLA).insert({
    proceso_id: procesoId,
    fenomeno_id: fenomenoId,
    rol: extra?.rol ?? null,
  });
  if (error) console.error("[vincularFenomenoAProceso] error:", error);
  return !error;
}

export async function actualizarFenomenoProceso(
  fenomenoProcesoId: string,
  cambios: { rol?: string | null },
) {
  const { error } = await supabase.from(TABLA).update(cambios).eq("id", fenomenoProcesoId);
  if (error) console.error("[actualizarFenomenoProceso] error:", error);
  return !error;
}

export async function desvincularFenomenoDeProceso(fenomenoProcesoId: string) {
  const { error } = await supabase.from(TABLA).delete().eq("id", fenomenoProcesoId);
  if (error) console.error("[desvincularFenomenoDeProceso] error:", error);
  return !error;
}
