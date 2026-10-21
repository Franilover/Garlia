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
 * v52: cache-first vía Dexie, mismo patrón que useOrganosDeUnTejido.ts /
 * useTejidosDeUnaCelula.ts (organismo_sistemas y organismos ya están en
 * DEXIE_TABLES).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import {
  CONFIG_ORGANISMOS,
  CONFIG_ORGANISMO_SISTEMAS,
  type Organismo,
} from "@/domains/garlia/elementos/types";

interface VinculoOrganismoSistema {
  id: string;        // sintético: organismo_id (la vista no tiene id propio)
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

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(sistemaId: string): Promise<VinculoOrganismoSistema[]> {
  try {
    if (!db) return [];
    const rows = await db.organismo_sistemas.where("sistema_id").equals(sistemaId).toArray();
    return rows as unknown as VinculoOrganismoSistema[];
  } catch {
    return [];
  }
}

async function leerOrganismosDeDexie(ids: string[]): Promise<Record<string, Organismo>> {
  const out: Record<string, Organismo> = {};
  if (!db || ids.length === 0) return out;
  try {
    const rows = await db.organismos.bulkGet(ids);
    for (const r of rows) if (r) out[(r as unknown as Organismo).id] = r as unknown as Organismo;
  } catch {}
  return out;
}

async function guardarEnDexie(vinculos: VinculoOrganismoSistema[], organismos: Organismo[]) {
  try {
    if (!db) return;
    if (vinculos.length) await db.organismo_sistemas.bulkPut(vinculos as any[]);
    if (organismos.length) await db.organismos.bulkPut(organismos as any[]);
  } catch (e) {
    console.warn("[useOrganismosDeUnSistema] no se pudo guardar en Dexie:", e);
  }
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

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const vinculosLocales = await leerVinculosDeDexie(sistemaId);
    if (vinculosLocales.length > 0) {
      setVinculos(vinculosLocales);
      const organismoIdsLocales = vinculosLocales.map((v) => v.organismo_id);
      const organismosLocales = await leerOrganismosDeDexie(organismoIdsLocales);
      setOrganismos(organismosLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    // La vista v_organismos_sistemas_efectivos_v4 no tiene `id` propio ni
    // `created_at`; generamos un id sintético = organismo_id (único por sistema).
    const { data: rawData, error: vinculoError } = await supabase
      .from("v_organismos_sistemas_efectivos_v4")
      .select("organismo_id, sistema_id")
      .eq("sistema_id", sistemaId);

    if (vinculoError || !rawData) {
      if (vinculosLocales.length === 0) {
        setVinculos([]);
        setOrganismos({});
      }
      setLoading(false);
      return;
    }
    const vinculoData: VinculoOrganismoSistema[] = (
      rawData as unknown as { organismo_id: string; sistema_id: string }[]
    ).map((r) => ({ id: r.organismo_id, organismo_id: r.organismo_id, sistema_id: r.sistema_id }));
    setVinculos(vinculoData);

    const organismoIds = vinculoData.map((v) => v.organismo_id);
    if (organismoIds.length === 0) {
      setOrganismos({});
      setLoading(false);
      void guardarEnDexie(vinculoData, []);
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
    void guardarEnDexie(vinculoData, Object.values(organismosPorId));
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
