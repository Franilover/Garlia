"use client";

/**
 * useVisibilidadExplicacion.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Visibilidad admin para las galerías de /garlia/universo/explicacion.
 * Dos niveles, independientes pero combinados:
 *
 *   1. MAESTRO por tipo_entidad ("particula" | "elemento" | ...):
 *      un switch que oculta TODA la sección de golpe.
 *      Tabla: explicacion_visibilidad_maestro (1 fila por tipo).
 *
 *   2. INDIVIDUAL por entidad (tipo_entidad + entidad_id):
 *      oculta/muestra un item puntual. Sirve tanto para ocultar
 *      excepciones sueltas como para, con el maestro apagado, dejar
 *      "prendida" una excepción (ver esVisible: el maestro apagado NO
 *      pisa una excepción individual marcada explícitamente visible).
 *      Tabla: explicacion_visibilidad (ya existía, genérica para todo
 *      el proyecto — no solo esta página).
 *
 * Reglas de visibilidad pública (mismo espíritu que
 * domains/garlia/libros/utils/filtrarVisibilidad.ts — filtro único,
 * ausencia de fila = visible por defecto):
 *
 *   - Si el maestro del tipo está VISIBLE (o no existe fila → default true):
 *       → visible, salvo que exista una fila individual con visible=false.
 *   - Si el maestro del tipo está OCULTO:
 *       → oculto, salvo que exista una fila individual con visible=true
 *         (excepción explícita para "mostrar igual este uno").
 *
 * Un solo hook por tipo de entidad; se usa una vez en cada Etapa
 * (EtapaPolaridades → "particula", EtapaElementos → "elemento").
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

export type TipoEntidadVisibilidad =
  | "particula"
  | "elemento"
  | "compuesto"
  | "estructura"
  | "material"
  | "objeto";

interface FilaIndividual {
  entidad_id: string;
  visible: boolean;
}

export function useVisibilidadExplicacion(tipo: TipoEntidadVisibilidad) {
  const [maestroVisible, setMaestroVisible] = useState(true);
  const [individuales, setIndividuales] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const [maestroRes, individualesRes] = await Promise.all([
      supabase
        .from("explicacion_visibilidad_maestro")
        .select("visible")
        .eq("tipo_entidad", tipo)
        .maybeSingle(),
      supabase
        .from("explicacion_visibilidad")
        .select("entidad_id, visible")
        .eq("tipo_entidad", tipo),
    ]);

    // Ausencia de fila maestro → default visible (mismo criterio que
    // filtrarVisibilidad.ts: fallback siempre hacia "se muestra").
    setMaestroVisible(maestroRes.data?.visible ?? true);

    const mapa = new Map<string, boolean>();
    for (const fila of (individualesRes.data ?? []) as FilaIndividual[]) {
      mapa.set(fila.entidad_id, fila.visible);
    }
    setIndividuales(mapa);
    setLoading(false);
  }, [tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Visibilidad efectiva de una entidad puntual, combinando maestro + individual. */
  const esVisible = useCallback(
    (entidadId: string) => {
      const excepcion = individuales.get(entidadId);
      if (excepcion !== undefined) return excepcion;
      return maestroVisible;
    },
    [individuales, maestroVisible],
  );

  /** Filtra un arreglo de items (con id) dejando solo los visibles — para el público. */
  const filtrarVisibles = useCallback(
    <T extends { id: string }>(items: T[]): T[] => {
      if (maestroVisible && individuales.size === 0) return items; // camino rápido, sin excepciones
      return items.filter((it) => esVisible(it.id));
    },
    [esVisible, maestroVisible, individuales],
  );

  const toggleMaestro = useCallback(async () => {
    const nuevo = !maestroVisible;
    setMaestroVisible(nuevo); // optimista
    const { error } = await supabase
      .from("explicacion_visibilidad_maestro")
      .upsert({ tipo_entidad: tipo, visible: nuevo, updated_at: new Date().toISOString() });
    if (error) {
      setMaestroVisible(!nuevo); // revertir si falló
      console.error("[useVisibilidadExplicacion] toggleMaestro:", error);
    }
  }, [maestroVisible, tipo]);

  const toggleIndividual = useCallback(
    async (entidadId: string) => {
      const actual = esVisible(entidadId);
      const nuevo = !actual;

      setIndividuales((prev) => {
        const copia = new Map(prev);
        copia.set(entidadId, nuevo);
        return copia;
      });

      const { error } = await supabase.from("explicacion_visibilidad").upsert(
        {
          tipo_entidad: tipo,
          entidad_id: entidadId,
          visible: nuevo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tipo_entidad,entidad_id" },
      );

      if (error) {
        setIndividuales((prev) => {
          const copia = new Map(prev);
          copia.set(entidadId, actual); // revertir
          return copia;
        });
        console.error("[useVisibilidadExplicacion] toggleIndividual:", error);
      }
    },
    [esVisible, tipo],
  );

  return useMemo(
    () => ({
      loading,
      maestroVisible,
      esVisible,
      filtrarVisibles,
      toggleMaestro,
      toggleIndividual,
    }),
    [loading, maestroVisible, esVisible, filtrarVisibles, toggleMaestro, toggleIndividual],
  );
}
