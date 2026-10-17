"use client";

/**
 * useOrganismoSistemas.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve los Sistemas vinculados a UN Organismo — tabla puente
 * `organismo_sistemas` (M:N, Fase 5). A diferencia de sistema_organos, esta
 * tabla SÍ tiene `proporcion` libre en texto, mismo patrón que
 * organo_tejidos (ej. "1", "2" — peso relativo del Sistema en el Organismo).
 *
 * Techo de la cadena: Célula → Tejido → Órgano → Sistema → Organismo.
 * Un mismo Sistema puede reutilizarse en varios Organismos.
 *
 * Fase 8: cache-first vía Dexie, mismo patrón que useOrganoTejidos.ts /
 * useSistemaOrganos.ts (organismo_sistemas y sistemas ya están en
 * DEXIE_TABLES desde v35). Además espeja el resultado en
 * useOrganismoBiologiaStore (Zustand) para que otra instancia del hook
 * pidiendo el mismo organismoId (ej. EditorCriatura + PanelEditorOrganismo
 * abiertos a la vez) adopte el resultado ya resuelto sin refetchear.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";
import { db } from "@/infra/supabase/db";

import {
  CONFIG_ORGANISMO_SISTEMAS,
  CONFIG_SISTEMAS,
  type OrganismoSistema,
  type Sistema,
} from "@/domains/garlia/elementos/types";
import { useOrganismoBiologiaStore } from "@/domains/garlia/elementos/useOrganismoBiologiaStore";

// Select con join embebido — una sola query, sin race condition.
const SELECT_CON_JOIN = `id, organismo_id, sistema_id, proporcion, created_at, sistema:sistemas(${CONFIG_SISTEMAS.select})`;

// ── Cache-first: leer/escribir Dexie ───────────────────────────────────────
async function leerVinculosDeDexie(organismoId: string): Promise<OrganismoSistema[]> {
  try {
    if (!db) return [];
    const rows = await db.organismo_sistemas
      .where("organismo_id")
      .equals(organismoId)
      .toArray();
    return rows as unknown as OrganismoSistema[];
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

async function guardarEnDexie(vinculos: OrganismoSistema[], sistemas: Sistema[]) {
  try {
    if (!db) return;
    if (vinculos.length) await db.organismo_sistemas.bulkPut(vinculos as any[]);
    if (sistemas.length) await db.sistemas.bulkPut(sistemas as any[]);
  } catch (e) {
    console.warn("[useOrganismoSistemas] no se pudo guardar en Dexie:", e);
  }
}

/** Una fila resuelta: vínculo + Sistema ya cargado, lista para la UI. */
export interface SistemaDeOrganismo {
  vinculo_id: string;
  organismo_id: string;
  sistema_id: string;
  proporcion: string | null;
  sistema: Sistema;
}

