"use client";

import { useState, useEffect, useCallback } from "react";
import { cancionesQueries } from "@/lib/api/queries/wiki/canciones";
import { db } from "@/lib/api/client/db";
import { dexieSecRead, dexieSecWrite } from "../lib/seccionesDb";
import type { Cancion, Seccion } from "../types";

export function useCancionEditor(id: string | null) {
  const [cancion,   setCancion]   = useState<Cancion | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (cancionId: string) => {
    try {
      const cTable = (db as any)["canciones"];
      const base   = cTable ? await cTable.get(cancionId) : null;
      const secs   = await dexieSecRead(cancionId);
      if (base) {
        setCancion({ ...base, secciones: secs });
        setLoading(false);
      } else {
        setLoading(true);
      }
    } catch {}

    if (!navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = cancionesQueries.getById(cancionId);
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(true);
        setLoading(false);
        return;
      }

      const data = result as Cancion;
      setCancion(data);
      try {
        const cTable = (db as any)["canciones"];
        if (cTable) await cTable.put({ ...data, status: "synced" });
      } catch {}
      if (data?.secciones?.length) {
        await dexieSecWrite(data.secciones.map((s: Seccion) => ({ ...s, status: "synced" })));
      }
    } catch {
      try {
        const cTable = (db as any)["canciones"];
        const base   = cTable ? await cTable.get(cancionId) : null;
        const secs   = await dexieSecRead(cancionId);
        if (base) setCancion({ ...base, secciones: secs });
      } catch {}
      setIsOffline(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (id) load(id);
    else setCancion(null);
  }, [id, load]);

  useEffect(() => {
    const handleOnline = () => { if (id) { setIsOffline(false); load(id); } };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [id, load]);

  return { cancion, setCancion, loading, isOffline, reload: () => id && load(id) };
}
