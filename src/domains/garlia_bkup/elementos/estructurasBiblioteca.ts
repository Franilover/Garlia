/**
 * estructurasBiblioteca.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Lógica pura (sin React, sin Supabase) del canon de la biblioteca de
 * Estructuras, decidido 2026-09-20:
 *
 *   MICRO / MACRO / PATRONES ESTRUCTURALES  = AGRUPACIÓN VISUAL
 *   TIPO      = naturaleza de la estructura (celular, anatómica, vegetal…)
 *   FUNCIÓN   = qué hace
 *   GEOMETRÍA = cómo se configura espacialmente (Forma geométrica asignada)
 *   TAGS      = clasificaciones adicionales
 *
 * Reemplaza el agrupado anterior (Bases estructurales → Estructuras
 * concretas por patrón → Sin base asignada), que mezclaba dos ejes
 * distintos: "qué clase de entrada es" y "qué patrón usa". El patrón
 * (patron_estructural_id) sigue existiendo como dato — una estructura
 * Micro o Macro PUEDE usar un patrón (Núcleo → núcleo-periferia) — pero ya
 * no define la sección visual.
 *
 * Los filtros Tipo/Función/Geometría/Tags actúan sobre TODO el grid a la
 * vez (Micro + Macro + Patrones + Sin escala), sin pestañas: el escritor ve
 * la biblioteca completa y solo se reduce lo que no coincide.
 */

import type { Estructura } from "./types";

/** tipo que identifica a un patrón estructural (modelo abstracto). */
export const TIPO_PATRON = "patron_estructural";

export type SeccionEstructura = "micro" | "macro" | "patron" | "sin_escala";

/** Orden fijo de las secciones en el grid + su rótulo visible. */
export const SECCIONES: { clave: SeccionEstructura; titulo: string }[] = [
  { clave: "micro", titulo: "Micro" },
  { clave: "macro", titulo: "Macro" },
  { clave: "patron", titulo: "Patrones estructurales" },
  { clave: "sin_escala", titulo: "Sin escala definida" },
];

/**
 * En qué sección visual cae una estructura.
 *  - tipo=patron_estructural            → "patron" (aunque tenga escala)
 *  - escala "micro" / "macro"           → esa sección
 *  - concreta sin escala reconocible    → "sin_escala" (excepción/auditoría,
 *                                          NO categoría científica: no se
 *                                          clasifica artificialmente)
 */
export function seccionDe(e: Pick<Estructura, "tipo" | "escala">): SeccionEstructura {
  if (e.tipo === TIPO_PATRON) return "patron";
  const escala = (e.escala ?? "").trim().toLowerCase();
  if (escala === "micro") return "micro";
  if (escala === "macro") return "macro";
  return "sin_escala";
}

/**
 * "Función" es texto libre en la BD (ej. "Protección estructural; soporte
 * mecánico…"). Para poder filtrar por ella se normaliza a su PRIMER
 * segmento (hasta el primer ; , . o salto de línea), en minúsculas y sin
 * espacios sobrantes. Vacío → null (la estructura no aparece bajo ninguna
 * opción de Función, solo con "Todos").
 */
export function funcionClave(funcion: string | null | undefined): string | null {
  const t = (funcion ?? "").trim();
  if (!t) return null;
  const primero = t.split(/[;,.\n]/)[0].trim().toLowerCase();
  return primero || null;
}

/** Capitaliza la primera letra para mostrar una clave de función. */
export function etiquetaFuncion(clave: string): string {
  return clave.charAt(0).toUpperCase() + clave.slice(1);
}

export interface FiltrosEstructuras {
  tipo: string | null;
  funcion: string | null;
  /** id de formas_geometricas. */
  geometria: string | null;
  /** id de tags. */
  tag: string | null;
}

export const FILTROS_VACIOS: FiltrosEstructuras = {
  tipo: null,
  funcion: null,
  geometria: null,
  tag: null,
};

export function hayFiltrosActivos(f: FiltrosEstructuras): boolean {
  return Boolean(f.tipo || f.funcion || f.geometria || f.tag);
}

export interface RelacionesFiltro {
  tagIdsPorEstructura: Map<string, Set<string>>;
  formaIdPorEstructura: Map<string, string>;
}

/** ¿La estructura cumple TODOS los filtros activos? (AND entre dropdowns). */
export function cumpleFiltros(
  e: Estructura,
  f: FiltrosEstructuras,
  rel: RelacionesFiltro,
): boolean {
  if (f.tipo && e.tipo !== f.tipo) return false;
  if (f.funcion && funcionClave(e.funcion) !== f.funcion) return false;
  if (f.geometria && rel.formaIdPorEstructura.get(e.id) !== f.geometria) return false;
  if (f.tag && !rel.tagIdsPorEstructura.get(e.id)?.has(f.tag)) return false;
  return true;
}

/**
 * Reparte las estructuras (ya filtradas) en las secciones del canon, en el
 * orden de SECCIONES, ordenadas por nombre dentro de cada una. Las
 * secciones vacías se omiten — así "Sin escala definida" solo aparece
 * mientras haya estructuras sin clasificar, y un filtro que deja Micro en
 * cero no dibuja un encabezado huérfano.
 */
