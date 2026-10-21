"use client";

/**
 * useEcosistemaJerarquia.ts
 * Resuelve: ← Planeta ← Bioma ← Ecosistema (activo) → Hábitat → Criatura
 */

import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

export type ItemJerarquia = { id: string; nombre: string };

export type EcosistemaJerarquia = {
  planetas:  ItemJerarquia[];
  biomas:    ItemJerarquia[];
  habitats:  ItemJerarquia[];
  criaturas: ItemJerarquia[];
  loading:   boolean;
};

function dedup(items: ItemJerarquia[]): ItemJerarquia[] {
  const seen = new Set<string>();
  return items.filter(({ id }) => id && !seen.has(id) && seen.add(id));
}

export function useEcosistemaJerarquia(
  ecosistemaId: string,
  biomaId?: string | null,
): EcosistemaJerarquia {
  const [estado, setEstado] = useState<Omit<EcosistemaJerarquia, "loading">>({
    planetas: [], biomas: [], habitats: [], criaturas: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ecosistemaId) return;
    let cancelado = false;
    setLoading(true);

    (async () => {
      // Paso 1: resolver bioma_id si no lo tenemos, y nombre del bioma
      let resolvedBiomaId = biomaId ?? null;
      let biomas: ItemJerarquia[] = [];

      if (resolvedBiomaId) {
        const { data: bData } = await supabase
          .from("biomas")
          .select("nombre")
          .eq("id", resolvedBiomaId)
          .single();
        if (!cancelado && bData) {
          biomas = [{ id: resolvedBiomaId, nombre: bData.nombre }];
        }
      } else {
        const { data: eco } = await supabase
          .from("ecosistemas")
          .select("bioma_id, biomas(nombre)")
          .eq("id", ecosistemaId)
          .single();
        if (!cancelado && eco?.bioma_id) {
          resolvedBiomaId = eco.bioma_id;
          biomas = [{ id: eco.bioma_id, nombre: (eco as any).biomas?.nombre ?? "Bioma" }];
        }
      }

      if (cancelado) return;

      // Paso 2: IDs de planetas via bioma + hábitats + criaturas en paralelo
      const [
        { data: rawPlanetaIds },
        { data: rawHabitats },
        { data: participantes },
      ] = await Promise.all([
        resolvedBiomaId
          ? supabase
              .from("cuerpo_celeste_biomas_v1")
              .select("cuerpo_celeste_id")
              .eq("bioma_id", resolvedBiomaId)
          : Promise.resolve({ data: [] }),

        supabase
          .from("v_habitats_ecosistemas_v1")
          .select("habitat_id, habitat")
          .eq("ecosistema_id", ecosistemaId),

        supabase
          .from("ecosistema_participantes")
          .select("criatura_id, criaturas(nombre)")
          .eq("ecosistema_id", ecosistemaId)
          .not("criatura_id", "is", null)
          .eq("activo", true),
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

      const habitats = dedup(
        (rawHabitats ?? [])
          .filter((r: any) => r.habitat_id && r.habitat)
          .map((r: any) => ({ id: r.habitat_id, nombre: r.habitat }))
      );

      const criaturas = dedup(
        (participantes ?? [])
          .filter((p: any) => p.criatura_id && p.criaturas?.nombre)
          .map((p: any) => ({ id: p.criatura_id, nombre: p.criaturas.nombre }))
      );

      if (!cancelado) {
        setEstado({ planetas, biomas, habitats, criaturas });
        setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [ecosistemaId, biomaId]);

  return { ...estado, loading };
}
