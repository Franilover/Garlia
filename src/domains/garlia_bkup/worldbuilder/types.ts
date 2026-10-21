/**
 * types.ts — dominio Worldbuilder
 * ───────────────────────────────────────────────────────────────────────────
 * Capa humana encima del motor Garlia: el worldbuilder describe lo que
 * quiere en lenguaje natural ("quiero algo duro y resistente") y el motor
 * (fn_worldbuilder_*, ya viven en Supabase) resuelve intención → criterios →
 * candidatos/creación → evaluación, sin exponer dureza/rigidez/fórmulas como
 * conceptos que el usuario deba manejar directamente.
 *
 * Todos los shapes de acá fueron confirmados corriendo las RPC reales contra
 * Supabase (no se infirieron de la documentación) — ver comentarios en cada
 * tipo para el ejemplo real que los originó.
 */

// ─── Catálogo (solo lectura) ────────────────────────────────────────────────

export interface IntencionHumana {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  sinonimos: string[];
  criterios: CriterioIntencion[];
  activa: boolean;
}

export interface CategoriaMaterial {
  id: string;
  clave: string;
  nombre_humano: string;
  descripcion: string;
  sinonimos: string[];
  activa: boolean;
}

export interface TipoObjeto {
  id: string;
  clave: string;
  nombre_humano: string;
  sinonimos: string[];
  plantilla_id: string;
  categoria_canonica: string;
  activo: boolean;
  /** Medidas de referencia de la plantilla geométrica asociada
   *  (plantillas_geometricas.parametros_base, ej. {"longitud":{"valor":80,
   *  "unidad":"longitud_u"}, ...}) — traído vía join en listarTiposObjeto()
   *  únicamente para mostrar un preview de tamaño/forma antes de crear el
   *  objeto; el motor real sigue derivando la geometría del item a partir
   *  de plantilla_id dentro de fn_worldbuilder_crear_item, esto es solo
   *  lectura informativa en la UI. */
  parametros_base: Record<string, { valor: number; unidad: string }> | null;
}

// ─── Shapes jsonb devueltos por las RPC — confirmados en vivo ──────────────

/** Un criterio de una intención: mínimo, máximo, o ambos, sobre una
 *  propiedad física real. Ej.: {"min":0.75,"propiedad":"dureza"}. */
export interface CriterioIntencion {
  propiedad: string;
  min?: number | null;
  max?: number | null;
}

/** Igual que CriterioIntencion pero ya evaluado contra una entidad real —
 *  lo que devuelven evaluar_material/evaluar_item/sugerir_materiales dentro
 *  de "criterios". Ej.:
 *  {"max":null,"min":0.75,"valor":0.6037,"cumple":false,"intencion":"duro","propiedad":"dureza"} */
export interface CriterioEvaluado extends CriterioIntencion {
  valor: number;
  cumple: boolean;
  intencion: string;
}

/** Salida de fn_worldbuilder_detectar_intenciones — array plano de
 *  intenciones detectadas en el texto, cada una con sus criterios crudos
 *  (no evaluados todavía, eso pasa en evaluar/sugerir). */
export type IntencionDetectada = IntencionHumana & { multiplicador_umbral: number };

/** Salida de fn_worldbuilder_evaluar_material / fn_worldbuilder_evaluar_item.
 *  estado: "cumple" | "no_cumple" (confirmado en vivo); "requiere_datos" se
 *  documenta en el motor para materiales sin propiedades calculables
 *  todavía — se contempla igual, nunca se asume que solo hay 2 estados. */
export interface EvaluacionWorldbuilder {
  estado: "cumple" | "no_cumple" | "requiere_datos" | string;
  criterios: CriterioEvaluado[];
  intenciones: IntencionDetectada[];
}

/** Un candidato dentro de fn_worldbuilder_sugerir_materiales. */
export interface MaterialSugerido {
  id: string;
  nombre: string;
  categoria: string;
  criterios: CriterioEvaluado[];
  /** [0,1] — fracción de criterios que cumple, no una magnitud física. */
  puntuacion: number;
}

