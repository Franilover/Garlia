/**
 * estadoInicial.ts — dominio Sandbox
 * ───────────────────────────────────────────────────────────────────────────
 * Extraído de SandboxPage.tsx (fase 2026-09, "Interacción = nuevo Sandbox")
 * para que useInteraccionRoute pueda reusar exactamente la misma lógica de
 * "copiar Elemento/Compuesto del catálogo al Sandbox" sin duplicarla ni
 * importar desde un componente de página.
 *
 * IMPORTANTE: no recalcula ninguna propiedad física, solo copia valores que
 * ya existen en el catálogo real (Elemento/Compuesto) — mismo criterio que
 * el resto del dominio Sandbox: el motor de Supabase manda sobre
 * estado_actual, este archivo solo arma el estado_inicial que se le pasa a
 * agregar_entidad_sandbox.
 */

import type { Compuesto, Elemento } from "@/domains/garlia/elementos/types";

export function estadoInicialDeElemento(elemento: Elemento): Record<string, unknown> {
  const propiedades: Record<string, unknown> = {};

  const propiedadesFisicas = [
    "masa_base",
    "estabilidad",
    "rigidez",
    "flexibilidad",
    "dureza",
    "conductividad",
    "transparencia",
    "capacidad_transformacion",
    "dinamismo_particular",
    "valencia_estructural",
    "capacidad_enlace",
    "polaridad_estructural",
    "saturacion_enlace",
    "regimen_estructural",
  ] as const;

  for (const clave of propiedadesFisicas) {
    const valor = elemento[clave];

    if (valor !== null && valor !== undefined) {
      propiedades[clave] = valor;
    }
  }

  propiedades.numero_atomico = elemento.numero_atomico;
  propiedades.es_noble = elemento.es_noble;
  propiedades.es_catalizador = elemento.es_catalizador ?? false;

  propiedades.nucleo = elemento.nucleo;
  propiedades.media = elemento.media;
  propiedades.externa = elemento.externa;

  return {
    propiedades,
    estados: {},
  };
}

/**
 * Igual que para Elementos, pero respetando las propiedades
 * calculadas que ya proporciona Supabase para Compuestos.
 */
export function estadoInicialDeCompuesto(compuesto: Compuesto): Record<string, unknown> {
  const propiedades: Record<string, unknown> = {};

  const propiedadesFisicas = [
    "masa",
    "carga",
    "estabilidad",
    "rigidez",
    "flexibilidad",
    "compatibilidad",
    "energia_enlace",
  ] as const;

  for (const clave of propiedadesFisicas) {
    const valor = compuesto[clave];

    if (valor !== null && valor !== undefined) {
      propiedades[clave] = valor;
    }
  }

  if (compuesto.tipo_compuesto != null) {
    propiedades.tipo_compuesto = compuesto.tipo_compuesto;
  }

  // 2026-09: Compuesto.estado_estructura → estado_topologia y
  // Compuesto.tipo_estructura → topologia_estructura (rename en Supabase).
  // La clave de salida en "propiedades" se deja igual (estado_estructura/
  // tipo_estructura) porque es solo la etiqueta interna de display del
  // sandbox, no una columna real.
  if (compuesto.estado_topologia != null) {
    propiedades.estado_estructura = compuesto.estado_topologia;
  }

  if (compuesto.formula_canonica != null) {
    propiedades.formula_canonica = compuesto.formula_canonica;
  }

  if (compuesto.clasificacion != null) {
    propiedades.clasificacion = compuesto.clasificacion;
  }

  if (compuesto.topologia_estructura != null) {
    propiedades.tipo_estructura = compuesto.topologia_estructura;
  }

  if (compuesto.estado != null) {
    propiedades.estado = compuesto.estado;
  }

  return {
    propiedades,
    estados: {},
  };
}
