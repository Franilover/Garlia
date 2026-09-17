"use client";

/**
 * useSimuladorCompuesto.ts
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-17 "Laboratorio", slice "Simulador de combinaciones": "si combino
 * este Elemento con este, ¿qué Compuesto resultaría y con qué
 * propiedades?" — sin crear nada, es una previsualización.
 *
 * Usa el catálogo real de Elementos (useElementos, ya existente en el
 * proyecto) para elegir qué combinar, y delega el cálculo a la RPC
 * simular_compuesto_desde_elementos vía laboratorioPropiedadesService —
 * misma fórmula que el motor usaría si el Compuesto existiera de verdad.
 *
 * Partes iguales únicamente en este slice (sin control de proporción por
 * elemento) — si más adelante se pide ajustar proporciones, este hook es
 * el lugar natural para sumar esa opción sin tocar el service ni la RPC
 * (que ya recibe cantidades vía la tabla real; acá se puede extender a un
 * array de {elemento_id, cantidad} el día que haga falta).
 */

import { useCallback, useMemo, useState } from "react";

import { useElementos } from "@/domains/garlia/elementos/useElementos";

import { simularCompuestoDesdeElementos } from "./laboratorioPropiedadesService";
import type { ResultadoSimulacionCompuesto } from "./laboratorioPropiedades.types";

export function useSimuladorCompuesto() {
  const { items: elementos, loading: loadingElementos } = useElementos();

  const [seleccionIds, setSeleccionIds] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoSimulacionCompuesto | null>(null);
  const [loadingSimulacion, setLoadingSimulacion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seleccionados = useMemo(
    () => elementos.filter((e) => seleccionIds.includes(e.id)),
    [elementos, seleccionIds],
  );

  const disponibles = useMemo(
    () => elementos.filter((e) => !seleccionIds.includes(e.id)),
    [elementos, seleccionIds],
  );

  const agregarElemento = useCallback((id: string) => {
    setSeleccionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    // cambiar la combinación invalida el resultado anterior — evita mostrar
    // un compuesto simulado que ya no corresponde a lo seleccionado.
    setResultado(null);
    setError(null);
  }, []);

  const quitarElemento = useCallback((id: string) => {
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
      setError("Elegí al menos 2 elementos para simular un compuesto.");
      return;
    }
    setLoadingSimulacion(true);
    setError(null);
    try {
      const r = await simularCompuestoDesdeElementos(seleccionIds);
      if (r.estado !== "simulado") {
        setError(
          r.estado === "elementos_inexistentes"
            ? "Alguno de los elementos elegidos ya no existe en el catálogo."
            : "No se pudo simular esta combinación.",
        );
        setResultado(null);
      } else {
        setResultado(r);
      }
    } catch (e) {
      console.error("[useSimuladorCompuesto] error simulando:", e);
      setError("No se pudo consultar el laboratorio. Probá de nuevo en un momento.");
      setResultado(null);
    } finally {
      setLoadingSimulacion(false);
    }
  }, [seleccionIds]);

  return {
    elementos,
    loadingElementos,
    disponibles,
    seleccionados,
    seleccionIds,
    agregarElemento,
    quitarElemento,
    limpiar,
    simular,
    resultado,
    loadingSimulacion,
    error,
  };
}
