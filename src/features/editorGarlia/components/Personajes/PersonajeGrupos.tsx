"use client";

/**
 * PersonajeGrupos.tsx
 * ────────────────────
 * Hook `useGruposDelPersonaje` + componente `PersonajeGrupos`.
 * Lista los grupos_mundo de tipo "personajes" en los que aparece el
 * personaje dado, con navegación directa al editor de grupos.
 *
 * Ruta destino:
 *   src/features/editorGarlia/components/PersonajeGrupos.tsx
 */

import { Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/api/client/supabase";
import { getGruposByTipo } from "@/lib/utils/criaturaCache";

// ─── Tipo ─────────────────────────────────────────────────────────────────────
type GrupoMin = { id: string; nombre: string; tipo: string };

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGruposDelPersonaje(personajeId: string): {
  grupos: GrupoMin[];
  loading: boolean;
} {
  const [grupos, setGrupos] = useState<GrupoMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Dexie — usar índice "tipo" en vez de toArray() completo
    try {
      const todosPersonajes = await getGruposByTipo("personajes");
      const local = todosPersonajes.filter((g: any) =>
        (g.miembro_ids ?? []).includes(personajeId),
      );
      if (local.length) {
        setGrupos(
          local.map((g: any) => ({
            id: g.id,
            nombre: g.nombre,
            tipo: g.tipo,
          })),
        );
        setLoading(false);
        if (!navigator.onLine) return;
      }
    } catch {}

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    // 2. Supabase
    try {
      const { data } = await supabase
        .from("grupos_mundo")
        .select("id, nombre, tipo")
        .eq("tipo", "personajes")
        .contains("miembro_ids", [personajeId]);
      setGrupos(
        (data ?? []).map((g: any) => ({
          id: g.id,
          nombre: g.nombre,
          tipo: g.tipo,
        })),
      );
    } catch {}
    setLoading(false);
  }, [personajeId]);

  useEffect(() => {
    load();
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
