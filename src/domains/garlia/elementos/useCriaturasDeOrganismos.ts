"use client";

/**
 * useCriaturasDeOrganismos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Versión PLURAL de useCriaturasDeUnOrganismo: dado un array de organismo_id
 * (los Organismos ya alcanzados desde una Célula, un Tejido, un Órgano o un
 * Sistema — ver useSistemasYOrganismosDeOrganos / useOrganismosDeUnSistema),
 * resuelve la unión de Criaturas que usan CUALQUIERA de esos Organismos
 * (tabla puente `criatura_organismos`).
 *
 * Permite que cada nivel del breadcrumb salte DIRECTO a Criatura, igual que
 * ya salta directo a Organismo, sin obligar a subir nivel por nivel:
 *
 *   Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo ⇄ Criatura
 *
 * Una misma Criatura puede usar varios de los Organismos — se junta todo sin
 * duplicados, mismo criterio que useSistemasYOrganismosDeOrganos.
 *
 * Devuelve `items` ya con el shape { id, nombre } que espera
 * BreadcrumbJerarquia, para no repetir el mapeo en los 4 paneles.
 *
 * No cachea en Dexie: solo lectura para un breadcrumb, no un catálogo
 * editable. Nota: `criatura_organismos` puede estar vacía en Supabase (ver
 * useCriaturasDeUnOrganismo) — en ese caso `items` sale [] sin error.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

interface VinculoCriaturaOrganismo {
  criatura_id: string;
}

interface CriaturaMinima {
  id: string;
  nombre: string;
}

export function useCriaturasDeOrganismos(organismoIds: string[]) {
  const [criaturas, setCriaturas] = useState<Record<string, CriaturaMinima>>({});
  const [loading, setLoading] = useState(true);

  // Clave estable para el efecto: un array nuevo con el mismo contenido no
  // debe disparar un refetch (organismoIds llega recalculado en cada render).
  const key = organismoIds.slice().sort().join(",");

  const load = useCallback(async () => {
    if (organismoIds.length === 0) {
      setCriaturas({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: vinculoData, error: vinculoError } = await supabase
      .from("criatura_organismos")
      .select("criatura_id")
      .in("organismo_id", organismoIds);

    if (vinculoError || !vinculoData || vinculoData.length === 0) {
      setCriaturas({});
      setLoading(false);
      return;
    }

    const criaturaIds = Array.from(
      new Set((vinculoData as unknown as VinculoCriaturaOrganismo[]).map((v) => v.criatura_id)),
    );

    const { data: criaturaData } = await supabase
      .from("criaturas")
      .select("id, nombre")
      .in("id", criaturaIds);

    const criaturasPorId: Record<string, CriaturaMinima> = {};
    for (const c of (criaturaData ?? []) as unknown as CriaturaMinima[]) criaturasPorId[c.id] = c;
    setCriaturas(criaturasPorId);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => Object.values(criaturas), [criaturas]);

  return { items, loading };
}
