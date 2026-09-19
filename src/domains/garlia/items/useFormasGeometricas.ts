"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

/**
 * Catálogo de formas geométricas con ley de volumen activa, junto a sus
 * medidas de referencia (formas_geometricas_defaults.parametros_default).
 *
 * Solo se listan formas que:
 *  a) tienen una `leyes_geometricas` en estado 'activa' (si no, no hay forma
 *     de derivar volumen desde sus medidas — ej. "punto" no la tiene hoy), y
 *  b) tienen fila en `formas_geometricas_defaults` (si no, no hay medidas de
 *     referencia que ofrecer al elegirla).
 *
 * Verificado contra el proyecto real (migraciones
 * crear_formas_geometricas_defaults / autocompletar_geometria_por_forma_default):
 * el trigger de `items` autocompleta cualquier clave de
 * parametros_default que falte en items.geometria_fisica al guardar, así que
 * el frontend nunca necesita mandar las medidas si no quiere — basta con
 * {"forma": "<clave>"}.
 */
export interface FormaGeometrica {
  id: string;
  clave: string;
  nombre: string;
  /** Descripción canónica de formas_geometricas, solo presentación. */
  descripcion: string;
  /** Medidas de referencia ya en el formato que el motor espera en
   *  geometria_fisica (incluye unidad_longitud). Se usan como valor inicial
   *  editable en el formulario — nunca se le muestran al usuario como
   *  "unidad_longitud: longitud_u" literal, solo los números. */
  parametrosDefault: Record<string, number | string>;
  /** Claves numéricas de parametrosDefault, en el orden en que deben
   *  mostrarse como inputs (excluye cualquier clave "unidad_*"). */
  parametrosNumericos: string[];
}

const LABELS_PARAMETRO: Record<string, string> = {
  longitud: "Longitud",
  ancho: "Ancho",
  grosor: "Grosor",
  radio: "Radio",
};

export function labelParametro(clave: string): string {
  return LABELS_PARAMETRO[clave] ?? clave;
}

export function useFormasGeometricas() {
  const [formas, setFormas] = useState<FormaGeometrica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setLoading(true);

      const { data: leyesActivas, error: errorLeyes } = await supabase
        .from("leyes_geometricas")
        .select("forma_id")
        .eq("estado", "activa");

      if (errorLeyes || !leyesActivas) {
        console.error("[useFormasGeometricas] error cargando leyes geométricas:", errorLeyes);
        if (!cancelado) setLoading(false);
        return;
      }
      const idsConLeyActiva = new Set(leyesActivas.map((l) => l.forma_id as string));

      const { data: defaults, error: errorDefaults } = await supabase
        .from("formas_geometricas_defaults")
        .select("forma_id, parametros_default, formas_geometricas(id, clave, nombre)");

      if (errorDefaults || !defaults) {
        console.error("[useFormasGeometricas] error cargando defaults de forma:", errorDefaults);
        if (!cancelado) setLoading(false);
        return;
      }

      const resultado: FormaGeometrica[] = defaults
        .filter((fila: any) => idsConLeyActiva.has(fila.forma_id) && fila.formas_geometricas)
        .map((fila: any) => {
          const parametrosDefault = (fila.parametros_default ?? {}) as Record<string, number | string>;
          const parametrosNumericos = Object.keys(parametrosDefault).filter(
            (k) => !k.startsWith("unidad_") && typeof parametrosDefault[k] === "number",
          );
          return {
            id: fila.formas_geometricas.id,
            clave: fila.formas_geometricas.clave,
            nombre: fila.formas_geometricas.nombre,
            descripcion: fila.formas_geometricas.descripcion ?? "",
            parametrosDefault,
            parametrosNumericos,
          };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      if (!cancelado) {
        setFormas(resultado);
        setLoading(false);
      }
    }
    void cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  return { formas, loading };
}
