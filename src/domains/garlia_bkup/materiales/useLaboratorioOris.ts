"use client";

/**
 * useLaboratorioOris.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Slice "Oris" del grupo Lab (Worldbuilder) — simulador de cuánto Eterium
 * se necesita para activar un Oris, a una intensidad elegida, y si un
 * organismo elegido lo puede cubrir con su Eterium libre actual.
 *
 * Ambas listas (Oris con demanda ya calculada, organismos con su estado de
 * Eterium) vienen tal cual de Supabase (laboratorioOrisService) — este hook
 * solo selecciona y compara, no recalcula la fórmula E_req.
 */

import { useEffect, useMemo, useState } from "react";

import { listarOrganismosEterium, listarOrisDemandaEterium } from "./laboratorioOrisService";
import type {
  OrganismoEstadoEterium,
  OrisDemandaEterium,
  SimulacionDemandaOris,
} from "./laboratorioOris.types";

type IntensidadPct = 25 | 50 | 75 | 100;

function demandaSegunIntensidad(oris: OrisDemandaEterium, pct: IntensidadPct): number {
  switch (pct) {
    case 25:
      return oris.demanda25;
    case 50:
      return oris.demanda50;
    case 75:
      return oris.demanda75;
    case 100:
      return oris.demanda100;
  }
}

export function useLaboratorioOris() {
  const [orisList, setOrisList] = useState<OrisDemandaEterium[]>([]);
  const [loadingOris, setLoadingOris] = useState(true);
  const [organismos, setOrganismos] = useState<OrganismoEstadoEterium[]>([]);
  const [loadingOrganismos, setLoadingOrganismos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoadingOris(true);
    listarOrisDemandaEterium()
      .then((rows) => {
        if (!cancelado) setOrisList(rows);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelado) setLoadingOris(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    setLoadingOrganismos(true);
    listarOrganismosEterium()
      .then((rows) => {
        if (!cancelado) setOrganismos(rows);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelado) setLoadingOrganismos(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const [orisSelId, setOrisSelId] = useState<string | null>(null);
  const [organismoSelId, setOrganismoSelId] = useState<string | null>(null);
  const [intensidadPct, setIntensidadPct] = useState<IntensidadPct>(100);

  // Autoselección del primer Oris disponible — mismo criterio que el resto
  // del Visualizador/Lab (nunca queda "nada seleccionado" si hay datos).
  useEffect(() => {
    if (!orisSelId && orisList.length > 0) setOrisSelId(orisList[0].orisId);
  }, [orisList, orisSelId]);

  const orisSel = useMemo(
    () => orisList.find((o) => o.orisId === orisSelId) ?? null,
    [orisList, orisSelId],
  );

  const organismoSel = useMemo(
    () => organismos.find((o) => o.organismoId === organismoSelId) ?? null,
    [organismos, organismoSelId],
  );

  const simulacion = useMemo<SimulacionDemandaOris | null>(() => {
    if (!orisSel) return null;
    const demandaEterium = demandaSegunIntensidad(orisSel, intensidadPct);
    const disponible = organismoSel?.cantidadSLibre ?? null;
    const factible = organismoSel ? disponible !== null && disponible >= demandaEterium : null;
    const faltante =
      organismoSel && disponible !== null && disponible < demandaEterium
        ? demandaEterium - disponible
        : null;
    return {
      oris: orisSel,
      intensidadPct,
      demandaEterium,
      organismo: organismoSel,
      factible,
      faltante,
    };
  }, [orisSel, organismoSel, intensidadPct]);

  return {
    loading: loadingOris || loadingOrganismos,
    error,

    orisList,
    orisSelId,
    setOrisSelId,
    orisSel,

    organismos,
    organismoSelId,
    setOrganismoSelId,
    organismoSel,

    intensidadPct,
    setIntensidadPct,

    simulacion,
  };
}
