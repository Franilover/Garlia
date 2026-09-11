"use client";

/**
 * useOrganismoOrganos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve los Órganos vinculados DIRECTO a un Organismo — tabla puente
 * `organismo_organos` (M:N, con rol y cantidad). Distinto de
 * organismo_sistemas→sistema_organos (que llega al Órgano pasando por un
 * Sistema intermedio): esta tabla expresa "este Organismo posee este Órgano,
 * con esta cantidad y este rol" sin necesidad de que el Órgano cuelgue de
 * ningún Sistema catalogado.
 *
 * A diferencia de useOrganismoSistemas.ts/useSistemaOrganos.ts (que sí usan
 * Dexie), `organismo_organos` no está declarada en el esquema Dexie
 * (AgendaFraniDB) — agregarla es un cambio de infra fuera de este dominio.
 * Este hook queda Supabase-only + Zustand (cache en memoria entre
 * componentes), sin caché offline en disco, hasta que se registre la tabla
 * en el esquema.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_ORGANISMO_ORGANOS,
  CONFIG_ORGANOS,
  type Organo,
  type OrganismoOrgano,
} from "@/domains/garlia/elementos/types";
import { useOrganismoBiologiaStore } from "@/domains/garlia/elementos/useOrganismoBiologiaStore";

/** Una fila resuelta: vínculo + Órgano ya cargado, lista para la UI. */
export interface OrganoDeOrganismo {
  vinculo_id: string;
  organismo_id: string;
  organo_id: string;
  rol: string | null;
  cantidad: number;
  organo: Organo;
}

