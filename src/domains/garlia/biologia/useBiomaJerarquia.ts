"use client";

/**
 * useBiomaJerarquia.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve la jerarquía completa para el breadcrumb de PanelBioma:
 *
 *   ← Planeta ← Bioma (activo) → Ecosistema → Hábitat → Criatura
 *
 * Estrategia:
 *   1. cuerpo_celeste_biomas_v1  WHERE bioma_id → planeta(s)
 *   2. v_habitats_ecosistemas_v1 WHERE bioma_id → ecosistemas + hábitats
 *   3. ecosistema_participantes  WHERE ecosistema_id IN (...) + activo → criaturas con nombre
 */

import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

export type ItemJerarquia = { id: string; nombre: string };

export type BiomaJerarquia = {
  planetas:    ItemJerarquia[];
  ecosistemas: ItemJerarquia[];
  habitats:    ItemJerarquia[];
  criaturas:   ItemJerarquia[];
  loading:     boolean;
};

function dedup(items: ItemJerarquia[]): ItemJerarquia[] {
  const seen = new Set<string>();
  return items.filter(({ id }) => id && !seen.has(id) && seen.add(id));
}

export function useBiomaJerarquia(biomaId: string): BiomaJerarquia {
  const [estado, setEstado] = useState<Omit<BiomaJerarquia, "loading">>({
    planetas: [], ecosistemas: [], habitats: [], criaturas: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!biomaId) return;
    let cancelado = false;
    setLoading(true);

    (async () => {
      const [
        { data: rawPlanetas },
        { data: rawHabitats },
      ] = await Promise.all([
        // Planetas que contienen este bioma
        supabase
          .from("cuerpo_celeste_biomas_v1")
          .select("cuerpo_celeste_id, cuerpos_celestes(nombre)")
          .eq("bioma_id", biomaId),

        // Hábitats → también nos da ecosistemas (la vista los tiene en una fila)
        supabase
          .from("v_habitats_ecosistemas_v1")
          .select("habitat_id, habitat, ecosistema_id, ecosistema")
          .eq("bioma_id", biomaId),
      ]);

      if (cancelado) return;

      const planetas = dedup(
        (rawPlanetas ?? [])
          .filter((r: any) => r.cuerpo_celeste_id && r.cuerpos_celestes?.nombre)
          .map((r: any) => ({ id: r.cuerpo_celeste_id, nombre: r.cuerpos_celestes.nombre }))
      );

      const rows = rawHabitats ?? [];

      const ecosistemas = dedup(
        rows
          .filter((r: any) => r.ecosistema_id && r.ecosistema)
          .map((r: any) => ({ id: r.ecosistema_id, nombre: r.ecosistema }))
      );

      const habitats = dedup(
        rows
          .filter((r: any) => r.habitat_id && r.habitat)
          .map((r: any) => ({ id: r.habitat_id, nombre: r.habitat }))
      );

      // Criaturas vía ecosistema_participantes
      const ecoIds = ecosistemas.map((e) => e.id);
      let criaturas: ItemJerarquia[] = [];

      if (ecoIds.length > 0) {
        const { data: participantes } = await supabase
          .from("ecosistema_participantes")
          .select("criatura_id, criaturas(nombre)")
          .in("ecosistema_id", ecoIds)
          .not("criatura_id", "is", null)
          .eq("activo", true);

        if (!cancelado) {
          criaturas = dedup(
            (participantes ?? [])
              .filter((p: any) => p.criatura_id && p.criaturas?.nombre)
              .map((p: any) => ({ id: p.criatura_id, nombre: p.criaturas.nombre }))
          );
        }
      }

      if (!cancelado) {
        setEstado({ planetas, ecosistemas, habitats, criaturas });
        setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [biomaId]);

  return { ...estado, loading };
}
