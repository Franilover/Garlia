/**
 * interpretacionHumana.ts
 *
 * Único adaptador frontend para la interpretación humana canónica.
 *
 * Fuente de verdad:
 *   v_frontend_escritor_propiedades_interpretadas
 *
 * El frontend NO interpreta valores, NO aplica umbrales y NO lee
 * propiedades_emergentes.interpretacion_humana. Solo consume el resultado
 * que Supabase ya resolvió para cualquier entidad.
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

export type EntidadHumanaTipo = "elemento" | "compuesto" | "material" | "objeto";

export interface InterpretacionHumanaFila {
  entidad_tipo: EntidadHumanaTipo;
  entidad_id: string;
  entidad_nombre: string;
  propiedad_id: string;
  propiedad_clave: string;
  propiedad_nombre: string;
  descripcion: string | null;
  utilidad_narrativa: string | null;
  grupo_presentacion: string | null;
  categoria_presentacion: string | null;
  tipo_presentacion: string;
  modo_visualizacion: string;
  condicional: boolean;
  visible_escritor: boolean;
  orden_escritor: number;
  tipo_valor: string | null;
  rango_min: number | null;
  rango_max: number | null;
  unidad_clave: string | null;
  unidad_nombre: string | null;
  unidad_simbolo: string | null;
  categoria_clave: string | null;
  categoria_nombre: string | null;
  tags: string[];
  valor: string | null;
  estado_valor: string;
  estado_presentacion: string;
  valor_mostrable: boolean;
  fuente_canonica: string | null;
  interpretacion_humana: {
    valor?: number;
    nivel?: string;
    significado?: string;
    propiedad?: string;
    fuente?: string;
  } | null;
}

export interface InterpretacionHumana {
  nivel: string;
  significado: string;
  valor?: number;
  propiedad: string;
}

/**
 * Normaliza nombres internos/compatibilidad a la clave pública que usa el
 * catálogo de interpretación humana.
 */
export function claveHumanaCanonica(clave: string): string {
  switch (clave) {
    case "masa_base":
      return "masa";
    case "volumen_base":
      return "volumen";
    case "carga_q":
    case "carga":
      return "carga_neta";
    case "dureza":
      return "dureza_compuesto";
    case "conductividad":
      return "conductividad_compuesto";
    case "transparencia":
      return "transparencia_compuesto";
    case "interaccion":
      return "interaccion_compuesto";
    case "resistencia_efectiva":
      return "resistencia";
    default:
      return clave;
  }
}

export function indexarInterpretacionesHumanas(
  filas: InterpretacionHumanaFila[],
): Record<string, InterpretacionHumana> {
  const result: Record<string, InterpretacionHumana> = {};

  for (const fila of filas) {
    const h = fila.interpretacion_humana;
    if (!h?.nivel || !h.significado) continue;

    const clave = claveHumanaCanonica(fila.propiedad_clave);
    result[clave] = {
      nivel: h.nivel,
      significado: h.significado,
      valor: typeof h.valor === "number" ? h.valor : undefined,
      propiedad: h.propiedad ?? clave,
    };
  }

  return result;
}

export function interpretacionParaClave(
  interpretaciones: Record<string, InterpretacionHumana>,
  clave: string,
): InterpretacionHumana | undefined {
  return interpretaciones[claveHumanaCanonica(clave)];
}

export function useInterpretacionHumana(
  entidadTipo: EntidadHumanaTipo,
  entidadId: string | null | undefined,
): {
  filas: InterpretacionHumanaFila[];
  porClave: Record<string, InterpretacionHumana>;
  loading: boolean;
  error: string | null;
} {
  const [filas, setFilas] = useState<InterpretacionHumanaFila[]>([]);
  const [loading, setLoading] = useState(Boolean(entidadId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (!entidadId) {
        setFilas([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("v_frontend_escritor_propiedades_interpretadas")
        .select("*")
        .eq("entidad_tipo", entidadTipo)
        .eq("entidad_id", entidadId)
        .eq("visible_escritor", true)
        .order("orden_escritor")
        .order("propiedad_clave");

      if (cancelado) return;

      if (supabaseError) {
        setFilas([]);
        setError(supabaseError.message);
      } else {
        setFilas((data ?? []) as InterpretacionHumanaFila[]);
      }
      setLoading(false);
    }

    void cargar();

    return () => {
      cancelado = true;
    };
  }, [entidadTipo, entidadId]);

  const porClave = useMemo(() => indexarInterpretacionesHumanas(filas), [filas]);

  return { filas, porClave, loading, error };
}
