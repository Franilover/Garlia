"use client";

/**
 * PersonajeGrupos.tsx
 * ────────────────────
 * Hook `useGruposDelPersonaje` + componente `PersonajeGrupos`.
 *
 * ESTRATEGIA: Dexie primero (cero espera), Supabase en background.
 * ──────────────────────────────────────────────────────────────────
 * 1. Lee `grupos_mundo` de Dexie en el primer render → loading=false
 *    en <10 ms aunque no haya internet.
 * 2. Dispara un fetch a Supabase en background para actualizar Dexie
 *    y reflejar cambios remotos.
 * 3. Si Dexie está vacío (primera vez) muestra el spinner mientras
 *    espera a Supabase.
 *
 * Ruta destino:
 *   src/features/editorGarlia/components/PersonajeGrupos.tsx
 */

import { Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── Tipo ─────────────────────────────────────────────────────────────────────
type GrupoMin = { id: string; nombre: string; tipo: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lee grupos_mundo de Dexie y filtra por tipo "personajes". */
async function readGruposFromDexie(): Promise<any[]> {
  try {
    if (!db?.grupos_mundo) return [];
    const rows = await db.grupos_mundo
      .where("tipo")
      .equals("personajes")
      .toArray();
    return rows.filter((r: any) => !r.deleted);
  } catch {
    return [];
  }
}

/** Guarda/actualiza filas en Dexie (sin sobreescribir pendientes). */
async function writeGruposToDexie(rows: any[]): Promise<void> {
  try {
    if (!db?.grupos_mundo || rows.length === 0) return;
    // No sobreescribir filas con status "pending" (cambios offline locales)
    const local: any[] = await db.grupos_mundo.toArray();
    const pendingIds = new Set(
      local.filter((r: any) => r.status === "pending").map((r: any) => r.id),
    );
    const toWrite = rows
      .filter((r: any) => !pendingIds.has(r.id))
      .map((r: any) => ({ ...r, status: "synced" }));
    if (toWrite.length > 0) await db.grupos_mundo.bulkPut(toWrite);
  } catch (e) {
    console.warn("[PersonajeGrupos] No se pudo guardar en Dexie:", e);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGruposDelPersonaje(personajeId: string): {
  grupos: GrupoMin[];
  loading: boolean;
} {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const filterByPersonaje = useCallback(
    (rows: any[]): GrupoMin[] =>
      rows
        .filter((g: any) => (g.miembro_ids ?? []).includes(personajeId))
        .map((g: any) => ({ id: g.id, nombre: g.nombre, tipo: g.tipo })),
    [personajeId],
  );

  const load = useCallback(async () => {
    // ── 1. Dexie primero (instantáneo) ──────────────────────────────────────
    const localRows = await readGruposFromDexie();
    if (!isMounted.current) return;

    if (localRows.length > 0) {
      setGrupos(filterByPersonaje(localRows));
      setLoading(false); // ← listo para el usuario, sin esperar red
    }

    // ── 2. Supabase en background ────────────────────────────────────────────
    try {
      const { data, error } = await supabase
        .from("grupos_mundo")
        .select("id, nombre, tipo, miembro_ids")
        .eq("tipo", "personajes");

      if (error || !data) throw error ?? new Error("Sin datos");
      if (!isMounted.current) return;

      // Actualizar Dexie para la próxima vez (sin await, no bloqueamos UI)
      writeGruposToDexie(data).catch(() => {});

      setGrupos(filterByPersonaje(data));
    } catch {
      // Si falla la red pero ya teníamos datos de Dexie, no importa.
      // Si Dexie también estaba vacío, mostramos lista vacía.
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [personajeId, filterByPersonaje]);

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  return { grupos, loading };
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function PersonajeGrupos({
  personajeId,
  onOpenGrupo,
}: {
  personajeId: string;
  onOpenGrupo?: (id: string) => void;
}) {
  const { grupos, loading } = useGruposDelPersonaje(personajeId);

  if (loading)
    return (
      <div className="rounded-xl overflow-hidden border border-primary/10">
        <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
          <Users className="text-primary/25 shrink-0" size={8} />
          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
            Grupos
          </span>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-primary/20" size={14} />
        </div>
      </div>
    );

  if (!grupos.length) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-primary/10">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-primary/[0.06]">
        <Users className="text-primary/25 shrink-0" size={8} />
        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-primary/30 leading-none">
          Grupos
        </span>
      </div>
      <div>
        {grupos.map((g) => (
          <button
            key={g.id}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/[0.04] transition-colors text-left group border-b border-primary/[0.04] last:border-0"
            onClick={() => onOpenGrupo?.(g.id)}
          >
            <Users
              className="shrink-0 text-primary/20 group-hover:text-primary/40 transition-colors"
              size={8}
            />
            <span className="text-[8px] font-black uppercase tracking-wide text-primary/50 group-hover:text-primary/80 transition-colors truncate leading-tight">
              {g.nombre}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
