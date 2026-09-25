"use client";

/**
 * useFisica.ts
 * ────────────────────────
 * Datos de la tab "Física": los 9 Oris + los bloques de conceptos, cada uno
 * en su propia tabla Supabase ("oris", "fisica_conceptos"). Mismo patrón
 * que useElementos.ts — useSupabaseData con select fijo y orden por
 * "orden".
 */

import { useMemo } from "react";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";

import {
  CONTEXTO_HUMANO_CONFIG,
  ENERGIAS_CONCEPTOS,
  FISICA_CONCEPTOS_CONFIG,
  IUMS_CONFIG,
  ORIS_CONFIG,
  PARTICULAS_BASE_CONFIG,
  PARTICULAS_CONFIG,
  POLARIDADES_CONFIG,
  TODOS_LOS_CONCEPTOS_ENERGIA,
  type ContextoHumano,
  type FisicaConcepto,
  type Ium,
  type Oris,
  type Particula,
  type ParticulaBase,
  type Polaridad,
} from "./types";

/** Trae las fichas de Eterium/Garin desde "contexto_humano" filtrando por
 *  concepto (identificador humano/canónico — ver comentario en types.ts),
 *  no por id fijo. Antes era un fetch directo sin cache, así que Energías
 *  esperaba el round-trip completo a Supabase en cada carga. Ahora usa
 *  useSupabaseData (misma tabla "contexto_humano" ya cacheada en Dexie,
 *  ver v50 en infra/supabase/db.ts): pinta primero lo que haya en Dexie
 *  (instantáneo, offline-first) y Supabase reemplaza esa copia en cuanto
 *  responde. El filtro por IN de la query vieja se reemplaza por un filtro
 *  en memoria sobre la tabla completa cacheada — sigue igual de barato
 *  (contexto_humano no es una tabla grande) y sin él perderíamos el
 *  cache-first para esta vista. Se sigue trayendo, además de Eterium/Garin,
 *  todos sus conceptos "Relacionados" (ETERIUM_RELACIONADOS/
 *  GARIN_RELACIONADOS/mixtos) — así el panel flotante puede resolverlos por
 *  nombre sin hacer un fetch nuevo cada vez que el usuario abre uno desde
 *  la lista de relacionados. */
export function useEnergias() {
  const { data, loading } = useSupabaseData<ContextoHumano>(
    CONTEXTO_HUMANO_CONFIG.tabla,
    { select: CONTEXTO_HUMANO_CONFIG.select },
  );

  const relevantes = useMemo(
    () =>
      data.filter((c) =>
        (TODOS_LOS_CONCEPTOS_ENERGIA as readonly string[]).includes(c.concepto),
      ),
    [data],
  );

  // Orden fijo (Eterium, Garin) según ENERGIAS_CONCEPTOS, no el orden que
  // devuelva Supabase/Dexie — mismo criterio visual que RamaLibres en el
  // Mapa Universal. El mapa completo (incluye relacionados) se guarda
  // aparte para el panel flotante.
  const porConcepto = useMemo(
    () => new Map(relevantes.map((c) => [c.concepto, c])),
    [relevantes],
  );

  const items = useMemo(
    () =>
      ENERGIAS_CONCEPTOS.map((nombre) => porConcepto.get(nombre)).filter(
        (c): c is ContextoHumano => !!c,
      ),
    [porConcepto],
  );

  return { items, porConcepto, loading };
}

export function usePolaridades() {
  const { data, setData, loading } = useSupabaseData<Polaridad>(POLARIDADES_CONFIG.tabla, {
    select: POLARIDADES_CONFIG.select,
    order: { campo: "orden" },
  });

  const items = useMemo(() => data, [data]);

  return { items, setItems: setData, loading };
}

export function useParticulasBase() {
  const { data, setData, loading } = useSupabaseData<ParticulaBase>(PARTICULAS_BASE_CONFIG.tabla, {
    select: PARTICULAS_BASE_CONFIG.select,
    order: { campo: "orden" },
  });

  const items = useMemo(() => data, [data]);

  return { items, setItems: setData, loading };
}

export function useIums() {
  // select ya no trae "composicion" (columna eliminada, Fase 4) — se
  // completa acá con [] para que el shape siga cumpliendo Ium. Para la
  // composición real, usar useIumsConParticulas().
  const { data, setData, loading } = useSupabaseData<Omit<Ium, "composicion">>(
    IUMS_CONFIG.tabla,
    {
      select: IUMS_CONFIG.select,
      order: { campo: "orden" },
    },
  );

  const items = useMemo<Ium[]>(
    () => data.map((i) => ({ ...i, composicion: [] })),
    [data],
  );

  return { items, setItems: setData, loading };
}

export function useParticulas() {
  const { data, setData, loading } = useSupabaseData<Particula>(PARTICULAS_CONFIG.tabla, {
    select: PARTICULAS_CONFIG.select,
    order: { campo: "orden" },
  });

  const items = useMemo(() => data, [data]);

  return { items, setItems: setData, loading };
}

export function useOris() {
  // select ya no trae "iums_composicion" (columna eliminada, Fase 3) — se
  // completa acá con {} para que el shape siga cumpliendo Oris. Para la
  // composición real, usar useOrisConIums().
  const { data, setData, loading } = useSupabaseData<Omit<Oris, "iums_composicion">>(
    ORIS_CONFIG.tabla,
    {
      select: ORIS_CONFIG.select,
      order: { campo: "orden" },
    },
  );

  const items = useMemo<Oris[]>(
    () => data.map((o) => ({ ...o, iums_composicion: {} })),
    [data],
  );

  return { items, setItems: setData, loading };
}

export function useFisicaConceptos() {
  const { data, setData, loading } = useSupabaseData<FisicaConcepto>(
    FISICA_CONCEPTOS_CONFIG.tabla,
    {
      select: FISICA_CONCEPTOS_CONFIG.select,
      order: { campo: "orden" },
    },
  );

  const items = useMemo(() => data, [data]);

  return { items, setItems: setData, loading };
}
