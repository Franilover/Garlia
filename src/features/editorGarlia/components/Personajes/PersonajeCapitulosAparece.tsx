"use client";

/**
 * PersonajeCapitulosAparece.tsx
 * ─────────────────────────────
 * Hook `useCapitulosConPersonaje` + componente `PersonajeCapitulosAparece`.
 * Muestra la lista de capítulos en los que aparece un personaje dado,
 * con navegación directa al capítulo via localStorage + evento.
 *
 * Ruta destino:
 *   src/features/editorGarlia/components/PersonajeCapitulosAparece.tsx
 */

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/api/client/supabase";
import { getLibroMap } from "@/lib/utils/criaturaCache";
import { db } from "@/lib/api/client/db";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type CapAparece = {
  id: string;
  orden: number;
  titulo_capitulo: string;
  libro_titulo?: string | null;
  libro_id?: string | null;
};

// Cache en memoria para no re-escanear Dexie si ya cargamos este personaje.
// TTL corto: evita el costo de Dexie en navegaciones repetidas, pero sin
// quedarse pegada indefinidamente si Supabase tarda en sincronizar.
const _capsCache = new Map<string, { caps: CapAparece[]; ts: number }>();
const CAPS_TTL_MS = 30_000;

function mapCap(c: any, libroMap: Record<string, string>): CapAparece {
  return {
    id: c.id,
    orden: c.orden ?? 0,
    titulo_capitulo: c.titulo_capitulo ?? "Sin título",
    libro_titulo: libroMap[c.libro_id] ?? null,
    libro_id: c.libro_id ?? null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCapitulosConPersonaje(personajeId: string): {
  caps: CapAparece[];
  loading: boolean;
} {
  const cached = _capsCache.get(personajeId);
  const cacheVigente = cached && Date.now() - cached.ts < CAPS_TTL_MS;
  const [caps, setCaps] = useState<CapAparece[]>(
    cacheVigente ? cached!.caps : [],
  );
  const [loading, setLoading] = useState(!cacheVigente);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const cachedNow = _capsCache.get(personajeId);
      const vigente = cachedNow && Date.now() - cachedNow.ts < CAPS_TTL_MS;

      // 1. Dexie (stale-while-revalidate) — solo si no hay caché vigente
      if (!vigente) {
        try {
          if (db) {
            const [allCaps, libroMap] = await Promise.all([
              (db as any).capitulos?.toArray() ?? [],
              getLibroMap(),
            ]);
            if (cancelled) return;
            const filtered = (allCaps as any[])
              .filter((c: any) =>
                (c.personajes_ids ?? []).includes(personajeId),
              )
              .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
              .map((c: any) => mapCap(c, libroMap));
            if (filtered.length > 0) {
              setCaps(filtered);
            }
            setLoading(false);
            if (!navigator.onLine) return;
          }
        } catch {
          setLoading(false);
        }
      }

      if (!navigator.onLine) {
        setLoading(false);
        return;
      }

      // 2. Supabase en background (actualiza sin spinner)
      try {
        const { data, error } = await supabase
          .from("capitulos")
          .select(
            "id, orden, titulo_capitulo, libro_id, libros!libro_id(titulo)",
          )
          .contains("personajes_ids", [personajeId])
          .order("orden");
        if (error) throw error;
        if (cancelled) return;
        const fresh = (data ?? []).map((c: any) => ({
          id: c.id,
          orden: c.orden ?? 0,
          titulo_capitulo: c.titulo_capitulo ?? "Sin título",
          libro_titulo:
            (Array.isArray(c.libros)
              ? c.libros[0]?.titulo
              : c.libros?.titulo) ?? null,
          libro_id: c.libro_id ?? null,
        }));
        _capsCache.set(personajeId, { caps: fresh, ts: Date.now() });
        setCaps(fresh);
      } catch {
        // Si falló Supabase, no actualizamos el ts de la caché: así el
        // próximo montaje reintentará en vez de quedarse pegado.
      }
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [personajeId]);

  return { caps, loading };
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function PersonajeCapitulosAparece({
  personajeId,
}: {
  personajeId: string;
}) {
  const { caps, loading } = useCapitulosConPersonaje(personajeId);

  const navigateToCap = (cap: CapAparece) => {
    if (!cap.libro_id) return;
    localStorage.setItem("estudio-caps-last-cap", cap.id);
    localStorage.setItem("estudio-caps-last-libro", cap.libro_id);
    window.dispatchEvent(new Event("estudio-caps-action"));
  };

  if (loading)
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="animate-spin text-primary/15" size={12} />
      </div>
    );

  if (!caps.length)
    return (
      <p className="text-[7px] font-black text-primary/20 uppercase tracking-[0.2em] text-center py-3 italic">
        Sin apariciones
      </p>
    );

  return (
    <div>
      {caps.map((cap) => (
        <button
          key={cap.id}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/[0.04] transition-colors text-left group disabled:opacity-40 disabled:cursor-default cursor-pointer border-b border-primary/[0.04] last:border-0"
          disabled={!cap.libro_id}
          type="button"
          onClick={() => navigateToCap(cap)}
        >
          <span className="shrink-0 text-[7px] font-black tabular-nums text-accent/50 w-4 text-right leading-none">
            {cap.orden}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-primary/70 truncate uppercase tracking-wide leading-tight group-hover:text-primary transition-colors">
              {cap.titulo_capitulo}
            </p>
            {cap.libro_titulo && (
              <p className="text-[7px] text-primary/25 truncate leading-tight">
                {cap.libro_titulo}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
