/**
 * laboratorioPropiedades.types.ts — dominio Materiales/Compuestos
 * ───────────────────────────────────────────────────────────────────────────
 * Tipos para la sección "Lab → Buscador por propiedad": elegís una o más
 * propiedades y un umbral mínimo (y opcionalmente un tope máximo), y se
 * rankea el catálogo real de Compuestos/Materiales según qué tan bien las
 * cumple cada uno.
 *
 * Fuente de verdad (Supabase, ya existente — nada de esto se inventa acá):
 *   - propiedades_derivadas × propiedades_catalogo_v3 → catálogo oficial de
 *     propiedades disponibles para pedir (clave, nombre, rango_min/max).
 *   - RPC sugerir_compuestos_por_propiedades(p_requisitos jsonb, p_limite)
 *   - RPC sugerir_materiales_por_propiedades_v3(p_requisitos jsonb, p_limite)
 *
 * Ambas RPC devuelven la misma forma de tabla (solo cambia el nombre de la
 * columna id: "id" en compuestos, "material_id" en materiales) — se
 * normalizan acá a un único tipo SugerenciaPropiedad para que el frontend
 * no tenga que distinguir el caso.
 */

export type EntidadLab = "compuesto" | "material";

/** Fila del catálogo oficial de propiedades pedibles (propiedades_derivadas
 *  filtrado por propiedades_catalogo_v3.es_oficial = true). Se trae del
 *  catálogo real en vez de hardcodear una lista — si Supabase agrega una
 *  propiedad oficial nueva, aparece sola en el selector. */
export interface PropiedadCatalogoLab {
  id: string;
  clave: string;
  nombre: string;
  rango_min: number | null;
  rango_max: number | null;
}

export const CONFIG_PROPIEDADES_CATALOGO_LAB = {
  tabla: "propiedades_derivadas",
  // join contra propiedades_catalogo_v3 con es_oficial=true — ver
  // useCatalogoPropiedadesLab, que arma el .select() con la relación.
  select: "id, clave, nombre, rango_min, rango_max",
};

/** Un requisito que el usuario arma en la UI: "quiero esta propiedad por
 *  encima (o dentro) de tal rango". Se traduce 1:1 a la forma que esperan
 *  las RPC: {clave: {min, max}}. Al menos uno de min/max debe estar
 *  presente — la UI no deja armar un requisito vacío. */
export interface RequisitoPropiedadLab {
  clave: string;
  min: number | null;
  max: number | null;
}

/** Detalle de si una propiedad puntual del requisito se cumplió — tal cual
 *  lo entrega la columna `coincidencias` de la RPC (jsonb[]). */
export interface CoincidenciaPropiedadLab {
  propiedad: string;
  valor: number | null;
  min: number | null;
  max: number | null;
  objetivo: number | null;
  cumple: boolean;
}

/** Fila normalizada de resultado, para Compuesto o Material por igual. */
export interface SugerenciaPropiedadLab {
  id: string;
  nombre: string;
  /** 0–1: proporción de los requisitos pedidos que esta entidad cumple. */
  puntuacion: number;
  /** Todas las propiedades calculadas de la entidad (no solo las pedidas)
   *  — útil para mostrar contexto además del match puntual. */
  propiedades: Record<string, number>;
  coincidencias: CoincidenciaPropiedadLab[];
}

// ─── Simulador Elemento + Elemento → Compuesto hipotético ─────────────────
// Fuente de verdad: RPC simular_compuesto_desde_elementos(p_elemento_ids
// uuid[]) — solo lectura, no crea fila en "compuestos" ni "compuesto_
// elementos". Reutiliza la misma fórmula que fn_calcular_compuesto_desde_
// elementos (el compuesto REAL), con elementos en partes iguales (sin
// proporciones custom, según lo pedido).

export type EstadoSimulacionCompuesto =
  | "simulado"
  | "sin_elementos"
  | "insuficientes_elementos"
  | "elementos_inexistentes";

export interface ResultadoSimulacionCompuesto {
  estado: EstadoSimulacionCompuesto;
  modelo?: string;
  elementos?: { id: string; nombre: string }[];
  masa?: number | null;
  carga?: number | null;
  volumen_real?: number | null;
  densidad_real?: number | null;
  estabilidad?: number | null;
  rigidez?: number | null;
  flexibilidad?: number | null;
  dureza?: number | null;
  conductividad?: number | null;
  transparencia?: number | null;
  interaccion?: number | null;
  nota?: string;
}

