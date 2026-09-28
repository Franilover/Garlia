"use client";

/**
 * useMapaEcologico.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Lectura del mapa ecológico canónico (modelo macro → micro):
 *
 *   Bioma → Ecosistema → Hábitat → Presencias (organismo / criatura)
 *
 * REGLA: SUPABASE MANDA. Este hook solo LEE las vistas canónicas; no arma
 * JOINs ni reconstruye herencia en el cliente, y NO toca las tablas legacy
 * (ecosistema_criaturas, ecosistema_organismos, ecosistema_flora,
 * ecosistema_participantes.habitat_id):
 *
 *  - v_habitats_ecosistemas_v1
 *      habitat_id, habitat, tipo_habitat, tipo_habitat_nombre,
 *      ecosistema_id, ecosistema, habitat_padre_id, habitat_padre, orden
 *  - v_ecosistema_participantes_habitats_v1
 *      participante, ecosistema, organismo / criatura, tipo_participante,
 *      habitat, tipo_habitat, habitat_padre, tipo_presencia
 *
 * Solo lectura (las vistas usan security_invoker: el acceso depende de las
 * policies RLS de las tablas subyacentes — ver nota de RLS pendiente).
 *
 * No usa useSupabaseData: son vistas, no tablas sincronizadas con Dexie.
 * Mismo patrón que useEcosistemaCriaturas (fetch propio con cancelación).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

export interface HabitatEcologico {
  habitat_id: string;
  habitat: string;
  tipo_habitat: string | null;
  tipo_habitat_nombre: string | null;
  ecosistema_id: string;
  ecosistema: string | null;
  habitat_padre_id: string | null;
  habitat_padre: string | null;
  orden: number | null;
}

/** Una presencia = un participante ecológico ubicado en un hábitat. Un mismo
 *  participante puede aparecer en varios hábitats (multihábitat) → una fila
 *  por hábitat. */
export interface PresenciaEcologica {
  participante_id: string;
  ecosistema_id: string;
  habitat_id: string | null;
  /** "criatura" | "organismo" (según tipo_participante de la vista). */
  tipo_participante: string | null;
  criatura_id: string | null;
  organismo_id: string | null;
  /** Nombre ya resuelto del organismo o criatura. */
  nombre: string | null;
  /** Residente, etc. */
  tipo_presencia: string | null;
}

const SELECT_HABITATS =
  "habitat_id, habitat, tipo_habitat, tipo_habitat_nombre, ecosistema_id, ecosistema, habitat_padre_id, habitat_padre, orden";

// Columnas verificadas contra Supabase (information_schema) — no usar "*":
// la vista trae ids/joins de más y esto documenta el contrato real.
const SELECT_PRESENCIAS =
  "participante_id, ecosistema_id, ecosistema, organismo_id, organismo, criatura_id, criatura, tipo_participante, activo, habitat_id, habitat, tipo_habitat, habitat_padre_id, tipo_presencia";

/** Normaliza una fila de v_ecosistema_participantes_habitats_v1. Columnas
 *  verificadas: organismo/criatura (texto) + organismo_id/criatura_id. */
function normalizarPresencia(fila: Record<string, unknown>): PresenciaEcologica {
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
  return {
    participante_id: str(fila.participante_id) ?? "",
    ecosistema_id: str(fila.ecosistema_id) ?? "",
    habitat_id: str(fila.habitat_id),
    tipo_participante: str(fila.tipo_participante),
    criatura_id: str(fila.criatura_id),
    organismo_id: str(fila.organismo_id),
    nombre: str(fila.criatura) ?? str(fila.organismo),
    tipo_presencia: str(fila.tipo_presencia),
  };
}

/** En los datos reales, casi todo ser vivo existe DOS veces: como
 *  participante-criatura y como participante-organismo con el mismo nombre
 *  (p. ej. "Vampiro"). Mostrar ambos duplicaría el chip en el mismo hábitat.
 *  Se conserva la criatura (clicable) y se descarta el organismo gemelo SOLO
 *  cuando hay una criatura del mismo nombre en el MISMO hábitat. Los
 *  organismos sin criatura gemela (la flora: Flor Gelida, Imitadora…) se
 *  mantienen. */
function sinGemelosOrganismo(lista: PresenciaEcologica[]): PresenciaEcologica[] {
  const clave = (x: PresenciaEcologica) =>
    `${x.habitat_id ?? ""}::${(x.nombre ?? "").toLocaleLowerCase("es")}`;
  const criaturas = new Set(lista.filter((x) => x.criatura_id).map(clave));
  return lista.filter((x) => x.criatura_id || !criaturas.has(clave(x)));
}

export function useMapaEcologico() {
  const [habitats, setHabitats] = useState<HabitatEcologico[]>([]);
  const [presencias, setPresencias] = useState<PresenciaEcologica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const [h, p] = await Promise.all([
        supabase.from("v_habitats_ecosistemas_v1").select(SELECT_HABITATS).order("orden"),
        supabase
          .from("v_ecosistema_participantes_habitats_v1")
          .select(SELECT_PRESENCIAS)
          .eq("activo", true),
      ]);
      if (cancelado) return;
      if (h.error) console.error("[useMapaEcologico] hábitats:", h.error);
      if (p.error) console.error("[useMapaEcologico] presencias:", p.error);
      setHabitats((h.data as HabitatEcologico[] | null) ?? []);
      setPresencias(
        sinGemelosOrganismo(
          ((p.data as Record<string, unknown>[] | null) ?? []).map(normalizarPresencia),
        ),
      );
      setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Hábitats de un ecosistema, ordenados por `orden` (los de la vista ya
   *  vienen ordenados; se reordena por seguridad tras filtrar). */
  const habitatsDe = useCallback(
    (ecosistemaId: string) =>
      habitats
        .filter((x) => x.ecosistema_id === ecosistemaId)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [habitats],
  );

  /** Presencias (criaturas y organismos) de un hábitat concreto. */
  const presenciasDeHabitat = useCallback(
    (habitatId: string) => presencias.filter((x) => x.habitat_id === habitatId),
    [presencias],
  );

  /** Ids de criatura presentes en algún hábitat de un ecosistema —
   *  reemplaza a criaturaIdsDeEcosistema (tabla legacy ecosistema_criaturas)
   *  para decidir qué criaturas "tienen ecosistema". */
  const criaturaIdsDeEcosistema = useCallback(
    (ecosistemaId: string) => {
      const ids = new Set<string>();
      for (const x of presencias) {
        if (x.ecosistema_id === ecosistemaId && x.criatura_id) ids.add(x.criatura_id);
      }
      return [...ids];
    },
    [presencias],
  );

  const criaturaIdsConPresencia = useMemo(() => {
    const ids = new Set<string>();
    for (const x of presencias) if (x.criatura_id) ids.add(x.criatura_id);
    return ids;
  }, [presencias]);

  return {
    habitats,
    presencias,
    loading,
    habitatsDe,
    presenciasDeHabitat,
    criaturaIdsDeEcosistema,
    criaturaIdsConPresencia,
  };
}
