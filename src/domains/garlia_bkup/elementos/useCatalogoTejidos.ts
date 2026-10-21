"use client";

/**
 * useCatalogoTejidos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Lista TODOS los Tejidos que ya existen en Supabase, sin filtrar por
 * Órgano — a diferencia de useOrganoTejidos, que solo resuelve la fórmula
 * de UN Órgano puntual.
 *
 * Existe para alimentar el picker "Usar existente" de SelectorFormulaTejidos:
 * antes, la única forma de agregar una fila a la fórmula era crear una
 * Célula+Tejido nuevos desde cero (ver nota en useOrganoTejidos.ts). Este
 * hook expone el catálogo completo para poder reutilizar un Tejido ya
 * creado en otro Órgano, vinculándolo directo sin duplicar datos.
 *
 * Un Tejido se compone de Células vía tabla puente M:N `tejido_celulas`
 * (Tejido.celula_id quedó deprecated/null tras esa migración — ver
 * types.ts). Este hook resuelve, por picker, la PRIMERA Célula de cada
 * Tejido como representativa (mismo criterio simplificado que ya usaba
 * este picker antes de la migración a M:N), para poder mostrar
 * "Tejido X — hecho de Compuesto Y" sin fetches adicionales; el editor
 * completo (PanelEditorTejido) sí resuelve la lista completa de Células.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import {
  CONFIG_CELULAS,
  CONFIG_TEJIDOS,
  CONFIG_TEJIDO_CELULAS,
  type Celula,
  type Tejido,
  type TejidoCelula,
} from "@/domains/garlia/elementos/types";

/** Una entrada del catálogo, ya resuelta contra su primera Célula — mismo
 *  shape mínimo que necesita el picker (nombre + compuesto_id). */
export interface EntradaCatalogoTejido {
  id: string;
  nombre: string;
  funcion: string | null;
  notas: string | null;
  /** Id de la primera Célula vinculada (vía tejido_celulas) — el nivel que
   *  guarda compuesto_id. Null si el Tejido todavía no tiene ninguna. */
  catalogo_id: string | null;
  compuesto_id: string | null;
}

// ── Cache-first: catálogo completo, sin filtrar por entidad puntual ───────
// Mismo espíritu que useOrganoTejidos: pintar de Dexie de inmediato y
// revalidar contra Supabase en segundo plano.
function resolverDesdeTablas(
  tejidos: Tejido[],
  vinculosPorTejido: Record<string, TejidoCelula[]>,
  celulasPorId: Record<string, Celula>,
): EntradaCatalogoTejido[] {
  return tejidos.map((t) => {
    const primerVinculo = vinculosPorTejido[t.id]?.[0];
    const celula = primerVinculo ? celulasPorId[primerVinculo.celula_id] : undefined;
    return {
      id: t.id,
      nombre: t.nombre,
      funcion: t.funcion,
      notas: t.notas,
      catalogo_id: primerVinculo?.celula_id ?? null,
      compuesto_id: celula?.compuesto_id ?? null,
    };
  });
}

function agruparPorTejido(vinculos: TejidoCelula[]): Record<string, TejidoCelula[]> {
  const out: Record<string, TejidoCelula[]> = {};
  for (const v of vinculos) (out[v.tejido_id] ??= []).push(v);
  return out;
}

async function leerDeDexie(): Promise<EntradaCatalogoTejido[]> {
  try {
    if (!db) return [];
    const tejidos = (await db.tejidos.toArray()) as unknown as Tejido[];
    if (tejidos.length === 0) return [];

    const vinculos = (await db.tejido_celulas.toArray()) as unknown as TejidoCelula[];
    const vinculosPorTejido = agruparPorTejido(vinculos);

    const celulaIds = Array.from(new Set(vinculos.map((v) => v.celula_id)));
    let celulasPorId: Record<string, Celula> = {};
    if (celulaIds.length > 0) {
      const rows = (await db.celulas.bulkGet(celulaIds)) as unknown as (Celula | undefined)[];
      celulasPorId = {};
      for (const c of rows) if (c) celulasPorId[c.id] = c;
    }

    return resolverDesdeTablas(tejidos, vinculosPorTejido, celulasPorId).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  } catch {
    return [];
  }
}

async function guardarEnDexie(tejidos: Tejido[], vinculos: TejidoCelula[], celulas: Celula[]) {
  try {
    if (!db) return;
    if (tejidos.length) await db.tejidos.bulkPut(tejidos as any[]);
    if (vinculos.length) await db.tejido_celulas.bulkPut(vinculos as any[]);
    if (celulas.length) await db.celulas.bulkPut(celulas as any[]);
  } catch (e) {
    console.warn("[useCatalogoTejidos] no se pudo guardar en Dexie:", e);
  }
}

export function useCatalogoTejidos() {
  const [items, setItems] = useState<EntradaCatalogoTejido[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    const itemsLocales = await leerDeDexie();
    if (itemsLocales.length > 0) {
      setItems(itemsLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: tejidoData, error: tejidoError } = await supabase
      .from(CONFIG_TEJIDOS.tabla)
      .select(CONFIG_TEJIDOS.select)
      .order("nombre", { ascending: true });

    if (tejidoError || !tejidoData) {
      if (itemsLocales.length === 0) setItems([]);
      setLoading(false);
      return;
    }

    const tejidos = tejidoData as unknown as Tejido[];
    const tejidoIds = tejidos.map((t) => t.id);

    let vinculos: TejidoCelula[] = [];
    if (tejidoIds.length > 0) {
      const { data: vinculoData } = await supabase
        .from(CONFIG_TEJIDO_CELULAS.tabla)
        .select(CONFIG_TEJIDO_CELULAS.select)
        .in("tejido_id", tejidoIds);
      vinculos = (vinculoData ?? []) as unknown as TejidoCelula[];
    }
    const vinculosPorTejido = agruparPorTejido(vinculos);

    const celulaIds = Array.from(new Set(vinculos.map((v) => v.celula_id)));
    let celulaDatos: Celula[] = [];
    let celulasPorId: Record<string, Celula> = {};
    if (celulaIds.length > 0) {
      const { data: celulaData } = await supabase
        .from(CONFIG_CELULAS.tabla)
        .select(CONFIG_CELULAS.select)
        .in("id", celulaIds);

      celulaDatos = (celulaData ?? []) as unknown as Celula[];
      celulasPorId = {};
      for (const c of celulaDatos) celulasPorId[c.id] = c;
    }

    setItems(resolverDesdeTablas(tejidos, vinculosPorTejido, celulasPorId));
    setLoading(false);
    void guardarEnDexie(tejidos, vinculos, celulaDatos);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, load };
}
