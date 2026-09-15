import { supabase } from "@/infra/supabase/supabase";

import {
  TABLA_POR_TIPO,
  type DescubrimientoInput,
  type DescubrimientoPublico,
  type EntidadDescubribleResuelta,
  type EntidadMin,
  type TipoEntidadPublicable,
} from "./types";

/**
 * Config de cómo resolver cada tipo_entidad contra su tabla real:
 * qué columnas pedir para nombre/descripción/imagen. Ninguna de estas
 * tablas tiene una columna "publico" propia (ver discusión en el chat) —
 * por eso existe la tabla puente `descubrimientos_publicos` en vez de un
 * flag por tabla.
 */
const RESOLVER: Record<
  TipoEntidadPublicable,
  {
    columnas: string;
    nombre: (row: any) => string;
    descripcion: (row: any) => string | null;
    imagen: (row: any) => string | null;
  }
> = {
  criatura: {
    columnas: "id, nombre, descripcion, imagen_url",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.descripcion ?? null,
    imagen: (r) => r.imagen_url ?? null,
  },
  elemento: {
    columnas: "id, nombre, notas",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.notas ?? null,
    imagen: () => null,
  },
  compuesto: {
    columnas: "id, nombre, notas",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.notas ?? null,
    imagen: () => null,
  },
  particula: {
    columnas: "id, nombre, extra",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.extra ?? null,
    imagen: () => null,
  },
  material: {
    columnas: "id, nombre, descripcion",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.descripcion ?? null,
    imagen: () => null,
  },
  item: {
    columnas: "id, nombre, descripcion, imagen_url",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.descripcion ?? null,
    imagen: (r) => r.imagen_url ?? null,
  },
  ecosistema: {
    columnas: "id, nombre, descripcion",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.descripcion ?? null,
    imagen: () => null,
  },
  bioma: {
    columnas: "id, nombre, descripcion",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.descripcion ?? null,
    imagen: () => null,
  },
  reino: {
    columnas: "id, nombre, geografia, mapa_url",
    nombre: (r) => r.nombre,
    descripcion: (r) => r.geografia ?? null,
    imagen: (r) => r.mapa_url ?? null,
  },
};

export const descubrimientosQueries = {
  /**
   * Lectura pública: trae las filas puente de uno o más tipos y resuelve
   * cada una contra su tabla real. Se hace una query por tabla involucrada
   * (no un JOIN dinámico — Supabase/PostgREST no soporta FK genéricas),
   * así que si se piden varios `tipos` (ej. la categoría "Química")
   * se agrupan y se dispara una query por tabla distinta.
   *
   * El título/descripción mostrados priorizan lo que el admin escribió a
   * mano en la tabla puente (titulo/descripcion) por sobre los campos de
   * la entidad original — así el "descubrimiento" puede tener su propio
   * ángulo narrativo sin editar la entidad real.
   */
  listPublicados: async (
    tipos: TipoEntidadPublicable[],
  ): Promise<EntidadDescubribleResuelta[]> => {
    const { data: puentes, error } = await supabase
      .from("descubrimientos_publicos")
      .select(
        "id, tipo_entidad, entidad_id, publicado_por, created_at, titulo, descripcion, fecha, reino_id, ciudad_id",
      )
      .in("tipo_entidad", tipos)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!puentes || puentes.length === 0) return [];

    const porTipo = new Map<TipoEntidadPublicable, DescubrimientoPublico[]>();
    for (const p of puentes as DescubrimientoPublico[]) {
      const lista = porTipo.get(p.tipo_entidad) ?? [];
      lista.push(p);
      porTipo.set(p.tipo_entidad, lista);
    }

    const resueltos: EntidadDescubribleResuelta[] = [];

    for (const [tipo, filas] of porTipo) {
      const cfg = RESOLVER[tipo];
      const tabla = TABLA_POR_TIPO[tipo];
      const ids = filas.map((f) => f.entidad_id);
      const { data: entidades, error: errEntidades } = await supabase
        .from(tabla)
        .select(cfg.columnas)
        .in("id", ids);
      if (errEntidades) throw errEntidades;

      const mapaEntidades = new Map(
        (entidades ?? []).map((e: any) => [e.id, e]),
      );

      for (const f of filas) {
        const row = mapaEntidades.get(f.entidad_id);
        // Entidad borrada del lado admin pero la fila puente quedó viva:
        // se omite en vez de romper el listado.
        if (!row) continue;
        resueltos.push({
          id: f.id,
          tipo_entidad: f.tipo_entidad,
          entidad_id: f.entidad_id,
          nombre: f.titulo?.trim() || cfg.nombre(row),
          descripcion: f.descripcion?.trim() || cfg.descripcion(row),
          imagen_url: cfg.imagen(row),
          created_at: f.created_at,
          fecha: f.fecha,
          reino_id: f.reino_id,
          ciudad_id: f.ciudad_id,
        });
      }
    }

    // Las queries por tabla no respetan el orden global por created_at
    // (cada una llega en su propio orden) — se reordena acá al final.
    resueltos.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return resueltos;
  },

  /** IDs ya publicados de un tipo dado — para pintar el toggle en el editor admin. */
  listPublicadosIds: async (
    tipo: TipoEntidadPublicable,
  ): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from("descubrimientos_publicos")
      .select("entidad_id")
      .eq("tipo_entidad", tipo);
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.entidad_id));
  },

  /**
   * Lista mínima (id, nombre) de las entidades reales de un tipo dado, para
   * poblar el selector "qué entidad publicar" del formulario del admin.
   */
  listEntidadesDeTipo: async (
    tipo: TipoEntidadPublicable,
  ): Promise<EntidadMin[]> => {
    const tabla = TABLA_POR_TIPO[tipo];
    const { data, error } = await supabase
      .from(tabla)
      .select("id, nombre")
      .order("nombre");
    if (error) throw error;
    return (data ?? []) as EntidadMin[];
  },

  /** Crea una nueva publicación en Biblioteca > Descubrimientos. */
  crear: async (input: DescubrimientoInput) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("descubrimientos_publicos").insert({
      tipo_entidad: input.tipo_entidad,
      entidad_id: input.entidad_id,
      titulo: input.titulo || null,
      descripcion: input.descripcion || null,
      fecha: input.fecha,
      reino_id: input.reino_id,
      ciudad_id: input.ciudad_id,
      publicado_por: auth.user?.id ?? null,
    });
    if (error) throw error;
  },

  /** Edita una publicación existente (por id de descubrimientos_publicos). */
  actualizar: async (id: string, input: DescubrimientoInput) => {
    const { error } = await supabase
      .from("descubrimientos_publicos")
      .update({
        tipo_entidad: input.tipo_entidad,
        entidad_id: input.entidad_id,
        titulo: input.titulo || null,
        descripcion: input.descripcion || null,
        fecha: input.fecha,
        reino_id: input.reino_id,
        ciudad_id: input.ciudad_id,
      })
      .eq("id", id);
    if (error) throw error;
  },

  eliminar: async (id: string) => {
    const { error } = await supabase
      .from("descubrimientos_publicos")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  publicar: async (tipo: TipoEntidadPublicable, entidadId: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("descubrimientos_publicos").insert({
      tipo_entidad: tipo,
      entidad_id: entidadId,
      publicado_por: auth.user?.id ?? null,
    });
    if (error) throw error;
  },

  despublicar: async (tipo: TipoEntidadPublicable, entidadId: string) => {
    const { error } = await supabase
      .from("descubrimientos_publicos")
      .delete()
      .eq("tipo_entidad", tipo)
      .eq("entidad_id", entidadId);
    if (error) throw error;
  },
};
