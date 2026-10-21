/**
 * worldbuilderService.ts — dominio Worldbuilder
 * ───────────────────────────────────────────────────────────────────────────
 * Capa fina sobre `supabase.rpc(...)`. Ninguna regla de negocio vive acá:
 * detección de intención, resolución de tipo de objeto, cálculo de
 * propiedades y evaluación humana ("cumple"/"no cumple") son responsabilidad
 * exclusiva de las funciones fn_worldbuilder_* en Supabase.
 *
 * Cada wrapper fue probado en vivo contra el proyecto (ver conversación de
 * diseño) antes de escribirse — los shapes de types.ts no son una
 * suposición sobre la documentación, son lo que la RPC devolvió realmente.
 */

import { supabase } from "@/infra/supabase/supabase";

import type {
  CategoriaMaterial,
  ComponenteMaterial,
  EvaluacionWorldbuilder,
  IntencionDetectada,
  IntencionHumana,
  ItemCreadoResultado,
  MaterialCreadoResultado,
  MaterialDeItem,
  SugerenciaMaterialesResultado,
  TipoObjeto,
  TipoObjetoResuelto,
  WorldbuilderCreacion,
} from "./types";

function assertNoError<T>(data: T, error: { message: string } | null, contexto: string): T {
  if (error) {
    throw new Error(`[worldbuilderService] ${contexto}: ${error.message}`);
  }
  return data;
}

// ─── Catálogo (solo lectura) ────────────────────────────────────────────────

export async function listarIntenciones(): Promise<IntencionHumana[]> {
  const { data, error } = await supabase
    .from("worldbuilder_intenciones_humanas")
    .select("id, clave, nombre, descripcion, sinonimos, criterios, activa")
    .eq("activa", true)
    .order("nombre");
  return assertNoError(data as IntencionHumana[], error, "listarIntenciones") ?? [];
}

export async function listarCategorias(): Promise<CategoriaMaterial[]> {
  const { data, error } = await supabase
    .from("worldbuilder_categorias_materiales")
    .select("id, clave, nombre_humano, descripcion, sinonimos, activa")
    .eq("activa", true)
    .order("nombre_humano");
  return assertNoError(data as CategoriaMaterial[], error, "listarCategorias") ?? [];
}

export async function listarTiposObjeto(): Promise<TipoObjeto[]> {
  const { data, error } = await supabase
    .from("worldbuilder_tipos_objeto")
    .select(
      "id, clave, nombre_humano, sinonimos, plantilla_id, categoria_canonica, activo, " +
        "plantillas_geometricas!plantilla_id(parametros_base)",
    )
    .eq("activo", true)
    .order("nombre_humano");
  // Supabase-js no infiere bien el tipo de un embed simple sobre los tipos
  // generados del proyecto (devuelve GenericStringError[] en vez del shape
  // real) — se fuerza vía `unknown` primero, tal como pide TS, ya que el
  // shape real fue confirmado corriendo esta query en vivo.
  type FilaConPlantilla = Omit<TipoObjeto, "parametros_base"> & {
    plantillas_geometricas: { parametros_base: TipoObjeto["parametros_base"] } | null;
  };
  const filas = assertNoError(
    data as unknown as FilaConPlantilla[],
    error,
    "listarTiposObjeto",
  );
  // El embed de Supabase-js devuelve la relación 1:1 como objeto (no array)
  // cuando el FK es único, como acá (plantilla_id) — se aplana a plano para
  // no forzar a cada caller a desanidar plantillas_geometricas.parametros_base.
  return (filas ?? []).map((f) => ({
    ...f,
    parametros_base: f.plantillas_geometricas?.parametros_base ?? null,
  }));
}


/** Últimas creaciones (materiales e items), para el panel de auditoría/
 *  historial — mismo criterio que el resto del dominio: solo lectura, no
 *  reinterpreta nada de lo que el motor ya guardó. */
export async function listarCreaciones(limite = 30): Promise<WorldbuilderCreacion[]> {
  const { data, error } = await supabase
    .from("worldbuilder_creaciones")
    .select("id, entidad_tipo, entidad_id, entrada_humana, parametros, resultado, estado, created_at")
    .order("created_at", { ascending: false })
    .limit(limite);
  return assertNoError(data as WorldbuilderCreacion[], error, "listarCreaciones") ?? [];
}

// ─── Detección / resolución de lenguaje natural ────────────────────────────

/** Traduce texto libre ("quiero algo duro y resistente") a la lista de
 *  intenciones humanas que el motor reconoció — para mostrar como chips de
 *  confirmación ANTES de ejecutar cualquier búsqueda/creación, así el
 *  worldbuilder puede corregir si detectó mal en vez de crear con una
 *  intención mal interpretada en silencio. */
export async function detectarIntenciones(texto: string): Promise<IntencionDetectada[]> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_detectar_intenciones", {
    p_texto: texto,
  });
  return assertNoError(data as IntencionDetectada[], error, "detectarIntenciones") ?? [];
}

/** Traduce "quiero una espada" a la plantilla geométrica real —
 *  estado:"resuelto" trae plantilla_id; cualquier otro estado significa que
 *  el motor no reconoció el tipo y no hay que ofrecer "crear item" todavía. */
export async function resolverTipoObjeto(texto: string): Promise<TipoObjetoResuelto> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_resolver_tipo_objeto", {
    p_texto: texto,
  });
  return assertNoError(data as TipoObjetoResuelto, error, "resolverTipoObjeto");
}

