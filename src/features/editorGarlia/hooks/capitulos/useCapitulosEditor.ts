import { useState, useEffect, useCallback } from "react";

import type {
  Capitulo,
  Reino} from "@/components/forms/lexical-editor/types";
import {
  TABLA_CAPS,
  dexieCapRead,
  dexieCapGet,
  dexieCapWrite,
} from "@/components/forms/lexical-editor/types";
import { isReallyOnline } from "@/hooks/data/useOfflineSync";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";


// ─── Tipos locales ─────────────────────────────────────────────────────────────

// Extiende Capitulo con el campo de sync que ya existe en Dexie pero faltaba en
// la interfaz base. Usar este tipo evita todos los `(loc as any)?.status`.
type CapituloLocal = Capitulo & { status?: "pending" | "synced" };

// Token de cancelación pasado por referencia: se puede marcar como cancelado
// desde el cleanup del useEffect ANTES de que load() resuelva, eliminando la
// race condition que existía al retornar la función de cancelación desde dentro
// del propio async y capturarla con `await`.
interface Signal {
  cancelled: boolean;
}

// ─── Utilidades compartidas ────────────────────────────────────────────────────

/** Detecta si un error de Supabase o de fetch es un error de red. */
function isNetErr(err: any): boolean {
  const msg = (err?.message ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    err?.code === "PGRST000"
  );
}

/** Crea una Promise que resuelve a "timeout" tras `ms` milisegundos. */
const withTimeout = <T>(ms: number) =>
  new Promise<"timeout">((r) => setTimeout(() => r("timeout"), ms));

// ─── useCapitulos ─────────────────────────────────────────────────────────────

export function useCapitulos(libroId: string | null) {
  const [capitulos, setCapitulos] = useState<CapituloLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // load() recibe un Signal externo en lugar de crear el suyo propio e intentar
  // retornarlo. Así el cleanup del useEffect puede cancelar inmediatamente, sin
  // depender de que la Promise haya resuelto primero.
  const load = useCallback(async (id: string, sig: Signal) => {
    const local = (await dexieCapRead(id)) as CapituloLocal[];
    if (sig.cancelled) return;

    if (local.length > 0) {
      // Datos locales disponibles: mostrar inmediatamente y lanzar fetch en
      // background sin bloquear en isReallyOnline() (~200 ms de red real).
      setCapitulos(local);
      setLoading(false);
    } else {
      // Sin datos locales: comprobar conectividad antes de poner al usuario
      // frente a una pantalla vacía con spinner indefinido.
      setLoading(true);
      if (!(await isReallyOnline())) {
        if (sig.cancelled) return;
        setIsOffline(true);
        setLoading(false);
        return;
      }
    }
    if (sig.cancelled) return;

    try {
      const result = await Promise.race([
        supabase
          .from(TABLA_CAPS)
          .select("*")
          .eq("libro_id", id)
          .order("orden", { ascending: true }),
        withTimeout(5000),
      ]);
      if (sig.cancelled) return;

      if (result === "timeout") {
        setIsOffline(local.length === 0);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) {
        if (isNetErr(error)) setIsOffline(true);
        setLoading(false);
        return;
      }

      const caps = (data ?? []) as CapituloLocal[];
      const localById = new Map(local.map((c) => [c.id, c]));

      // Respetar borradores pending: no sobreescribir con la versión remota.
      const merged = caps.map((remote) => {
        const loc = localById.get(remote.id);
        return loc?.status === "pending" ? loc : remote;
      });

      if (!sig.cancelled) {
        setCapitulos(merged);
        setIsOffline(false);
      }

      // Persistir en Dexie conservando los pending sin tocar.
      await dexieCapWrite(
        caps.map((c) => {
          const loc = localById.get(c.id);
          return loc?.status === "pending"
            ? loc
            : { ...c, status: "synced" as const };
        }),
      );
    } catch (err: any) {
      if (sig.cancelled) return;
      setIsOffline(isNetErr(err));
      // Fallback: releer Dexie solo si no teníamos nada en memoria.
      if (local.length === 0) {
        setCapitulos((await dexieCapRead(id)) as CapituloLocal[]);
      }
    }

    if (!sig.cancelled) setLoading(false);
  }, []);

  useEffect(() => {
    if (!libroId) {
      setCapitulos([]);
      setIsOffline(false);
      return;
    }
    // El Signal vive aquí: el cleanup lo marca como cancelado sincrónicamente,
    // antes de que load() pueda hacer ningún setState tras el desmonte.
    const sig: Signal = { cancelled: false };
    void load(libroId, sig);
    return () => {
      sig.cancelled = true;
    };
  }, [libroId, load]);

  useEffect(() => {
    const h = () => {
      if (libroId) {
        setIsOffline(false);
        // Cada llamada desde el evento "online" tiene su propio Signal efímero;
        // no necesita cancelarse porque no hay cleanup asociado.
        void load(libroId, { cancelled: false });
      }
    };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [libroId, load]);

  return {
    capitulos,
    setCapitulos,
    loading,
    isOffline,
    reload: () => libroId && load(libroId, { cancelled: false }),
  };
}

// ─── useCapituloEditor ────────────────────────────────────────────────────────

export function useCapituloEditor(capId: string | null) {
  const [cap, setCap] = useState<CapituloLocal | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async (id: string, sig: Signal) => {
    let local: CapituloLocal | null = null;
    try {
      local = (await dexieCapGet(id)) as CapituloLocal | null;
    } catch (e) {
      console.warn("[Dexie] dexieCapGet falló:", e);
    }
    if (sig.cancelled) return;

    if (local) {
      // Datos locales disponibles: mostrar inmediatamente y lanzar fetch en
      // background sin bloquear en isReallyOnline() (~200 ms de red real).
      setCap(local);
      setLoading(false);
    } else {
      // Sin datos locales: comprobar conectividad antes de mostrar spinner vacío.
      setLoading(true);
      if (!(await isReallyOnline())) {
        if (sig.cancelled) return;
        setIsOffline(true);
        setLoading(false);
        return;
      }
    }
    if (sig.cancelled) return;

    try {
      const result = await Promise.race([
        supabase.from(TABLA_CAPS).select("*").eq("id", id).single(),
        withTimeout(5000),
      ]);
      if (sig.cancelled) return;

      if (result === "timeout") {
        setIsOffline(!local);
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) {
        if (isNetErr(error)) setIsOffline(true);
        setLoading(false);
        return;
      }

      if (local?.status === "pending" && local.contenido !== data.contenido) {
        // Conservar borrador local no sincronizado; NO sobreescribir Dexie.
        if (!sig.cancelled)
          setCap({ ...data, contenido: local.contenido, status: "pending" });
      } else {
        if (!sig.cancelled) setCap(data as CapituloLocal);
        await dexieCapWrite([{ ...data, status: "synced" as const }]);
      }

      if (!sig.cancelled) setIsOffline(false);
    } catch (err: any) {
      if (sig.cancelled) return;
      setIsOffline(isNetErr(err));
      // Fallback solo si no teníamos nada en estado (evitar parpadeo).
      if (!local) {
        try {
          const fallback = (await dexieCapGet(id)) as CapituloLocal | null;
          if (!sig.cancelled && fallback) setCap(fallback);
        } catch {}
      }
    }

    if (!sig.cancelled) setLoading(false);
  }, []);

  useEffect(() => {
    if (!capId) {
      setCap(null);
      setIsOffline(false);
      return;
    }
    const sig: Signal = { cancelled: false };
    void load(capId, sig);
    return () => {
      sig.cancelled = true;
    };
  }, [capId, load]);

  useEffect(() => {
    const h = () => {
      if (capId) {
        setIsOffline(false);
        void load(capId, { cancelled: false });
      }
    };
    window.addEventListener("online", h);
    return () => window.removeEventListener("online", h);
  }, [capId, load]);

  return {
    cap,
    setCap,
    loading,
    isOffline,
    reload: () => capId && load(capId, { cancelled: false }),
  };
}

