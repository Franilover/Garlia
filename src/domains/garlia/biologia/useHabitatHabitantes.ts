"use client";

/**
 * useHabitatHabitantes.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Datos y acciones del menú flotante de un HÁBITAT (ver HabitatPopoverContent).
 *
 * REGLA: SUPABASE MANDA. Este hook solo LEE las vistas canónicas y solo
 * ESCRIBE en las dos tablas canónicas de presencia; no reconstruye herencia
 * de factores ni compatibilidad en el cliente:
 *
 *  LECTURA
 *  - v_opciones_habitantes_habitat_v1  → candidatos (organismos + criaturas)
 *      para ESTE hábitat: es_presente, compatibilidad, prioridad,
 *      descripcion_compatibilidad, participante_id (null si el candidato
 *      todavía no es participante del ecosistema).
 *  - v_editor_factores_abioticos_v1    → factores con su valor EFECTIVO ya
 *      resuelto (hábitat → ecosistema → bioma) y de dónde viene (fuente_nivel).
 *
 *  ESCRITURA (multihábitat: un participante ↔ N hábitats)
 *  - ecosistema_participantes          → nodo ecológico (organismo|criatura)
 *      dentro de un ecosistema. Se crea solo si el candidato aún no lo es.
 *  - ecosistema_participante_habitats  → presencia del participante en ESTE
 *      hábitat (con tipo_presencia). Los triggers de la BD validan que el
 *      hábitat sea del mismo ecosistema y sincronizan el habitat_id de
 *      referencia; el cliente NO toca ecosistema_participantes.habitat_id.
 *
 *  Quitar = borrar SOLO la fila de presencia de este hábitat. El participante
 *  se conserva (puede seguir en otros hábitats o recibir relaciones/roles).
 *
 * No usa useSupabaseData: son vistas / puentes sin caché offline (mismo
 * criterio que useMapaEcologico y useEcosistemaCriaturas).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

/** Estados canónicos de reglas_compatibilidad_habitat_participantes
 *  (+ "sin_evaluar" cuando no hay regla: la vista lo devuelve por defecto). */
export type CompatibilidadHabitat = "compatible" | "posible" | "incompatible" | "sin_evaluar";

export type TipoParticipanteHabitat = "organismo" | "criatura";

export interface CandidatoHabitante {
  /** Clave estable de UI: `${tipo}:${organismo_id|criatura_id}`. */
  clave: string;
  tipo_participante: TipoParticipanteHabitat;
  organismo_id: string | null;
  criatura_id: string | null;
  /** Nombre ya resuelto (organismo o criatura). */
  nombre: string;
  /** null si todavía no es participante del ecosistema. */
  participante_id: string | null;
  /** Presencia REAL en este hábitat (ecosistema_participante_habitats). */
  es_presente: boolean;
  compatibilidad: CompatibilidadHabitat;
  prioridad: number | null;
  descripcion_compatibilidad: string | null;
  tipo_presencia: string | null;
}

export interface FactorEfectivo {
  factor_id: string;
  factor: string;
  categoria: string | null;
  tipo_valor: string | null;
  valor_numerico: number | null;
  /** Símbolo canónico desde unidades_fisicas (p. ej. "uΘ", donde 1 uΘ = 1 K).
   *  null para índices adimensionales y selecciones. NUNCA hardcodear "K"/"Pa". */
  unidad_simbolo: string | null;
  opcion: string | null;
  /** habitat | ecosistema | bioma — de dónde viene el valor efectivo. */
  fuente_nivel: string | null;
  falta_valor: boolean;
  orden_factor: number;
}

export interface TipoPresencia {
  id: string;
  clave: string;
  nombre: string;
}

const SELECT_CANDIDATOS =
  "habitat_id, ecosistema_id, tipo_participante, organismo_id, organismo, criatura_id, criatura, participante_id, es_presente, compatibilidad, prioridad, descripcion_compatibilidad, tipo_presencia";

const SELECT_FACTORES =
  "factor_id, factor, categoria, tipo_valor, valor_numerico, unidad_simbolo, opcion, fuente_nivel, falta_valor, orden_factor";

const COMPATIBILIDADES: CompatibilidadHabitat[] = [
  "compatible",
  "posible",
  "incompatible",
  "sin_evaluar",
];

