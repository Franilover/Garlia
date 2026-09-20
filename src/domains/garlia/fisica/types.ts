/**
 * types.ts — domains/garlia/fisica
 * ───────────────────────────────────────────────────────────────────────────
 * Tipos del sistema de Física/Energías: los Oris (fuerzas cósmicas — 10 en
 * el catálogo actual, no 9) y los bloques de conceptos (Vacío/Garin/Eterium,
 * Manifestaciones, etc).
 *
 * Tablas propias en Supabase — "oris" y "fisica_conceptos" — separadas por
 * completo de "elementos" (Tabla Química/Alquímica), aunque comparten la
 * misma jerarquía conceptual (Partícula Base → Partículas → Ium → Oris).
 * Partículas Base / Partículas / Iums son catálogos fijos (no cambian, no
 * tienen CRUD propio) y viven como constantes acá mismo — mismo criterio
 * que PARTICLE_TYPES en elementos/types.ts (27 partículas TASI reales,
 * sincronizado 2026-09-12).
 */

import { Atom, Beaker, Sparkle } from "lucide-react";

export type OrisFamilia = "Mecánica" | "Energética" | "Biológica";

export const ORIS_FAMILIAS: OrisFamilia[] = ["Mecánica", "Energética", "Biológica"];

export const ORIS_FAMILIA_ICON: Record<OrisFamilia, React.ElementType> = {
  Mecánica: Atom,
  Energética: Sparkle,
  Biológica: Beaker,
};

/** Fila cruda tal cual vive en Supabase (tabla "oris"). */
export interface Oris {
  id: string;
  orden: number;
  nombre: string;
  familia: OrisFamilia;
  formula: string;
  dominio: string;
  descripcion?: string | null;
  /** NO es una columna de Supabase — la tabla "oris" ya no tiene
   *  iums_composicion (columna jsonb eliminada, Fase 3). Este campo se
   *  reconstruye en memoria a partir de oris_iums — ver useOrisConIums().
   *  useOris() (lectura cruda) NO lo devuelve; solo useOrisConIums() lo
   *  completa. No enviar este campo en insert/update contra "oris". */
  iums_composicion: Record<string, number>;
}

/** Fila cruda tal cual vive en Supabase (tabla "oris_iums") — fuente
 *  normalizada de la mezcla de Iums, reemplaza a iums_composicion (jsonb)
 *  como fuente de verdad. Ver Fase 3 del rediseño 1.0. */
export interface OrisIumRow {
  id: string;
  oris_id: string;
  ium_id: string;
  cantidad: number;
}

export const ORIS_IUMS_CONFIG = {
  tabla: "oris_iums",
  select: "id, oris_id, ium_id, cantidad",
};

export const ORIS_CONFIG = {
  tabla: "oris",
  // iums_composicion ya no es columna de "oris" (Fase 3) — no seleccionar.
  // useOris() ya no trae composición; usar useOrisConIums() para eso.
  select: "id, orden, nombre, familia, formula, dominio, descripcion",
};

/** Adapta un Oris (Supabase) al shape FilaCatalogo usado por las vistas de
 *  catálogo compartidas con Base/Ium/Partículas. */
export function orisAFilaCatalogo(o: Oris): FilaCatalogo {
  return { nombre: o.nombre, detalle: o.dominio || o.formula, extra: o.familia };
}

/** Fila cruda tal cual vive en Supabase (tabla "fisica_conceptos"). */
export interface FisicaConcepto {
  id: string;
  orden: number;
  bloque: string;
  titulo: string;
  contenido: string;
}

export const FISICA_CONCEPTOS_CONFIG = {
  tabla: "fisica_conceptos",
  select: "id, orden, bloque, titulo, contenido",
};

/** Agrupa conceptos por su campo "bloque", preservando orden. */
export function agruparPorBloque(
  conceptos: FisicaConcepto[],
): { bloque: string; items: FisicaConcepto[] }[] {
  const grupos: { bloque: string; items: FisicaConcepto[] }[] = [];
  const indice = new Map<string, number>();
  for (const c of conceptos) {
    if (!indice.has(c.bloque)) {
      indice.set(c.bloque, grupos.length);
      grupos.push({ bloque: c.bloque, items: [] });
    }
    grupos[indice.get(c.bloque)!].items.push(c);
  }
  return grupos;
}

