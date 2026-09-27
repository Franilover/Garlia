"use client";

/**
 * useOrganosDeUnaCelula.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa y transitiva de useCelulasDeUnOrgano: dada una
 * celula_id, resuelve TODOS los Órganos que la alcanzan atravesando los
 * DOS niveles de la cadena real en sentido inverso:
 *   Celula → tejido_celulas → Tejido → organo_tejidos → Organo
 * Una misma Célula puede poblar varios Tejidos, y cada uno de esos
 * Tejidos puede ser usado por varios Órganos distintos — este hook junta
 * la unión completa, sin duplicados, para el nivel "Órgano" del
 * breadcrumb parado en una Célula.
 *
 * v52: cache-first vía Dexie para ambos saltos, mismo patrón que
 * useOrganosDeUnTejido.ts (tejido_celulas, organo_tejidos y organos ya
 * están en DEXIE_TABLES).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import {
  CONFIG_ORGANOS,
  CONFIG_TEJIDO_CELULAS,
  type Organo,
  type TejidoCelula,
} from "@/domains/garlia/elementos/types";

interface VinculoOrganoTejido {
  id: string;
  organo_id: string;
  tejido_id: string;
}

// ── Cache-first: leer de Dexie ──────────────────────────────────────────────
async function leerTejidoIdsDeDexie(celulaId: string): Promise<string[]> {
  try {
    if (!db) return [];
    const rows = await db.tejido_celulas.where("celula_id").equals(celulaId).toArray();
    return Array.from(
      new Set((rows as unknown as TejidoCelula[]).map((v) => v.tejido_id)),
    );
  } catch {
    return [];
  }
}

async function leerVinculosOrganoDeDexie(tejidoIds: string[]): Promise<VinculoOrganoTejido[]> {
  try {
    if (!db || tejidoIds.length === 0) return [];
    const rows = await db.organo_tejidos.where("tejido_id").anyOf(tejidoIds).toArray();
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

export function useOrganosDeUnaCelula(celulaId: string | null) {
  const [tejidoIds, setTejidoIds] = useState<string[]>([]);
  const [vinculosOrgano, setVinculosOrgano] = useState<VinculoOrganoTejido[]>([]);
  const [organos, setOrganos] = useState<Record<string, Organo>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!celulaId) {
      setTejidoIds([]);
      setVinculosOrgano([]);
      setOrganos({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const tejidoIdsLocales = await leerTejidoIdsDeDexie(celulaId);
    if (tejidoIdsLocales.length > 0) {
      setTejidoIds(tejidoIdsLocales);
      const vinculosLocales = await leerVinculosOrganoDeDexie(tejidoIdsLocales);
      setVinculosOrgano(vinculosLocales);
      const organoIdsLocales = Array.from(new Set(vinculosLocales.map((v) => v.organo_id)));
      const organosLocales = await leerOrganosDeDexie(organoIdsLocales);
      setOrganos(organosLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: tcData, error: tcError } = await supabase
      .from(CONFIG_TEJIDO_CELULAS.tabla)
      .select(CONFIG_TEJIDO_CELULAS.select)
      .eq("celula_id", celulaId);

    if (tcError || !tcData) {
      if (tejidoIdsLocales.length === 0) {
        setTejidoIds([]);
        setVinculosOrgano([]);
        setOrganos({});
      }
      setLoading(false);
      return;
    }

    const idsTejidos = Array.from(
      new Set((tcData as unknown as TejidoCelula[]).map((v) => v.tejido_id)),
    );
    setTejidoIds(idsTejidos);

    if (idsTejidos.length === 0) {
      setVinculosOrgano([]);
      setOrganos({});
      setLoading(false);
      return;
    }

    const { data: otData, error: otError } = await supabase
      .from("organo_tejidos")
      .select("id, organo_id, tejido_id")
      .in("tejido_id", idsTejidos);

    if (otError || !otData) {
      if (tejidoIdsLocales.length === 0) {
        setVinculosOrgano([]);
        setOrganos({});
      }
      setLoading(false);
      return;
    }
    setVinculosOrgano(otData as unknown as VinculoOrganoTejido[]);

    const organoIds = Array.from(
      new Set((otData as unknown as VinculoOrganoTejido[]).map((v) => v.organo_id)),
    );
    if (organoIds.length === 0) {
      setOrganos({});
      setLoading(false);
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
  }, [celulaId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Unión sin duplicados: un mismo Órgano puede alcanzarse por varios Tejidos. */
  const items = useMemo<Organo[]>(() => {
    const idsVistos = new Set<string>();
    const out: Organo[] = [];
    for (const v of vinculosOrgano) {
      const organo = organos[v.organo_id];
      if (!organo || idsVistos.has(organo.id)) continue;
      idsVistos.add(organo.id);
      out.push(organo);
    }
    return out;
  }, [vinculosOrgano, organos]);

  return { items, tejidoIds, loading, load };
}
