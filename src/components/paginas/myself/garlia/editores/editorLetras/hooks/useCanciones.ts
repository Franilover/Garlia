"use client";

import { useState, useEffect, useCallback } from "react";
import { cancionesQueries } from "@/lib/api/queries/garlia/canciones";
import { db } from "@/lib/api/client/db";
import type { Cancion } from "../types";

export function useCanciones() {
  const [canciones,  setCanciones] = useState<Cancion[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [isOffline,  setIsOffline] = useState(false);

  const readLocal = async (): Promise<Cancion[]> => {
    try {
      const table = (db as any)["canciones"];
      if (!table) return [];
      return (await table.toArray()).filter((r: any) => !r.deleted) as Cancion[];
    } catch { return []; }
  };

  const load = useCallback(async () => {
    const local = await readLocal();
    if (local.length > 0) {
      setCanciones(local);
      setLoading(false);
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = cancionesQueries.getAll();
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(local.length === 0);
        setLoading(false);
        return;
      }

      const data = result as unknown as Cancion[];
      setCanciones(data);
      try {
        const table = (db as any)["canciones"];
        if (table) await table.bulkPut(data.map(r => ({ ...r, status: "synced" })));
      } catch {}
    } catch {
      if (local.length === 0) setCanciones(await readLocal());
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const handleOnline = () => { setIsOffline(false); load(); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [load]);

  return { canciones, setCanciones, loading, isOffline, refetch: load };
}
