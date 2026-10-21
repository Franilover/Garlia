"use client";

/**
 * useVisibilidadDescubrimientos.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Visibilidad admin para las secciones de DescubrimientosPage.
 * Reutiliza las mismas tablas que useVisibilidadExplicacion:
 *   - `explicacion_visibilidad_maestro` → oculta/muestra toda una sección
 *   - `explicacion_visibilidad`         → oculta/muestra un item puntual
 *
 * Tipos soportados: particula | ium | ori | elemento | compuesto | proceso
 * (los mismos que renderiza DescubrimientosPage en el bloque de Física/Química)
 *
 * Regla de visibilidad (idéntica a useVisibilidadExplicacion):
 *   - Ausencia de fila → visible por defecto.
 *   - Maestro OCULTO + excepción individual VISIBLE → se muestra igual.
 *   - Maestro VISIBLE  + excepción individual OCULTA → se oculta.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/infra/supabase/supabase";

export type TipoEntidadDescubrimientos =
  | "particula"
  | "ium"
  | "ori"
  | "elemento"
  | "compuesto"
  | "proceso";

interface FilaIndividual {
  entidad_id: string;
  visible: boolean;
}

export function useVisibilidadDescubrimientos(
  tipo: TipoEntidadDescubrimientos,
) {
  const [maestroVisible, setMaestroVisible] = useState(true);
  const [individuales, setIndividuales] = useState<Map<string, boolean>>(
    new Map(),
  );
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

  const esVisible = useCallback(
    (entidadId: string) => {
      const excepcion = individuales.get(entidadId);
      if (excepcion !== undefined) return excepcion;
      return maestroVisible;
    },
    [individuales, maestroVisible],
  );

  const filtrarVisibles = useCallback(
    <T extends { id: string }>(items: T[]): T[] => {
      if (maestroVisible && individuales.size === 0) return items;
      return items.filter((it) => esVisible(it.id));
    },
    [esVisible, maestroVisible, individuales],
  );

  const toggleMaestro = useCallback(async () => {
    const nuevo = !maestroVisible;
    setMaestroVisible(nuevo);
    const { error } = await supabase
      .from("explicacion_visibilidad_maestro")
      .upsert({
        tipo_entidad: tipo,
        visible: nuevo,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      setMaestroVisible(!nuevo);
      console.error("[useVisibilidadDescubrimientos] toggleMaestro:", error);
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

      const { error } = await supabase
        .from("explicacion_visibilidad")
        .upsert(
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
          copia.set(entidadId, actual);
          return copia;
        });
        console.error(
          "[useVisibilidadDescubrimientos] toggleIndividual:",
          error,
        );
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
    [
      loading,
      maestroVisible,
      esVisible,
      filtrarVisibles,
      toggleMaestro,
      toggleIndividual,
    ],
  );
}
