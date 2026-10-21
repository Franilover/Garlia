"use client";
import { useEffect, useState } from "react";

import { librosConocimientoQueries } from "./queries";
import type { LibroConocimiento } from "./types";

export function useLibrosConocimiento() {
  const [items, setItems] = useState<LibroConocimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    librosConocimientoQueries
      .listar()
      .then((data) => {
        if (mounted) setItems(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return {
    items,
    loading,
    refresh: () => librosConocimientoQueries.listar().then(setItems),
  };
}
