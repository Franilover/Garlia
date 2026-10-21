"use client";

/**
 * useSistemasDeUnOrgano.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa de useSistemaOrganos: dado un organo_id, devuelve los
 * Sistemas que lo usan (tabla puente `sistema_organos`, filtro por
 * organo_id en vez de sistema_id). Mismo rol que useOrganosDeUnTejido.ts
 * un nivel abajo — resuelve "¿quién me usa?" para el breadcrumb navegable
 * Órgano ⇄ Sistema.
 *
 * v52: cache-first vía Dexie, mismo patrón que useOrganosDeUnTejido.ts /
 * useOrganismosDeUnSistema.ts (sistema_organos y sistemas ya están en
 * DEXIE_TABLES).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import {
  CONFIG_SISTEMAS,
  CONFIG_SISTEMA_ORGANOS,
  type Sistema,
} from "@/domains/garlia/elementos/types";

interface VinculoSistemaOrgano {
  id: string;
  sistema_id: string;
  organo_id: string;
}

/** Un Sistema que usa el Órgano consultado, ya resuelto para la UI. */
export interface SistemaDeOrgano {
  vinculo_id: string;
  sistema_id: string;
  organo_id: string;
  sistema: Sistema;
}

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(organoId: string): Promise<VinculoSistemaOrgano[]> {
  try {
    if (!db) return [];
    const rows = await db.sistema_organos.where("organo_id").equals(organoId).toArray();
    return rows as unknown as VinculoSistemaOrgano[];
  } catch {
    return [];
  }
}

async function leerSistemasDeDexie(ids: string[]): Promise<Record<string, Sistema>> {
  const out: Record<string, Sistema> = {};
  if (!db || ids.length === 0) return out;
  try {
    const rows = await db.sistemas.bulkGet(ids);
    for (const r of rows) if (r) out[(r as unknown as Sistema).id] = r as unknown as Sistema;
  } catch {}
  return out;
}

async function guardarEnDexie(vinculos: VinculoSistemaOrgano[], sistemas: Sistema[]) {
  try {
    if (!db) return;
    if (vinculos.length) await db.sistema_organos.bulkPut(vinculos as any[]);
    if (sistemas.length) await db.sistemas.bulkPut(sistemas as any[]);
  } catch (e) {
    console.warn("[useSistemasDeUnOrgano] no se pudo guardar en Dexie:", e);
  }
}

export function useSistemasDeUnOrgano(organoId: string | null) {
  const [vinculos, setVinculos] = useState<VinculoSistemaOrgano[]>([]);
  const [sistemas, setSistemas] = useState<Record<string, Sistema>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organoId) {
      setVinculos([]);
      setSistemas({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const vinculosLocales = await leerVinculosDeDexie(organoId);
    if (vinculosLocales.length > 0) {
      setVinculos(vinculosLocales);
      const sistemaIdsLocales = vinculosLocales.map((v) => v.sistema_id);
      const sistemasLocales = await leerSistemasDeDexie(sistemaIdsLocales);
      setSistemas(sistemasLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: vinculoData, error: vinculoError } = await supabase
      .from(CONFIG_SISTEMA_ORGANOS.tabla)
      .select("id, sistema_id, organo_id")
      .eq("organo_id", organoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      if (vinculosLocales.length === 0) {
        setVinculos([]);
        setSistemas({});
      }
      setLoading(false);
      return;
    }
    setVinculos(vinculoData as unknown as VinculoSistemaOrgano[]);

    const sistemaIds = (vinculoData as unknown as VinculoSistemaOrgano[]).map((v) => v.sistema_id);
    if (sistemaIds.length === 0) {
      setSistemas({});
      setLoading(false);
      void guardarEnDexie(vinculoData as unknown as VinculoSistemaOrgano[], []);
      return;
    }

    const { data: sistemaData } = await supabase
      .from(CONFIG_SISTEMAS.tabla)
      .select(CONFIG_SISTEMAS.select)
      .in("id", sistemaIds);

    const sistemasPorId: Record<string, Sistema> = {};
    for (const s of (sistemaData ?? []) as unknown as Sistema[]) sistemasPorId[s.id] = s;
    setSistemas(sistemasPorId);
    setLoading(false);
    void guardarEnDexie(
      vinculoData as unknown as VinculoSistemaOrgano[],
      Object.values(sistemasPorId),
    );
  }, [organoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<SistemaDeOrgano[]>(() => {
    return vinculos
      .map((v) => {
        const sistema = sistemas[v.sistema_id];
        if (!sistema) return null;
        return {
          vinculo_id: v.id,
          sistema_id: v.sistema_id,
          organo_id: v.organo_id,
          sistema,
        };
      })
      .filter((s): s is SistemaDeOrgano => s !== null);
  }, [vinculos, sistemas]);

  return { items, loading, load };
}