// ─── Catálogo: Polaridades Fundamentales (arranque antes de Partícula Base)
// Vive en Supabase (tabla "polaridades") — mismo criterio que
// "particulas_base": catálogo fijo en contenido (solo 2 filas: + y -) pero
// editable desde ahí, no constante hardcodeada. Jerarquía documentada:
//   POLARIDADES (+/-) → RELACIONES POLARES (++/--/+-/-+) → TASI → Partículas
// donde Síntesis (S) = +→- (Emisión) e Invertisis (I) = -→+ (Recepción).

/** Fila cruda tal cual vive en Supabase (tabla "polaridades"). */
export interface Polaridad {
  id: string;
  orden: number;
  signo: "+" | "-";
  nombre: string;
  detalle: string;
}

export const POLARIDADES_CONFIG = {
  tabla: "polaridades",
  select: "id, orden, signo, nombre, detalle",
};

/** Fila de Polaridad: además de nombre/detalle, trae su signo suelto
 *  ("+" o "-") para dibujar su círculo simple con PoloVisual — mismo
 *  criterio que FilaParticulaBase con su letra A/T/S/I. */
export interface FilaPolaridad extends FilaCatalogo {
  signo: "+" | "-";
}

/** Adapta una Polaridad (Supabase) al shape FilaPolaridad usado por las
 *  vistas de catálogo. */
export function polaridadAFilaCatalogo(p: Polaridad): FilaPolaridad {
  return { nombre: p.nombre, detalle: p.detalle, signo: p.signo };
}

// ─── Catálogo: Energías (Eterium / Garin) — después de Subsistemas ─────────
// A diferencia de Polaridad/ParticulaBase/Ium/Oris, Eterium y Garin NO
// viven en una tabla propia de Física: son filas de "contexto_humano"
// (tabla compartida de fichas conceptuales — capa "Magia"), identificadas
// por su nombre canónico en la columna "concepto" (concepto='Eterium' /
// concepto='Garin'). El frontend consulta por ese identificador humano en
// vez de un id fijo hardcodeado. Mismo par S(emisión)/I(recepción) que ya
// se dibuja como diagrama conceptual en la Rama 3 del Mapa Universal
// (ver RamaLibres en visualizador/MapaUniversalSection.tsx), pero acá con
// la ficha completa real en vez de solo el diagrama.

/** Fila cruda tal cual vive en Supabase (tabla "contexto_humano") — shape
 *  completo de la ficha, no solo lo que necesita el catálogo de Física. */
export interface ContextoHumano {
  id: string;
  concepto: string;
  explicacion_simple: string | null;
  formula_referencia: string | null;
  fuente_documentacion_sistema_concepto: string | null;
  analogia_o_ejemplo: string | null;
  capa: string | null;
  resumen: string | null;
  que_es: string | null;
  como_se_forma: string | null;
  que_hace: string | null;
  propiedades_clave: { tipo: string; clave: string; valor: string }[] | null;
  informacion_adicional: string | null;
  orden_visual: number | null;
}

export const CONTEXTO_HUMANO_CONFIG = {
  tabla: "contexto_humano",
  select:
    "id, concepto, explicacion_simple, formula_referencia, fuente_documentacion_sistema_concepto, analogia_o_ejemplo, capa, resumen, que_es, como_se_forma, que_hace, propiedades_clave, informacion_adicional, orden_visual",
};

/** Nombres canónicos de los conceptos de Energías, tal como viven en
 *  contexto_humano.concepto — usado tanto para el filtro de la query como
 *  para fijar el orden de la fila (Eterium primero, Garin después, mismo
 *  orden que ya usa RamaLibres en el Mapa Universal). */
export const ENERGIAS_CONCEPTOS = ["Eterium", "Garin"] as const;

/** Fila de Energía: reusa FilaCatalogo (nombre/detalle) con el resumen
 *  como detalle, y trae el registro completo de ContextoHumano para que el
 *  popover pueda mostrar la ficha rica (explicación, fórmula, analogía,
 *  propiedades clave) en vez de solo nombre/detalle genérico. */
