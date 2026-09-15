"use client";
import { useEffect, useState } from "react";

import { descubrimientosQueries } from "./queries";
import type {
  EntidadDescubribleResuelta,
  TipoEntidadPublicable,
} from "./types";

/**
 * Trae las entidades publicadas de una categoría (puede ser más de un
 * tipo_entidad, ej. "Química" = elemento + compuesto + particula juntos).
 * Solo lectura — pensado para las páginas públicas de Biblioteca >
 * Descubrimientos.
 */
export function useDescubrimientosPublicados(tipos: TipoEntidadPublicable[]) {
  const [items, setItems] = useState<EntidadDescubribleResuelta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Los tipos vienen de un array literal en cada page.tsx (no cambia entre
  // renders en la práctica), pero por las dudas se usa join como key de
  // efecto para no depender de la identidad del array.
  const tiposKey = tipos.join(",");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    descubrimientosQueries
      .listPublicados(tipos)
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.message ?? "Error al cargar");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiposKey]);

  return { items, loading, error };
}
