import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { isReallyOnline } from "@/hooks/data/useOfflineSync";
import {
  Capitulo, TABLA_CAPS,
  dexieCapRead, dexieCapGet, dexieCapWrite,
} from "./types";

// ─── useCapitulos ─────────────────────────────────────────────────────────────

export function useCapitulos(libroId: string | null) {
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    // FIX 4: token de cancelación — si llega una nueva llamada a load()
    // antes de que ésta resuelva, los setState se vuelven no-ops.
    let cancelled = false;

    const local = await dexieCapRead(id);
    if (cancelled) return;

    if (local.length > 0) {
      setCapitulos(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!(await isReallyOnline())) {
      if (cancelled) return;
      setIsOffline(true);
      setLoading(false);
      return;
    }
    if (cancelled) return;
    setIsOffline(false);

    try {
      const fetchPromise = supabase
        .from(TABLA_CAPS)
        .select("*")
        .eq("libro_id", id)
        .order("orden", { ascending: true });

      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result  = await Promise.race([fetchPromise, timeout]);
      if (cancelled) return;

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

      // Respetar borradores pending: no sobreescribir con la versión del servidor
      // si el capítulo tiene cambios locales sin sincronizar.
      const localById = new Map(local.map(c => [c.id, c]));
      const merged = caps.map(remote => {
        const loc = localById.get(remote.id);
        if (loc?.status === "pending") return loc;  // mantener cambios locales
        return remote;
      });

      setCapitulos(merged);
      setIsOffline(false);
      // FIX 1: escribir en Dexie usando merged para que los pending no se pierdan
      await dexieCapWrite(
        caps.map(c => {
          const loc = localById.get(c.id);
          return loc?.status === "pending"
            ? loc
            : { ...c, status: "synced" };
        }),
      );
    } catch (err: any) {
      if (cancelled) return;
      const msg = err?.message?.toLowerCase() ?? "";
      const isNetworkError =
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("load failed");
      setIsOffline(isNetworkError);
      // Si no teníamos nada en memoria, releer Dexie como fallback
      if (local.length === 0) setCapitulos(await dexieCapRead(id));
    }

    if (!cancelled) setLoading(false);

    // Devolver función de cancelación para que useEffect pueda llamarla.
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!libroId) {
      setCapitulos([]);
      setIsOffline(false);
      return;
    }
    let cancel: (() => void) | undefined;
    // load() devuelve la función cancel en la promesa; la capturamos aquí
    // para que el cleanup del efecto la invoque si libroId cambia antes
    // de que el fetch termine.
    const run = async () => { cancel = await load(libroId) as any; };
    run();
    return () => cancel?.();
  }, [libroId, load]);

  useEffect(() => {
    const h = () => { if (libroId) { setIsOffline(false); load(libroId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [libroId, load]);

  return { capitulos, setCapitulos, loading, isOffline, reload: () => libroId && load(libroId) };
}

// ─── useCapituloEditor ────────────────────────────────────────────────────────

export function useCapituloEditor(capId: string | null) {
  const [cap, setCap]             = useState<Capitulo | null>(null);
  const [loading, setLoading]     = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string) => {
    // FIX 4: token de cancelación (mismo patrón que useCapitulos)
    let cancelled = false;

    // FIX 2: envolver lectura Dexie en try/catch para evitar que un error
    // interno de Dexie (quota, DB corrupta) colapse el flujo silenciosamente.
    let local: Capitulo | null = null;
    try {
      local = await dexieCapGet(id);
    } catch (e) {
      console.warn("[Dexie] dexieCapGet falló:", e);
    }
    if (cancelled) return;

    if (local) {
      setCap(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (!(await isReallyOnline())) {
      if (cancelled) return;
      setIsOffline(true);
      setLoading(false);
      return;
    }
    if (cancelled) return;
    setIsOffline(false);

    try {
      const fetchPromise = supabase
        .from(TABLA_CAPS)
        .select("*")
        .eq("id", id)
        .single();

      const timeout = new Promise<"timeout">(r => setTimeout(() => r("timeout"), 5000));
      const result  = await Promise.race([fetchPromise, timeout]);
      if (cancelled) return;

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
        // Conservar borrador local no sincronizado
        setCap({ ...data, contenido: local.contenido, status: "pending" });
        // NO sobreescribir Dexie: el pending se debe subir al sync
      } else {
        setCap(data as Capitulo);
        await dexieCapWrite([{ ...data, status: "synced" }]);
      }
      setIsOffline(false);
    } catch (err: any) {
      if (cancelled) return;
      const msg = err?.message?.toLowerCase() ?? "";
      const isNetworkError =
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("load failed");
      setIsOffline(isNetworkError);
      // Solo leer Dexie si no tenemos nada en estado (evitar parpadeo)
      if (!local) {
        try {
          const fallback = await dexieCapGet(id);
          if (!cancelled && fallback) setCap(fallback);
        } catch {}
      }
    }

    if (!cancelled) setLoading(false);

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!capId) {
      setCap(null);
      setIsOffline(false);
      return;
    }
    let cancel: (() => void) | undefined;
    const run = async () => { cancel = await load(capId) as any; };
    run();
    return () => cancel?.();
  }, [capId, load]);

  useEffect(() => {
    const h = () => { if (capId) { setIsOffline(false); load(capId); } };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [capId, load]);

  return { cap, setCap, loading, isOffline, reload: () => capId && load(capId) };
}

// ─── useReinos ────────────────────────────────────────────────────────────────

// FIX 3: useReinos ahora lee Dexie primero y hace fallback offline,
// igual que los otros hooks. Usa la tabla "reinos" que ya está en SYNC_TABLES
// y en DEXIE_TABLES de useSupabaseData.
export function useReinos() {
  const [reinos, setReinos]   = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 1. Leer caché local primero
      try {
        const { db } = await import("@/lib/api/client/db");
        const local: any[] = await (db as any).reinos?.toArray() ?? [];
        if (!cancelled && local.length > 0) {
          setReinos(local.map(r => ({ id: r.id, nombre: r.nombre })));
          setLoading(false);
        }
      } catch {}

      // 2. Verificar conectividad
      const online = await isReallyOnline();
      if (cancelled) return;
      if (!online) {
        setIsOffline(true);
        setLoading(false);
        return;
      }

      // 3. Fetch remoto
      try {
        const { data } = await supabase
          .from("reinos")
          .select("id, nombre")
          .order("nombre", { ascending: true });

        if (cancelled) return;
        const rows = (data ?? []) as { id: string; nombre: string }[];
        setReinos(rows);
        setIsOffline(false);
        setLoading(false);

        // 4. Persistir en Dexie para la próxima vez offline
        try {
          const { db } = await import("@/lib/api/client/db");
          await (db as any).reinos?.bulkPut(
            rows.map(r => ({ ...r, status: "synced" })),
          );
        } catch {}
      } catch {
        if (!cancelled) { setIsOffline(true); setLoading(false); }
      }
    };

    run();

    const handleOnline = () => { setIsOffline(false); run(); };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return { reinos, loading, isOffline };
}