export interface FilaEnergia extends FilaCatalogo {
  contexto: ContextoHumano;
}

/** Adapta un ContextoHumano (Supabase) al shape FilaEnergia usado por el
 *  catálogo de Física. */
export function contextoHumanoAFilaEnergia(c: ContextoHumano): FilaEnergia {
  return { nombre: c.concepto, detalle: c.resumen ?? c.explicacion_simple ?? "", contexto: c };
}

// ─── Catálogos: Partícula Base e Iums ──────────────────────────────────────
// Viven en Supabase (tablas "particulas_base" e "iums") — mismo criterio que
// "particulas": son catálogos fijos en contenido pero editables desde ahí,
// no constantes hardcodeadas. Se muestran como referencia fija arriba de
// los Oris en la tab Física.

export interface FilaCatalogo {
  nombre: string;
  detalle: string;
  extra?: string;
}

/** Fila de Partícula Base: además de nombre/detalle, trae su letra A/T/S/I
 *  suelta (no una fórmula de 3) para poder dibujar su círculo de un solo
 *  color con ParticulaVisual. */
export interface FilaParticulaBase extends FilaCatalogo {
  letra: "A" | "T" | "S" | "I";
}

/** Fila cruda tal cual vive en Supabase (tabla "particulas_base"). */
export interface ParticulaBase {
  id: string;
  orden: number;
  letra: "T" | "A" | "S" | "I";
  nombre: string;
  detalle: string;
}

export const PARTICULAS_BASE_CONFIG = {
  tabla: "particulas_base",
  select: "id, orden, letra, nombre, detalle",
};

/** Adapta una ParticulaBase (Supabase) al shape FilaParticulaBase usado por
 *  las vistas de catálogo. */
export function particulaBaseAFilaCatalogo(p: ParticulaBase): FilaParticulaBase {
  return { nombre: p.nombre, detalle: p.detalle, letra: p.letra };
}

// ─── Partículas (capa intermedia Base → Partículas → Ium) ─────────────────
// A diferencia de Base/Ium, esta capa SÍ vive en Supabase (tabla
// "particulas"): son las 11 combinaciones de Tesis/Antítesis/Síntesis que
// representan clases distintas dentro del espacio 3³=27. Las 16 combinaciones
// restantes se exploraron como partículas candidatas y luego se eliminaron
// (12/08/2026, ver "Partículas teóricas descartadas" en fisica_conceptos) al
// confirmar que son rotaciones de estas 11 — mismo grado de libertad visto en
// otra fase del ciclo A→T→S, no partículas nuevas ("Ley de Equivalencia
// Rotacional"). El campo es_teorica queda en el schema por compatibilidad,
// pero ya no debería haber filas con es_teorica=true.

/** Fila cruda tal cual vive en Supabase (tabla "particulas"). */
export interface Particula {
  id: string;
  orden: number;
  nombre: string;
  /** Combinación de 3 letras A/T/S, ej. "AAA", "SAT". */
  formula: string;
  extra?: string | null;
  /** Suma de A=+1/T=-1/S=0 sobre la fórmula — polaridad neta. */
  vector_neto?: number | null;
  /** Cantidad de "S" en la fórmula (0 a 3). */
  s_count?: number | null;
  /** true = parte de las 16 combinaciones no manifestadas originalmente,
   *  añadidas para completar el espacio de 27; false = las 11 originales. */
  es_teorica: boolean;
}

export const PARTICULAS_CONFIG = {
  tabla: "particulas",
  select: "id, orden, nombre, formula, extra, vector_neto, s_count, es_teorica",
};

/** Adapta una Particula (Supabase) al shape FilaCatalogo usado por las
 *  vistas de catálogo compartidas con Base/Ium. */
export function particulaAFilaCatalogo(p: Particula): FilaCatalogo {
  return { nombre: p.nombre, detalle: p.formula, extra: p.extra ?? undefined };
}

/** Fila de Ium: además de nombre/detalle/extra, trae un id estable (slug)
 *  y su composición como lista de {particula de Química, cantidad} — usada
 *  para calcular el gráfico A/T/S (ver PARTICULA_QUIMICA_FORMULA +
 *  contarLetrasDeIum en este archivo). */
