/**
 * presenciaService.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Operaciones de escritura sobre presencias ecológicas sin pasar por el
 * hook por-hábitat (useHabitatHabitantes), para usarlas desde vistas que
 * no tienen un hábitat "activo" como contexto (p. ej. CriaturasJerarquica
 * arrastrando un chip de criatura entre hábitats con click derecho).
 *
 * REGLA: SUPABASE MANDA.  Solo toca las dos tablas canónicas:
 *   - ecosistema_participantes          → nodo ecológico en un ecosistema
 *   - ecosistema_participante_habitats  → presencia en un hábitat concreto
 *
 * No reconstruye joins ni calcula herencia: la vista v_opciones_habitantes
 * y los triggers de la BD se encargan de esa lógica.
 */

import { supabase } from "@/infra/supabase/supabase";
import type { PresenciaEcologica } from "./useMapaEcologico";

/**
 * Obtiene el participante existente de un ecosistema para la entidad dada,
 * o lo crea si aún no existe.
 */
async function obtenerOCrearParticipante(
  ecosistemaId: string,
  criaturaId: string | null,
  organismoId: string | null,
): Promise<string> {
  const col = criaturaId ? "criatura_id" : "organismo_id";
  const val = criaturaId ?? organismoId;
  if (!val) throw new Error("presenciaService: entidad sin criatura_id ni organismo_id");

  // Busca participante existente en ese ecosistema.
  const { data: existente, error: errBus } = await supabase
    .from("ecosistema_participantes")
    .select("id")
    .eq("ecosistema_id", ecosistemaId)
    .eq(col, val)
    .maybeSingle();
  if (errBus) throw errBus;
  if (existente) return existente.id as string;

  // Crea uno nuevo.
  const { data, error: errIns } = await supabase
    .from("ecosistema_participantes")
    .insert({
      ecosistema_id: ecosistemaId,
      criatura_id: criaturaId,
      organismo_id: organismoId,
      activo: true,
    })
    .select("id")
    .single();
  if (errIns || !data) throw errIns ?? new Error("presenciaService: no se creó el participante");
  return data.id as string;
}

/**
 * Mueve (o clona con Shift) una presencia ecológica a otro hábitat.
 *
 * - `soloAnadir = false` (click derecho sin Shift) → MOVER:
 *     - Inserta presencia en `targetHabitatId`.
 *     - Borra presencia en el hábitat de origen.
 *
 * - `soloAnadir = true` (Shift + click derecho) → AÑADIR:
 *     - Solo inserta presencia en `targetHabitatId` (la criatura queda
 *       también en el hábitat de origen — multihábitat).
 *
 * Si el hábitat destino pertenece a un ecosistema distinto, se busca/crea
 * el participante correspondiente en ese ecosistema antes de operar.
 */
export async function moverPresenciaEntreHabitats(
  presencia: PresenciaEcologica,
  targetHabitatId: string,
  targetEcosistemaId: string,
  soloAnadir: boolean,
): Promise<void> {
  if (presencia.habitat_id === targetHabitatId) return; // mismo hábitat: no-op

  const mismoEcosistema = presencia.ecosistema_id === targetEcosistemaId;

  // Participante en el ecosistema destino.
  const participanteIdDestino = mismoEcosistema
    ? presencia.participante_id
    : await obtenerOCrearParticipante(
        targetEcosistemaId,
        presencia.criatura_id,
        presencia.organismo_id,
      );

  // Insertar presencia en el hábitat destino.
  const { error: errIns } = await supabase
    .from("ecosistema_participante_habitats")
    .insert({
      participante_id: participanteIdDestino,
      habitat_id: targetHabitatId,
    });
  // 23505 = presencia ya existía (doble drop rápido): no es error.
  if (errIns && errIns.code !== "23505") throw errIns;

  // Si no es "solo añadir", quitar la presencia del hábitat origen.
  if (!soloAnadir && presencia.habitat_id) {
    const { error: errDel } = await supabase
      .from("ecosistema_participante_habitats")
      .delete()
      .eq("participante_id", presencia.participante_id)
      .eq("habitat_id", presencia.habitat_id);
    if (errDel) throw errDel;
  }
}
