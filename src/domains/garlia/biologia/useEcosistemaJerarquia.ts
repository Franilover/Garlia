"use client";

/**
 * useEcosistemaJerarquia.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve la jerarquía completa para el breadcrumb de PanelEcosistema:
 *
 *   ← Planeta ← Bioma ← Ecosistema (activo) → Hábitat → Criatura
 *
 * Estrategia:
 *   1. ecosistemas WHERE id → bioma_id → luego planeta via cuerpo_celeste_biomas_v1
 *   2. v_habitats_ecosistemas_v1 WHERE ecosistema_id → hábitats
 *   3. ecosistema_participantes WHERE ecosistema_id → criaturas
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
  /** bioma_id ya conocido del ecosistema (evita una query extra) */
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
      // Resolvemos bioma si no lo tenemos
      let resolvedBiomaId = biomaId ?? null;
      let biomas: ItemJerarquia[] = [];

      if (!resolvedBiomaId) {
        const { data: eco } = await supabase
          .from("ecosistemas")
          .select("bioma_id, biomas(nombre)")
          .eq("id", ecosistemaId)
          .single();
        if (!cancelado && eco?.bioma_id) {
          resolvedBiomaId = eco.bioma_id;
          biomas = [{ id: eco.bioma_id, nombre: (eco as any).biomas?.nombre ?? "Bioma" }];
        }
      } else {
        const { data: bData } = await supabase
          .from("biomas")
          .select("nombre")
          .eq("id", resolvedBiomaId)
          .single();
        if (!cancelado && bData) {
          biomas = [{ id: resolvedBiomaId, nombre: bData.nombre }];
        }
      }

      if (cancelado) return;

      const [
        { data: rawPlanetas },
        { data: rawHabitats },
        { data: participantes },
      ] = await Promise.all([
        // Planetas vía el bioma
        resolvedBiomaId
          ? supabase
              .from("cuerpo_celeste_biomas_v1")
              .select("cuerpo_celeste_id, cuerpos_celestes(nombre)")
              .eq("bioma_id", resolvedBiomaId)
          : Promise.resolve({ data: [] }),

        // Hábitats de este ecosistema
        supabase
          .from("v_habitats_ecosistemas_v1")
          .select("habitat_id, habitat")
          .eq("ecosistema_id", ecosistemaId),

        // Criaturas
        supabase
          .from("ecosistema_participantes")
          .select("criatura_id, criaturas(nombre)")
          .eq("ecosistema_id", ecosistemaId)
          .not("criatura_id", "is", null)
          .eq("activo", true),
      ]);

      if (cancelado) return;

      const planetas = dedup(
        (rawPlanetas ?? [])
          .filter((r: any) => r.cuerpo_celeste_id && r.cuerpos_celestes?.nombre)
          .map((r: any) => ({ id: r.cuerpo_celeste_id, nombre: r.cuerpos_celestes.nombre }))
      );

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