/** Salida completa de fn_worldbuilder_sugerir_materiales. */
export interface SugerenciaMaterialesResultado {
  estado: "resultados" | "sin_intenciones" | "sin_resultados" | string;
  entrada: string;
  resultados: MaterialSugerido[];
  intenciones: IntencionDetectada[];
}

/** Subconjunto de propiedades_calculadas/propiedades_fisicas que el
 *  Worldbuilder muestra en la tarjeta principal — las 7 magnitudes humanas
 *  ya usadas en Laboratorio/Interacción. El resto (volumen_trazabilidad,
 *  factor_geometrico, etc., solo presentes en Items) se deja en el detalle
 *  expandible, sin tipar cada campo: es diagnóstico interno, no algo que el
 *  worldbuilder deba interpretar. */
export interface PropiedadesFisicasBase {
  estabilidad?: number | null;
  rigidez?: number | null;
  flexibilidad?: number | null;
  dureza?: number | null;
  conductividad?: number | null;
  transparencia?: number | null;
  interaccion?: number | null;
  masa?: number | null;
  carga?: number | null;
  densidad?: number | null;
  volumen?: number | null;
  [key: string]: unknown;
}

/** Salida común a fn_worldbuilder_crear_material y
 *  fn_worldbuilder_mezclar_materiales — confirmado idéntico en ambas. */
export interface MaterialCreadoResultado {
  id: string;
  nombre: string;
  categoria: string;
  propiedades: PropiedadesFisicasBase;
  evaluacion: EvaluacionWorldbuilder;
  /** "creado" si evaluacion.estado no es no_cumple/requiere_datos; si no,
   *  refleja ese mismo estado — el material SIEMPRE se crea igual, esto es
   *  solo si cumplió lo pedido, nunca bloquea la creación. */
  estado: "creado" | "no_cumple" | "requiere_datos" | string;
  auditoria_id: string;
}

/** Salida de fn_worldbuilder_resolver_tipo_objeto. */
export interface TipoObjetoResuelto {
  estado: "resuelto" | "no_resuelto" | string;
  clave?: string;
  nombre?: string;
  categoria?: string;
  plantilla_id?: string;
}

/** Salida de fn_worldbuilder_crear_item. Cuando el tipo de objeto no se
 *  resuelve, el motor devuelve {estado:"requiere_plantilla", tipo:...} SIN
 *  crear nada — la UI debe distinguir este caso de una creación real. */
export interface ItemCreadoResultado {
  estado: "creado" | "no_cumple" | "requiere_datos" | "requiere_plantilla" | string;
  id?: string;
  nombre?: string;
  origen?: string;
  categoria?: string;
  tipo?: TipoObjetoResuelto;
  evaluacion?: EvaluacionWorldbuilder;
  propiedades_fisicas?: PropiedadesFisicasBase;
  auditoria_id?: string;
}

// ─── Auditoría (worldbuilder_creaciones, solo lectura) ─────────────────────

export interface WorldbuilderCreacion {
  id: string;
  entidad_tipo: "material" | "item" | string;
  entidad_id: string;
  entrada_humana: string;
  parametros: Record<string, unknown>;
  resultado: Record<string, unknown>;
  estado: string;
  created_at: string;
}

// ─── Inputs de las acciones de creación/mezcla ─────────────────────────────

/** Un componente de fn_worldbuilder_crear_material — Material O Compuesto
 *  ya existente, nunca un Elemento suelto (confirmado leyendo la función:
 *  valida contra las tablas materiales/compuestos). */
export interface ComponenteMaterial {
  tipo: "material" | "compuesto";
  id: string;
  proporcion?: number;
  unidad?: string;
  rol?: string;
}

/** Un material de fn_worldbuilder_crear_item — siempre Material, con
 *  proporción opcional (se reparte equitativa si se omite en todos). */
export interface MaterialDeItem {
  id: string;
  proporcion?: number;
  rol?: string;
}
