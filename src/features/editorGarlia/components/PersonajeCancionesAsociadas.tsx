"use client";

/**
 * PersonajeCancionesAsociadas.tsx
 * ────────────────────────────────
 * Hook `useCancionesDelPersonaje` + componente `PersonajeCancionesAsociadas`.
 * Lista las canciones asociadas a un personaje (por personaje_id, por su
 * propio id como canción, o por coincidencia de nombre en el título).
 *
 * Ruta destino:
 *   src/features/editorGarlia/components/PersonajeCancionesAsociadas.tsx
 */

import Image from "next/image";
import { Loader2, Music2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type CancionMin = {
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

    // 1. Dexie — usa el índice personaje_id (v23)
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

    // 2. Supabase: por personaje_id, por id o por título
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

// ─── Componente ───────────────────────────────────────────────────────────────
export function PersonajeCancionesAsociadas({
  personajeId,
  nombrePersonaje,
  onSelectCancion,
}: {
  personajeId: string;
  nombrePersonaje: string;
  onSelectCancion?: (id: string) => void;
}) {
  const { canciones, loading } = useCancionesDelPersonaje(
    personajeId,
    nombrePersonaje,
  );

  if (loading)
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="animate-spin text-primary/15" size={12} />
      </div>
    );

  if (!canciones.length)
    return (
      <p className="text-[7px] font-black text-primary/20 uppercase tracking-[0.2em] text-center py-3 italic">
        Sin canciones
      </p>
    );

  return (
    <div>
      {canciones.map((c) => (
        <button
          key={c.id}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/[0.04] transition-colors text-left group disabled:cursor-default cursor-pointer border-b border-primary/[0.04] last:border-0"
          disabled={!onSelectCancion}
          type="button"
          onClick={() => onSelectCancion?.(c.id)}
        >
          {c.portada_url ? (
            <div className="shrink-0 w-4 h-4 rounded overflow-hidden border border-primary/10">
              <Image
                alt={c.titulo}
                className="w-full h-full object-cover"
                src={c.portada_url}
              />
            </div>
          ) : (
            <Music2 className="shrink-0 text-primary/20" size={9} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-primary/70 truncate uppercase tracking-wide leading-tight group-hover:text-primary transition-colors">
              {c.titulo}
            </p>
            {c.cantante && (
              <p className="text-[7px] text-primary/25 truncate leading-tight">
                {c.cantante}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
