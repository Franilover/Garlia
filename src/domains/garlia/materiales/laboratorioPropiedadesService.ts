/**
 * laboratorioPropiedadesService.ts — dominio Materiales/Compuestos
 * ───────────────────────────────────────────────────────────────────────────
 * Capa fina sobre `supabase.rpc(...)`, mismo patrón que sandbox/sandboxService.ts:
 * este archivo NO decide qué es "buena" dureza ni pondera nada — solo llama
 * a las RPC ya existentes en Supabase y normaliza su respuesta.
 *
 * RPC usadas (confirmadas existentes en el proyecto, no se crean acá):
 *   - sugerir_compuestos_por_propiedades(p_requisitos jsonb, p_limite int)
 *   - sugerir_materiales_por_propiedades_v3(p_requisitos jsonb, p_limite int)
 *
 * Ambas devuelven TABLE(id/material_id, nombre, puntuacion, propiedades,
 * coincidencias) ordenada por puntuacion desc. p_requisitos tiene la forma:
 *   { "<clave_propiedad>": { "min"?: number, "max"?: number } }
 * (el backend también acepta "objetivo", pero la UI de este slice solo
 * ofrece min/max — no se expone "objetivo" porque no hay un caso de uso
 * claro para él en el Lab todavía).
 */

import { supabase } from "@/infra/supabase/supabase";

import type {
  CoincidenciaPropiedadLab,
  EntidadLab,
  ParCompuestosSugerido,
  ParElementosSugerido,
  RequisitoPropiedadLab,
  ResultadoCreacionCompuestoLab,
  ResultadoCreacionMaterialLab,
  ResultadoSimulacionCompuesto,
  ResultadoSimulacionMaterial,
  SugerenciaPropiedadLab,
} from "./laboratorioPropiedades.types";

function assertNoError<T>(data: T, error: { message: string } | null, contexto: string): T {
  if (error) {
    throw new Error(`[laboratorioPropiedadesService] ${contexto}: ${error.message}`);
  }
  return data;
}

/** Arma el jsonb p_requisitos a partir de los requisitos armados en la UI.
 *  Descarta requisitos sin clave o sin ningún límite seteado — la RPC los
 *  ignoraría igual (no matchean contra `bounds`), pero es más claro no
 *  mandarlos. */
function armarRequisitosJson(requisitos: RequisitoPropiedadLab[]): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const r of requisitos) {
    if (!r.clave) continue;
    if (r.min === null && r.max === null) continue;
    const rango: Record<string, number> = {};
    if (r.min !== null) rango.min = r.min;
    if (r.max !== null) rango.max = r.max;
    salida[r.clave] = rango;
  }
  return salida;
}

/** Normaliza una fila cruda de cualquiera de las dos RPC (difieren solo en
 *  el nombre de la columna id) al tipo SugerenciaPropiedadLab compartido. */
function normalizarFila(
  fila: Record<string, unknown>,
  campoId: "id" | "material_id",
): SugerenciaPropiedadLab {
  return {
    id: String(fila[campoId]),
    nombre: String(fila.nombre ?? ""),
    puntuacion: Number(fila.puntuacion ?? 0),
    propiedades: (fila.propiedades as Record<string, number>) ?? {},
    coincidencias: (fila.coincidencias as CoincidenciaPropiedadLab[]) ?? [],
  };
}

/** Pide al backend qué Compuestos o Materiales del catálogo real cumplen
 *  mejor los requisitos de propiedad armados en la UI. `limite` acota
 *  cuántas filas trae la RPC (ambas RPC clampean 1..100 igual, esto es
 *  solo el valor que se les pasa). */
export async function sugerirPorPropiedades(
  entidad: EntidadLab,
  requisitos: RequisitoPropiedadLab[],
  limite = 20,
): Promise<SugerenciaPropiedadLab[]> {
  const pRequisitos = armarRequisitosJson(requisitos);

  // Sin ningún requisito con límite real, no tiene sentido pegarle a la
  // RPC (devolvería el catálogo entero con puntuación 0/no diferenciada).
  // La UI ya evita este estado, pero se guarda acá también por si algún
  // caller nuevo no lo hace.
  if (Object.keys(pRequisitos).length === 0) return [];

  if (entidad === "compuesto") {
    const { data, error } = await supabase.rpc("sugerir_compuestos_por_propiedades", {
      p_requisitos: pRequisitos,
      p_limite: limite,
    });
    const filas = assertNoError(data as Record<string, unknown>[] | null, error, "sugerirCompuestos") ?? [];
    return filas.map((f) => normalizarFila(f, "id"));
  }

  const { data, error } = await supabase.rpc("sugerir_materiales_por_propiedades_v3", {
    p_requisitos: pRequisitos,
    p_limite: limite,
  });
  const filas = assertNoError(data as Record<string, unknown>[] | null, error, "sugerirMateriales") ?? [];
  return filas.map((f) => normalizarFila(f, "material_id"));
}

