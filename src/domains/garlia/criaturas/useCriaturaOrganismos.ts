"use client";

/**
 * useCriaturaOrganismos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Vincula una Criatura con Organismo(s) del catálogo — techo de la cadena
 * biológica (Célula→Tejido→Órgano→Sistema→Organismo) aplicado a una
 * Criatura real, tabla puente dedicada "criatura_organismos".
 *
 * A diferencia de useCriaturaOrganos.ts (que delega a
 * useEntidadVinculosGrupo/estructura_componentes, Fase 7), esta tabla NO
 * pasó por esa unificación — sigue siendo dedicada, y useEntidadVinculosGrupo
 * ni siquiera acepta "organismo" como hijo_tipo válido (ver su propio tipo
 * HijoTipoCatalogo).
 *
 * Fase 8: cache-first vía Dexie + Zustand (useCriaturaOrganismosStore), en
 * el mismo espíritu que useOrganismoSistemas.ts. `criatura_organismos`
 * puede no estar declarada todavía en el esquema local de Dexie (ver
 * infra/supabase/db.ts) — todo acceso a `db.criatura_organismos` es
 * defensivo (try/catch) para que, si la tabla no existe ahí, el hook siga
 * funcionando igual contra Supabase, solo sin el pintado instantáneo
 * offline. En cuanto se sume "criatura_organismos" a DEXIE_TABLES, este
 * hook empieza a cachear sin cambios adicionales.
 *
 * Al momento de crear este hook, la tabla tenía 0 filas — es un hueco de
 * datos real, no solo de frontend: exponerlo acá permite empezar a
 * poblarlo desde la UI en vez de depender de SQL manual.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import {
  CONFIG_CRIATURA_ORGANISMOS,
  CONFIG_ORGANISMOS,
  type CriaturaOrganismo,
  type Organismo,
} from "@/domains/garlia/elementos/types";
import { useCriaturaOrganismosStore } from "@/domains/garlia/criaturas/useCriaturaOrganismosStore";

// ── Cache-first: leer/escribir Dexie (defensivo — la tabla puede no estar
// declarada todavía en el esquema local; ver nota arriba). ─────────────────
async function leerVinculosDeDexie(criaturaId: string): Promise<CriaturaOrganismo[]> {
  try {
    if (!db || !(db as any).criatura_organismos) return [];
    const rows = await (db as any).criatura_organismos
      .where("criatura_id")
      .equals(criaturaId)
      .toArray();
    return rows as CriaturaOrganismo[];
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

async function guardarEnDexie(vinculos: CriaturaOrganismo[], organismos: Organismo[]) {
  try {
    if (!db) return;
    if (vinculos.length && (db as any).criatura_organismos) {
      await (db as any).criatura_organismos.bulkPut(vinculos as any[]);
    }
    if (organismos.length) await db.organismos.bulkPut(organismos as any[]);
  } catch (e) {
    console.warn("[useCriaturaOrganismos] no se pudo guardar en Dexie:", e);
  }
}

async function borrarDeDexie(vinculoId: string) {
  try {
    if (db && (db as any).criatura_organismos) {
      await (db as any).criatura_organismos.delete(vinculoId);
    }
  } catch {}
}

/** Una fila resuelta: vínculo + Organismo ya cargado, lista para la UI. */
export interface OrganismoDeCriatura {
  vinculo_id: string;
  criatura_id: string;
  organismo_id: string;
  rol: string | null;
  cantidad: number;
  es_principal: boolean;
  organismo: Organismo;
}

