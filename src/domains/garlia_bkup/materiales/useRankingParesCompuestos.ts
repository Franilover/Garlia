"use client";

/**
 * useRankingParesCompuestos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-17 "Laboratorio", slice "¿Qué combino para conseguir X?" — un nivel
 * arriba de useRankingParesElementos: elegís UNA propiedad y el hook trae
 * el top 20 de combinaciones de 2 Compuestos —de todo el catálogo real,
 * no una que armes a mano— que darían el Material resultante con el valor
 * más alto en esa propiedad. Ordenado de mayor a menor, listo para mostrar.
 *
 * No calcula nada acá: sugerir_pares_compuestos_por_propiedad ya evalúa
 * todos los C(n,2) pares del lado de Postgres con la misma fórmula de
 * promedio simple que usa simular_material_desde_compuestos, y devuelve
 * el ranking hecho.
 */

import { useCallback, useState } from "react";

import { sugerirParesCompuestosPorPropiedad } from "./laboratorioPropiedadesService";
import { PROPIEDADES_PAR_COMPUESTOS, type ParCompuestosSugerido } from "./laboratorioPropiedades.types";

export function useRankingParesCompuestos() {
  const [propiedad, setPropiedad] = useState<string>(PROPIEDADES_PAR_COMPUESTOS[0].clave);
  const [resultados, setResultados] = useState<ParCompuestosSugerido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscado, setBuscado] = useState(false);

  const buscar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filas = await sugerirParesCompuestosPorPropiedad(propiedad, 20);
      setResultados(filas);
    } catch (e) {
      console.error("[useRankingParesCompuestos] error buscando ranking:", e);
      setError("No se pudo consultar el laboratorio. Probá de nuevo en un momento.");
      setResultados([]);
    } finally {
      setLoading(false);
      setBuscado(true);
    }
  }, [propiedad]);

  return {
    propiedades: PROPIEDADES_PAR_COMPUESTOS,
    propiedad,
    setPropiedad,
    resultados,
    loading,
    error,
    buscado,
    buscar,
  };
}
