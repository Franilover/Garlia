"use client";

/**
 * useSimuladorMaterial.ts
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-17 "Laboratorio", slice "Simulador de combinaciones" — un nivel
 * arriba del de Elemento→Compuesto: "si combino este Compuesto con este,
 * ¿qué Material resultaría?" Mismo patrón exacto que useSimuladorCompuesto,
 * cambiando el catálogo base (useCompuestos en vez de useElementos) y la
 * RPC (simular_material_desde_compuestos).
 *
 * Partes iguales únicamente, sin Estructura asociada (ver nota en la RPC y
 * en laboratorioPropiedades.types.ts) — mismo alcance acotado que el
 * simulador de Compuesto.
 */

import { useCallback, useMemo, useState } from "react";

import { useCompuestos } from "@/domains/garlia/elementos/useCompuestos";

import { simularMaterialDesdeCompuestos } from "./laboratorioPropiedadesService";
import type { ResultadoSimulacionMaterial } from "./laboratorioPropiedades.types";

export function useSimuladorMaterial() {
  const { items: compuestos, loading: loadingCompuestos } = useCompuestos();

  const [seleccionIds, setSeleccionIds] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoSimulacionMaterial | null>(null);
  const [loadingSimulacion, setLoadingSimulacion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seleccionados = useMemo(
    () => compuestos.filter((c) => seleccionIds.includes(c.id)),
    [compuestos, seleccionIds],
  );

  const disponibles = useMemo(
    () => compuestos.filter((c) => !seleccionIds.includes(c.id)),
    [compuestos, seleccionIds],
  );

  const agregarCompuesto = useCallback((id: string) => {
    setSeleccionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setResultado(null);
    setError(null);
  }, []);

  const quitarCompuesto = useCallback((id: string) => {
    setSeleccionIds((prev) => prev.filter((x) => x !== id));
    setResultado(null);
    setError(null);
  }, []);

  const limpiar = useCallback(() => {
    setSeleccionIds([]);
    setResultado(null);
    setError(null);
  }, []);

  const simular = useCallback(async () => {
    if (seleccionIds.length < 2) {
      setError("Elegí al menos 2 compuestos para simular un material.");
      return;
    }
    setLoadingSimulacion(true);
    setError(null);
    try {
      const r = await simularMaterialDesdeCompuestos(seleccionIds);
      if (r.estado !== "simulado") {
        setError(
          r.estado === "compuestos_inexistentes"
            ? "Alguno de los compuestos elegidos ya no existe en el catálogo."
            : "No se pudo simular esta combinación.",
        );
        setResultado(null);
      } else {
        setResultado(r);
      }
    } catch (e) {
      console.error("[useSimuladorMaterial] error simulando:", e);
      setError("No se pudo consultar el laboratorio. Probá de nuevo en un momento.");
      setResultado(null);
    } finally {
      setLoadingSimulacion(false);
    }
  }, [seleccionIds]);

  return {
    compuestos,
    loadingCompuestos,
    disponibles,
    seleccionados,
    seleccionIds,
    agregarCompuesto,
    quitarCompuesto,
    limpiar,
    simular,
    resultado,
    loadingSimulacion,
    error,
  };
}
