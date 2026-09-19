"use client";

/**
 * useInterpretacionEscritor.ts
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
 * `valor_mostrable = true`. Reemplaza al camino legado que leía
 * `propiedades_emergentes.interpretacion_humana` embebido en cada fila
 * (adjuntar() en elementos/types.ts), que solo existía para Elemento y
 * Compuesto y dejaba a Material y Objeto sin capa humana.
 *
 * Cache-first vía Dexie (ver guardarEscritorCache/leerEscritorCache en
 * syncEngine.ts): al cambiar de entidad se pinta primero lo que ya haya en
 * Dexie (si hay, instantáneo y funciona offline), y SIEMPRE se dispara en
 * paralelo la consulta a Supabase, que es la fuente de verdad — la vista se
 * recalcula en el servidor cuando cambian las reglas o los valores, así que
 * el resultado de Supabase, cuando llega, reemplaza lo que se haya pintado
 * desde Dexie y además reescribe la copia local para la próxima vez. Si
 * Supabase falla (offline/timeout) y ya había algo de Dexie, ese algo queda
 * como último resultado válido.
 *
 * REGLA ESTRICTA (sin fallback técnico): en modo Escritor una propiedad se
 * muestra SOLO si la vista dice `valor_mostrable = true` y trae un `nivel`.
 * Cualquier otro caso se OCULTA. Nunca se cae al valor técnico.
 *
 * Este archivo NO decide qué propiedades existen, cómo se llaman ni en qué
 * grupo van: eso es del contrato (ver useContratoPresentacion.ts).
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

/** Mapa `clave de propiedad del frontend → interpretación`. */
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
 * Convierte las filas de la vista en un mapa por `propiedad_clave`, TAL COMO
 * la entrega Supabase. Pura y exportada para poder probarla sin red.
 *
 * Sin alias de clave y sin lista blanca: qué claves existen lo decide el
 * contrato, no este archivo.
 *
 * Reglas:
 *  - `valor_mostrable !== true` → se descarta.
 *  - sin `interpretacion_humana.nivel` → se descarta.
 */
export function mapearInterpretaciones(filas: FilaVista[]): InterpretacionesPorClave {
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
 * Si ambas fuentes fallan/están vacías, devuelve `{}` y en modo Escritor no
 * se muestra ninguna propiedad (no hay fallback técnico).
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
          setInterpretaciones(mapearInterpretaciones(local as unknown as FilaVista[]));
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
          setInterpretaciones(mapearInterpretaciones(filas));
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
 * Aplica la regla estricta del modo Escritor sobre una lista de tarjetas.
 *
 *  - `valor_mostrable = true` + `nivel` válido → la tarjeta se muestra, con
 *    `nivelHumano`/`significadoHumano` del motor.
 *  - cualquier otro caso → la tarjeta se OCULTA. No hay fallback al valor
 *    técnico: mostrar el número donde el motor no interpretó rompería el
 *    contrato del modo Escritor.
 *
 * `interpretaciones` está indexado por `propiedad_clave` de la vista. Si la
 * tarjeta usa otra clave para la misma propiedad, quien llama renombra
 * explícitamente con `renombrarClaves` — no hay tabla de alias compartida.
 */
export function fusionarInterpretaciones<
  T extends { clave: string; nivelHumano?: string; significadoHumano?: string },
>(propiedades: T[], interpretaciones: InterpretacionesPorClave): T[] {
  const out: T[] = [];
  for (const p of propiedades) {
    const h = interpretaciones[p.clave];
    if (!h || !h.nivel) continue;
    out.push({ ...p, nivelHumano: h.nivel, significadoHumano: h.significado ?? undefined });
  }
  return out;
}

/**
 * Renombra claves de un mapa de interpretaciones. Utilidad local y
 * EXPLÍCITA: cada caller declara su propio mapa de 1–2 claves. No es una
 * autoridad compartida; si una clave del contrato difiere de la clave de
 * la tarjeta, la corrección de fondo es en Supabase.
 */
export function renombrarClaves(
  interpretaciones: InterpretacionesPorClave,
  mapa: Record<string, string>,
): InterpretacionesPorClave {
  const out: InterpretacionesPorClave = {};
  for (const [k, v] of Object.entries(interpretaciones)) out[mapa[k] ?? k] = v;
  return out;
}

/** Datos de una tarjeta que vive SOLO en la vista (no existe como columna en
 *  el frontend). Nombre, descripción y grupo salen del CONTRATO
 *  (`nombre_escritor`, `descripcion_escritor`, `grupo_nombre`); nada se
 *  inventa localmente. */
export interface FilaContratoMinima {
  propiedad_clave: string | null;
  grupo_nombre: string;
  propiedad_nombre?: string | null;
  nombre_escritor?: string | null;
  descripcion_escritor?: string | null;
}

/**
 * Igual que `fusionarInterpretaciones`, pero además agrega las tarjetas que
 * el motor interpretó y que NO existen como tarjeta en el frontend (hoy:
 * Cohesión). Se agregan solo si el contrato las declara para este modo, y
 * su nombre/descripción/grupo vienen del contrato, no de una tabla local.
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
  filasContrato: FilaContratoMinima[],
): T[] {
  const base = fusionarInterpretaciones(propiedades, interpretaciones);
  const yaPresentes = new Set(propiedades.map((p) => p.clave));
  const extras: T[] = [];

  for (const f of filasContrato) {
    const clave = f.propiedad_clave;
    if (!clave || yaPresentes.has(clave)) continue;
    const h = interpretaciones[clave];
    if (!h || !h.nivel) continue;
    extras.push({
      clave,
      label: f.nombre_escritor ?? f.propiedad_nombre ?? clave,
      valor: h.valor === null ? null : h.valor.toFixed(3),
      proporcion: h.valor === null ? undefined : Math.max(0, Math.min(1, h.valor)),
      descripcion: f.descripcion_escritor ?? "",
      grupo: f.grupo_nombre,
      nivelHumano: h.nivel,
      significadoHumano: h.significado ?? undefined,
    } as unknown as T);
  }
  return [...base, ...extras];
}
