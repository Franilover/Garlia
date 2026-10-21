"use client";

/**
 * useCriaturaJerarquiaEcologica.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve los niveles ecológicos ascendentes de una criatura:
 *
 *   Criatura (activo) ▸ Hábitat ▸ Ecosistema ▸ Bioma ▸ Planeta
 *
 * Estrategia en 2 queries sin depender de FK constraints en PostgREST:
 *
 *   1. ecosistema_participantes  →  sólo ids (ecosistema_id, habitat_id)
 *   2. v_mapa_ecologico_v1 WHERE ecosistema_id IN (...)
 *      → nombres de hábitat, ecosistema, bioma y planeta en una sola pasada
 */

import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

export type ItemJerarquia = { id: string; nombre: string };

export type JerarquiaEcologicaCriatura = {
  habitats:    ItemJerarquia[];
  ecosistemas: ItemJerarquia[];
  biomas:      ItemJerarquia[];
  planetas:    ItemJerarquia[];
  loading:     boolean;
};

function dedup(items: ItemJerarquia[]): ItemJerarquia[] {
  const seen = new Set<string>();
  return items.filter(({ id }) => !seen.has(id) && seen.add(id));
}

export function useCriaturaJerarquiaEcologica(criaturaId: string): JerarquiaEcologicaCriatura {
  const [estado, setEstado] = useState<Omit<JerarquiaEcologicaCriatura, "loading">>({
    habitats: [], ecosistemas: [], biomas: [], planetas: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!criaturaId) return;
    let cancelado = false;
    setLoading(true);

    (async () => {
      // ── Paso 1: ids directos, sin joins ────────────────────────────────
      const { data: participantes } = await supabase
        .from("ecosistema_participantes")
        .select("ecosistema_id, habitat_id")
        .eq("criatura_id", criaturaId)
        .eq("activo", true);

      if (cancelado) return;

      const ecoIds = [...new Set(
        (participantes ?? [])
          .map((r: any) => r.ecosistema_id)
          .filter(Boolean)
      )];

      // Sin ecosistemas, nada que mostrar
      if (ecoIds.length === 0) {
        setEstado({ habitats: [], ecosistemas: [], biomas: [], planetas: [] });
        setLoading(false);
        return;
      }

      // ── Paso 2: todos los nombres via la vista ecológica ───────────────
      const { data: mapa } = await supabase
        .from("v_mapa_ecologico_v1")
        .select("habitat_id, habitat, ecosistema_id, ecosistema, bioma_id, bioma, cuerpo_celeste_id, cuerpo_celeste")
        .in("ecosistema_id", ecoIds);

      if (cancelado) return;

      const rows = mapa ?? [];

      setEstado({
        habitats: dedup(
          rows
            .filter((r: any) => r.habitat_id && r.habitat)
            .map((r: any) => ({ id: r.habitat_id, nombre: r.habitat }))
        ),
        ecosistemas: dedup(
          rows
            .filter((r: any) => r.ecosistema_id && r.ecosistema)
            .map((r: any) => ({ id: r.ecosistema_id, nombre: r.ecosistema }))
        ),
        biomas: dedup(
          rows
            .filter((r: any) => r.bioma_id && r.bioma)
            .map((r: any) => ({ id: r.bioma_id, nombre: r.bioma }))
        ),
        planetas: dedup(
          rows
            .filter((r: any) => r.cuerpo_celeste_id && r.cuerpo_celeste)
            .map((r: any) => ({ id: r.cuerpo_celeste_id, nombre: r.cuerpo_celeste }))
        ),
      });
      setLoading(false);
    })();

    return () => { cancelado = true; };
  }, [criaturaId]);

  return { ...estado, loading };
}
