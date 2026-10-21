"use client";

/**
 * useLaboratorioPropiedades.ts
 * ───────────────────────────────────────────────────────────────────────────
 * VIS-17 "Laboratorio", slice "Buscador por propiedad": el usuario elige
 * una o más propiedades del catálogo oficial (propiedades_derivadas ×
 * propiedades_catalogo_v3, es_oficial=true) con un mínimo (y opcionalmente
 * un máximo) deseado, y este hook pide a Supabase qué Compuestos o
 * Materiales del catálogo real las cumplen mejor.
 *
 * No calcula nada: delega el ranking a
 * sugerir_compuestos_por_propiedades / sugerir_materiales_por_propiedades_v3
 * vía laboratorioPropiedadesService — mismo principio que useCompuestoRoute
 * ("el motor determina qué estructura resulta", acá "qué combinación
 * resulta mejor", no un promedio inventado en el frontend).
 *
 * El catálogo de propiedades pedibles se trae de Supabase en vez de
 * hardcodear una lista: si se marca una propiedad nueva como oficial en
 * propiedades_catalogo_v3, aparece sola en el selector sin tocar este
 * archivo.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

import { sugerirPorPropiedades } from "./laboratorioPropiedadesService";
import {
  CONFIG_PROPIEDADES_CATALOGO_LAB,
  type EntidadLab,
  type PropiedadCatalogoLab,
  type RequisitoPropiedadLab,
  type SugerenciaPropiedadLab,
} from "./laboratorioPropiedades.types";

export function useLaboratorioPropiedades() {
  // ─── Catálogo oficial de propiedades pedibles ──────────────────────────
  const [catalogo, setCatalogo] = useState<PropiedadCatalogoLab[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoadingCatalogo(true);
    supabase
      .from(CONFIG_PROPIEDADES_CATALOGO_LAB.tabla)
      .select(
        // join contra propiedades_catalogo_v3: solo las marcadas oficiales
        // son las que las RPC realmente pueden matchear (ver `oficiales`
        // en la definición SQL de sugerir_*_por_propiedades).
        `${CONFIG_PROPIEDADES_CATALOGO_LAB.select}, propiedades_catalogo_v3!inner(es_oficial)`,
      )
      .eq("propiedades_catalogo_v3.es_oficial", true)
      .order("nombre")
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          console.error("[useLaboratorioPropiedades] error cargando catálogo:", error);
          setCatalogo([]);
        } else {
          setCatalogo((data as unknown as PropiedadCatalogoLab[]) ?? []);
        }
        setLoadingCatalogo(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // ─── Requisitos armados por el usuario ─────────────────────────────────
  const [requisitos, setRequisitos] = useState<RequisitoPropiedadLab[]>([]);

  const agregarRequisito = useCallback((clave: string) => {
    setRequisitos((prev) => {
      if (prev.some((r) => r.clave === clave)) return prev;
      return [...prev, { clave, min: null, max: null }];
    });
  }, []);

  const quitarRequisito = useCallback((clave: string) => {
    setRequisitos((prev) => prev.filter((r) => r.clave !== clave));
  }, []);

  const actualizarRequisito = useCallback(
    (clave: string, cambios: Partial<Pick<RequisitoPropiedadLab, "min" | "max">>) => {
      setRequisitos((prev) =>
        prev.map((r) => (r.clave === clave ? { ...r, ...cambios } : r)),
      );
    },
    [],
  );

  // ─── Entidad a rankear (Compuesto o Material) ──────────────────────────
  const [entidad, setEntidad] = useState<EntidadLab>("material");

  // ─── Resultados ─────────────────────────────────────────────────────────
  const [resultados, setResultados] = useState<SugerenciaPropiedadLab[]>([]);
  const [loadingResultados, setLoadingResultados] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscado, setBuscado] = useState(false);

  const requisitosValidos = useMemo(
    () => requisitos.filter((r) => r.min !== null || r.max !== null),
    [requisitos],
  );

  const buscar = useCallback(async () => {
    if (requisitosValidos.length === 0) {
      setResultados([]);
      setBuscado(true);
      setError("Elegí al menos una propiedad y un mínimo o máximo antes de buscar.");
      return;
    }
    setLoadingResultados(true);
    setError(null);
    try {
      const filas = await sugerirPorPropiedades(entidad, requisitosValidos, 25);
      setResultados(filas);
    } catch (e) {
      console.error("[useLaboratorioPropiedades] error buscando sugerencias:", e);
      setError("No se pudo consultar el laboratorio. Probá de nuevo en un momento.");
      setResultados([]);
    } finally {
      setLoadingResultados(false);
      setBuscado(true);
    }
  }, [entidad, requisitosValidos]);

  return {
    // catálogo de propiedades para el selector
    catalogo,
    loadingCatalogo,

    // requisitos armados
    requisitos,
    agregarRequisito,
    quitarRequisito,
    actualizarRequisito,
    requisitosValidos,

    // qué se está rankeando
    entidad,
    setEntidad,

    // resultados
    resultados,
    loadingResultados,
    error,
    buscado,
    buscar,
  };
}
