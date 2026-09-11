"use client";

/**
 * useComposicionDeUnOrganismo.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Resuelve TODOS los Órganos, Tejidos y Células alcanzables desde un
 * Organismo, atravesando la cadena completa vía Sistema:
 *   Organismo → organismo_sistemas → Sistema → sistema_organos → Órgano
 *                                                    → organo_tejidos → Tejido
 *                                                        → tejido_celulas → Célula
 * Mismo espíritu que useComposicionDeUnSistema, un nivel más arriba — para
 * completar el breadcrumb de 5 niveles parado en un Organismo
 * (Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo), donde "Célula",
 * "Tejido" y "Órgano" deben listar todo lo alcanzable a través de
 * CUALQUIERA de los Sistemas del Organismo.
 *
 * No incluye Órganos directos (organismo_organos, sin pasar por Sistema):
 * ese vínculo vive aparte en OrganismoPanelFlotante/useOrganismoOrganos y
 * no forma parte de la cadena fija de 5 niveles que expone el breadcrumb.
 *
 * No cachea en Dexie (solo lectura para un breadcrumb, no un catálogo editable).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_CELULAS,
  CONFIG_ORGANOS,
  CONFIG_TEJIDOS,
  CONFIG_TEJIDO_CELULAS,
  type Celula,
  type Organo,
  type Tejido,
  type TejidoCelula,
} from "@/domains/garlia/elementos/types";

interface VinculoOrganismoSistema {
  sistema_id: string;
}

interface VinculoSistemaOrgano {
  organo_id: string;
}

interface VinculoOrganoTejido {
  tejido_id: string;
}

export function useComposicionDeUnOrganismo(organismoId: string | null) {
  const [organos, setOrganos] = useState<Record<string, Organo>>({});
  const [tejidos, setTejidos] = useState<Record<string, Tejido>>({});
  const [celulas, setCelulas] = useState<Record<string, Celula>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organismoId) {
      setOrganos({});
      setTejidos({});
      setCelulas({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: osData, error: osError } = await supabase
      .from("organismo_sistemas")
      .select("sistema_id")
      .eq("organismo_id", organismoId);

    if (osError || !osData || osData.length === 0) {
      setOrganos({});
      setTejidos({});
      setCelulas({});
      setLoading(false);
      return;
    }
    const sistemaIds = Array.from(
      new Set((osData as unknown as VinculoOrganismoSistema[]).map((v) => v.sistema_id)),
    );

    const { data: soData } = await supabase
      .from("sistema_organos")
      .select("organo_id")
      .in("sistema_id", sistemaIds);
    const organoIds = Array.from(
      new Set(((soData ?? []) as unknown as VinculoSistemaOrgano[]).map((v) => v.organo_id)),
    );

    if (organoIds.length === 0) {
      setOrganos({});
      setTejidos({});
      setCelulas({});
      setLoading(false);
      return;
    }

    const { data: organoData } = await supabase
      .from(CONFIG_ORGANOS.tabla)
      .select(CONFIG_ORGANOS.select)
      .in("id", organoIds);
    const organosPorId: Record<string, Organo> = {};
    for (const o of (organoData ?? []) as unknown as Organo[]) organosPorId[o.id] = o;
    setOrganos(organosPorId);

    const { data: otData } = await supabase
      .from("organo_tejidos")
      .select("tejido_id")
      .in("organo_id", organoIds);
    const tejidoIds = Array.from(
      new Set(((otData ?? []) as unknown as VinculoOrganoTejido[]).map((v) => v.tejido_id)),
    );

    if (tejidoIds.length === 0) {
      setTejidos({});
      setCelulas({});
      setLoading(false);
      return;
    }

    const { data: tejidoData } = await supabase
      .from(CONFIG_TEJIDOS.tabla)
      .select(CONFIG_TEJIDOS.select)
      .in("id", tejidoIds);
    const tejidosPorId: Record<string, Tejido> = {};
    for (const t of (tejidoData ?? []) as unknown as Tejido[]) tejidosPorId[t.id] = t;
    setTejidos(tejidosPorId);

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
  }, [organismoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const organoItems = useMemo(() => Object.values(organos), [organos]);
  const tejidoItems = useMemo(() => Object.values(tejidos), [tejidos]);
  const celulaItems = useMemo(() => Object.values(celulas), [celulas]);

  return { organoItems, tejidoItems, celulaItems, loading };
}
