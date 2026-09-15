"use client";

/**
 * useCriaturasDeUnOrganismo.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa de useCriaturaOrganismos (domains/garlia/criaturas):
 * dado un organismo_id, devuelve las Criaturas que lo usan (tabla puente
 * `criatura_organismos`, filtro por organismo_id en vez de criatura_id).
 * Mismo rol que useOrganismosDeUnSistema.ts un nivel abajo — resuelve
 * "¿quién me usa?" para el breadcrumb navegable Organismo ⇄ Criatura, y
 * extiende el techo de la cadena completa:
 *
 *   Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo ⇄ Criatura
 *
 * Nota (2026-09-14): `criatura_organismos` tiene 0 filas en Supabase al
 * momento de crear este hook — mismo hueco de datos real que documenta
 * useCriaturaOrganismos.ts, no un bug de este archivo. `items` saldrá
 * vacío para cualquier Organismo hasta que se cargue esa tabla.
 *
 * Liviano y de solo lectura: no cachea en Dexie, igual que su análogo
 * useOrganismosDeUnSistema.ts.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

interface VinculoCriaturaOrganismo {
  id: string;
  criatura_id: string;
  organismo_id: string;
}

/** Ficha mínima de Criatura — mismo shape que CriaturaMin (criaturasCache),
 *  suficiente para un nodo de flujo (nombre + link visual). */
export interface CriaturaMinima {
  id: string;
  nombre: string;
  imagen_url: string | null;
}

/** Una Criatura que usa el Organismo consultado, ya resuelta para la UI. */
export interface CriaturaDeOrganismo {
  vinculo_id: string;
  criatura_id: string;
  organismo_id: string;
  criatura: CriaturaMinima;
}

export function useCriaturasDeUnOrganismo(organismoId: string | null) {
  const [vinculos, setVinculos] = useState<VinculoCriaturaOrganismo[]>([]);
  const [criaturas, setCriaturas] = useState<Record<string, CriaturaMinima>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organismoId) {
      setVinculos([]);
      setCriaturas({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: vinculoData, error: vinculoError } = await supabase
      .from("criatura_organismos")
      .select("id, criatura_id, organismo_id")
      .eq("organismo_id", organismoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      setVinculos([]);
      setCriaturas({});
      setLoading(false);
      return;
    }
    setVinculos(vinculoData as unknown as VinculoCriaturaOrganismo[]);

    const criaturaIds = (vinculoData as unknown as VinculoCriaturaOrganismo[]).map(
      (v) => v.criatura_id,
    );
    if (criaturaIds.length === 0) {
      setCriaturas({});
      setLoading(false);
      return;
    }

    const { data: criaturaData } = await supabase
      .from("criaturas")
      .select("id, nombre, imagen_url")
      .in("id", criaturaIds);

    const criaturasPorId: Record<string, CriaturaMinima> = {};
    for (const c of (criaturaData ?? []) as unknown as CriaturaMinima[]) criaturasPorId[c.id] = c;
    setCriaturas(criaturasPorId);
    setLoading(false);
  }, [organismoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<CriaturaDeOrganismo[]>(() => {
    return vinculos
      .map((v) => {
        const criatura = criaturas[v.criatura_id];
        if (!criatura) return null;
        return {
          vinculo_id: v.id,
          criatura_id: v.criatura_id,
          organismo_id: v.organismo_id,
          criatura,
        };
      })
      .filter((c): c is CriaturaDeOrganismo => c !== null);
  }, [vinculos, criaturas]);

  return { items, loading, load };
}