export interface FilaIum extends FilaCatalogo {
  id: string;
  composicion: { particula: string; cantidad: number }[];
}

/** Fila de "iums" + composición reconstruida (no es 1:1 con Supabase). */
export interface Ium {
  id: string;
  orden: number;
  nombre: string;
  detalle: string;
  extra?: string | null;
  /** NO es columna de Supabase — "iums" ya no tiene composicion (jsonb
   *  eliminada, Fase 4). Se reconstruye en memoria desde iums_particulas —
   *  ver useIumsConParticulas(). useIums() (lectura cruda) NO lo completa;
   *  llega en [] si se usa ese hook directamente. No enviar este campo en
   *  insert/update contra "iums". */
  composicion: { particula: string; cantidad: number }[];
}

export const IUMS_CONFIG = {
  tabla: "iums",
  // composicion ya no es columna de "iums" (Fase 4) — no seleccionar.
  // useIums() ya no trae composición; usar useIumsConParticulas() para eso.
  select: "id, orden, nombre, detalle, extra",
};

/** Adapta un Ium (Supabase) al shape FilaIum usado por las vistas de
 *  catálogo y por las funciones utilitarias de este archivo. */
export function iumAFilaIum(i: Ium): FilaIum {
  return {
    id: i.id,
    nombre: i.nombre,
    detalle: i.detalle,
    extra: i.extra ?? undefined,
    composicion: i.composicion,
  };
}

/**
 * Fórmula T/A/S/I (3 letras) de cada una de las 27 Partículas canónicas —
 * mismo nombre que ParticleType en elementos/types.ts. Sincronizado
 * 2026-09-12 directamente contra particulas.formula en Supabase (antes solo
 * cubría 11 de las 27 partículas reales, y el comentario original hablaba
 * de una convención "T=Tesis/A=Antítesis" que ya no está vigente — ver
 * contexto_humano.concepto="TASI (T/A/S/I)" para el significado actual:
 * T=dinámica, A=masa/constitución, S=emisión (Eterium), I=recepción (Garin)).
 * Duplicado como constante fija en vez de fetch porque no cambia y evita
 * acoplar este archivo al fetch de useParticulas() solo para dibujar
 * íconos. Si se agregan partículas nuevas en Supabase, actualizar aquí.
 */
export const PARTICULA_QUIMICA_FORMULA: Record<string, string> = {
  Masa: "AAA",
  Cinética: "TTT",
  Potencial: "ATT",
  Información: "TAA",
  Voluntad: "AAT",
  Percepción: "TTA",
  Transición: "TST",
  Ciclo: "ASA",
  Entropía: "STA",
  Catálisis: "TAS",
  Equilibrio: "III",
  Interacción: "ATS",
  Adaptación: "AII",
  Integración: "IIT",
  Emisión: "SSS",
  Proyección: "ASS",
  Propagación: "SST",
  Reserva: "AAI",
  Filtración: "AIS",
  Canalización: "AIT",
  Resonancia: "ASI",
  Absorción: "ATI",
  Concentración: "IIS",
  Difusión: "ISS",
  Conducción: "IST",
  Inducción: "ITS",
  Estímulo: "ITT",
};

/** Inicial corta de cada Partícula — para el modo "iniciales" de IumVisual
 *  (mismo criterio que PARTICLE_INITIAL en elementos/types.ts, con las
 *  mismas 27 entradas sincronizadas 2026-09-12): cada círculo muestra la
 *  letra/abreviatura de su Partícula en vez de sus 3 tercios T/A/S/I. */
export const PARTICULA_INITIAL: Record<string, string> = {
  Masa: "M",
  Cinética: "Ci",
  Potencial: "P",
  Información: "Inf",
  Voluntad: "V",
  Percepción: "Pc",
  Transición: "Tr",
  Ciclo: "Cl",
  Entropía: "En",
  Catálisis: "Ct",
  Equilibrio: "Eq",
  Interacción: "Int",
  Adaptación: "Ad",
  Integración: "Ig",
  Emisión: "Em",
  Proyección: "Pr",
  Propagación: "Pg",
  Reserva: "Rs",
  Filtración: "Fl",
  Canalización: "Cn",
  Resonancia: "Rn",
  Absorción: "Ab",
  Concentración: "Cc",
  Difusión: "Di",
  Conducción: "Cd",
  Inducción: "Id",
  Estímulo: "Es",
};

