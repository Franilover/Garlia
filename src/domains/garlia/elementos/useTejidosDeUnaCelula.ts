"use client";

/**
 * useTejidosDeUnaCelula.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa de useTejidoCelulas: dada una celula_id, devuelve los
 * Tejidos que la usan (tabla puente `tejido_celulas`, filtro por celula_id
 * en vez de tejido_id). Una misma Célula puede poblar varios Tejidos —
 * este hook resuelve "¿quién me usa?" para el breadcrumb navegable
 * Célula ⇄ Tejido ⇄ Órgano.
 *
 * v52: cache-first vía Dexie, mismo patrón que useOrganosDeUnTejido.ts /
 * useTejidoCelulas.ts (tejido_celulas y tejidos ya están en DEXIE_TABLES).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import {
  CONFIG_TEJIDOS,
  CONFIG_TEJIDO_CELULAS,
  type Tejido,
} from "@/domains/garlia/elementos/types";

interface VinculoTejidoCelula {
  id: string;
  tejido_id: string;
  celula_id: string;
  rol: string | null;
  proporcion: string | null;
}

/** Un Tejido que usa la Célula consultada, ya resuelto para la UI. */
export interface TejidoDeCelula {
  vinculo_id: string;
  tejido_id: string;
  celula_id: string;
  rol: string | null;
  proporcion: string | null;
  tejido: Tejido;
}

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(celulaId: string): Promise<VinculoTejidoCelula[]> {
  try {
    if (!db) return [];
    const rows = await db.tejido_celulas.where("celula_id").equals(celulaId).toArray();
    return rows as unknown as VinculoTejidoCelula[];
  } catch {
    return [];
  }
}

async function leerTejidosDeDexie(ids: string[]): Promise<Record<string, Tejido>> {
  const out: Record<string, Tejido> = {};
  if (!db || ids.length === 0) return out;
  try {
    const rows = await db.tejidos.bulkGet(ids);
    for (const r of rows) if (r) out[(r as unknown as Tejido).id] = r as unknown as Tejido;
  } catch {}
  return out;
}

async function guardarEnDexie(vinculos: VinculoTejidoCelula[], tejidos: Tejido[]) {
  try {
    if (!db) return;
    if (vinculos.length) await db.tejido_celulas.bulkPut(vinculos as any[]);
    if (tejidos.length) await db.tejidos.bulkPut(tejidos as any[]);
  } catch (e) {
    console.warn("[useTejidosDeUnaCelula] no se pudo guardar en Dexie:", e);
  }
}

export function useTejidosDeUnaCelula(celulaId: string | null) {
  const [vinculos, setVinculos] = useState<VinculoTejidoCelula[]>([]);
  const [tejidos, setTejidos] = useState<Record<string, Tejido>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!celulaId) {
      setVinculos([]);
      setTejidos({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const vinculosLocales = await leerVinculosDeDexie(celulaId);
    if (vinculosLocales.length > 0) {
      setVinculos(vinculosLocales);
      const tejidoIdsLocales = vinculosLocales.map((v) => v.tejido_id);
      const tejidosLocales = await leerTejidosDeDexie(tejidoIdsLocales);
      setTejidos(tejidosLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: vinculoData, error: vinculoError } = await supabase
      .from(CONFIG_TEJIDO_CELULAS.tabla)
      .select(CONFIG_TEJIDO_CELULAS.select)
      .eq("celula_id", celulaId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      if (vinculosLocales.length === 0) {
        setVinculos([]);
        setTejidos({});
      }
      setLoading(false);
      return;
    }
    setVinculos(vinculoData as unknown as VinculoTejidoCelula[]);

    const tejidoIds = (vinculoData as unknown as VinculoTejidoCelula[]).map((v) => v.tejido_id);
    if (tejidoIds.length === 0) {
      setTejidos({});
      setLoading(false);
      void guardarEnDexie(vinculoData as unknown as VinculoTejidoCelula[], []);
      return;
    }

    const { data: tejidoData } = await supabase
      .from(CONFIG_TEJIDOS.tabla)
      .select(CONFIG_TEJIDOS.select)
      .in("id", tejidoIds);

    const tejidosPorId: Record<string, Tejido> = {};
    for (const t of (tejidoData ?? []) as unknown as Tejido[]) tejidosPorId[t.id] = t;
    setTejidos(tejidosPorId);
    setLoading(false);
    void guardarEnDexie(
      vinculoData as unknown as VinculoTejidoCelula[],
      Object.values(tejidosPorId),
    );
  }, [celulaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<TejidoDeCelula[]>(() => {
    return vinculos
      .map((v) => {
        const tejido = tejidos[v.tejido_id];
        if (!tejido) return null;
        return {
          vinculo_id: v.id,
          tejido_id: v.tejido_id,
          celula_id: v.celula_id,
          rol: v.rol,
          proporcion: v.proporcion,
          tejido,
        };
      })
      .filter((t): t is TejidoDeCelula => t !== null);
  }, [vinculos, tejidos]);

  return { items, loading, load };
}