/**
 * Simula "si combino estos Elementos (partes iguales), ¿qué Compuesto
 * resultaría?" — vía la RPC de solo-lectura simular_compuesto_desde_
 * elementos. No crea ninguna fila; es la misma fórmula que usa el motor
 * para un Compuesto real (fn_calcular_compuesto_desde_elementos), aplicada
 * a una combinación que no existe en el catálogo.
 *
 * Requiere 2+ ids de Elemento — la RPC devuelve estado
 * "insuficientes_elementos" si se manda menos, y la UI no debería llegar
 * a llamar esto con menos de 2 seleccionados.
 */
export async function simularCompuestoDesdeElementos(
  elementoIds: string[],
): Promise<ResultadoSimulacionCompuesto> {
  const { data, error } = await supabase.rpc("simular_compuesto_desde_elementos", {
    p_elemento_ids: elementoIds,
  });
  return assertNoError(
    data as ResultadoSimulacionCompuesto,
    error,
    "simularCompuestoDesdeElementos",
  );
}

/**
 * Simula "si combino estos Compuestos (partes iguales), ¿qué Material
 * resultaría?" — vía la RPC de solo-lectura simular_material_desde_
 * compuestos. No crea ninguna fila; agrega masa/carga/volumen por suma y
 * promedia el resto de propiedades con la misma lógica que
 * _calcular_propiedades_material_recursivo usa para componentes tipo
 * "compuesto" (sin Estructura asociada, eso es otro nivel).
 *
 * Requiere 2+ ids de Compuesto.
 */
export async function simularMaterialDesdeCompuestos(
  compuestoIds: string[],
): Promise<ResultadoSimulacionMaterial> {
  const { data, error } = await supabase.rpc("simular_material_desde_compuestos", {
    p_compuesto_ids: compuestoIds,
  });
  return assertNoError(
    data as ResultadoSimulacionMaterial,
    error,
    "simularMaterialDesdeCompuestos",
  );
}

/**
 * "Elegí una propiedad → mostrame las N combinaciones de 2 Elementos que
 * darían el compuesto resultante con el valor más alto en esa propiedad."
 * Vía sugerir_pares_elementos_por_propiedad, que evalúa TODOS los pares
 * del catálogo real (no uno armado a mano) con la fórmula real de
 * compuesto y devuelve el top N ya ordenado desc. Solo lectura.
 */
export async function sugerirParesElementosPorPropiedad(
  propiedad: string,
  limite = 20,
): Promise<ParElementosSugerido[]> {
  const { data, error } = await supabase.rpc("sugerir_pares_elementos_por_propiedad", {
    p_propiedad: propiedad,
    p_limite: limite,
  });
  const filas =
    assertNoError(data as Record<string, unknown>[] | null, error, "sugerirParesElementosPorPropiedad") ?? [];
  return filas.map((f) => ({
    elementoAId: String(f.elemento_a_id),
    elementoANombre: String(f.elemento_a_nombre),
    elementoBId: String(f.elemento_b_id),
    elementoBNombre: String(f.elemento_b_nombre),
    valor: Number(f.valor),
    propiedades: (f.propiedades as Record<string, number>) ?? {},
  }));
}

/**
 * "Elegí una propiedad → mostrame las N combinaciones de 2 Compuestos que
 * darían el Material resultante con el valor más alto en esa propiedad."
 * Vía sugerir_pares_compuestos_por_propiedad, análoga a la de Elementos
 * pero un nivel arriba: evalúa TODOS los pares del catálogo real de
 * Compuestos con promedio simple (misma fórmula que
 * simular_material_desde_compuestos) y devuelve el top N ya ordenado
 * desc. Solo lectura.
 */
