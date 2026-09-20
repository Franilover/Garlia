"use client";

/**
 * useComposicionDeOrganismos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Versión PLURAL de useComposicionDeUnOrganismo: dado un array de
 * organismo_id (los Organismos de una Criatura — ver useCriaturaOrganismos),
 * resuelve la unión de TODOS los Sistemas, Órganos, Tejidos y Células
 * alcanzables desde CUALQUIERA de ellos:
 *
 *   Criatura → Organismo(s) → organismo_sistemas → Sistema(s)
 *                                → sistema_organos → Órgano(s)
 *                                    → organo_tejidos → Tejido(s)
 *                                        → tejido_celulas → Célula(s)
 *
 * Es la mitad DESCENDENTE del pedido "desde la Criatura poder bajar hasta
 * Célula sin pasar nivel por nivel". La mitad ascendente (Célula → … →
 * Criatura) vive en useCriaturasDeOrganismos.
 *
 *   Célula ⇄ Tejido ⇄ Órgano ⇄ Sistema ⇄ Organismo ⇄ Criatura
 *
 * A diferencia de useComposicionDeUnOrganismo, también devuelve los
 * Sistemas (ese hook los omitía porque su panel ya los tenía por otra vía).
 *
 * No incluye Órganos directos (organismo_organos, sin pasar por Sistema),
 * igual que useComposicionDeUnOrganismo: esa cadena vive aparte.
 *
 * No cachea en Dexie: solo lectura para un breadcrumb, no un catálogo
 * editable.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

import {
  CONFIG_CELULAS,
  CONFIG_ORGANOS,
  CONFIG_SISTEMAS,
  CONFIG_TEJIDOS,
  CONFIG_TEJIDO_CELULAS,
  type Celula,
  type Organo,
  type Sistema,
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

export function useComposicionDeOrganismos(organismoIds: string[]) {
  const [sistemas, setSistemas] = useState<Record<string, Sistema>>({});
  const [organos, setOrganos] = useState<Record<string, Organo>>({});
  const [tejidos, setTejidos] = useState<Record<string, Tejido>>({});
  const [celulas, setCelulas] = useState<Record<string, Celula>>({});
  const [loading, setLoading] = useState(true);

  // Clave estable: un array nuevo con el mismo contenido no dispara refetch.
  const key = organismoIds.slice().sort().join(",");

  const load = useCallback(async () => {
    function vaciar() {
      setSistemas({});
      setOrganos({});
      setTejidos({});
      setCelulas({});
    }

    if (organismoIds.length === 0) {
      vaciar();
      setLoading(false);
      return;
    }
    setLoading(true);

    // Organismo → Sistema
    const { data: osData, error: osError } = await supabase
      .from("organismo_sistemas")
      .select("sistema_id")
      .in("organismo_id", organismoIds);

    if (osError || !osData || osData.length === 0) {
      vaciar();
      setLoading(false);
      return;
    }
    const sistemaIds = Array.from(
      new Set((osData as unknown as VinculoOrganismoSistema[]).map((v) => v.sistema_id)),
    );

    const { data: sistemaData } = await supabase
      .from(CONFIG_SISTEMAS.tabla)
      .select(CONFIG_SISTEMAS.select)
      .in("id", sistemaIds);
    const sistemasPorId: Record<string, Sistema> = {};
    for (const s of (sistemaData ?? []) as unknown as Sistema[]) sistemasPorId[s.id] = s;
    setSistemas(sistemasPorId);

    // Sistema → Órgano
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

    // Órgano → Tejido
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

    // Tejido → Célula
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  const sistemaItems = useMemo(() => Object.values(sistemas), [sistemas]);
  const organoItems = useMemo(() => Object.values(organos), [organos]);
  const tejidoItems = useMemo(() => Object.values(tejidos), [tejidos]);
  const celulaItems = useMemo(() => Object.values(celulas), [celulas]);

  return { sistemaItems, organoItems, tejidoItems, celulaItems, loading };
}
