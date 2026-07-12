"use client";

/**
 * usePublicacionEntidades
 * ───────────────────────────────────────────────────────────────────────────
 * Une personajes/criaturas/items/reinos/ciudades/hechizos/dones/runas en una
 * sola lista homogénea con { id, tabla, tipo, nombre, imagen_url, publicado,
 * publicado_at }. La usan:
 *   - PublicacionSection (admin, myself/garlia): togglear publicado por fila.
 *   - AventuraFeed (público, /garlia/aventura): filtra publicado=true y
 *     ordena por publicado_at desc.
 *
 * Reutiliza useSupabaseData por tabla → realtime ya viene gratis: al
 * publicar desde el admin, todo cliente con AventuraFeed montado se
 * actualiza sin refrescar (postgres_changes ya suscrito por tabla).
 */

import { useMemo } from "react";

import { useSupabaseData } from "@/hooks/data/useSupabaseData";

export type TipoEntidadPublicable =
  | "personajes"
  | "criaturas"
  | "items"
  | "reinos"
  | "ciudades"
  | "hechizos"
  | "dones"
  | "runas";

export const TIPO_LABEL: Record<TipoEntidadPublicable, { singular: string; plural: string }> = {
  personajes: { singular: "Personaje", plural: "Personajes" },
  criaturas: { singular: "Criatura", plural: "Criaturas" },
  items: { singular: "Objeto", plural: "Objetos" },
  reinos: { singular: "Reino", plural: "Reinos" },
  ciudades: { singular: "Ciudad", plural: "Ciudades" },
  hechizos: { singular: "Hechizo", plural: "Hechizos" },
  dones: { singular: "Don", plural: "Dones" },
  runas: { singular: "Runa", plural: "Runas" },
};

const TIPOS: TipoEntidadPublicable[] = [
  "personajes",
  "criaturas",
  "items",
  "reinos",
  "ciudades",
  "hechizos",
  "dones",
  "runas",
];

interface RowBase {
  id: string;
  nombre: string;
  imagen_url?: string | null;
  descripcion?: string | null;
  explicacion?: string | null;
  publicado?: boolean | null;
  publicado_at?: string | null;
}

export interface EntidadPublicable {
  id: string;
  tabla: TipoEntidadPublicable;
  nombre: string;
  imagen_url: string | null;
  descripcion: string | null;
  publicado: boolean;
  publicado_at: string | null;
}

function normalizar(tabla: TipoEntidadPublicable, rows: RowBase[]): EntidadPublicable[] {
  return rows.map((r) => ({
    id: r.id,
    tabla,
    nombre: r.nombre,
    imagen_url: r.imagen_url ?? null,
    descripcion: r.descripcion ?? r.explicacion ?? null,
    publicado: !!r.publicado,
    publicado_at: r.publicado_at ?? null,
  }));
}

export function usePublicacionEntidades() {
  const personajes = useSupabaseData<RowBase>("personajes");
  const criaturas = useSupabaseData<RowBase>("criaturas");
  const items = useSupabaseData<RowBase>("items");
  const reinos = useSupabaseData<RowBase>("reinos");
  const ciudades = useSupabaseData<RowBase>("ciudades");
  const hechizos = useSupabaseData<RowBase>("hechizos");
  const dones = useSupabaseData<RowBase>("dones");
  const runas = useSupabaseData<RowBase>("runas");

  const porTabla = {
    personajes,
    criaturas,
    items,
    reinos,
    ciudades,
    hechizos,
    dones,
    runas,
  } as const;

  const loading = TIPOS.some((t) => porTabla[t].loading);

  const todas = useMemo<EntidadPublicable[]>(() => {
    return TIPOS.flatMap((t) => normalizar(t, porTabla[t].data ?? []));
  }, [
    personajes.data,
    criaturas.data,
    items.data,
    reinos.data,
    ciudades.data,
    hechizos.data,
    dones.data,
    runas.data,
  ]);

  const publicadas = useMemo(
    () =>
      todas
        .filter((e) => e.publicado)
        .sort((a, b) => {
          const ta = a.publicado_at ? new Date(a.publicado_at).getTime() : 0;
          const tb = b.publicado_at ? new Date(b.publicado_at).getTime() : 0;
          return tb - ta;
        }),
    [todas],
  );

  const togglePublicado = async (entidad: EntidadPublicable) => {
    const nuevoValor = !entidad.publicado;
    await porTabla[entidad.tabla].updateRow(entidad.id, {
      publicado: nuevoValor,
      publicado_at: nuevoValor ? new Date().toISOString() : null,
    });
  };

  return { todas, publicadas, loading, togglePublicado };
}
