"use client";

/**
 * useHabitatJerarquia.ts
 * Resuelve: ← Planeta ← Bioma ← Ecosistema ← Hábitat (activo) → Criatura
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
      // Paso 1: contexto del hábitat (bioma_id + ecosistema_id desde la vista)
      const { data: hRow } = await supabase
        .from("v_habitats_ecosistemas_v1")
        .select("ecosistema_id, ecosistema, bioma_id, bioma")
        .eq("habitat_id", habitatId)
        .limit(1)
        .single();

      if (cancelado) return;

      const ecosistemaId = hRow?.ecosistema_id ?? null;
      const biomaId      = hRow?.bioma_id ?? null;

      const biomas: ItemJerarquia[] = biomaId
        ? [{ id: biomaId, nombre: hRow?.bioma ?? "Bioma" }]
        : [];

      const ecosistemas: ItemJerarquia[] = ecosistemaId
        ? [{ id: ecosistemaId, nombre: hRow?.ecosistema ?? "Ecosistema" }]
        : [];

      // Paso 2: IDs de planetas + criaturas en paralelo
      const [
        { data: rawPlanetaIds },
        { data: participantes },
      ] = await Promise.all([
        biomaId
          ? supabase
              .from("cuerpo_celeste_biomas_v1")
              .select("cuerpo_celeste_id")
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

      // Paso 3: nombres de planetas
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
