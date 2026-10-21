"use client";
import { useCallback, useEffect, useState } from "react";

import { descubrimientosQueries } from "./queries";
import type { TipoEntidadPublicable } from "./types";

/**
 * Hook para el botón "Publicar en Biblioteca" de un editor admin puntual
 * (ej. EditorCriatura, ElementoEditor, ItemEditor...). Un solo `entidadId`
 * a la vez — no es para listar, es para el toggle dentro del editor de UNA
 * entidad.
 *
 * Uso:
 *   const { publico, loading, toggle } = usePublicarDescubrimiento("criatura", criatura.id);
 *   <Btn onClick={toggle}>{publico ? "Quitar de Biblioteca" : "Publicar en Biblioteca"}</Btn>
 */
export function usePublicarDescubrimiento(
  tipo: TipoEntidadPublicable,
  entidadId: string | null | undefined,
) {
  const [publico, setPublico] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!entidadId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    descubrimientosQueries
      .listPublicadosIds(tipo)
      .then((ids) => {
        if (mounted) setPublico(ids.has(entidadId));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tipo, entidadId]);

  const toggle = useCallback(async () => {
    if (!entidadId || working) return;
    setWorking(true);
    try {
      if (publico) {
        await descubrimientosQueries.despublicar(tipo, entidadId);
        setPublico(false);
      } else {
        await descubrimientosQueries.publicar(tipo, entidadId);
        setPublico(true);
      }
    } finally {
      setWorking(false);
    }
  }, [tipo, entidadId, publico, working]);

  return { publico, loading, working, toggle };
}