// ─── Buscar antes de crear ──────────────────────────────────────────────────

/** "¿Ya existe algo así?" — evalúa TODOS los materiales del catálogo contra
 *  las intenciones detectadas en el texto y devuelve los mejores candidatos
 *  ya puntuados. Debe ofrecerse SIEMPRE antes de "Crear material": evita que
 *  el worldbuilder duplique un material que ya existe con otro nombre. */
export async function sugerirMateriales(texto: string, limite = 8): Promise<SugerenciaMaterialesResultado> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_sugerir_materiales", {
    p_texto: texto,
    p_limite: limite,
  });
  return assertNoError(data as SugerenciaMaterialesResultado, error, "sugerirMateriales");
}

// ─── Evaluación humana (✓ cumple / ✗ no cumple) ────────────────────────────

/** Evalúa un material YA EXISTENTE contra un texto de intención — para
 *  mostrar el mismo veredicto ✓/✗ en cualquier vista de detalle de
 *  Material, no solo justo después de crearlo. */
export async function evaluarMaterial(materialId: string, texto = ""): Promise<EvaluacionWorldbuilder> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_evaluar_material", {
    p_material_id: materialId,
    p_texto: texto,
  });
  return assertNoError(data as EvaluacionWorldbuilder, error, "evaluarMaterial");
}

/** Igual que evaluarMaterial pero para un Item ya existente. */
export async function evaluarItem(itemId: string, texto = ""): Promise<EvaluacionWorldbuilder> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_evaluar_item", {
    p_item_id: itemId,
    p_texto: texto,
  });
  return assertNoError(data as EvaluacionWorldbuilder, error, "evaluarItem");
}

/** Valor crudo [0,1] de una propiedad física de un material — solo lectura,
 *  uso puntual (p. ej. mostrar el número exacto detrás de un ✓/✗ si el
 *  worldbuilder pide "ver el detalle"). */
export async function valorPropiedadMaterial(materialId: string, propiedad: string): Promise<number> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_valor_material", {
    p_material_id: materialId,
    p_propiedad: propiedad,
  });
  return assertNoError(data as number, error, "valorPropiedadMaterial");
}

// ─── Crear / mezclar (mutación real) ────────────────────────────────────────

/** Crea un Material nuevo combinando 1-16 Materiales/Compuestos ya
 *  existentes bajo un nombre propio — categoría y las 7 propiedades físicas
 *  se derivan automáticamente (fn_derivar_categoria_material +
 *  calcular_propiedades_material), el worldbuilder nunca las toca a mano.
 *  `intenciones` es el texto libre original ("duro y resistente"), usado
 *  para devolver la evaluación ✓/✗ junto con el material recién creado.
 *  El material SIEMPRE se crea, incluso si no cumple lo pedido — `estado`
 *  en la respuesta indica el veredicto, nunca bloquea la creación. */
export async function crearMaterial(params: {
  nombre: string;
  descripcion?: string;
  componentes: ComponenteMaterial[];
  intenciones?: string;
}): Promise<MaterialCreadoResultado> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_crear_material", {
    p_nombre: params.nombre,
    p_descripcion: params.descripcion ?? "",
    p_componentes: params.componentes,
    p_intenciones: params.intenciones ?? "",
  });
  return assertNoError(data as MaterialCreadoResultado, error, "crearMaterial");
}

/** Combina exactamente 2 Materiales en una proporción A/B — caso particular
 *  y más simple de "crear material" (mismo shape de respuesta), pensado
 *  para el flujo "70% Feliros + 30% Cuero" del docx de diseño. Acepta la
 *  proporción como fracción [0,1] (0.7) o como porcentaje (70) — el motor
 *  normaliza cuando la suma supera 1. */
export async function mezclarMateriales(params: {
  nombre: string;
  materialAId: string;
  materialBId: string;
  proporcionA?: number;
  intenciones?: string;
  descripcion?: string;
}): Promise<MaterialCreadoResultado> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_mezclar_materiales", {
    p_nombre: params.nombre,
    p_material_a_id: params.materialAId,
    p_material_b_id: params.materialBId,
    p_proporcion_a: params.proporcionA ?? 0.5,
    p_intenciones: params.intenciones ?? "",
    p_descripcion: params.descripcion ?? "",
  });
  return assertNoError(data as MaterialCreadoResultado, error, "mezclarMateriales");
}

/** Crea un Item nuevo a partir de un tipo humano ("espada") + 0..N
 *  Materiales ya existentes. Si el tipo no se resuelve, el motor devuelve
 *  {estado:"requiere_plantilla", tipo:...} SIN crear nada — el caller debe
 *  chequear `estado` antes de asumir que `id` existe. */
export async function crearItem(params: {
  nombre: string;
  tipoTexto: string;
  descripcion?: string;
  materiales?: MaterialDeItem[];
  intenciones?: string;
}): Promise<ItemCreadoResultado> {
  const { data, error } = await supabase.rpc("fn_worldbuilder_crear_item", {
    p_nombre: params.nombre,
    p_tipo_texto: params.tipoTexto,
    p_descripcion: params.descripcion ?? "",
    p_materiales: params.materiales ?? [],
    p_intenciones: params.intenciones ?? "",
  });
  return assertNoError(data as ItemCreadoResultado, error, "crearItem");
}
