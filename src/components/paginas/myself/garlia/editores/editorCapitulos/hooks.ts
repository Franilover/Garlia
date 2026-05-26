import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { isReallyOnline } from "@/hooks/data/useOfflineSync";
import {
  Capitulo, TABLA_CAPS,
  dexieCapRead, dexieCapGet, dexieCapWrite,
} from "./types";

export function useCapitulos(libroId: string | null) {
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    const local = await dexieCapRead(id);
    if (local.length > 0) {
      setCapitulos(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!(await isReallyOnline())) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = supabase
        .from(TABLA_CAPS).select("*").eq("libro_id", id).order("orden", { ascending: true });
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(local.length === 0);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) {
        const isNetworkError =
          error?.message?.toLowerCase().includes("failed to fetch") ||
          error?.message?.toLowerCase().includes("network") ||
          error?.code === "PGRST000";
        if (isNetworkError) setIsOffline(true);
        setLoading(false);
        return;
      }
      const caps = (data || []) as Capitulo[];
      setCapitulos(caps);
      setIsOffline(false);
      await dexieCapWrite(caps.map((c) => ({ ...c, status: "synced" })));
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() ?? "";
      const isNetworkError =
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("load failed");
      setIsOffline(isNetworkError);
      if (local.length === 0) setCapitulos(await dexieCapRead(id));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (libroId) load(libroId);
    else { setCapitulos([]); setIsOffline(false); }
  }, [libroId, load]);

  useEffect(() => {
    const h = () => { if (libroId) { setIsOffline(false); load(libroId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [libroId, load]);

  return { capitulos, setCapitulos, loading, isOffline, reload: () => libroId && load(libroId) };
}

export function useCapituloEditor(capId: string | null) {
  const [cap, setCap]             = useState<Capitulo | null>(null);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    const local = await dexieCapGet(id);
    if (local) {
      setCap(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!(await isReallyOnline())) {
      setIsOffline(true);
      setLoading(false);
      return;
    }
    setIsOffline(false);

    try {
      const fetchPromise = supabase.from(TABLA_CAPS).select("*").eq("id", id).single();
      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result = await Promise.race([fetchPromise, timeout]);

      if (result === "timeout") {
        setIsOffline(!local);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) {
        const isNetworkError =
          error?.message?.toLowerCase().includes("failed to fetch") ||
          error?.message?.toLowerCase().includes("network") ||
          error?.code === "PGRST000";
        if (isNetworkError) setIsOffline(true);
        setLoading(false);
        return;
      }

      if (local?.status === "pending" && local.contenido !== data.contenido) {
        setCap({ ...data, contenido: local.contenido, status: "pending" });
      } else {
        setCap(data as Capitulo);
        await dexieCapWrite([{ ...data, status: "synced" }]);
      }
      setIsOffline(false);
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() ?? "";
      const isNetworkError =
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("load failed");
      setIsOffline(isNetworkError);
      if (!local) setCap(await dexieCapGet(id));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (capId) load(capId);
    else { setCap(null); setIsOffline(false); }
  }, [capId, load]);

  useEffect(() => {
    const h = () => { if (capId) { setIsOffline(false); load(capId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [capId, load]);

  return { cap, setCap, loading, isOffline, reload: () => capId && load(capId) };
}

export function useReinos() {
  const [reinos, setReinos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("reinos")
      .select("id, nombre")
      .eq("oculto", false)
      .order("nombre", { ascending: true })
      .then(({ data }) => {
        setReinos((data ?? []) as { id: string; nombre: string }[]);
        setLoading(false);
      });
  }, []);
  return { reinos, loading };
}
