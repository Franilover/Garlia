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
 * v52: cache-first vía Dexie, mismo patrón que useCriaturasDeUnOrganismo.ts
 * (criatura_organismos ya está en DEXIE_TABLES). Nota: `criatura_organismos`
 * puede estar vacía en Supabase (ver useCriaturasDeUnOrganismo) — en ese
 * caso `items` sale [] sin error.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

interface VinculoCriaturaOrganismo {
  criatura_id: string;
  organismo_id: string;
}

interface CriaturaMinima {
  id: string;
  nombre: string;
}

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(organismoIds: string[]): Promise<VinculoCriaturaOrganismo[]> {
  try {
    if (!db || organismoIds.length === 0) return [];
    const rows = await db.criatura_organismos
      .where("organismo_id")
      .anyOf(organismoIds)
      .toArray();
    return rows as unknown as VinculoCriaturaOrganismo[];
  } catch {
    return [];
  }
}

async function leerCriaturasDeDexie(ids: string[]): Promise<Record<string, CriaturaMinima>> {
  const out: Record<string, CriaturaMinima> = {};
  if (!db || ids.length === 0) return out;
  try {
    const rows = await db.criaturas.bulkGet(ids);
    for (const r of rows)
      if (r) {
        const c = r as unknown as { id: string; nombre: string };
        out[c.id] = { id: c.id, nombre: c.nombre };
      }
  } catch {}
  return out;
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

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const vinculosLocales = await leerVinculosDeDexie(organismoIds);
    if (vinculosLocales.length > 0) {
      const criaturaIdsLocales = Array.from(
        new Set(vinculosLocales.map((v) => v.criatura_id)),
      );
      const criaturasLocales = await leerCriaturasDeDexie(criaturaIdsLocales);
      setCriaturas(criaturasLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: vinculoData, error: vinculoError } = await supabase
      .from("criatura_organismos")
      .select("criatura_id")
      .in("organismo_id", organismoIds);

    if (vinculoError || !vinculoData || vinculoData.length === 0) {
      if (vinculosLocales.length === 0) setCriaturas({});
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
