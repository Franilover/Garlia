"use client";

/**
 * usePlanetaJerarquiaEcologica.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve la cadena ecológica completa de un planeta para alimentar
 * BreadcrumbJerarquia en PanelPlaneta:
 *
 *   Planeta ▸ Bioma ▸ Ecosistema ▸ Hábitat ▸ Criatura
 *
 * Usa v_mapa_ecologico_v1 (que ya tiene cuerpo_celeste_id + todos los
 * niveles intermedios) más una query a ecosistema_participantes para
 * las criaturas. Todo en un Promise.all.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

export type ItemJerarquia = { id: string; nombre: string };

export type JerarquiaEcologica = {
  biomas:      ItemJerarquia[];
  ecosistemas: ItemJerarquia[];
  habitats:    ItemJerarquia[];
  criaturas:   ItemJerarquia[];
  loading:     boolean;
};

/** Deduplica por id manteniendo orden de primera aparición. */
function dedup(items: ItemJerarquia[]): ItemJerarquia[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
}

export function usePlanetaJerarquiaEcologica(planetaId: string): JerarquiaEcologica {
  const [estado, setEstado] = useState<Omit<JerarquiaEcologica, "loading">>({
    biomas: [], ecosistemas: [], habitats: [], criaturas: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!planetaId) return;
    let cancelado = false;
    setLoading(true);

    (async () => {
      // ── Niveles 2-4 desde la vista ecológica ────────────────────────────
      const { data: mapa } = await supabase
        .from("v_mapa_ecologico_v1")
        .select("bioma_id, bioma, ecosistema_id, ecosistema, habitat_id, habitat")
        .eq("cuerpo_celeste_id", planetaId);

      if (cancelado) return;

      const rows = mapa ?? [];

      const biomas = dedup(
        rows
          .filter((r: any) => r.bioma_id && r.bioma)
          .map((r: any) => ({ id: r.bioma_id, nombre: r.bioma }))
      );
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

      // ── Nivel 5: criaturas via ecosistema_participantes ─────────────────
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
        setEstado({ biomas, ecosistemas, habitats, criaturas });
        setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [planetaId]);

  return { ...estado, loading };
}
