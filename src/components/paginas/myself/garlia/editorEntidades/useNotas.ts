import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { type Nota } from "./types";
import { loreReadAll, lorePut, loreDel, loreWriteAll } from "@/lib/api/client/loreDb";
import { enqueueOperation, isReallyOnline } from "@/hooks/data/useOfflineSync";

// ─── Hook principal ───────────────────────────────────────────────────────────
// Usa "notas_lore" como tabla Dexie para no colisionar con "notas" personal.
// Las operaciones offline se encolan en offline_queue → useOfflineSync las sube
// automáticamente cuando vuelve la conexión.

export function useNotas() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // 1. Cachear desde Dexie primero
    const local = await loreReadAll<Nota>("notas_lore");
    if (local.length) { setNotas(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }

    const { data, error } = await supabase
      .from("notas")
      .select("id, titulo, contenido, etiquetas, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[useNotas] Error al cargar notas:", error);
      if (!local.length) setLoading(false);
      return;
    }

    const result = (data ?? []) as Nota[];
    setNotas(result);
    setLoading(false);
    await loreWriteAll("notas_lore", result);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const crear = useCallback(async (titulo: string): Promise<Nota | null> => {
    const online = await isReallyOnline();

    if (!online) {
      // Crear offline con UUID temporal
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const nota: Nota = {
        id,
        titulo: titulo.trim(),
        contenido: "",
        updated_at: now,
        status: "pending",
      } as any;
      setNotas(prev => [nota, ...prev]);
      await lorePut("notas_lore", nota);
      await enqueueOperation("notas_lore", "upsert", id, {
        id,
        titulo: nota.titulo,
        contenido: "",
        updated_at: now,
      });
      return nota;
    }

    const { data, error } = await supabase
      .from("notas")
      .insert([{ titulo: titulo.trim(), contenido: "" }])
      .select("id, titulo, contenido, etiquetas, created_at, updated_at")
      .single();

    if (error || !data) {
      console.error("[useNotas] Error al crear nota:", error);
      return null;
    }

    const nota = data as Nota;
    setNotas(prev => [nota, ...prev]);
    await lorePut("notas_lore", nota);
    return nota;
  }, []);

  const actualizar = useCallback(async (nota: Nota): Promise<void> => {
    const now = new Date().toISOString();
    const updated = { ...nota, updated_at: now };

    // Optimistic update local siempre
    setNotas(prev => prev.map(n => n.id === nota.id ? updated : n));
    await lorePut("notas_lore", updated);

    const online = await isReallyOnline();

    if (!online) {
      // Encolar para sync cuando vuelva la conexión
      await enqueueOperation("notas_lore", "update", nota.id, {
        titulo:     nota.titulo,
        contenido:  nota.contenido ?? "",
        etiquetas:  nota.etiquetas ?? null,
        updated_at: now,
      });
      return;
    }

    const { error } = await supabase
      .from("notas")
      .update({
        titulo:    nota.titulo,
        contenido: nota.contenido ?? "",
        etiquetas: nota.etiquetas ?? null,
        updated_at: now,
      })
      .eq("id", nota.id);

    if (error) {
      console.error("[useNotas] Error al actualizar nota:", error);
      // Encolar igualmente por si fue un error transitorio
      await enqueueOperation("notas_lore", "update", nota.id, {
        titulo:     nota.titulo,
        contenido:  nota.contenido ?? "",
        etiquetas:  nota.etiquetas ?? null,
        updated_at: now,
      });
    }
  }, []);

  const eliminar = useCallback(async (id: string): Promise<void> => {
    // Optimistic: sacar de UI y Dexie inmediatamente
    setNotas(prev => prev.filter(n => n.id !== id));
    await loreDel("notas_lore", id);

    const online = await isReallyOnline();

    if (!online) {
      await enqueueOperation("notas_lore", "delete", id);
      return;
    }

    const { error } = await supabase.from("notas").delete().eq("id", id);
    if (error) {
      console.error("[useNotas] Error al eliminar nota:", error);
      // Encolar para reintentar
      await enqueueOperation("notas_lore", "delete", id);
    }
  }, []);

  return { notas, setNotas, loading, crear, actualizar, eliminar, refetch: load };
}