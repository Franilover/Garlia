import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/api/client/supabase";
import type { Tables } from "@/lib/types/supabase";

// ── Tipos derivados de las tablas reales ──────────────────────────────────────

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
}

// ── Query ─────────────────────────────────────────────────────────────────────

export function useGlobalSearch(term: string) {
  const trimmed = term.trim();

  return useQuery<GlobalSearchResults>({
    queryKey: ["global-search", trimmed],
    queryFn: async (): Promise<GlobalSearchResults> => {
      if (trimmed.length < 2) {
        return { personajes: [], libros: [], canciones: [], reinos: [], criaturas: [], ciudades: [] };
      }

      const pattern = `%${trimmed}%`;

      const [personajes, libros, canciones, reinos, criaturas, ciudades] = await Promise.all([
        supabase
          .from("personajes")
          .select("id, nombre, especie, img_url")
          .ilike("nombre", pattern)
          .limit(4),

        supabase
          .from("libros")
          .select("id, titulo, portada_url, estado")
          .ilike("titulo", pattern)
          .eq("visibilidad", "publico")
          .limit(4),

        supabase
          .from("canciones")
          .select("id, titulo, cantante, portada_url")
          .ilike("titulo", pattern)
          .eq("visible", true)
          .limit(3),

        supabase
          .from("reinos")
          .select("id, nombre, logo_url")
          .ilike("nombre", pattern)
          .limit(3),

        supabase
          .from("criaturas")
          .select("id, nombre, imagen_url")
          .ilike("nombre", pattern)
          .limit(3),

        supabase
          .from("ciudades")
          .select("id, nombre, imagen_url")
          .ilike("nombre", pattern)
          .limit(3),
      ]);

      return {
        personajes: personajes.data ?? [],
        libros:     libros.data     ?? [],
        canciones:  canciones.data  ?? [],
        reinos:     reinos.data     ?? [],
        criaturas:  criaturas.data  ?? [],
        ciudades:   ciudades.data   ?? [],
      };
    },
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 30, // 30 seg — resultados de búsqueda se vuelven stale rápido
    placeholderData: { personajes: [], libros: [], canciones: [], reinos: [], criaturas: [], ciudades: [] },
  });
}