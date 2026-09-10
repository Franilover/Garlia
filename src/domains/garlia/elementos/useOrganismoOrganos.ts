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
 * Mismo patrón que useSistemaOrganos.ts, sin cache-first en Dexie (tabla no
 * declarada aún en el esquema local — se puede sumar más adelante sin tocar
 * la firma pública de acá).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_ORGANISMO_ORGANOS,
  CONFIG_ORGANOS,
  type Organo,
  type OrganismoOrgano,
} from "@/domains/garlia/elementos/types";

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
  const [vinculos, setVinculos] = useState<OrganismoOrgano[]>([]);
  const [organos, setOrganos] = useState<Record<string, Organo>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organismoId) {
      setVinculos([]);
      setOrganos({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: vinculoData, error: vinculoError } = await supabase
      .from(CONFIG_ORGANISMO_ORGANOS.tabla)
      .select(CONFIG_ORGANISMO_ORGANOS.select)
      .eq("organismo_id", organismoId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      setVinculos([]);
      setOrganos({});
      setLoading(false);
      return;
    }
    const vinculosResueltos = vinculoData as unknown as OrganismoOrgano[];
    setVinculos(vinculosResueltos);

    const organoIds = [...new Set(vinculosResueltos.map((v) => v.organo_id))];
    if (organoIds.length === 0) {
      setOrganos({});
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
    setOrganos(organosPorId);
    setLoading(false);
  }, [organismoId]);

  useEffect(() => {
    void load();
  }, [load]);

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

      if (!organos[organoId]) {
        const { data: organoData } = await supabase
          .from(CONFIG_ORGANOS.tabla)
          .select(CONFIG_ORGANOS.select)
          .eq("id", organoId)
          .single();
        if (organoData) {
          setOrganos((prev) => ({ ...prev, [organoId]: organoData as unknown as Organo }));
        }
      }
      setVinculos((prev) => [...prev, vinculo as unknown as OrganismoOrgano]);
      return vinculo as unknown as OrganismoOrgano;
    },
    [organismoId, organos],
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
    [],
  );

  /** Quitar el vínculo (el Órgano queda en su catálogo, no se borra). */
  const quitar = useCallback(async (vinculoId: string) => {
    setVinculos((prev) => prev.filter((v) => v.id !== vinculoId));
    const { error } = await supabase
      .from(CONFIG_ORGANISMO_ORGANOS.tabla)
      .delete()
      .eq("id", vinculoId);
    if (error) console.error("[useOrganismoOrganos] error quitando vínculo:", error);
  }, []);

  return { items, loading, vincularExistente, actualizarVinculo, quitar, load };
}