export function useOrganismoSistemas(organismoId: string | null) {
  // ── Zustand: cache en memoria compartida entre componentes ────────────
  const cacheEntry = useOrganismoBiologiaStore((s) =>
    organismoId ? s.sistemasPorOrganismo[organismoId] : undefined,
  );
  const setSistemasEnStore = useOrganismoBiologiaStore((s) => s.setSistemas);

  const [vinculos, setVinculosLocal] = useState<OrganismoSistema[]>(cacheEntry?.vinculos ?? []);
  const [sistemas, setSistemasLocal] = useState<Record<string, Sistema>>(cacheEntry?.sistemas ?? {});
  const [loading, setLoading] = useState(!cacheEntry);

  // Si otro componente ya resolvió este organismoId en el store, adoptamos
  // ese estado de inmediato en vez de esperar otro round-trip.
  useEffect(() => {
    if (cacheEntry) {
      setVinculosLocal(cacheEntry.vinculos);
      setSistemasLocal(cacheEntry.sistemas);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organismoId]);

  const setVinculos = useCallback(
    (updater: OrganismoSistema[] | ((prev: OrganismoSistema[]) => OrganismoSistema[])) => {
      setVinculosLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (organismoId) setSistemasEnStore(organismoId, next, sistemas);
        return next;
      });
    },
    [organismoId, sistemas, setSistemasEnStore],
  );

  const setSistemas = useCallback(
    (
      updater:
        | Record<string, Sistema>
        | ((prev: Record<string, Sistema>) => Record<string, Sistema>),
    ) => {
      setSistemasLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (organismoId) setSistemasEnStore(organismoId, vinculos, next);
        return next;
      });
    },
    [organismoId, vinculos, setSistemasEnStore],
  );

  const load = useCallback(async () => {
    if (!organismoId) {
      setVinculosLocal([]);
      setSistemasLocal({});
      setLoading(false);
      return;
    }

    // ── Paso 1: pintar de inmediato con lo que ya haya en Dexie ──────────
    if (!cacheEntry) {
      const vinculosLocales = await leerVinculosDeDexie(organismoId);
      if (vinculosLocales.length > 0) {
        setVinculosLocal(vinculosLocales);
        const sistemaIdsLocales = vinculosLocales.map((v) => v.sistema_id);
        const sistemasLocales = await leerSistemasDeDexie(sistemaIdsLocales);
        setSistemasLocal(sistemasLocales);
        setSistemasEnStore(organismoId, vinculosLocales, sistemasLocales);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    // ── Paso 2: revalidar contra Supabase con join embebido ───────────────
    // Una sola query elimina el race condition entre dos fetches separados.
    const { data, error: vinculoError } = await supabase
      .from("organismo_sistemas")
      .select(SELECT_CON_JOIN)
      .eq("organismo_id", organismoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !data) {
      setLoading(false);
      return;
    }

    const sistemasPorId: Record<string, Sistema> = {};
    const vinculosLimpios: OrganismoSistema[] = [];
    for (const row of data as any[]) {
      const { sistema, ...vinculo } = row;
      vinculosLimpios.push(vinculo as OrganismoSistema);
      if (sistema) sistemasPorId[vinculo.sistema_id] = sistema as Sistema;
    }

    setSistemasLocal(sistemasPorId);
    setVinculosLocal(vinculosLimpios);
    setSistemasEnStore(organismoId, vinculosLimpios, sistemasPorId);
    setLoading(false);
    void guardarEnDexie(vinculosLimpios, Object.values(sistemasPorId));
  }, [organismoId, cacheEntry, setSistemasEnStore]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organismoId]);

  const items = useMemo<SistemaDeOrganismo[]>(() => {
    return vinculos
      .map((v) => {
        const sistema = sistemas[v.sistema_id];
        if (!sistema) return null;
        return {
          vinculo_id: v.id,
          organismo_id: v.organismo_id,
          sistema_id: v.sistema_id,
          proporcion: v.proporcion,
          sistema,
        };
      })
      .filter((s): s is SistemaDeOrganismo => s !== null);
  }, [vinculos, sistemas]);

  /** Vincular un Sistema ya existente del catálogo a este Organismo. */
  const vincularExistente = useCallback(
    async (sistemaId: string) => {
      if (!organismoId) return null;
      const { data: vinculo, error } = await supabase
        .from(CONFIG_ORGANISMO_SISTEMAS.tabla)
        .insert([{ organismo_id: organismoId, sistema_id: sistemaId }])
        .select()
        .single();
      if (error || !vinculo) return null;

      let sistemaResuelto = sistemas[sistemaId];
      if (!sistemaResuelto) {
        const { data: sistemaData } = await supabase
          .from(CONFIG_SISTEMAS.tabla)
          .select(CONFIG_SISTEMAS.select)
          .eq("id", sistemaId)
          .single();
        if (sistemaData) {
          sistemaResuelto = sistemaData as unknown as Sistema;
          setSistemas((prev) => ({ ...prev, [sistemaId]: sistemaResuelto }));
        }
      }
      const vinculoTyped = vinculo as unknown as OrganismoSistema;
      setVinculos((prev) => [...prev, vinculoTyped]);
      void guardarEnDexie([vinculoTyped], sistemaResuelto ? [sistemaResuelto] : []);
      return vinculoTyped;
    },
    [organismoId, sistemas, setSistemas, setVinculos],
  );

  /** Editar la proporción de una fila. */
  const actualizarProporcion = useCallback(
    async (vinculoId: string, proporcion: string) => {
      setVinculos((prev) => {
        const next = prev.map((v) => (v.id === vinculoId ? { ...v, proporcion } : v));
        const actualizado = next.find((v) => v.id === vinculoId);
        if (actualizado) void guardarEnDexie([actualizado], []);
        return next;
      });
      const { error } = await supabase
        .from(CONFIG_ORGANISMO_SISTEMAS.tabla)
        .update({ proporcion })
        .eq("id", vinculoId);
      if (error) console.error("[useOrganismoSistemas] error actualizando proporción:", error);
    },
    [setVinculos],
  );

  /** Quitar el vínculo (el Sistema queda en su catálogo, no se borra). */
  const quitar = useCallback(
    async (vinculoId: string) => {
      setVinculos((prev) => prev.filter((v) => v.id !== vinculoId));
      try {
        if (db) await db.organismo_sistemas.delete(vinculoId);
      } catch {}
      const { error } = await supabase
        .from(CONFIG_ORGANISMO_SISTEMAS.tabla)
        .delete()
        .eq("id", vinculoId);
      if (error) console.error("[useOrganismoSistemas] error quitando vínculo:", error);
    },
    [setVinculos],
  );

  return { items, loading, vincularExistente, actualizarProporcion, quitar, load };
}
