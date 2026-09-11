"use client";

/**
 * useOrganismosDeUnSistema.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa de useOrganismoSistemas: dado un sistema_id, devuelve
 * los Organismos que lo usan (tabla puente `organismo_sistemas`, filtro por
 * sistema_id en vez de organismo_id). Mismo rol que useSistemasDeUnOrgano.ts
 * un nivel abajo — resuelve "¿quién me usa?" para el breadcrumb navegable
 * Sistema ⇄ Organismo, y cierra el techo de la cadena completa:
 *
 *   Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo
 *
 * Liviano y de solo lectura: no cachea en Dexie, igual que su análogo.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_ORGANISMOS,
  CONFIG_ORGANISMO_SISTEMAS,
  type Organismo,
} from "@/domains/garlia/elementos/types";

interface VinculoOrganismoSistema {
  id: string;
  organismo_id: string;
  sistema_id: string;
}

/** Un Organismo que usa el Sistema consultado, ya resuelto para la UI. */
export interface OrganismoDeSistema {
  vinculo_id: string;
  organismo_id: string;
  sistema_id: string;
  organismo: Organismo;
}

export function useOrganismosDeUnSistema(sistemaId: string | null) {
  const [vinculos, setVinculos] = useState<VinculoOrganismoSistema[]>([]);
  const [organismos, setOrganismos] = useState<Record<string, Organismo>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!sistemaId) {
      setVinculos([]);
      setOrganismos({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: vinculoData, error: vinculoError } = await supabase
      .from(CONFIG_ORGANISMO_SISTEMAS.tabla)
      .select("id, organismo_id, sistema_id")
      .eq("sistema_id", sistemaId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      setVinculos([]);
      setOrganismos({});
      setLoading(false);
      return;
    }
    setVinculos(vinculoData as unknown as VinculoOrganismoSistema[]);

    const organismoIds = (vinculoData as unknown as VinculoOrganismoSistema[]).map(
      (v) => v.organismo_id,
    );
    if (organismoIds.length === 0) {
      setOrganismos({});
      setLoading(false);
      return;
    }

    const { data: organismoData } = await supabase
      .from(CONFIG_ORGANISMOS.tabla)
      .select(CONFIG_ORGANISMOS.select)
      .in("id", organismoIds);

    const organismosPorId: Record<string, Organismo> = {};
    for (const o of (organismoData ?? []) as unknown as Organismo[]) organismosPorId[o.id] = o;
    setOrganismos(organismosPorId);
    setLoading(false);
  }, [sistemaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<OrganismoDeSistema[]>(() => {
    return vinculos
      .map((v) => {
        const organismo = organismos[v.organismo_id];
        if (!organismo) return null;
        return {
          vinculo_id: v.id,
          organismo_id: v.organismo_id,
          sistema_id: v.sistema_id,
          organismo,
        };
      })
      .filter((o): o is OrganismoDeSistema => o !== null);
  }, [vinculos, organismos]);

  return { items, loading, load };
}
