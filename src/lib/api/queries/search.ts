import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";
import type { Tables } from "@/lib/types/supabase";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type SearchPersonaje = Pick<Tables<"personajes">, "id" | "nombre" | "especie" | "img_url">;
export type SearchLibro     = Pick<Tables<"libros">,     "id" | "titulo" | "portada_url" | "estado">;
export type SearchCancion   = Pick<Tables<"canciones">,  "id" | "titulo" | "cantante" | "portada_url">;
export type SearchReino     = Pick<Tables<"reinos">,     "id" | "nombre" | "logo_url">;
export type SearchCriatura  = Pick<Tables<"criaturas">,  "id" | "nombre" | "imagen_url">;
export type SearchCiudad    = Pick<Tables<"ciudades">,   "id" | "nombre" | "imagen_url">;

export interface GlobalSearchResults {
  personajes: SearchPersonaje[];
  libros:     SearchLibro[];
  canciones:  SearchCancion[];
  reinos:     SearchReino[];
  criaturas:  SearchCriatura[];
  ciudades:   SearchCiudad[];
  /** true = vino de Dexie (offline), false = vino de Supabase (online) */
  fromCache:  boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Filtra un array por nombre usando ilike (case-insensitive, con acento ignorado básico) */
function localFilter<T extends { nombre?: string; titulo?: string }>(
  items: T[],
  term: string,
  field: "nombre" | "titulo" = "nombre",
  limit = 4
): T[] {
  const lower = term.toLowerCase();
  return items
    .filter((item) => (item[field] ?? "").toLowerCase().includes(lower))
    .slice(0, limit);
}

// ── Búsqueda en Dexie (offline-first) ────────────────────────────────────────

async function searchDexie(term: string): Promise<GlobalSearchResults | null> {
  if (!db) return null;

  try {
    // Dexie no hace ilike nativo, pero toArray() + filter en JS es muy rápido
    // porque todo está en memoria/IndexedDB local
    const [personajes, libros, canciones, reinos, criaturas, ciudades] = await Promise.all([
      db.personajes.toArray(),
      db.libros.toArray(),
      db.canciones.toArray(),
      db.reinos.toArray(),
      db.criaturas.toArray(),
      db.ciudades.toArray(),
    ]);

    const results: GlobalSearchResults = {
      personajes: localFilter(personajes, term, "nombre", 4) as SearchPersonaje[],
      libros:     localFilter(libros,     term, "titulo", 4) as SearchLibro[],
      canciones:  localFilter(canciones,  term, "titulo", 3) as SearchCancion[],
      reinos:     localFilter(reinos,     term, "nombre", 3) as SearchReino[],
      criaturas:  localFilter(criaturas,  term, "nombre", 3) as SearchCriatura[],
      ciudades:   localFilter(ciudades,   term, "nombre", 3) as SearchCiudad[],
      fromCache: true,
    };

    // Si al menos una tabla tiene datos, consideramos Dexie válido
    const hasAnyData =
      personajes.length > 0 || libros.length > 0 ||
      canciones.length > 0  || reinos.length > 0;

    return hasAnyData ? results : null;
  } catch {
    return null;
  }
}

// ── Búsqueda en Supabase (fallback online) ────────────────────────────────────

async function searchSupabase(term: string): Promise<GlobalSearchResults> {
  const pattern = `%${term}%`;

  const [personajes, libros, canciones, reinos, criaturas, ciudades] = await Promise.all([
    supabase.from("personajes").select("id, nombre, especie, img_url").ilike("nombre", pattern).limit(4),
    supabase.from("libros").select("id, titulo, portada_url, estado").ilike("titulo", pattern).eq("visibilidad", "publico").limit(4),
    supabase.from("canciones").select("id, titulo, cantante, portada_url").ilike("titulo", pattern).eq("visible", true).limit(3),
    supabase.from("reinos").select("id, nombre, logo_url").ilike("nombre", pattern).limit(3),
    supabase.from("criaturas").select("id, nombre, imagen_url").ilike("nombre", pattern).limit(3),
    supabase.from("ciudades").select("id, nombre, imagen_url").ilike("nombre", pattern).limit(3),
  ]);

  return {
    personajes: personajes.data ?? [],
    libros:     libros.data     ?? [],
    canciones:  canciones.data  ?? [],
    reinos:     reinos.data     ?? [],
    criaturas:  criaturas.data  ?? [],
    ciudades:   ciudades.data   ?? [],
    fromCache:  false,
  };
}

// ── Query principal ───────────────────────────────────────────────────────────

export function useGlobalSearch(term: string) {
  const trimmed = term.trim();

  return useQuery<GlobalSearchResults>({
    queryKey: ["global-search", trimmed],

    queryFn: async (): Promise<GlobalSearchResults> => {
      if (trimmed.length < 2) {
        return { personajes: [], libros: [], canciones: [], reinos: [], criaturas: [], ciudades: [], fromCache: false };
      }

      // 1️⃣ Intentar Dexie primero (instantáneo, offline)
      const dexieResults = await searchDexie(trimmed);
      if (dexieResults) return dexieResults;

      // 2️⃣ Fallback a Supabase (red, online)
      return searchSupabase(trimmed);
    },

    enabled: trimmed.length >= 2,
    staleTime: 1000 * 60 * 2,   // 2 min — Dexie es tan rápido que no hace falta invalidar seguido
    placeholderData: { personajes: [], libros: [], canciones: [], reinos: [], criaturas: [], ciudades: [], fromCache: false },
  });
}