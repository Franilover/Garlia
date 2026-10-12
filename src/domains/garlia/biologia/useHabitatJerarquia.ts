"use client";

/**
 * useHabitatJerarquia.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve la jerarquía completa para el breadcrumb de HabitatEditor:
 *
 *   ← Planeta ← Bioma ← Ecosistema ← Hábitat (activo) → Criatura
 *
 * Usa v_habitats_ecosistemas_v1 (que ya tiene bioma_id, ecosistema_id en
 * la fila del hábitat) más una query de planetas y otra de criaturas.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

export type ItemJerarquia = { id: string; nombre: string };

export type HabitatJerarquia = {
  planetas:    ItemJerarquia[];
  biomas:      ItemJerarquia[];
  ecosistemas: ItemJerarquia[];
  criaturas:   ItemJerarquia[];
  loading:     boolean;
};

function dedup(items: ItemJerarquia[]): ItemJerarquia[] {
  const seen = new Set<string>();
  return items.filter(({ id }) => id && !seen.has(id) && seen.add(id));
}

export function useHabitatJerarquia(habitatId: string): HabitatJerarquia {
  const [estado, setEstado] = useState<Omit<HabitatJerarquia, "loading">>({
    planetas: [], biomas: [], ecosistemas: [], criaturas: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!habitatId) return;
    let cancelado = false;
    setLoading(true);

    (async () => {
      // 1. Contexto del hábitat (bioma_id + ecosistema_id están en la vista)
      const { data: hRow } = await supabase
        .from("v_habitats_ecosistemas_v1")
        .select("ecosistema_id, ecosistema, bioma_id, bioma")
        .eq("habitat_id", habitatId)
        .limit(1)
        .single();

      if (cancelado) return;

      const ecosistemaId = hRow?.ecosistema_id ?? null;
      const biomaId      = hRow?.bioma_id ?? null;

      const biomas: ItemJerarquia[] = hRow?.bioma_id
        ? [{ id: hRow.bioma_id, nombre: hRow.bioma ?? "Bioma" }]
        : [];

      const ecosistemas: ItemJerarquia[] = hRow?.ecosistema_id
        ? [{ id: hRow.ecosistema_id, nombre: hRow.ecosistema ?? "Ecosistema" }]
        : [];

      // 2. Planetas (via bioma) + Criaturas (via ecosistema_participantes) en paralelo
      const [
        { data: rawPlanetas },
        { data: participantes },
      ] = await Promise.all([
        biomaId
          ? supabase
              .from("cuerpo_celeste_biomas_v1")
              .select("cuerpo_celeste_id, cuerpos_celestes(nombre)")
              .eq("bioma_id", biomaId)
          : Promise.resolve({ data: [] }),

        ecosistemaId
          ? supabase
              .from("ecosistema_participantes")
              .select("criatura_id, criaturas(nombre)")
              .eq("ecosistema_id", ecosistemaId)
              .not("criatura_id", "is", null)
              .eq("activo", true)
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelado) return;

      const planetas = dedup(
        (rawPlanetas ?? [])
          .filter((r: any) => r.cuerpo_celeste_id && r.cuerpos_celestes?.nombre)
          .map((r: any) => ({ id: r.cuerpo_celeste_id, nombre: r.cuerpos_celestes.nombre }))
      );

      const criaturas = dedup(
        (participantes ?? [])
          .filter((p: any) => p.criatura_id && p.criaturas?.nombre)
          .map((p: any) => ({ id: p.criatura_id, nombre: p.criaturas.nombre }))
      );

      if (!cancelado) {
        setEstado({ planetas, biomas, ecosistemas, criaturas });
        setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [habitatId]);

  return { ...estado, loading };
}
