"use client";

/**
 * useEntidadesDeCriatura.ts
 * ───────────────────────────
 * Trae las entidades vinculadas a una criatura para el agrupador visual
 * "Criatura → Entidades" del editor de Criatura:
 *   - Ítems: vínculo DIRECTO vía columna `criatura_id` (1 criatura → N items;
 *     acá la criatura es el "dueño"/origen del item).
 *   - Minerales: no tienen columna directa a criatura_id — viven en
 *     `Ecosistema.mineral_ids` (jsonb).
 *   - Flora: tampoco tiene columna directa — vive en la tabla puente
 *     `ecosistema_flora` (M:N, ecosistemas.flora_ids ya no es columna).
 *   Ambas se muestran acá, al mismo nivel que Items, para la Flora/Minerales
 *   de todo Ecosistema ligado a esta criatura vía la tabla puente
 *   `ecosistema_criaturas` (ruta canónica v226; solo lectura acá — la
 *   edición del vínculo vive en PanelEcosistema).
 *
 * Ruta destino:
 *   src/features/editorGarlia/hooks/criaturas/useEntidadesDeCriatura.ts
 */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

export type EntidadDeCriaturaMin = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
};

type Grupos = {
  items: EntidadDeCriaturaMin[];
  flora: EntidadDeCriaturaMin[];
  minerales: EntidadDeCriaturaMin[];
};

const EMPTY: Grupos = { items: [], flora: [], minerales: [] };

export function useEntidadesDeCriatura(criaturaId: string) {
  const [grupos, setGrupos] = useState<Grupos>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!criaturaId) {
      setGrupos(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: items }, { data: vinculos }] = await Promise.all([
        supabase
          .from("items")
          .select("id, nombre, imagen_url")
          .eq("criatura_id", criaturaId)
          .order("nombre"),
        // Ruta canónica v226: ecosistema_criaturas es la tabla puente que
        // liga esta criatura a sus ecosistemas.
        supabase
          .from("ecosistema_criaturas")
          .select("ecosistema_id")
          .eq("criatura_id", criaturaId),
      ]);

      const ecosistemaIds = (vinculos ?? []).map((v: any) => v.ecosistema_id as string);
      const [{ data: ecosistemas }, { data: floraVinculos }] = ecosistemaIds.length
        ? await Promise.all([
            supabase.from("ecosistemas").select("mineral_ids").in("id", ecosistemaIds),
            // ecosistemas.flora_ids ya no es columna — la relación vive en
            // la tabla puente ecosistema_flora (M:N).
            supabase.from("ecosistema_flora").select("flora_id").in("ecosistema_id", ecosistemaIds),
          ])
        : [
            { data: [] as { mineral_ids: string[] }[] },
            { data: [] as { flora_id: string }[] },
          ];

      const floraIds = Array.from(
        new Set((floraVinculos ?? []).map((f: any) => f.flora_id as string)),
      );
      const mineralIds = Array.from(
        new Set((ecosistemas ?? []).flatMap((e: any) => (e.mineral_ids ?? []) as string[])),
      );

      const [{ data: flora }, { data: minerales }] = await Promise.all([
        floraIds.length
          ? supabase
              .from("organismos")
              .select("id, nombre, imagen_url")
              .eq("tipo_organismo", "vegetal")
              .in("id", floraIds)
              .order("nombre")
          : Promise.resolve({ data: [] as EntidadDeCriaturaMin[] }),
        mineralIds.length
          ? supabase.from("minerales").select("id, nombre, imagen_url").in("id", mineralIds).order("nombre")
          : Promise.resolve({ data: [] as EntidadDeCriaturaMin[] }),
      ]);

      setGrupos({
        items: (items ?? []) as EntidadDeCriaturaMin[],
        flora: (flora ?? []) as EntidadDeCriaturaMin[],
        minerales: (minerales ?? []) as EntidadDeCriaturaMin[],
      });
    } finally {
      setLoading(false);
    }
  }, [criaturaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = grupos.items.length + grupos.flora.length + grupos.minerales.length;

  return { grupos, total, loading, reload: load };
}
