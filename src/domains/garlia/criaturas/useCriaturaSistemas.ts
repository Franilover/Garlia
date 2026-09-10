"use client";

/**
 * useCriaturaSistemas.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Vincula una Criatura con Sistema(s) del catálogo directamente — tabla
 * puente dedicada "criatura_sistemas". A diferencia de useCriaturaOrganismos
 * (Célula→Tejido→Órgano→Sistema→Organismo completo), esto permite que una
 * Criatura tenga un Sistema propio sin pasar por un Organismo del catálogo
 * — ej. un sistema mágico vestigial exclusivo de esa criatura. Mismo shape
 * que organismo_sistemas (proporción libre en texto, sin rol/cantidad),
 * mismo estilo que useCriaturaOrganismos.ts: pega directo a Supabase, sin
 * cache-first en Dexie (tabla nueva, todavía no declarada en el esquema
 * local — se puede sumar más adelante sin tocar la firma pública de acá).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_CRIATURA_SISTEMAS,
  CONFIG_SISTEMAS,
  type CriaturaSistema,
  type Sistema,
} from "@/domains/garlia/elementos/types";

/** Una fila resuelta: vínculo + Sistema ya cargado, lista para la UI. */
export interface SistemaDeCriatura {
  vinculo_id: string;
  criatura_id: string;
  sistema_id: string;
  proporcion: string | null;
  sistema: Sistema;
}

export function useCriaturaSistemas(criaturaId: string | null) {
  const [vinculos, setVinculos] = useState<CriaturaSistema[]>([]);
  const [sistemas, setSistemas] = useState<Record<string, Sistema>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!criaturaId) {
      setVinculos([]);
      setSistemas({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: vinculoData, error: vinculoError } = await supabase
      .from(CONFIG_CRIATURA_SISTEMAS.tabla)
      .select(CONFIG_CRIATURA_SISTEMAS.select)
      .eq("criatura_id", criaturaId)
      .order("created_at", { ascending: true });

    if (vinculoError || !vinculoData) {
      setVinculos([]);
      setSistemas({});
      setLoading(false);
      return;
    }
    const vinculosResueltos = vinculoData as unknown as CriaturaSistema[];
    setVinculos(vinculosResueltos);

    const sistemaIds = [...new Set(vinculosResueltos.map((v) => v.sistema_id))];
    if (sistemaIds.length === 0) {
      setSistemas({});
      setLoading(false);
      return;
    }

    const { data: sistemaData, error: sistemaError } = await supabase
      .from(CONFIG_SISTEMAS.tabla)
      .select(CONFIG_SISTEMAS.select)
      .in("id", sistemaIds);
    if (sistemaError) {
      // No se corta el flujo (vinculos ya quedaron seteados arriba), pero
      // se loguea siempre — mismo motivo que en useCriaturaOrganismos.ts.
      console.error("[useCriaturaSistemas] error cargando sistemas:", sistemaError);
    }
    const sistemasPorId: Record<string, Sistema> = {};
    for (const s of (sistemaData ?? []) as unknown as Sistema[]) sistemasPorId[s.id] = s;
    setSistemas(sistemasPorId);
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<SistemaDeCriatura[]>(() => {
    return vinculos
      .map((v) => {
        const sistema = sistemas[v.sistema_id];
        if (!sistema) return null;
        return {
          vinculo_id: v.id,
          criatura_id: v.criatura_id,
          sistema_id: v.sistema_id,
          proporcion: v.proporcion,
          sistema,
        };
      })
      .filter((s): s is SistemaDeCriatura => s !== null);
  }, [vinculos, sistemas]);

  /** Vincular un Sistema ya existente del catálogo a esta Criatura. */
  const vincularExistente = useCallback(
    async (sistemaId: string) => {
      if (!criaturaId) return null;
      const { data: vinculo, error } = await supabase
        .from(CONFIG_CRIATURA_SISTEMAS.tabla)
        .insert([{ criatura_id: criaturaId, sistema_id: sistemaId }])
        .select()
        .single();
      if (error || !vinculo) {
        console.error("[useCriaturaSistemas] error vinculando sistema:", error);
        return null;
      }

      if (!sistemas[sistemaId]) {
        const { data: sistemaData } = await supabase
          .from(CONFIG_SISTEMAS.tabla)
          .select(CONFIG_SISTEMAS.select)
          .eq("id", sistemaId)
          .single();
        if (sistemaData) {
          setSistemas((prev) => ({ ...prev, [sistemaId]: sistemaData as unknown as Sistema }));
        }
      }
      setVinculos((prev) => [...prev, vinculo as unknown as CriaturaSistema]);
      return vinculo as unknown as CriaturaSistema;
    },
    [criaturaId, sistemas],
  );

  /** Editar la proporción de una fila. */
  const actualizarProporcion = useCallback(async (vinculoId: string, proporcion: string) => {
    setVinculos((prev) => prev.map((v) => (v.id === vinculoId ? { ...v, proporcion } : v)));
    const { error } = await supabase
      .from(CONFIG_CRIATURA_SISTEMAS.tabla)
      .update({ proporcion })
      .eq("id", vinculoId);
    if (error) console.error("[useCriaturaSistemas] error actualizando proporción:", error);
  }, []);

  /** Quitar el vínculo (el Sistema queda en su catálogo, no se borra). */
  const quitar = useCallback(async (vinculoId: string) => {
    setVinculos((prev) => prev.filter((v) => v.id !== vinculoId));
    const { error } = await supabase
      .from(CONFIG_CRIATURA_SISTEMAS.tabla)
      .delete()
      .eq("id", vinculoId);
    if (error) console.error("[useCriaturaSistemas] error quitando vínculo:", error);
  }, []);

  return { items, loading, vincularExistente, actualizarProporcion, quitar, load };
}
