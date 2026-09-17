"use client";

/**
 * useRankingParesElementos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-17 "Laboratorio", slice "¿Qué combino para conseguir X?": elegís UNA
 * propiedad (dureza, transparencia, etc.) y el hook trae el top 20 de
 * combinaciones de 2 Elementos —de todo el catálogo real, no una que armes
 * a mano— que darían el compuesto resultante con el valor más alto en esa
 * propiedad. Ordenado de mayor a menor, listo para mostrar.
 *
 * No calcula nada acá: sugerir_pares_elementos_por_propiedad ya evalúa
 * todos los C(n,2) pares del lado de Postgres con la fórmula real de
 * compuesto y devuelve el ranking hecho.
 */

import { useCallback, useState } from "react";

import { sugerirParesElementosPorPropiedad } from "./laboratorioPropiedadesService";
import { PROPIEDADES_PAR_ELEMENTOS, type ParElementosSugerido } from "./laboratorioPropiedades.types";

export function useRankingParesElementos() {
  const [propiedad, setPropiedad] = useState<string>(PROPIEDADES_PAR_ELEMENTOS[0].clave);
  const [resultados, setResultados] = useState<ParElementosSugerido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscado, setBuscado] = useState(false);

  const buscar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filas = await sugerirParesElementosPorPropiedad(propiedad, 20);
      setResultados(filas);
    } catch (e) {
      console.error("[useRankingParesElementos] error buscando ranking:", e);
      setError("No se pudo consultar el laboratorio. Probá de nuevo en un momento.");
      setResultados([]);
    } finally {
      setLoading(false);
      setBuscado(true);
    }
  }, [propiedad]);

  return {
    propiedades: PROPIEDADES_PAR_ELEMENTOS,
    propiedad,
    setPropiedad,
    resultados,
    loading,
    error,
    buscado,
    buscar,
  };
}
