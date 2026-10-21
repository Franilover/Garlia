"use client";

/**
 * useComposicionDeUnSistema.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve TODOS los Tejidos y TODAS las Células alcanzables desde un
 * Sistema, atravesando la cadena completa:
 *   Sistema → sistema_organos → Órgano → organo_tejidos → Tejido
 *                                              → tejido_celulas → Célula
 * Mismo espíritu que useCelulasDeUnOrgano (unión sin duplicados, aunque un
 * mismo Tejido/Célula se repita en varios Órganos del Sistema), pero un
 * nivel más arriba — para completar el breadcrumb de 5 niveles parado en
 * un Sistema (Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo), donde
 * "Célula" y "Tejido" deben listar todo lo alcanzable a través de CUALQUIERA
 * de los Órganos del Sistema, no solo del primero.
 *
 * No cachea en Dexie (igual que useSistemasDeUnOrgano/useCelulasDeUnOrgano):
 * es de solo lectura para un breadcrumb, no un catálogo editable.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_CELULAS,
  CONFIG_TEJIDOS,
  CONFIG_TEJIDO_CELULAS,
  type Celula,
  type Tejido,
  type TejidoCelula,
} from "@/domains/garlia/elementos/types";

interface VinculoSistemaOrgano {
  organo_id: string;
}

interface VinculoOrganoTejido {
  organo_id: string;
  tejido_id: string;
}

export function useComposicionDeUnSistema(sistemaId: string | null) {
  const [tejidos, setTejidos] = useState<Record<string, Tejido>>({});
  const [celulas, setCelulas] = useState<Record<string, Celula>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!sistemaId) {
      setTejidos({});
      setCelulas({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: soData, error: soError } = await supabase
      .from("sistema_organos")
      .select("organo_id")
      .eq("sistema_id", sistemaId);

    if (soError || !soData || soData.length === 0) {
      setTejidos({});
      setCelulas({});
      setLoading(false);
      return;
    }
    const organoIds = Array.from(
      new Set((soData as unknown as VinculoSistemaOrgano[]).map((v) => v.organo_id)),
    );

    const { data: otData, error: otError } = await supabase
      .from("organo_tejidos")
      .select("organo_id, tejido_id")
      .in("organo_id", organoIds);

    if (otError || !otData || otData.length === 0) {
      setTejidos({});
      setCelulas({});
      setLoading(false);
      return;
    }
    const tejidoIds = Array.from(
      new Set((otData as unknown as VinculoOrganoTejido[]).map((v) => v.tejido_id)),
    );

    const { data: tejidoData } = await supabase
      .from(CONFIG_TEJIDOS.tabla)
      .select(CONFIG_TEJIDOS.select)
      .in("id", tejidoIds);
    const tejidosPorId: Record<string, Tejido> = {};
    for (const t of (tejidoData ?? []) as unknown as Tejido[]) tejidosPorId[t.id] = t;
    setTejidos(tejidosPorId);

    if (tejidoIds.length === 0) {
      setCelulas({});
      setLoading(false);
      return;
    }

    const { data: tcData } = await supabase
      .from(CONFIG_TEJIDO_CELULAS.tabla)
      .select(CONFIG_TEJIDO_CELULAS.select)
      .in("tejido_id", tejidoIds);

    const celulaIds = Array.from(
      new Set(((tcData ?? []) as unknown as TejidoCelula[]).map((v) => v.celula_id)),
    );
    if (celulaIds.length === 0) {
      setCelulas({});
      setLoading(false);
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
  }, [sistemaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tejidoItems = useMemo(() => Object.values(tejidos), [tejidos]);
  const celulaItems = useMemo(() => Object.values(celulas), [celulas]);

  return { tejidoItems, celulaItems, loading };
}