export function agruparPorSeccion(
  items: Estructura[],
): { clave: SeccionEstructura; titulo: string; items: Estructura[] }[] {
  const porSeccion = new Map<SeccionEstructura, Estructura[]>();
  for (const e of items) {
    const s = seccionDe(e);
    const lista = porSeccion.get(s) ?? [];
    lista.push(e);
    porSeccion.set(s, lista);
  }
  return SECCIONES.map(({ clave, titulo }) => ({
    clave,
    titulo,
    items: (porSeccion.get(clave) ?? []).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    ),
  })).filter((s) => s.items.length > 0);
}

/**
 * Eje de agrupación activo para el grid de Estructuras. "canon" es el
 * agrupado fijo Micro/Macro/Patrones/Sin escala (el de siempre); los otros
 * cuatro reagrupan TODO el grid por esa dimensión en lugar de filtrar —
 * pedido 2026-09-21: botones que agrupan, no dropdowns que ocultan.
 */
export type EjeAgrupacionEstructuras = "canon" | "tipo" | "funcion" | "geometria" | "tag";

/** Etiqueta legible del tipo (misma normalización que ya usaba el dropdown
 *  de Tipo en ElementosPage: patron_estructural → "Patrón estructural",
 *  el resto con guiones bajos → espacios y primera letra en mayúscula). */
export function etiquetaTipo(tipo: string): string {
  if (tipo === TIPO_PATRON) return "Patrón estructural";
  return etiquetaFuncion(tipo.replace(/_/g, " "));
}

/**
 * Agrupa TODAS las estructuras (ya filtradas por texto de búsqueda si
 * hubiera) por el eje activo. Con eje "canon" delega en agruparPorSeccion
 * (comportamiento de siempre). Con cualquier otro eje, reparte por el valor
 * de esa dimensión — Geometría y Tags necesitan `rel` para resolver la
 * relación (no son columnas directas de Estructura). Las estructuras sin
 * valor en el eje elegido (p.ej. sin Función, sin Tag) caen en un grupo
 * "Sin asignar" al final, igual que "Sin escala definida" en el canon.
 */
export function agruparPorEje(
  items: Estructura[],
  eje: EjeAgrupacionEstructuras,
  rel: RelacionesFiltro,
  formasNombrePorId: Map<string, string>,
  tagsNombrePorId: Map<string, string>,
): { clave: string; titulo: string; items: Estructura[] }[] {
  if (eje === "canon") return agruparPorSeccion(items);

  const extraerClaves = (e: Estructura): { clave: string; titulo: string }[] => {
    if (eje === "tipo") {
      const tipo = e.tipo;
      return tipo ? [{ clave: tipo, titulo: etiquetaTipo(tipo) }] : [];
    }
    if (eje === "funcion") {
      const clave = funcionClave(e.funcion);
      return clave ? [{ clave, titulo: etiquetaFuncion(clave) }] : [];
    }
    if (eje === "geometria") {
      const formaId = rel.formaIdPorEstructura.get(e.id);
      if (!formaId) return [];
      return [{ clave: formaId, titulo: formasNombrePorId.get(formaId) ?? formaId }];
    }
    // eje === "tag": una estructura puede tener varios tags, así que
    // aparece repetida bajo cada uno — mismo criterio que "many-to-many
    // muestra en todos los grupos a los que pertenece" del resto de la app.
    const tagIds = rel.tagIdsPorEstructura.get(e.id);
    if (!tagIds || tagIds.size === 0) return [];
    return [...tagIds].map((tagId) => ({
      clave: tagId,
      titulo: tagsNombrePorId.get(tagId) ?? tagId,
    }));
  };

  const porGrupo = new Map<string, { titulo: string; items: Estructura[] }>();
  const sinAsignar: Estructura[] = [];

  for (const e of items) {
    const claves = extraerClaves(e);
    if (claves.length === 0) {
      sinAsignar.push(e);
      continue;
    }
    for (const { clave, titulo } of claves) {
      if (!porGrupo.has(clave)) porGrupo.set(clave, { titulo, items: [] });
      porGrupo.get(clave)!.items.push(e);
    }
  }

  const grupos = [...porGrupo.entries()]
    .map(([clave, { titulo, items }]) => ({
      clave,
      titulo,
      items: items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

  if (sinAsignar.length > 0) {
    grupos.push({
      clave: "__sin_asignar__",
      titulo: "Sin asignar",
      items: sinAsignar.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    });
  }

  return grupos;
}

/** Opciones únicas (con conteo) de un campo derivado, ordenadas por
 *  etiqueta. Se calculan sobre el catálogo COMPLETO (no el filtrado) para
 *  que las opciones no desaparezcan al elegir otro filtro. */
export function opcionesUnicas(
  items: Estructura[],
  extraer: (e: Estructura) => string | null,
  etiquetar: (valor: string) => string = (v) => v,
): { value: string; label: string; count: number }[] {
  const cuenta = new Map<string, number>();
  for (const e of items) {
    const v = extraer(e);
    if (v) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([value, count]) => ({ value, label: etiquetar(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
