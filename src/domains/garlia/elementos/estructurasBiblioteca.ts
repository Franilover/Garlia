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