// ─── useReinos ────────────────────────────────────────────────────────────────

export function useReinos() {
  const [reinos, setReinos] = useState<Pick<Reino, "id" | "nombre">[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // 1. Leer Dexie primero — db.reinos es Table<Reino, string>, sin cast.
      let hasLocal = false;
      try {
        const local = await db.reinos.orderBy("nombre").toArray();
        if (!cancelled && local.length > 0) {
          setReinos(local.map(({ id, nombre }) => ({ id, nombre })));
          setLoading(false);
          hasLocal = true;
        }
      } catch (e) {
        console.warn("[Dexie] reinos.toArray falló:", e);
      }

      // 2. Sin datos locales: verificar conectividad antes de dejar al usuario
      //    frente a un spinner vacío. Con datos locales, el fetch va directo.
      if (!hasLocal) {
        const online = await isReallyOnline();
        if (cancelled) return;
        if (!online) {
          setIsOffline(true);
          setLoading(false);
          return;
        }
      }
      if (cancelled) return;

      // 3. Fetch remoto (en background si había local, bloqueante si no había)
      try {
        const { data, error } = await supabase
          .from("reinos")
          .select("id, nombre")
          .order("nombre", { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        const rows = (data ?? []) as Pick<Reino, "id" | "nombre">[];
        setReinos(rows);
        setIsOffline(false);
        setLoading(false);

        // 4. Persistir en Dexie — merge con campos locales para no perder
        //    descripcion, orden, mapa_url, etc.
        const existing = await db.reinos
          .where("id")
          .anyOf(rows.map((r) => r.id))
          .toArray();
        const existingById = new Map(existing.map((r) => [r.id, r]));

        await db.reinos.bulkPut(
          rows.map((r) => ({
            ...existingById.get(r.id),
            ...r,
          })),
        );
      } catch {
        if (!cancelled) {
          setIsOffline(true);
          setLoading(false);
        }
      }
    };

    void run();

    const handleOnline = () => {
      setIsOffline(false);
      void run();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return { reinos, loading, isOffline };
}
