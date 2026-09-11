"use client";

/**
 * useSistemasYOrganismosDeOrganos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dado un array de organo_id (los Órganos ya alcanzados desde una Célula o
 * un Tejido — ver useOrganosDeUnaCelula/useOrganosDeUnTejido), resuelve la
 * unión de Sistemas que los usan (sistema_organos) y, a partir de esos
 * Sistemas, la unión de Organismos que los usan (organismo_sistemas).
 * Completa los dos niveles de arriba del breadcrumb de 5 niveles parado en
 * una Célula o un Tejido:
 *
 *   Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo
 *
 * Un mismo Órgano puede pertenecer a varios Sistemas, y un mismo Sistema a
 * varios Organismos — se junta todo sin duplicados, mismo criterio que
 * useOrganosDeUnaCelula/useOrganosDeUnTejido un nivel abajo.
 *
 * No cachea en Dexie: solo lectura para un breadcrumb, no un catálogo editable.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_ORGANISMOS,
  CONFIG_SISTEMAS,
  type Organismo,
  type Sistema,
} from "@/domains/garlia/elementos/types";

interface VinculoSistemaOrgano {
  sistema_id: string;
}

interface VinculoOrganismoSistema {
  organismo_id: string;
}

export function useSistemasYOrganismosDeOrganos(organoIds: string[]) {
  const [sistemas, setSistemas] = useState<Record<string, Sistema>>({});
  const [organismos, setOrganismos] = useState<Record<string, Organismo>>({});
  const [loading, setLoading] = useState(true);

  // Clave estable para el efecto: un array nuevo con el mismo contenido no
  // debe disparar un refetch (organoIds llega recalculado en cada render
  // desde useMemo de los hooks de nivel inferior).
  const key = organoIds.slice().sort().join(",");

  const load = useCallback(async () => {
    if (organoIds.length === 0) {
      setSistemas({});
      setOrganismos({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: soData, error: soError } = await supabase
      .from("sistema_organos")
      .select("sistema_id")
      .in("organo_id", organoIds);

    if (soError || !soData || soData.length === 0) {
      setSistemas({});
      setOrganismos({});
      setLoading(false);
      return;
    }
    const sistemaIds = Array.from(
      new Set((soData as unknown as VinculoSistemaOrgano[]).map((v) => v.sistema_id)),
    );

    const { data: sistemaData } = await supabase
      .from(CONFIG_SISTEMAS.tabla)
      .select(CONFIG_SISTEMAS.select)
      .in("id", sistemaIds);
    const sistemasPorId: Record<string, Sistema> = {};
    for (const s of (sistemaData ?? []) as unknown as Sistema[]) sistemasPorId[s.id] = s;
    setSistemas(sistemasPorId);

    const { data: osData } = await supabase
      .from("organismo_sistemas")
      .select("organismo_id")
      .in("sistema_id", sistemaIds);
    const organismoIds = Array.from(
      new Set(((osData ?? []) as unknown as VinculoOrganismoSistema[]).map((v) => v.organismo_id)),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  const sistemaItems = useMemo(() => Object.values(sistemas), [sistemas]);
  const organismoItems = useMemo(() => Object.values(organismos), [organismos]);

  return { sistemaItems, organismoItems, loading };
}
