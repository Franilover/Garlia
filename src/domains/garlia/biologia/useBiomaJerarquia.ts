"use client";

/**
 * useBiomaJerarquia.ts
 * Resuelve: ← Planeta ← Bioma (activo) → Ecosistema → Hábitat → Criatura
 *
 * cuerpo_celeste_biomas_v1 solo tiene cuerpo_celeste_id + bioma_id (sin FK join).
 * Se hace en 2 pasos: ids → nombres desde cuerpos_celestes_v1.
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
        { data: rawPlanetaIds },
        { data: rawHabitats },
      ] = await Promise.all([
        // Solo IDs — la vista no tiene FK a cuerpos_celestes
        supabase
          .from("cuerpo_celeste_biomas_v1")
          .select("cuerpo_celeste_id")
          .eq("bioma_id", biomaId),

        // Hábitats + ecosistemas en una sola query
        supabase
          .from("v_habitats_ecosistemas_v1")
          .select("habitat_id, habitat, ecosistema_id, ecosistema")
          .eq("bioma_id", biomaId),
      ]);

      if (cancelado) return;

      // Nombres de planetas desde cuerpos_celestes_v1
      const planetaIds = (rawPlanetaIds ?? [])
        .map((r: any) => r.cuerpo_celeste_id)
        .filter(Boolean);

      let planetas: ItemJerarquia[] = [];
      if (planetaIds.length > 0) {
        const { data: rawPlanetas } = await supabase
          .from("cuerpos_celestes_v1")
          .select("id, nombre")
          .in("id", planetaIds);
        if (!cancelado) {
          planetas = dedup(
            (rawPlanetas ?? [])
              .filter((r: any) => r.id && r.nombre)
              .map((r: any) => ({ id: r.id, nombre: r.nombre }))
          );
        }
      }

      if (cancelado) return;

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
