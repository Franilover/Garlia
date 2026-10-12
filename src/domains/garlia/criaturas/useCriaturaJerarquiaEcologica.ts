"use client";

/**
 * useCriaturaJerarquiaEcologica.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve los niveles ecológicos ASCENDENTES de una criatura para extender
 * el breadcrumb de EditorCriatura hacia la derecha:
 *
 *   … ▸ Criatura (activo) ▸ Hábitat ▸ Ecosistema ▸ Bioma ▸ Planeta
 *
 * Cadena de joins:
 *   ecosistema_participantes (criatura_id) ──► ecosistema_id, habitat_id
 *   v_mapa_ecologico_v1      (ecosistema_id IN ...) ──► bioma, planeta
 *
 * Todo en un Promise.all de dos queries; la vista ya tiene el árbol completo.
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
      // ── Paso 1: hábitats y ecosistemas directos de la criatura ─────────
      const { data: participantes } = await supabase
        .from("ecosistema_participantes")
        .select("ecosistema_id, habitat_id, habitats(nombre), ecosistemas(nombre)")
        .eq("criatura_id", criaturaId)
        .eq("activo", true);

      if (cancelado) return;

      const rows = participantes ?? [];

      const habitats = dedup(
        rows
          .filter((r: any) => r.habitat_id && r.habitats?.nombre)
          .map((r: any) => ({ id: r.habitat_id, nombre: r.habitats.nombre }))
      );
      const ecosistemas = dedup(
        rows
          .filter((r: any) => r.ecosistema_id && r.ecosistemas?.nombre)
          .map((r: any) => ({ id: r.ecosistema_id, nombre: r.ecosistemas.nombre }))
      );

      // ── Paso 2: biomas y planetas desde la vista ecológica ─────────────
      const ecoIds = ecosistemas.map((e) => e.id);
      let biomas:   ItemJerarquia[] = [];
      let planetas: ItemJerarquia[] = [];

      if (ecoIds.length > 0) {
        const { data: mapa } = await supabase
          .from("v_mapa_ecologico_v1")
          .select("bioma_id, bioma, cuerpo_celeste_id, cuerpo_celeste")
          .in("ecosistema_id", ecoIds);

        if (!cancelado) {
          biomas = dedup(
            (mapa ?? [])
              .filter((r: any) => r.bioma_id && r.bioma)
              .map((r: any) => ({ id: r.bioma_id, nombre: r.bioma }))
          );
          planetas = dedup(
            (mapa ?? [])
              .filter((r: any) => r.cuerpo_celeste_id && r.cuerpo_celeste)
              .map((r: any) => ({ id: r.cuerpo_celeste_id, nombre: r.cuerpo_celeste }))
          );
        }
      }

      if (!cancelado) {
        setEstado({ habitats, ecosistemas, biomas, planetas });
        setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [criaturaId]);

  return { ...estado, loading };
}
