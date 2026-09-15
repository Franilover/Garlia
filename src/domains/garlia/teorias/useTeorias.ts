"use client";
import { useEffect, useState } from "react";

import { teoriasQueries } from "./queries";
import type { Teoria } from "./types";

export function useTeorias() {
  const [items, setItems] = useState<Teoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    teoriasQueries
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

  return { items, loading, refresh: () => teoriasQueries.listar().then(setItems) };
}