/** Conteo de letras A/T/S/I de una lista de {particula de Química, cantidad}
 *  — usado tanto para el Ium (composicion fija) como para el Oris
 *  (iums_composicion → cada Ium aporta su propio conteo × cantidad). */
export function contarLetrasDeComposicion(
  composicion: { particula: string; cantidad: number }[],
): { A: number; T: number; S: number; I: number } {
  const out = { A: 0, T: 0, S: 0, I: 0 };
  for (const { particula, cantidad } of composicion) {
    const formula = PARTICULA_QUIMICA_FORMULA[particula];
    if (!formula) continue;
    for (const c of formula) {
      if (c === "A" || c === "T" || c === "S" || c === "I") out[c] += cantidad;
    }
  }
  return out;
}

/** Conteo de letras A/T/S/I de un Ium por su composición fija. */
export function contarLetrasDeIum(ium: FilaIum): { A: number; T: number; S: number; I: number } {
  return contarLetrasDeComposicion(ium.composicion);
}

/** Lista de partículas componentes de un Ium con su fórmula A/T/S real,
 *  expandida en entradas individuales (una por cada unidad, sin agrupar
 *  por cantidad) — para dibujar cada una como círculo propio orbitando
 *  (ver IumVisual en ParticulaVisual.tsx). Ej. Fluxor (2×Cinética + 1×Masa)
 *  → [Cinética, Cinética, Masa], 3 entradas individuales. */
export function particulasDeIum(
  ium: FilaIum,
): { nombre: string; formula: string }[] {
  const out: { nombre: string; formula: string }[] = [];
  for (const c of ium.composicion) {
    const formula = PARTICULA_QUIMICA_FORMULA[c.particula];
    if (!formula) continue;
    for (let i = 0; i < c.cantidad; i++) {
      out.push({ nombre: c.particula, formula });
    }
  }
  return out;
}

/** Lista de partículas componentes de un Oris a partir de iums_composicion,
 *  expandida en entradas individuales: cada Ium aporta sus propias
 *  Partículas (ya expandidas), repetidas tantas veces como el Ium aparezca
 *  en el Oris. Sin agrupar — se muestran siempre las partículas reales.
 *  Recibe iumPorId (armado desde useIums()) en vez de leer una constante
 *  global, ya que Iums ahora vive en Supabase. */
export function particulasDeOris(
  iumsComposicion: Record<string, number>,
  iumPorId: Record<string, FilaIum>,
): { nombre: string; formula: string }[] {
  const out: { nombre: string; formula: string }[] = [];
  for (const [iumId, cantidadIum] of Object.entries(iumsComposicion)) {
    const ium = iumPorId[iumId];
    if (!ium || !cantidadIum) continue;
    const particulas = particulasDeIum(ium);
    for (let i = 0; i < cantidadIum; i++) {
      out.push(...particulas);
    }
  }
  return out;
}

/** Conteo de letras A/T/S/I de un Oris a partir de iums_composicion
 *  ({ [iumId]: cantidad }): cada Ium aporta su propio conteo × cantidad.
 *  Recibe iumPorId (armado desde useIums()) en vez de leer una constante
 *  global, ya que Iums ahora vive en Supabase. */
export function contarLetrasDeOris(
  iumsComposicion: Record<string, number>,
  iumPorId: Record<string, FilaIum>,
): {
  A: number;
  T: number;
  S: number;
  I: number;
} {
  const out = { A: 0, T: 0, S: 0, I: 0 };
  for (const [iumId, cantidad] of Object.entries(iumsComposicion)) {
    const ium = iumPorId[iumId];
    if (!ium || !cantidad) continue;
    const letras = contarLetrasDeIum(ium);
    out.A += letras.A * cantidad;
    out.T += letras.T * cantidad;
    out.S += letras.S * cantidad;
    out.I += letras.I * cantidad;
  }
  return out;
}
