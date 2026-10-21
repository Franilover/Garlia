"use client";

/**
 * useCelulasDeUnCompuesto.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa de useCelulaCompuestos: dado un compuesto_id, devuelve
 * las Células que lo usan (tabla puente `celula_compuestos`, filtro por
 * compuesto_id en vez de celula_id). A diferencia de Grano→Compuesto (1:1
 * directo vía columna, ver useGranosDeUnCompuesto), Célula→Compuesto es
 * M:N desde la migración ago-2026 (celulas.compuesto_id quedó legacy y sin
 * uso, ver elementos/types.ts) — por eso acá sí hace falta resolver la
 * tabla puente, igual que useOrganosDeUnTejido.
 *
 * Resuelve la rama "Célula" de la vista dual Compuesto → {Grano, Célula} —
 * ver useGranosDeUnCompuesto para la otra rama (1:1 directo vía grano.
 * compuesto_id).
 *
 * v52: cache-first vía Dexie, mismo patrón que useOrganosDeUnTejido.ts /
 * useTejidosDeUnaCelula.ts (celula_compuestos y celulas ya están en
 * DEXIE_TABLES).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import { CONFIG_CELULAS, type Celula } from "@/domains/garlia/elementos/types";

interface VinculoCelulaCompuesto {
  id: string;
  celula_id: string;
  compuesto_id: string;
  rol: string | null;
  proporcion: string | null;
}

/** Una Célula que usa el Compuesto consultado, ya resuelta para la UI. */
export interface CelulaDeCompuesto {
  vinculo_id: string;
  celula_id: string;
  compuesto_id: string;
  rol: string | null;
  proporcion: string | null;
  celula: Celula;
}

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(compuestoId: string): Promise<VinculoCelulaCompuesto[]> {
  try {
    if (!db) return [];
    const rows = await db.celula_compuestos.where("compuesto_id").equals(compuestoId).toArray();
    return rows as unknown as VinculoCelulaCompuesto[];
  } catch {
    return [];
  }
}

async function leerCelulasDeDexie(ids: string[]): Promise<Record<string, Celula>> {
  const out: Record<string, Celula> = {};
  if (!db || ids.length === 0) return out;
  try {
    const rows = await db.celulas.bulkGet(ids);
    for (const r of rows) if (r) out[(r as unknown as Celula).id] = r as unknown as Celula;
  } catch {}
  return out;
}

async function guardarEnDexie(vinculos: VinculoCelulaCompuesto[], celulas: Celula[]) {
  try {
    if (!db) return;
    if (vinculos.length) await db.celula_compuestos.bulkPut(vinculos as any[]);
    if (celulas.length) await db.celulas.bulkPut(celulas as any[]);
  } catch (e) {
    console.warn("[useCelulasDeUnCompuesto] no se pudo guardar en Dexie:", e);
  }
}

export function useCelulasDeUnCompuesto(compuestoId: string | null) {
  const [vinculos, setVinculos] = useState<VinculoCelulaCompuesto[]>([]);
  const [celulas, setCelulas] = useState<Record<string, Celula>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!compuestoId) {
      setVinculos([]);
      setCelulas({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const vinculosLocales = await leerVinculosDeDexie(compuestoId);
    if (vinculosLocales.length > 0) {
      setVinculos(vinculosLocales);
      const celulaIdsLocales = vinculosLocales.map((v) => v.celula_id);
      const celulasLocales = await leerCelulasDeDexie(celulaIdsLocales);
      setCelulas(celulasLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: vinculoData, error: vinculoError } = await supabase
      .from("celula_compuestos")
      .select("id, celula_id, compuesto_id, rol, proporcion")
      .eq("compuesto_id", compuestoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      if (vinculosLocales.length === 0) {
        setVinculos([]);
        setCelulas({});
      }
      setLoading(false);
      return;
    }
    setVinculos(vinculoData as unknown as VinculoCelulaCompuesto[]);

    const celulaIds = (vinculoData as unknown as VinculoCelulaCompuesto[]).map((v) => v.celula_id);
    if (celulaIds.length === 0) {
      setCelulas({});
      setLoading(false);
      void guardarEnDexie(vinculoData as unknown as VinculoCelulaCompuesto[], []);
      return;
    }

    const { data: celulaData } = await supabase
      .from(CONFIG_CELULAS.tabla)
      .select(CONFIG_CELULAS.select)
      .in("id", celulaIds);

    const celulasPorId: Record<string, Celula> = {};
    for (const c of (celulaData ?? []) as unknown as Celula[]) celulasPorId[c.id] = c;
    setCelulas(celulasPorId);
    setLoading(false);
    void guardarEnDexie(
      vinculoData as unknown as VinculoCelulaCompuesto[],
      Object.values(celulasPorId),
    );
  }, [compuestoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<CelulaDeCompuesto[]>(() => {
    return vinculos
      .map((v) => {
        const celula = celulas[v.celula_id];
        if (!celula) return null;
        return {
          vinculo_id: v.id,
          celula_id: v.celula_id,
          compuesto_id: v.compuesto_id,
          rol: v.rol,
          proporcion: v.proporcion,
          celula,
        };
      })
      .filter((c): c is CelulaDeCompuesto => c !== null);
  }, [vinculos, celulas]);

  return { items, loading, load };
}