/** PostgREST serializa `numeric` como string ("288.15"): se parsea acá. */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizarCandidato(f: Record<string, unknown>): CandidatoHabitante | null {
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
  const tipo = f.tipo_participante === "criatura" ? "criatura" : "organismo";
  const organismo_id = str(f.organismo_id);
  const criatura_id = str(f.criatura_id);
  const refId = tipo === "criatura" ? criatura_id : organismo_id;
  if (!refId) return null;
  const compat = COMPATIBILIDADES.includes(f.compatibilidad as CompatibilidadHabitat)
    ? (f.compatibilidad as CompatibilidadHabitat)
    : "sin_evaluar";
  return {
    clave: `${tipo}:${refId}`,
    tipo_participante: tipo,
    organismo_id,
    criatura_id,
    nombre: (tipo === "criatura" ? str(f.criatura) : str(f.organismo)) ?? "Sin nombre",
    participante_id: str(f.participante_id),
    es_presente: f.es_presente === true,
    compatibilidad: compat,
    prioridad: typeof f.prioridad === "number" ? f.prioridad : null,
    descripcion_compatibilidad: str(f.descripcion_compatibilidad),
    tipo_presencia: str(f.tipo_presencia),
  };
}

/** En los datos reales casi todo ser vivo existe DOS veces: como criatura y
 *  como organismo con el mismo nombre (p. ej. "Vampiro"). Igual que
 *  useMapaEcologico.sinGemelosOrganismo: se conserva la criatura y se oculta
 *  el organismo gemelo, SALVO que el organismo ya esté presente en el hábitat
 *  (no se debe esconder algo ya registrado — hay que poder quitarlo). */
function sinGemelos(lista: CandidatoHabitante[]): CandidatoHabitante[] {
  const norm = (s: string) => s.toLocaleLowerCase("es");
  const nombresCriatura = new Set(
    lista.filter((c) => c.tipo_participante === "criatura").map((c) => norm(c.nombre)),
  );
  return lista.filter(
    (c) =>
      c.tipo_participante === "criatura" ||
      c.es_presente ||
      !nombresCriatura.has(norm(c.nombre)),
  );
}

/** Orden: presentes primero; luego por compatibilidad (compatible → posible
 *  → sin_evaluar → incompatible), luego prioridad desc, luego nombre. */
const RANGO_COMPAT: Record<CompatibilidadHabitat, number> = {
  compatible: 0,
  posible: 1,
  sin_evaluar: 2,
  incompatible: 3,
};

function ordenar(a: CandidatoHabitante, b: CandidatoHabitante): number {
  if (a.es_presente !== b.es_presente) return a.es_presente ? -1 : 1;
  const dc = RANGO_COMPAT[a.compatibilidad] - RANGO_COMPAT[b.compatibilidad];
  if (dc !== 0) return dc;
  const dp = (b.prioridad ?? 0) - (a.prioridad ?? 0);
  if (dp !== 0) return dp;
  return a.nombre.localeCompare(b.nombre, "es");
}