export async function sugerirParesCompuestosPorPropiedad(
  propiedad: string,
  limite = 20,
): Promise<ParCompuestosSugerido[]> {
  const { data, error } = await supabase.rpc("sugerir_pares_compuestos_por_propiedad", {
    p_propiedad: propiedad,
    p_limite: limite,
  });
  const filas =
    assertNoError(data as Record<string, unknown>[] | null, error, "sugerirParesCompuestosPorPropiedad") ?? [];
  return filas.map((f) => ({
    compuestoAId: String(f.compuesto_a_id),
    compuestoANombre: String(f.compuesto_a_nombre),
    compuestoBId: String(f.compuesto_b_id),
    compuestoBNombre: String(f.compuesto_b_nombre),
    valor: Number(f.valor),
    propiedades: (f.propiedades as Record<string, number>) ?? {},
  }));
}

/**
 * Sugiere un nombre para la combinación vía fn_generar_nombre_material_v1
 * (fragmentos fonéticos de los nombres base + sufijo por categoría, con
 * anti-colisión contra compuestos y materiales existentes — misma función
 * que ya usa el resto del proyecto, ej. "Ashvane"+"Cargess"→"Ashvacargeil").
 * Es solo una propuesta: la UI la precarga en un input editable, nunca crea
 * con este nombre sin que el usuario lo confirme.
 */
export async function sugerirNombreCombinacion(
  nombresBase: string[],
  categoria?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("fn_generar_nombre_material_v1", {
    p_nombres_base: nombresBase,
    p_categoria_clave: categoria ?? null,
  });
  return assertNoError(data as string, error, "sugerirNombreCombinacion");
}

/**
 * Materializa de verdad (a diferencia de simular_* / sugerir_pares_*, que
 * son solo lectura) un Compuesto nuevo a partir de N Elementos reales — vía la
 * RPC fn_worldbuilder_crear_compuesto. Partes iguales (cantidad=1 cada
 * elemento) salvo que se pase `cantidades`, mismo criterio que el resto de
 * este slice (sin control fino de proporción todavía).
 *
 * Se usa tanto desde una fila de "¿Qué combino para conseguir X?" (2
 * elementos, ids salen de ParElementosSugerido) como desde el Simulador
 * manual (2+ elementos, ids salen de seleccionIds) — misma función para
 * ambos casos, el nivel de UI no le importa a la RPC.
 */
export async function crearCompuestoDesdeElementos(
  nombre: string,
  elementoIds: string[],
  opciones?: { categoria?: string; notas?: string; cantidades?: Record<string, number> },
): Promise<ResultadoCreacionCompuestoLab> {
  const elementos = elementoIds.map((id) => ({
    id,
    ...(opciones?.cantidades?.[id] ? { cantidad: opciones.cantidades[id] } : {}),
  }));
  const { data, error } = await supabase.rpc("fn_worldbuilder_crear_compuesto", {
    p_nombre: nombre,
    p_categoria: opciones?.categoria ?? null,
    p_elementos: elementos,
    p_notas: opciones?.notas ?? "Creado desde Laboratorio.",
  });
  return assertNoError(data as ResultadoCreacionCompuestoLab, error, "crearCompuestoDesdeElementos");
}

/**
 * Materializa de verdad un Material nuevo a partir de N Compuestos reales —
 * vía la RPC fn_worldbuilder_crear_material (ya existente, genérica: acepta
 * componentes tipo "material" o "compuesto" mezclados, acá se usan todos
 * tipo "compuesto" porque es el caso de este slice). Partes iguales salvo
 * que se pasen `proporciones` explícitas.
 *
 * Mismo uso dual que crearCompuestoDesdeElementos: sirve tanto para una
 * fila de "Compuestos → Material" del ranking como para el Simulador
 * manual de Compuesto+Compuesto.
 */
export async function crearMaterialDesdeCompuestos(
  nombre: string,
  compuestoIds: string[],
  opciones?: { descripcion?: string; proporciones?: Record<string, number> },
): Promise<ResultadoCreacionMaterialLab> {
  const componentes = compuestoIds.map((id) => ({
    tipo: "compuesto" as const,
    id,
    ...(opciones?.proporciones?.[id] ? { proporcion: opciones.proporciones[id] } : {}),
  }));
  const { data, error } = await supabase.rpc("fn_worldbuilder_crear_material", {
    p_nombre: nombre,
    p_descripcion: opciones?.descripcion ?? "",
    p_componentes: componentes,
    p_intenciones: "Creado desde Laboratorio.",
  });
  return assertNoError(data as ResultadoCreacionMaterialLab, error, "crearMaterialDesdeCompuestos");
}
