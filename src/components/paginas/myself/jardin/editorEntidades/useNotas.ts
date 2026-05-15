import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { type Nota } from "./types";

// ─── Dexie helpers locales ────────────────────────────────────────────────────

async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch { return []; }
}

async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}

async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}

async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useNotas() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const local = await dexieReadAll<Nota>("notas");
    if (local.length) { setNotas(local); setLoading(false); }
    if (!navigator.onLine) { if (!local.length) setLoading(false); return; }

    const { data } = await supabase
      .from("notas")
      .select("id, titulo, contenido, etiquetas, created_at, updated_at")
      .order("updated_at", { ascending: false });

    const result = (data ?? []) as Nota[];
    setNotas(result);
    setLoading(false);
    await dexieWriteAll("notas", result);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const crear = useCallback(async (titulo: string): Promise<Nota | null> => {
    const { data, error } = await supabase
      .from("notas")
      .insert([{ titulo: titulo.trim(), contenido: "" }])
      .select("id, titulo, contenido, etiquetas, created_at, updated_at")
      .single();
    if (error || !data) return null;
    const nota = data as Nota;
    setNotas(prev => [nota, ...prev]);
    await dexiePut("notas", nota);
    return nota;
  }, []);

  const actualizar = useCallback(async (nota: Nota): Promise<void> => {
    const now = new Date().toISOString();
    const updated = { ...nota, updated_at: now };
    // Optimistic update
    setNotas(prev => prev.map(n => n.id === nota.id ? updated : n));
    await dexiePut("notas", updated);
    await supabase
      .from("notas")
      .update({
        titulo: nota.titulo,
        contenido: nota.contenido ?? "",
        etiquetas: nota.etiquetas ?? null,
        updated_at: now,
      })
      .eq("id", nota.id);
  }, []);

  const eliminar = useCallback(async (id: string): Promise<void> => {
    setNotas(prev => prev.filter(n => n.id !== id));
    await dexieDel("notas", id);
    await supabase.from("notas").delete().eq("id", id);
  }, []);

  return { notas, setNotas, loading, crear, actualizar, eliminar, refetch: load };
}
