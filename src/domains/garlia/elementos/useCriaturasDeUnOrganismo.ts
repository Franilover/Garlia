"use client";

/**
 * useCriaturasDeUnOrganismo.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Dirección inversa de useCriaturaOrganismos (domains/garlia/criaturas):
 * dado un organismo_id, devuelve las Criaturas que lo usan (tabla puente
 * `criatura_organismos`, filtro por organismo_id en vez de criatura_id).
 * Mismo rol que useOrganismosDeUnSistema.ts un nivel abajo — resuelve
 * "¿quién me usa?" para el breadcrumb navegable Organismo ⇄ Criatura, y
 * extiende el techo de la cadena completa:
 *
 *   Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo ⇄ Criatura
 *
 * Nota (2026-09-14): `criatura_organismos` tiene 0 filas en Supabase al
 * momento de crear este hook — mismo hueco de datos real que documenta
 * useCriaturaOrganismos.ts, no un bug de este archivo. `items` saldrá
 * vacío para cualquier Organismo hasta que se cargue esa tabla.
 *
 * v52: cache-first vía Dexie, mismo patrón que useCelulasDeUnCompuesto.ts /
 * useOrganosDeUnTejido.ts (criatura_organismos ya está en DEXIE_TABLES;
 * "criaturas" ya lo estaba desde antes).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

interface VinculoCriaturaOrganismo {
  id: string;
  criatura_id: string;
  organismo_id: string;
}

/** Ficha mínima de Criatura — mismo shape que CriaturaMin (criaturasCache),
 *  suficiente para un nodo de flujo (nombre + link visual). */
export interface CriaturaMinima {
  id: string;
  nombre: string;
  imagen_url: string | null;
}

/** Una Criatura que usa el Organismo consultado, ya resuelta para la UI. */
export interface CriaturaDeOrganismo {
  vinculo_id: string;
  criatura_id: string;
  organismo_id: string;
  criatura: CriaturaMinima;
}

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(organismoId: string): Promise<VinculoCriaturaOrganismo[]> {
  try {
    if (!db) return [];
    const rows = await db.criatura_organismos
      .where("organismo_id")
      .equals(organismoId)
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
        const c = r as unknown as { id: string; nombre: string; imagen_url: string | null };
        out[c.id] = { id: c.id, nombre: c.nombre, imagen_url: c.imagen_url ?? null };
      }
  } catch {}
  return out;
}

async function guardarEnDexie(vinculos: VinculoCriaturaOrganismo[]) {
  try {
    if (!db || vinculos.length === 0) return;
    await db.criatura_organismos.bulkPut(vinculos as any[]);
  } catch (e) {
    console.warn("[useCriaturasDeUnOrganismo] no se pudo guardar en Dexie:", e);
  }
}

export function useCriaturasDeUnOrganismo(organismoId: string | null) {
  const [vinculos, setVinculos] = useState<VinculoCriaturaOrganismo[]>([]);
  const [criaturas, setCriaturas] = useState<Record<string, CriaturaMinima>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organismoId) {
      setVinculos([]);
      setCriaturas({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const vinculosLocales = await leerVinculosDeDexie(organismoId);
    if (vinculosLocales.length > 0) {
      setVinculos(vinculosLocales);
      const criaturaIdsLocales = vinculosLocales.map((v) => v.criatura_id);
      const criaturasLocales = await leerCriaturasDeDexie(criaturaIdsLocales);
      setCriaturas(criaturasLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: vinculoData, error: vinculoError } = await supabase
      .from("criatura_organismos")
      .select("id, criatura_id, organismo_id")
      .eq("organismo_id", organismoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      if (vinculosLocales.length === 0) {
        setVinculos([]);
        setCriaturas({});
      }
      setLoading(false);
      return;
    }
    setVinculos(vinculoData as unknown as VinculoCriaturaOrganismo[]);
    void guardarEnDexie(vinculoData as unknown as VinculoCriaturaOrganismo[]);

    const criaturaIds = (vinculoData as unknown as VinculoCriaturaOrganismo[]).map(
      (v) => v.criatura_id,
    );
    if (criaturaIds.length === 0) {
      setCriaturas({});
      setLoading(false);
      return;
    }

    const { data: criaturaData } = await supabase
      .from("criaturas")
      .select("id, nombre, imagen_url")
      .in("id", criaturaIds);

    const criaturasPorId: Record<string, CriaturaMinima> = {};
    for (const c of (criaturaData ?? []) as unknown as CriaturaMinima[]) criaturasPorId[c.id] = c;
    setCriaturas(criaturasPorId);
    setLoading(false);
  }, [organismoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<CriaturaDeOrganismo[]>(() => {
    return vinculos
      .map((v) => {
        const criatura = criaturas[v.criatura_id];
        if (!criatura) return null;
        return {
          vinculo_id: v.id,
          criatura_id: v.criatura_id,
          organismo_id: v.organismo_id,
          criatura,
        };
      })
      .filter((c): c is CriaturaDeOrganismo => c !== null);
  }, [vinculos, criaturas]);

  return { items, loading, load };
}
