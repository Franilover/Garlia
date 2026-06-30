"use client";

/**
 * useCancionesDelPersonaje.ts
 * ────────────────────────────
 * Canciones asociadas a un personaje: por personaje_id, por su propio id,
 * o por coincidencia de nombre en el título.
 * Dexie primero → Supabase en background.
 *
 * Ruta: src/features/editorGarlia/hooks/useCancionesDelPersonaje.ts
 */

import { useCallback, useEffect, useState } from "react";

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── Tipo ─────────────────────────────────────────────────────────────────────

export type CancionMin = {
  id: string;
  titulo: string;
  cantante: string | null;
  portada_url: string | null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCancionesDelPersonaje(
  personajeId: string,
  nombrePersonaje: string,
): { canciones: CancionMin[]; loading: boolean } {
  const [canciones, setCanciones] = useState<CancionMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // ── 1. Dexie — índice personaje_id ────────────────────────────────────
    try {
      if (db) {
        const byId: any[] =
          (await (db as any).canciones
            ?.where("personaje_id")
            .equals(personajeId)
            .toArray()) ?? [];

        const nombre = nombrePersonaje?.trim().toLowerCase() ?? "";
        let byNombre: any[] = [];
        if (nombre && byId.length === 0) {
          const todas: any[] = (await (db as any).canciones?.toArray()) ?? [];
          byNombre = todas.filter(
            (c: any) =>
              c.id === personajeId ||
              (nombre && c.titulo?.toLowerCase().includes(nombre)),
          );
        }

        const filtered = byId.length > 0 ? byId : byNombre;
        if (filtered.length > 0) {
          setCanciones(
            filtered.map((c: any) => ({
              id: c.id,
              titulo: c.titulo ?? "Sin título",
              cantante: c.cantante ?? null,
              portada_url: c.portada_url ?? null,
            })),
          );
          setLoading(false);
          if (!navigator.onLine) return;
        }
      }
    } catch {}

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    // ── 2. Supabase: por personaje_id, por id o por título ────────────────
    try {
      const nombre = nombrePersonaje?.trim() ?? "";
      let query = supabase
        .from("canciones")
        .select("id, titulo, cantante, portada_url");

      if (nombre) {
        query = query.or(
          `personaje_id.eq.${personajeId},id.eq.${personajeId},titulo.ilike.%${nombre}%`,
        );
      } else {
        query = query.or(
          `personaje_id.eq.${personajeId},id.eq.${personajeId}`,
        );
      }

      const { data } = await query.order("titulo");
      setCanciones(
        (data ?? []).map((c: any) => ({
          id: c.id,
          titulo: c.titulo ?? "Sin título",
          cantante: c.cantante ?? null,
          portada_url: c.portada_url ?? null,
        })),
      );
    } catch {}

    setLoading(false);
  }, [personajeId, nombrePersonaje]);

  useEffect(() => {
    load();
  }, [load]);

  return { canciones, loading };
}
