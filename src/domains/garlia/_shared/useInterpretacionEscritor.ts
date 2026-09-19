"use client";

/**
 * useInterpretacionEscritor.ts — FE-018
 * ───────────────────────────────────────────────────────────────────────────
 * Lee la capa humana (modo Escritor) desde el CONTRATO CANÓNICO de Supabase:
 *
 *   propiedad + valor
 *        ↓  fn_interpretar_propiedad_humana()
 *   reglas de interpretación en Supabase
 *        ↓
 *   v_frontend_escritor_propiedades_interpretadas   ← lo único que se lee acá
 *        ↓
 *   frontend
 *
 * El frontend NO implementa umbrales, clasificaciones, textos propios,
 * conversiones ni interpretaciones locales: solo pinta `nivel` y
 * `significado` tal como los devuelve la vista, y solo cuando
 * `valor_mostrable = true` Y hay interpretación humana válida (`nivel`
 * presente). Reemplaza al camino legado que leía
 * `propiedades_emergentes.interpretacion_humana` embebido en cada fila
 * (adjuntar() en elementos/types.ts), que solo existía para Elemento y
 * Compuesto y dejaba a Material y Objeto sin capa humana.
 *
 * FE-018: antes de esta migración, este archivo mantenía su propia
 * autoridad sobre qué propiedades existen en el modo Escritor
 * (PROPIEDADES_CAPA_HUMANA, una lista blanca de "las 11 acordadas"), cómo
 * se llaman en la vista vs. en el frontend (ALIAS_VISTA_A_FRONTEND,
 * ALIAS_ELEMENTO) y qué tarjetas "extra" agregar cuando la vista trae una
 * propiedad sin columna propia en el frontend (TARJETAS_SOLO_VISTA, ej.
 * Cohesión). Esas tres cosas quedan retiradas: qué propiedades existen, su
 * nombre, su grupo y su orden ahora los decide
 * `v_frontend_contrato_presentacion_detalle` (ver useContratoPresentacion),
 * no una lista local. Este archivo se reduce a su función original: leer
 * `v_frontend_escritor_propiedades_interpretadas` y devolver el mapa
 * clave→interpretación, con la regla estricta de ocultamiento.
 *
 * Regla obligatoria (sin excepciones ni fallback):
 *   interpretación humana válida + valor_mostrable = true  → mostrar
 *   cualquier otro caso                                    → ocultar
 * Nunca se cae al valor técnico como sustituto de una interpretación
 * ausente — eso lo decide el caller (o mejor, el contrato) mostrando la
 * propiedad como no disponible, nunca sustituyendo el número técnico en su
 * lugar.
 *
 * Cache-first vía Dexie (ver guardarEscritorCache/leerEscritorCache en
 * syncEngine.ts): al cambiar de entidad se pinta primero lo que ya haya en
 * Dexie (si hay, instantáneo y funciona offline), y SIEMPRE se dispara en
 * paralelo la consulta a Supabase, que es la fuente de verdad — la vista se
 * recalcula en el servidor cuando cambian las reglas o los valores, así que
 * el resultado de Supabase, cuando llega, reemplaza lo que se haya pintado
 * desde Dexie y además reescribe la copia local para la próxima vez. Si
 * Supabase falla (offline/timeout) y ya había algo de Dexie, ese algo queda
 * como último resultado válido en vez de caer al valor técnico.
 */

import { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import {
  guardarEscritorCache,
  leerEscritorCache,
} from "@/infra/sync/syncEngine";

/** Tipos de entidad que el interpretador ya cubre (vista: entidad_tipo). */
export type EntidadInterpretable = "elemento" | "compuesto" | "material" | "objeto";

/** Nivel + significado ya resueltos por el motor, listos para pintar. */
export interface InterpretacionEscritor {
  nivel: string;
  significado: string | null;
  /** Valor numérico tal como lo entrega la vista (`valor`). Solo se usa
   *  para propiedades que NO existen como columna en el frontend (ej.
   *  `cohesion`) — nunca se recalcula ni se reinterpreta acá. */
  valor: number | null;
}

/** Mapa `propiedad_clave de la vista → interpretación`. La clave usada acá
 *  es EXACTAMENTE `propiedad_clave` tal como la entrega
 *  `v_frontend_escritor_propiedades_interpretadas` — ya no se traduce a un
 *  nombre de columna interno del frontend (ver nota de migración FE-018
 *  arriba). El caller que necesite cruzar esto contra el contrato de
 *  presentación (`propiedad_clave` de
 *  v_frontend_contrato_presentacion_detalle) usa la misma clave, porque
 *  ambas vistas comparten el mismo vocabulario canónico de propiedad. */
export type InterpretacionesPorClave = Record<string, InterpretacionEscritor>;

/** Fila mínima que se pide a la vista. */
interface FilaVista {
  propiedad_clave: string;
  valor: string | null;
  valor_mostrable: boolean | null;
  interpretacion_humana: {
    nivel?: string | null;
    significado?: string | null;
  } | null;
}

/**
 * Convierte las filas de la vista en el mapa por `propiedad_clave` tal
 * como la entrega Supabase. Pura y exportada para poder probarla sin red.
 *
 * Regla estricta (sin fallback):
 *  - `valor_mostrable !== true` → se descarta.
 *  - sin `interpretacion_humana.nivel` (interpretación inválida/ausente) →
 *    se descarta.
 * No hay lista blanca local ni alias de traducción de clave: toda fila que
 * cumpla las dos condiciones de arriba se expone tal cual. Cualquier
 * filtro adicional sobre qué propiedades mostrar en un editor puntual debe
 * salir del contrato de presentación (ver useContratoPresentacion), no de
 * una constante en este archivo.
 */
export function mapearInterpretaciones(
  filas: FilaVista[],
  _entidad: EntidadInterpretable,
): InterpretacionesPorClave {
  const out: InterpretacionesPorClave = {};
  for (const f of filas) {
    if (f.valor_mostrable !== true) continue;
    const nivel = f.interpretacion_humana?.nivel;
    if (!nivel) continue;

    const n = f.valor === null || f.valor === undefined ? NaN : Number(f.valor);
    out[f.propiedad_clave] = {
      nivel,
      significado: f.interpretacion_humana?.significado ?? null,
      valor: Number.isFinite(n) ? n : null,
    };
  }
  return out;
}

/**
 * Interpretaciones del modo Escritor para UNA entidad.
 *
 * `activo` permite pedirlas solo cuando el editor está en modo Escritor (no
 * se hace ninguna consulta en modo Científico).
 *
 * `loading` solo es `true` mientras NO hay nada para pintar todavía (ni
 * Dexie ni Supabase respondieron). Si Dexie tiene algo, se pinta al
 * instante con `loading = false` y la consulta a Supabase sigue en
 * paralelo en segundo plano, revalidando cuando llega.
 *
 * Si ambas fuentes fallan/están vacías, devuelve `{}`: los llamadores deben
 * OCULTAR la propiedad cuando no hay interpretación — nunca sustituirla
 * por el valor técnico (ver regla estricta en el encabezado del archivo).
 */
export function useInterpretacionEscritor(
  entidad: EntidadInterpretable,
  entidadId: string | null | undefined,
  activo = true,
): { interpretaciones: InterpretacionesPorClave; loading: boolean } {
  const [interpretaciones, setInterpretaciones] = useState<InterpretacionesPorClave>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activo || !entidadId) {
      setInterpretaciones({});
      setLoading(false);
      return;
    }

    let cancelado = false;
    let pintadoDesdeCache = false;
    setLoading(true);

    (async () => {
      // 1) Dexie primero: si hay algo cacheado de una lectura anterior, se
      //    pinta ya (instantáneo, funciona offline) mientras se revalida.
      try {
        const local = await leerEscritorCache(entidad, entidadId);
        if (cancelado) return;
        if (local.length > 0) {
          setInterpretaciones(mapearInterpretaciones(local as unknown as FilaVista[], entidad));
          setLoading(false);
          pintadoDesdeCache = true;
        }
      } catch {
        // sin cache local todavía, seguimos directo a Supabase
      }

      // 2) Supabase: fuente de verdad. Se consulta SIEMPRE, haya o no
      //    pintado algo desde Dexie, y su resultado reemplaza lo anterior.
      try {
        const { data, error } = await (supabase as any)
          .from("v_frontend_escritor_propiedades_interpretadas")
          .select("propiedad_clave, valor, valor_mostrable, interpretacion_humana")
          .eq("entidad_tipo", entidad)
          .eq("entidad_id", entidadId)
          .eq("valor_mostrable", true);

        if (cancelado) return;
        if (error) {
          console.warn("[useInterpretacionEscritor] no se pudo leer la vista:", error.message);
          if (!pintadoDesdeCache) setInterpretaciones({});
        } else {
          const filas = (data ?? []) as FilaVista[];
          setInterpretaciones(mapearInterpretaciones(filas, entidad));
          // Actualiza el cache de Dexie con lo recién leído, para que la
          // próxima vez (y el próximo offline) tengan esta versión.
          void guardarEscritorCache(entidad, entidadId, filas);
        }
      } catch (e) {
        if (!cancelado) {
          console.warn("[useInterpretacionEscritor] error inesperado:", e);
          if (!pintadoDesdeCache) setInterpretaciones({});
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [entidad, entidadId, activo]);

  return { interpretaciones, loading };
}

/**
 * Renombra las claves de un mapa de interpretaciones ya filtrado (solo
 * traduce nombres de columna, nunca decide qué se muestra — eso ya pasó en
 * mapearInterpretaciones/valor_mostrable+nivel antes de llegar acá).
 *
 * FE-018: reemplaza a ALIAS_VISTA_A_FRONTEND/ALIAS_ELEMENTO, que vivían
 * hardcodeados en este archivo como autoridad centralizada. La diferencia
 * es de propietario, no de mecanismo: ahí eran una tabla opaca que este
 * módulo "sabía" aplicar a cualquier entidad; acá cada editor pasa
 * EXPLÍCITAMENTE su propio mapa de 1-2 renombres conocidos (ej. Compuesto:
 * `dureza_compuesto` → `dureza`, el mismo nombre de columna que ya usa en
 * su propia función de armado de tarjetas) — no hay lista compartida entre
 * entidades, ni autoridad sobre qué propiedades existen: si una clave no
 * está en `alias`, pasa tal cual.
 */
export function renombrarClaves(
  interpretaciones: InterpretacionesPorClave,
  alias: Record<string, string>,
): InterpretacionesPorClave {
  const out: InterpretacionesPorClave = {};
  for (const [clave, valor] of Object.entries(interpretaciones)) {
    out[alias[clave] ?? clave] = valor;
  }
  return out;
}

/**
 * Fusiona las interpretaciones del motor en una lista de tarjetas
 * (PropiedadCalculada). Solo agrega `nivelHumano`/`significadoHumano`; nunca
 * toca el valor técnico ni lo recalcula, así que el modo Científico queda
 * idéntico.
 *
 * FE-018: antes, una tarjeta `p` sin interpretación se devolvía "tal cual",
 * lo que en el caller (TarjetaPropiedad, modo "humana") terminaba cayendo
 * de vuelta al valor técnico como fallback visual. La regla del contrato es
 * estricta: sin interpretación válida, la propiedad se OCULTA en modo
 * Escritor, no se sustituye. Por eso esta función ahora FILTRA en vez de
 * solo mapear — devuelve únicamente las propiedades que sí tienen
 * interpretación. El caller ya no necesita (ni debe) tener su propio
 * fallback `interpretacion ?? valorTecnico`.
 */
export function fusionarInterpretaciones<
  T extends { clave: string; nivelHumano?: string; significadoHumano?: string },
>(propiedades: T[], interpretaciones: InterpretacionesPorClave): T[] {
  const out: T[] = [];
  for (const p of propiedades) {
    const h = interpretaciones[p.clave];
    if (!h) continue; // sin interpretación válida → se oculta, nunca fallback técnico
    out.push({ ...p, nivelHumano: h.nivel, significadoHumano: h.significado ?? undefined });
  }
  return out;
}

/**
 * Igual que fusionarInterpretaciones, pero además agrega como tarjeta
 * cualquier propiedad que la vista trae interpretada y que todavía no
 * existía en la lista `propiedades` de entrada (por ejemplo, una propiedad
 * de la capa humana que no tiene columna/tarjeta propia en el frontend,
 * como Cohesión en Compuesto/Material).
 *
 * FE-018: antes había una lista fija (TARJETAS_SOLO_VISTA) con la única
 * propiedad "extra" conocida (Cohesión), su label, descripción y grupo
 * hardcodeados acá. Ahora el nombre/label/grupo de una propiedad narrativa
 * SIEMPRE sale del contrato de presentación
 * (v_frontend_contrato_presentacion_detalle: nombre_escritor,
 * descripcion_escritor, grupo/grupo_nombre) — este archivo ya no inventa
 * ninguno. El caller pasa las filas del contrato (modo escritor) para esta
 * entidad; si no las pasa, simplemente no se agregan tarjetas "solo vista"
 * (nunca se inventa un nombre localmente como fallback).
 */
export function fusionarConTarjetasDeVista<
  T extends {
    clave: string;
    label: string;
    valor: string | null;
    proporcion?: number;
    descripcion: string;
    grupo?: string;
    nivelHumano?: string;
    significadoHumano?: string;
  },
>(
  propiedades: T[],
  interpretaciones: InterpretacionesPorClave,
  /** Filas del contrato de presentación (modo escritor) para esta entidad
   *  (ver useContratoPresentacion), usadas ÚNICAMENTE para resolver
   *  nombre/descripción/grupo de una propiedad que la vista interpreta
   *  pero que no trae tarjeta propia en `propiedades`. */
  filasContrato: {
    propiedad_clave: string | null;
    propiedad_nombre: string | null;
    nombre_escritor: string | null;
    descripcion_escritor: string | null;
    grupo_nombre: string;
  }[] = [],
): T[] {
  const base = fusionarInterpretaciones(propiedades, interpretaciones);
  const claves = new Set(base.map((p) => p.clave));
  const extras: T[] = [];

  for (const [clave, h] of Object.entries(interpretaciones)) {
    if (claves.has(clave)) continue;
    const fila = filasContrato.find((f) => f.propiedad_clave === clave);
    if (!fila) continue; // sin fila del contrato no hay nombre/grupo autorizado — se omite, no se inventa

    extras.push({
      clave,
      label: fila.nombre_escritor ?? fila.propiedad_nombre ?? clave,
      valor: h.valor === null ? null : h.valor.toFixed(3),
      proporcion: h.valor === null ? undefined : Math.max(0, Math.min(1, h.valor)),
      descripcion: fila.descripcion_escritor ?? "",
      grupo: fila.grupo_nombre,
      nivelHumano: h.nivel,
      significadoHumano: h.significado ?? undefined,
    } as unknown as T);
  }
  return [...base, ...extras];
}
