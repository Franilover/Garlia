"use client";

/**
 * useOrganosDeUnTejido.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa de useOrganoTejidos: dado un tejido_id, devuelve los
 * Órganos que lo usan en su fórmula (tabla puente `organo_tejidos`, filtro
 * por tejido_id en vez de organo_id). Un mismo Tejido puede reutilizarse
 * en varios Órganos — este hook resuelve "¿quién me usa?" para el
 * breadcrumb navegable Célula ⇄ Tejido ⇄ Órgano.
 *
 * v52: cache-first vía Dexie, mismo patrón que useCelulaCompuestos.ts /
 * useTejidoCompuestos.ts (organo_tejidos y organos ya están en
 * DEXIE_TABLES).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import { CONFIG_ORGANOS, type Organo } from "@/domains/garlia/elementos/types";

interface VinculoOrganoTejido {
  id: string;
  organo_id: string;
  tejido_id: string;
  proporcion: string | null;
}

/** Un Órgano que usa el Tejido consultado, ya resuelto para la UI. */
export interface OrganoDeTejido {
  vinculo_id: string;
  organo_id: string;
  tejido_id: string;
  proporcion: string | null;
  organo: Organo;
}

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(tejidoId: string): Promise<VinculoOrganoTejido[]> {
  try {
    if (!db) return [];
    const rows = await db.organo_tejidos.where("tejido_id").equals(tejidoId).toArray();
    return rows as unknown as VinculoOrganoTejido[];
  } catch {
    return [];
  }
}

async function leerOrganosDeDexie(ids: string[]): Promise<Record<string, Organo>> {
  const out: Record<string, Organo> = {};
  if (!db || ids.length === 0) return out;
  try {
    const rows = await db.organos.bulkGet(ids);
    for (const r of rows) if (r) out[(r as unknown as Organo).id] = r as unknown as Organo;
  } catch {}
  return out;
}

async function guardarEnDexie(vinculos: VinculoOrganoTejido[], organos: Organo[]) {
  try {
    if (!db) return;
    if (vinculos.length) await db.organo_tejidos.bulkPut(vinculos as any[]);
    if (organos.length) await db.organos.bulkPut(organos as any[]);
  } catch (e) {
    console.warn("[useOrganosDeUnTejido] no se pudo guardar en Dexie:", e);
  }
}

export function useOrganosDeUnTejido(tejidoId: string | null) {
  const [vinculos, setVinculos] = useState<VinculoOrganoTejido[]>([]);
  const [organos, setOrganos] = useState<Record<string, Organo>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tejidoId) {
      setVinculos([]);
      setOrganos({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const vinculosLocales = await leerVinculosDeDexie(tejidoId);
    if (vinculosLocales.length > 0) {
      setVinculos(vinculosLocales);
      const organoIdsLocales = vinculosLocales.map((v) => v.organo_id);
      const organosLocales = await leerOrganosDeDexie(organoIdsLocales);
      setOrganos(organosLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: vinculoData, error: vinculoError } = await supabase
      .from("organo_tejidos")
      .select("id, organo_id, tejido_id, proporcion")
      .eq("tejido_id", tejidoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      if (vinculosLocales.length === 0) {
        setVinculos([]);
        setOrganos({});
      }
      setLoading(false);
      return;
    }
    setVinculos(vinculoData as unknown as VinculoOrganoTejido[]);

    const organoIds = (vinculoData as unknown as VinculoOrganoTejido[]).map((v) => v.organo_id);
    if (organoIds.length === 0) {
      setOrganos({});
      setLoading(false);
      void guardarEnDexie(vinculoData as unknown as VinculoOrganoTejido[], []);
      return;
    }

    const { data: organoData } = await supabase
      .from(CONFIG_ORGANOS.tabla)
      .select(CONFIG_ORGANOS.select)
      .in("id", organoIds);

    const organosPorId: Record<string, Organo> = {};
    for (const o of (organoData ?? []) as unknown as Organo[]) organosPorId[o.id] = o;
    setOrganos(organosPorId);
    setLoading(false);
    void guardarEnDexie(
      vinculoData as unknown as VinculoOrganoTejido[],
      Object.values(organosPorId),
    );
  }, [tejidoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<OrganoDeTejido[]>(() => {
    return vinculos
      .map((v) => {
        const organo = organos[v.organo_id];
        if (!organo) return null;
        return {
          vinculo_id: v.id,
          organo_id: v.organo_id,
          tejido_id: v.tejido_id,
          proporcion: v.proporcion,
          organo,
        };
      })
      .filter((o): o is OrganoDeTejido => o !== null);
  }, [vinculos, organos]);

  return { items, loading, load };
}