// ─── Simulador Compuesto + Compuesto → Material hipotético ────────────────
// Fuente de verdad: RPC simular_material_desde_compuestos(p_compuesto_ids
// uuid[]) — solo lectura, no crea fila en "materiales" ni
// "material_componentes". Mismo criterio que el simulador de Compuesto:
// componentes en partes iguales, sin Estructura asociada (eso es
// composición real de otro nivel, fuera de este slice).

export type EstadoSimulacionMaterial =
  | "simulado"
  | "sin_compuestos"
  | "insuficientes_compuestos"
  | "compuestos_inexistentes";

export interface ResultadoSimulacionMaterial {
  estado: EstadoSimulacionMaterial;
  modelo?: string;
  compuestos?: { id: string; nombre: string }[];
  masa?: number | null;
  carga?: number | null;
  volumen?: number | null;
  densidad?: number | null;
  estabilidad?: number | null;
  rigidez?: number | null;
  flexibilidad?: number | null;
  dureza?: number | null;
  conductividad?: number | null;
  transparencia?: number | null;
  interaccion?: number | null;
  fuente_fisica?: string;
  nota?: string;
}

// ─── Ranking de pares de Elementos por una propiedad objetivo ─────────────
// Fuente de verdad: RPC sugerir_pares_elementos_por_propiedad(p_propiedad
// text, p_limite int) — solo lectura. A diferencia del simulador manual
// (una combinación armada a mano), esto evalúa TODOS los pares posibles
// del catálogo real de Elementos con la misma fórmula de compuesto
// (fn_calcular_compuesto_desde_elementos) y devuelve el top N ordenado
// desc por la propiedad elegida. "Elegís transparencia → te muestra las 20
// combinaciones que darían más transparencia", sin tener que armar nada
// a mano.

/** Las 7 propiedades que calcula un Compuesto real desde sus Elementos
 *  (fn_calcular_compuesto_desde_elementos) — únicas que la RPC de ranking
 *  de pares soporta. Se hardcodea esta lista (no viene de un catálogo
 *  Supabase) porque son literalmente las columnas físicas de "compuestos",
 *  no una entrada del catálogo oficial de propiedades_derivadas. */
export const PROPIEDADES_PAR_ELEMENTOS: { clave: string; nombre: string }[] = [
  { clave: "dureza", nombre: "Dureza" },
  { clave: "rigidez", nombre: "Rigidez" },
  { clave: "flexibilidad", nombre: "Flexibilidad" },
  { clave: "estabilidad", nombre: "Estabilidad" },
  { clave: "conductividad", nombre: "Conductividad" },
  { clave: "transparencia", nombre: "Transparencia" },
  { clave: "interaccion", nombre: "Interacción" },
];

export interface ParElementosSugerido {
  elementoAId: string;
  elementoANombre: string;
  elementoBId: string;
  elementoBNombre: string;
  /** El valor de la propiedad elegida para este par — es la columna por la
   *  que está ordenado el ranking. */
  valor: number;
  /** Las 7 propiedades del compuesto resultante, no solo la elegida —
   *  contexto extra, mismo criterio que coincidencias en el buscador
   *  anterior. */
  propiedades: Record<string, number>;
}

// ─── Ranking de pares de Compuestos por una propiedad objetivo ────────────
// Fuente de verdad: RPC sugerir_pares_compuestos_por_propiedad(p_propiedad
// text, p_limite int) — solo lectura. Mismo concepto que el ranking de
// pares de Elementos, un nivel arriba: evalúa TODOS los pares posibles del
// catálogo real de Compuestos y devuelve el top N ordenado desc por la
// propiedad elegida. A diferencia del par de Elementos (ponderado por
// volumen, con fn_promedio_dominante para dureza/conductividad/
// transparencia), acá se usa PROMEDIO SIMPLE entre los 2 compuestos —
// misma fórmula que simular_material_desde_compuestos/
// calcular_promedios_propiedades_json (partes iguales, sin Estructura).

/** Mismas 7 propiedades que el ranking de pares de Elementos — son las
 *  columnas físicas que tiene un Compuesto real, únicas que la RPC de
 *  ranking de pares de Compuestos soporta. */
export const PROPIEDADES_PAR_COMPUESTOS = PROPIEDADES_PAR_ELEMENTOS;

export interface ParCompuestosSugerido {
  compuestoAId: string;
  compuestoANombre: string;
  compuestoBId: string;
  compuestoBNombre: string;
  /** El valor de la propiedad elegida para este par — es la columna por la
   *  que está ordenado el ranking. */
  valor: number;
  /** Las 7 propiedades del Material resultante, no solo la elegida —
   *  contexto extra, mismo criterio que en el ranking de Elementos. */
  propiedades: Record<string, number>;
}
