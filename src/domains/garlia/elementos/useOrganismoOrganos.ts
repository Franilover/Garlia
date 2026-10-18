"use client";

/**
 * useOrganismoOrganos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve los Órganos vinculados a un Organismo — lee desde la vista
 * `v_organismos_organos_efectivos_v4` que resuelve herencia por clado.
 * La tabla base `organismo_organos` solo contiene vínculos directos,
 * pero los órganos heredados del clado viven únicamente en la vista;
 * usar la tabla base devuelve 0 filas para organismos que solo tienen
 * órganos heredados.
 *
 * Columnas de la vista: organismo_id, organo_id, rol, cantidad, fuente, origen.
 * No tiene `id` propio — se usa `organo_id` como clave de vínculo.
 *
 * Las mutaciones (vincularExistente, actualizarVinculo, quitar) siguen
 * escribiendo en la tabla base `organismo_organos` para vínculos directos.
 *
 * Fix race condition (oct-2026): se usa una ref local `fetchIdRef` para
 * descartar resultados de fetches que lleguen tarde.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** 'directo' = vínculo en tabla base / 'clado' = heredado del clado. */
  fuente?: string;
  /** 'propio' | 'heredado' según la vista efectivos. */
  origen?: string;
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

  // Ref para cancelar fetches en vuelo cuando organismoId cambia
  const fetchIdRef = useRef(0);

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

  // Refs para leer siempre los valores más frescos sin capturarlos en closures
  const organosRef = useRef(organos);
  const vinculosRef = useRef(vinculos);
  useEffect(() => { organosRef.current = organos; }, [organos]);
  useEffect(() => { vinculosRef.current = vinculos; }, [vinculos]);

  const setVinculos = useCallback(
    (updater: OrganismoOrgano[] | ((prev: OrganismoOrgano[]) => OrganismoOrgano[])) => {
      setVinculosLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (organismoId) setOrganosEnStore(organismoId, next, organosRef.current);
        return next;
      });
    },
    [organismoId, setOrganosEnStore],
  );

  const setOrganos = useCallback(
    (updater: Record<string, Organo> | ((prev: Record<string, Organo>) => Record<string, Organo>)) => {
      setOrganosLocal((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        if (organismoId) setOrganosEnStore(organismoId, vinculosRef.current, next);
        return next;
      });
    },
    [organismoId, setOrganosEnStore],
  );

  const load = useCallback(async () => {
    if (!organismoId) {
      setVinculosLocal([]);
      setOrganosLocal({});
      setLoading(false);
      return;
    }

    // Token único para este fetch — si organismoId cambia antes de que
    // llegue la respuesta, el fetch viejo descarta su resultado.
    const myFetchId = ++fetchIdRef.current;

    if (!cacheEntry) setLoading(true);

    // ── Query 1: vínculos desde la vista efectivos ────────────────────────
    // Usamos v_organismos_organos_efectivos_v4 en lugar de la tabla base
    // organismo_organos porque resuelve herencia por clado.
    // Columnas: organismo_id, organo_id, rol, cantidad, fuente, origen.
    // No tiene `id` propio — fabricamos uno sintético desde organo_id.
    const { data: vinculoData, error: vinculoError } = await supabase
      .from("v_organismos_organos_efectivos_v4")
      .select("organismo_id, organo_id, rol, cantidad, fuente, origen")
      .eq("organismo_id", organismoId);

    if (myFetchId !== fetchIdRef.current) return; // llegó tarde
    if (vinculoError || !vinculoData) {
      console.error("[useOrganismoOrganos] error cargando vínculos:", vinculoError);
      setLoading(false);
      return;
    }

    // Normalizar al shape OrganismoOrgano — id sintético = organo_id
    const vinculosResueltos: OrganismoOrgano[] = (vinculoData as any[]).map((row) => ({
      id: row.organo_id,
      organismo_id: row.organismo_id,
      organo_id: row.organo_id,
      rol: row.rol ?? null,
      cantidad: row.cantidad ?? 1,
      fuente: row.fuente,
      origen: row.origen,
      created_at: "",
    }));

    const organoIds = [...new Set(vinculosResueltos.map((v) => v.organo_id))];
    if (organoIds.length === 0) {
      setVinculosLocal(vinculosResueltos);
      setOrganosLocal({});
      setOrganosEnStore(organismoId, vinculosResueltos, {});
      setLoading(false);
      return;
    }

    // ── Query 2: órganos ─────────────────────────────────────────────────
    const { data: organoData, error: organoError } = await supabase
      .from(CONFIG_ORGANOS.tabla)
      .select(CONFIG_ORGANOS.select)
      .in("id", organoIds);

    if (myFetchId !== fetchIdRef.current) return; // llegó tarde
    if (organoError) {
      console.error("[useOrganismoOrganos] error cargando órganos:", organoError);
    }

    const organosPorId: Record<string, Organo> = {};
    for (const o of (organoData ?? []) as unknown as Organo[]) organosPorId[o.id] = o;

    // Setear todo junto — vinculos Y organos en el mismo ciclo
    setVinculosLocal(vinculosResueltos);
    setOrganosLocal(organosPorId);
    setOrganosEnStore(organismoId, vinculosResueltos, organosPorId);
    setLoading(false);
  }, [organismoId, cacheEntry, setOrganosEnStore]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organismoId]);

  const items = useMemo<OrganoDeOrganismo[]>(() => {
    const result: OrganoDeOrganismo[] = [];
    for (const v of vinculos) {
      const organo = organos[v.organo_id];
      if (!organo) continue;
      result.push({
        vinculo_id: v.id,
        organismo_id: v.organismo_id,
        organo_id: v.organo_id,
        rol: v.rol,
        cantidad: v.cantidad,
        fuente: (v as any).fuente,
        origen: (v as any).origen,
        organo,
      });
    }
    return result;
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

  /** Editar rol y/o cantidad de un vínculo directo (heredados del clado
   *  son read-only). vinculoId = organo_id (id sintético de la vista). */
  const actualizarVinculo = useCallback(
    async (vinculoId: string, cambios: Partial<Pick<OrganismoOrgano, "rol" | "cantidad">>) => {
      setVinculos((prev) => prev.map((v) => (v.id === vinculoId ? { ...v, ...cambios } : v)));
      const { error } = await supabase
        .from(CONFIG_ORGANISMO_ORGANOS.tabla)
        .update(cambios)
        .eq("organismo_id", organismoId!)
        .eq("organo_id", vinculoId);
      if (error) console.error("[useOrganismoOrganos] error actualizando vínculo:", error);
    },
    [organismoId, setVinculos],
  );

  /** Quitar un vínculo directo (el Órgano queda en su catálogo, no se borra).
   *  vinculoId = organo_id (id sintético de la vista). */
  const quitar = useCallback(
    async (vinculoId: string) => {
      setVinculos((prev) => prev.filter((v) => v.id !== vinculoId));
      const { error } = await supabase
        .from(CONFIG_ORGANISMO_ORGANOS.tabla)
        .delete()
        .eq("organismo_id", organismoId!)
        .eq("organo_id", vinculoId);
      if (error) console.error("[useOrganismoOrganos] error quitando vínculo:", error);
    },
    [organismoId, setVinculos],
  );

  return { items, loading, vincularExistente, actualizarVinculo, quitar, load };
}