export function useCriaturaOrganismos(criaturaId: string | null) {
  // ── Zustand: cache en memoria compartida entre componentes ────────────
  const cacheEntry = useCriaturaOrganismosStore((s) =>
    criaturaId ? s.porCriatura[criaturaId] : undefined,
  );
  const setOrganismosEnStore = useCriaturaOrganismosStore((s) => s.setOrganismos);

  const [vinculos, setVinculosLocal] = useState<CriaturaOrganismo[]>(cacheEntry?.vinculos ?? []);
  const [organismos, setOrganismosLocal] = useState<Record<string, Organismo>>(
    cacheEntry?.organismos ?? {},
  );
  const [loading, setLoading] = useState(!cacheEntry);

  useEffect(() => {
    if (cacheEntry) {
      setVinculosLocal(cacheEntry.vinculos);
      setOrganismosLocal(cacheEntry.organismos);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criaturaId]);

  const setVinculos = useCallback(
    (updater: CriaturaOrganismo[] | ((prev: CriaturaOrganismo[]) => CriaturaOrganismo[])) => {
      setVinculosLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (criaturaId) setOrganismosEnStore(criaturaId, next, organismos);
        return next;
      });
    },
    [criaturaId, organismos, setOrganismosEnStore],
  );

  const setOrganismos = useCallback(
    (
      updater:
        | Record<string, Organismo>
        | ((prev: Record<string, Organismo>) => Record<string, Organismo>),
    ) => {
      setOrganismosLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (criaturaId) setOrganismosEnStore(criaturaId, vinculos, next);
        return next;
      });
    },
    [criaturaId, vinculos, setOrganismosEnStore],
  );

  const load = useCallback(async () => {
    if (!criaturaId) {
      setVinculosLocal([]);
      setOrganismosLocal({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    if (!cacheEntry) {
      const vinculosLocales = await leerVinculosDeDexie(criaturaId);
      if (vinculosLocales.length > 0) {
        const organismoIdsLocales = [...new Set(vinculosLocales.map((v) => v.organismo_id))];
        const organismosLocales = await leerOrganismosDeDexie(organismoIdsLocales);
        setVinculosLocal(vinculosLocales);
        setOrganismosLocal(organismosLocales);
        setOrganismosEnStore(criaturaId, vinculosLocales, organismosLocales);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    // ── Paso 2: revalidar contra Supabase en segundo plano ────────────────
    const { data: vinculoData, error: vinculoError } = await supabase
      .from(CONFIG_CRIATURA_ORGANISMOS.tabla)
      .select(CONFIG_CRIATURA_ORGANISMOS.select)
      .eq("criatura_id", criaturaId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      console.error("[useCriaturaOrganismos] error cargando vínculos:", vinculoError);
      setLoading(false);
      return;
    }
    const vinculosResueltos = vinculoData as unknown as CriaturaOrganismo[];
    setVinculosLocal(vinculosResueltos);

    const organismoIds = [...new Set(vinculosResueltos.map((v) => v.organismo_id))];
    if (organismoIds.length === 0) {
      setOrganismosLocal({});
      setOrganismosEnStore(criaturaId, vinculosResueltos, {});
      setLoading(false);
      void guardarEnDexie(vinculosResueltos, []);
      return;
    }

    const { data: organismoData, error: organismoError } = await supabase
      .from(CONFIG_ORGANISMOS.tabla)
      .select(CONFIG_ORGANISMOS.select)
      .in("id", organismoIds);
    if (organismoError) {
      // No se corta el flujo (vinculos ya quedaron seteados arriba), pero
      // se loguea siempre — antes un error acá (ej. columna inexistente en
      // el select) quedaba invisible: `items` salía vacío como si no
      // hubiera vínculos, aunque `criatura_organismos` sí tuviera filas.
      console.error("[useCriaturaOrganismos] error cargando organismos:", organismoError);
    }
    const organismosPorId: Record<string, Organismo> = {};
    for (const o of (organismoData ?? []) as unknown as Organismo[]) organismosPorId[o.id] = o;
    setOrganismosLocal(organismosPorId);
    setOrganismosEnStore(criaturaId, vinculosResueltos, organismosPorId);
    setLoading(false);
    void guardarEnDexie(vinculosResueltos, Object.values(organismosPorId));
  }, [criaturaId, cacheEntry, setOrganismosEnStore]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criaturaId]);

  const items = useMemo<OrganismoDeCriatura[]>(() => {
    return vinculos
      .map((v) => {
        const organismo = organismos[v.organismo_id];
        if (!organismo) return null;
        return {
          vinculo_id: v.id,
          criatura_id: v.criatura_id,
          organismo_id: v.organismo_id,
          rol: v.rol,
          cantidad: v.cantidad,
          es_principal: v.es_principal,
          organismo,
        };
      })
      .filter((o): o is OrganismoDeCriatura => o !== null);
  }, [vinculos, organismos]);

  /** Vincular un Organismo ya existente del catálogo a esta Criatura.
   *  cantidad tiene default numérico en la base (no nulleable); es_principal
   *  arranca en false — se marca a mano después si corresponde. */
  const vincularExistente = useCallback(
    async (organismoId: string) => {
      if (!criaturaId) return null;
      const { data: vinculo, error } = await supabase
        .from(CONFIG_CRIATURA_ORGANISMOS.tabla)
        .insert([{ criatura_id: criaturaId, organismo_id: organismoId, es_principal: false }])
        .select()
        .single();
      if (error || !vinculo) {
        console.error("[useCriaturaOrganismos] error vinculando organismo:", error);
        return null;
      }

      let organismoResuelto = organismos[organismoId];
      if (!organismoResuelto) {
        const { data: organismoData } = await supabase
          .from(CONFIG_ORGANISMOS.tabla)
          .select(CONFIG_ORGANISMOS.select)
          .eq("id", organismoId)
          .single();
        if (organismoData) {
          organismoResuelto = organismoData as unknown as Organismo;
          setOrganismos((prev) => ({ ...prev, [organismoId]: organismoResuelto }));
        }
      }
      const vinculoTyped = vinculo as unknown as CriaturaOrganismo;
      setVinculos((prev) => [...prev, vinculoTyped]);
      void guardarEnDexie([vinculoTyped], organismoResuelto ? [organismoResuelto] : []);
      return vinculoTyped;
    },
    [criaturaId, organismos, setOrganismos, setVinculos],
  );

  /** Editar rol y/o cantidad de una fila. */
  const actualizarVinculo = useCallback(
    async (vinculoId: string, cambios: Partial<Pick<CriaturaOrganismo, "rol" | "cantidad">>) => {
      setVinculos((prev) => {
        const next = prev.map((v) => (v.id === vinculoId ? { ...v, ...cambios } : v));
        const actualizado = next.find((v) => v.id === vinculoId);
        if (actualizado) void guardarEnDexie([actualizado], []);
        return next;
      });
      const { error } = await supabase
        .from(CONFIG_CRIATURA_ORGANISMOS.tabla)
        .update(cambios)
        .eq("id", vinculoId);
      if (error) console.error("[useCriaturaOrganismos] error actualizando vínculo:", error);
    },
    [setVinculos],
  );

  /** Marcar/desmarcar como principal — no fuerza unicidad en el frontend
   *  (si la criatura tiene varios organismos marcados como principal a la
   *  vez, es una decisión de datos, no algo que este hook deba arbitrar). */
  const marcarPrincipal = useCallback(
    async (vinculoId: string, esPrincipal: boolean) => {
      setVinculos((prev) => {
        const next = prev.map((v) => (v.id === vinculoId ? { ...v, es_principal: esPrincipal } : v));
        const actualizado = next.find((v) => v.id === vinculoId);
        if (actualizado) void guardarEnDexie([actualizado], []);
        return next;
      });
      const { error } = await supabase
        .from(CONFIG_CRIATURA_ORGANISMOS.tabla)
        .update({ es_principal: esPrincipal })
        .eq("id", vinculoId);
      if (error) console.error("[useCriaturaOrganismos] error marcando principal:", error);
    },
    [setVinculos],
  );

  /** Quitar el vínculo (el Organismo queda en su catálogo, no se borra). */
  const quitar = useCallback(
    async (vinculoId: string) => {
      setVinculos((prev) => prev.filter((v) => v.id !== vinculoId));
      void borrarDeDexie(vinculoId);
      const { error } = await supabase
        .from(CONFIG_CRIATURA_ORGANISMOS.tabla)
        .delete()
        .eq("id", vinculoId);
      if (error) console.error("[useCriaturaOrganismos] error quitando vínculo:", error);
    },
    [setVinculos],
  );

  return { items, loading, vincularExistente, actualizarVinculo, marcarPrincipal, quitar, load };
}
