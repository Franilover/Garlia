"use client";

/**
 * useFiltrosEstructuras.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Datos de SOLO LECTURA que necesitan los filtros de la biblioteca de
 * Estructuras (Tipo / Función / Geometría / Tags) para resolver, en memoria,
 * qué Forma geométrica y qué Tags tiene cada estructura — sin pedir una
 * query por estructura. Mismo espíritu que useCompuestoTags: se traen las
 * relaciones de TODO el catálogo de una vez.
 *
 *  - Tags:       tabla "tags" (catálogo global) + "estructura_tags"
 *                (many-to-many, PK compuesta estructura_id+tag_id).
 *  - Geometría:  "estructura_geometrias" (1 fila por estructura_id) →
 *                "formas_geometricas" (nombre de la Forma: prisma, esfera…).
 *
 * El "tipo" y la "función" NO necesitan hook propio: son columnas directas
 * de "estructuras" (tipo: naturaleza de la estructura; funcion: texto libre
 * que se normaliza a su primera palabra clave en EstructurasPage).
 *
 * 2026-09-20: nuevo — canon Micro/Macro/Patrones + filtros combinables.
 */

import { useMemo } from "react";

import { useSupabaseData } from "@/infra/sync/useSupabaseData";

interface TagFiltro {
  id: string;
  nombre: string;
  categoria: string;
}

interface EstructuraTagRel {
  estructura_id: string;
  tag_id: string;
}

interface GeometriaRel {
  estructura_id: string;
  geometria_id: string;
}

interface FormaRel {
  id: string;
  nombre: string;
}

export function useFiltrosEstructuras() {
  const { data: tags, loading: loadingTags } = useSupabaseData<TagFiltro>("tags", {
    select: "id, nombre, categoria",
    order: { campo: "nombre" },
  });
  const { data: rels, loading: loadingRels } = useSupabaseData<EstructuraTagRel>(
    "estructura_tags",
    { select: "estructura_id, tag_id" },
  );
  const { data: geoms, loading: loadingGeoms } = useSupabaseData<GeometriaRel>(
    "estructura_geometrias",
    { select: "estructura_id, geometria_id" },
  );
  const { data: formas, loading: loadingFormas } = useSupabaseData<FormaRel>(
    "formas_geometricas",
    { select: "id, nombre", order: { campo: "nombre" } },
  );

  /** estructura_id → set de tag_id asignados. */
  const tagIdsPorEstructura = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const r of rels) {
      if (!mapa.has(r.estructura_id)) mapa.set(r.estructura_id, new Set());
      mapa.get(r.estructura_id)!.add(r.tag_id);
    }
    return mapa;
  }, [rels]);

  /** estructura_id → id de la Forma geométrica (0 o 1 por estructura). */
  const formaIdPorEstructura = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const g of geoms) mapa.set(g.estructura_id, g.geometria_id);
    return mapa;
  }, [geoms]);

  /** Solo los tags que efectivamente están asignados a alguna estructura —
   *  el dropdown no ofrece opciones que darían 0 resultados. */
  const tagsEnUso = useMemo(() => {
    const usados = new Set<string>();
    for (const set of tagIdsPorEstructura.values()) for (const id of set) usados.add(id);
    return tags.filter((t) => usados.has(t.id));
  }, [tags, tagIdsPorEstructura]);

  /** Solo las Formas que efectivamente usa alguna estructura. */
  const formasEnUso = useMemo(() => {
    const usadas = new Set(formaIdPorEstructura.values());
    return formas.filter((f) => usadas.has(f.id));
  }, [formas, formaIdPorEstructura]);

  return {
    tagsEnUso,
    formasEnUso,
    tagIdsPorEstructura,
    formaIdPorEstructura,
    loading: loadingTags || loadingRels || loadingGeoms || loadingFormas,
  };
}