export function useHabitatHabitantes(
  habitatId: string,
  ecosistemaId: string,
  /** Se invoca tras una escritura exitosa para que el mapa (chips del
   *  hábitat en CriaturasJerarquica) se refresque. */
  onCambio?: () => void,
) {
  const [candidatos, setCandidatos] = useState<CandidatoHabitante[]>([]);
  const [factores, setFactores] = useState<FactorEfectivo[]>([]);
  const [tiposPresencia, setTiposPresencia] = useState<TipoPresencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Claves de candidatos con una escritura en curso (deshabilita su fila). */
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());

  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;

  const cargar = useCallback(async () => {
    const [c, f, t] = await Promise.all([
      supabase
        .from("v_opciones_habitantes_habitat_v1")
        .select(SELECT_CANDIDATOS)
        .eq("habitat_id", habitatId),
      supabase
        .from("v_editor_factores_abioticos_v1")
        .select(SELECT_FACTORES)
        .eq("habitat_id", habitatId),
      supabase.from("tipos_presencia_ecologica").select("id, clave, nombre").eq("activo", true),
    ]);
    if (c.error) console.error("[useHabitatHabitantes] candidatos:", c.error);
    if (f.error) console.error("[useHabitatHabitantes] factores:", f.error);
    if (t.error) console.error("[useHabitatHabitantes] tipos presencia:", t.error);

    setCandidatos(
      sinGemelos(
        ((c.data as Record<string, unknown>[] | null) ?? [])
          .map(normalizarCandidato)
          .filter((x): x is CandidatoHabitante => x !== null),
      ),
    );
    setFactores(
      ((f.data as Record<string, unknown>[] | null) ?? [])
        .map((x) => ({
          factor_id: String(x.factor_id ?? ""),
          factor: String(x.factor ?? ""),
          categoria: (x.categoria as string | null) ?? null,
          tipo_valor: (x.tipo_valor as string | null) ?? null,
          valor_numerico: num(x.valor_numerico),
          unidad_simbolo: (x.unidad_simbolo as string | null) ?? null,
          opcion: (x.opcion as string | null) ?? null,
          fuente_nivel: (x.fuente_nivel as string | null) ?? null,
          falta_valor: x.falta_valor === true,
          orden_factor: num(x.orden_factor) ?? 0,
        }))
        .sort((a, b) => a.orden_factor - b.orden_factor),
    );
    setTiposPresencia((t.data as TipoPresencia[] | null) ?? []);
    setError(c.error ? "No se pudieron cargar los habitantes" : null);
  }, [habitatId]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    void cargar().finally(() => {
      if (!cancelado) setLoading(false);
    });
    return () => {
      cancelado = true;
    };
  }, [cargar]);

  const marcarPendiente = (clave: string, activo: boolean) =>
    setPendientes((prev) => {
      const next = new Set(prev);
      if (activo) next.add(clave);
      else next.delete(clave);
      return next;
    });

  /** Presencia por defecto al añadir: "residente" (único tipo hoy), o el
   *  primero activo si en el futuro cambia el catálogo. */
  const tipoPresenciaPorDefectoId = useMemo(
    () => (tiposPresencia.find((t) => t.clave === "residente") ?? tiposPresencia[0])?.id ?? null,
    [tiposPresencia],
  );

  /** Añade la presencia del candidato en este hábitat. Crea antes el
   *  participante del ecosistema si todavía no existe. */
  const añadir = useCallback(
    async (cand: CandidatoHabitante, tipoPresenciaId?: string | null) => {
      marcarPendiente(cand.clave, true);
      setError(null);
      try {
        let participanteId = cand.participante_id;

        if (!participanteId) {
          const { data, error: errP } = await supabase
            .from("ecosistema_participantes")
            .insert({
              ecosistema_id: ecosistemaId,
              organismo_id: cand.tipo_participante === "organismo" ? cand.organismo_id : null,
              criatura_id: cand.tipo_participante === "criatura" ? cand.criatura_id : null,
              activo: true,
            })
            .select("id")
            .single();
          if (errP || !data) throw errP ?? new Error("No se creó el participante");
          participanteId = data.id as string;
        }

        const { error: errH } = await supabase.from("ecosistema_participante_habitats").insert({
          participante_id: participanteId,
          habitat_id: habitatId,
          tipo_presencia_id: tipoPresenciaId ?? tipoPresenciaPorDefectoId,
        });
        // 23505 = ya existía la presencia (doble click / carrera): no es error.
        if (errH && errH.code !== "23505") throw errH;

        await cargar();
        onCambioRef.current?.();
      } catch (e) {
        console.error("[useHabitatHabitantes] añadir:", e);
        setError(`No se pudo añadir a ${cand.nombre}`);
      } finally {
        marcarPendiente(cand.clave, false);
      }
    },
    [ecosistemaId, habitatId, tipoPresenciaPorDefectoId, cargar],
  );

  /** Quita la presencia del candidato en ESTE hábitat (el participante y sus
   *  presencias en otros hábitats se conservan). */
  const quitar = useCallback(
    async (cand: CandidatoHabitante) => {
      if (!cand.participante_id) return;
      marcarPendiente(cand.clave, true);
      setError(null);
      try {
        const { error: errH } = await supabase
          .from("ecosistema_participante_habitats")
          .delete()
          .eq("participante_id", cand.participante_id)
          .eq("habitat_id", habitatId);
        if (errH) throw errH;

        await cargar();
        onCambioRef.current?.();
      } catch (e) {
        console.error("[useHabitatHabitantes] quitar:", e);
        setError(`No se pudo quitar a ${cand.nombre}`);
      } finally {
        marcarPendiente(cand.clave, false);
      }
    },
    [habitatId, cargar],
  );

  const ordenados = useMemo(() => [...candidatos].sort(ordenar), [candidatos]);

  return {
    candidatos: ordenados,
    factores,
    loading,
    error,
    pendientes,
    añadir,
    quitar,
    recargar: cargar,
  };
}