export function useOrganismoOrganos(organismoId: string | null) {
  // ── Zustand: cache en memoria compartida entre componentes ────────────
  const cacheEntry = useOrganismoBiologiaStore((s) =>
    organismoId ? s.organosPorOrganismo[organismoId] : undefined,
  );
  const setOrganosEnStore = useOrganismoBiologiaStore((s) => s.setOrganos);

  const [vinculos, setVinculosLocal] = useState<OrganismoOrgano[]>(cacheEntry?.vinculos ?? []);
  const [organos, setOrganosLocal] = useState<Record<string, Organo>>(cacheEntry?.organos ?? {});
  const [loading, setLoading] = useState(!cacheEntry);

  // Si otro componente ya resolvió este organismoId en el store, adoptamos
  // ese estado de inmediato en vez de esperar otro round-trip.
  useEffect(() => {
    if (cacheEntry) {
      setVinculosLocal(cacheEntry.vinculos);
      setOrganosLocal(cacheEntry.organos);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organismoId]);

  const setVinculos = useCallback(
    (updater: OrganismoOrgano[] | ((prev: OrganismoOrgano[]) => OrganismoOrgano[])) => {
      setVinculosLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (organismoId) setOrganosEnStore(organismoId, next, organos);
        return next;
      });
    },
    [organismoId, organos, setOrganosEnStore],
  );

  const setOrganos = useCallback(
    (updater: Record<string, Organo> | ((prev: Record<string, Organo>) => Record<string, Organo>)) => {
      setOrganosLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (organismoId) setOrganosEnStore(organismoId, vinculos, next);
        return next;
      });
    },
    [organismoId, vinculos, setOrganosEnStore],
  );

  const load = useCallback(async () => {
    if (!organismoId) {
      setVinculosLocal([]);
      setOrganosLocal({});
      setLoading(false);
      return;
    }

    if (!cacheEntry) setLoading(true);

    const { data: vinculoData, error: vinculoError } = await supabase
      .from(CONFIG_ORGANISMO_ORGANOS.tabla)
      .select(CONFIG_ORGANISMO_ORGANOS.select)
      .eq("organismo_id", organismoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      console.error("[useOrganismoOrganos] error cargando vínculos:", vinculoError);
      setLoading(false);
      return;
    }
    const vinculosResueltos = vinculoData as unknown as OrganismoOrgano[];
    setVinculosLocal(vinculosResueltos);

    const organoIds = [...new Set(vinculosResueltos.map((v) => v.organo_id))];
    if (organoIds.length === 0) {
      setOrganosLocal({});
      setOrganosEnStore(organismoId, vinculosResueltos, {});
      setLoading(false);
      return;
    }

    const { data: organoData, error: organoError } = await supabase
      .from(CONFIG_ORGANOS.tabla)
      .select(CONFIG_ORGANOS.select)
      .in("id", organoIds);
    if (organoError) {
      console.error("[useOrganismoOrganos] error cargando órganos:", organoError);
    }
    const organosPorId: Record<string, Organo> = {};
    for (const o of (organoData ?? []) as unknown as Organo[]) organosPorId[o.id] = o;
    setOrganosLocal(organosPorId);
    setOrganosEnStore(organismoId, vinculosResueltos, organosPorId);
    setLoading(false);
  }, [organismoId, cacheEntry, setOrganosEnStore]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organismoId]);

  const items = useMemo<OrganoDeOrganismo[]>(() => {
    return vinculos
      .map((v) => {
        const organo = organos[v.organo_id];
        if (!organo) return null;
        return {
          vinculo_id: v.id,
          organismo_id: v.organismo_id,
          organo_id: v.organo_id,
          rol: v.rol,
          cantidad: v.cantidad,
          organo,
        };
      })
      .filter((o): o is OrganoDeOrganismo => o !== null);
  }, [vinculos, organos]);

  /** Vincular un Órgano ya existente del catálogo directo a este Organismo. */
  const vincularExistente = useCallback(
    async (organoId: string) => {
      if (!organismoId) return null;
      const { data: vinculo, error } = await supabase
        .from(CONFIG_ORGANISMO_ORGANOS.tabla)
        .insert([{ organismo_id: organismoId, organo_id: organoId }])
        .select()
        .single();
      if (error || !vinculo) {
        console.error("[useOrganismoOrganos] error vinculando órgano:", error);
        return null;
      }

      let organoResuelto = organos[organoId];
      if (!organoResuelto) {
        const { data: organoData } = await supabase
          .from(CONFIG_ORGANOS.tabla)
          .select(CONFIG_ORGANOS.select)
          .eq("id", organoId)
          .single();
        if (organoData) {
          organoResuelto = organoData as unknown as Organo;
          setOrganos((prev) => ({ ...prev, [organoId]: organoResuelto }));
        }
      }
      const vinculoTyped = vinculo as unknown as OrganismoOrgano;
      setVinculos((prev) => [...prev, vinculoTyped]);
      return vinculoTyped;
    },
    [organismoId, organos, setOrganos, setVinculos],
  );

  /** Editar rol y/o cantidad de una fila. */
  const actualizarVinculo = useCallback(
    async (vinculoId: string, cambios: Partial<Pick<OrganismoOrgano, "rol" | "cantidad">>) => {
      setVinculos((prev) => prev.map((v) => (v.id === vinculoId ? { ...v, ...cambios } : v)));
      const { error } = await supabase
        .from(CONFIG_ORGANISMO_ORGANOS.tabla)
        .update(cambios)
        .eq("id", vinculoId);
      if (error) console.error("[useOrganismoOrganos] error actualizando vínculo:", error);
    },
    [setVinculos],
  );

  /** Quitar el vínculo (el Órgano queda en su catálogo, no se borra). */
  const quitar = useCallback(
    async (vinculoId: string) => {
      setVinculos((prev) => prev.filter((v) => v.id !== vinculoId));
      const { error } = await supabase
        .from(CONFIG_ORGANISMO_ORGANOS.tabla)
        .delete()
        .eq("id", vinculoId);
      if (error) console.error("[useOrganismoOrganos] error quitando vínculo:", error);
    },
    [setVinculos],
  );

  return { items, loading, vincularExistente, actualizarVinculo, quitar, load };
}

