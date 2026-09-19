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

/** Mapa `clave de propiedad del frontend → interpretación`. */
export type InterpretacionesPorClave = Record<string, InterpretacionEscritor>;

/**
 * La vista usa claves canónicas de propiedad que en 5 casos difieren de las
 * claves que usan las tarjetas del frontend (`p.clave`). Se resuelve acá, en
 * UN solo lugar, en vez de por editor: la clave de la vista se expone bajo
 * la clave que el frontend ya usa, sin tocar columnas ni la vista.
 *
 *   vista (propiedad_clave)      → frontend (p.clave)
 */
const ALIAS_VISTA_A_FRONTEND: Record<string, string> = {
  dureza_compuesto: "dureza",
  conductividad_compuesto: "conductividad",
  transparencia_compuesto: "transparencia",
  interaccion_compuesto: "interaccion",
  // Elemento: la tarjeta usa el nombre de columna interno.
  // (masa_base/volumen_base se resuelven abajo, solo para "elemento", porque
  // en Compuesto/Material/Objeto la clave de tarjeta ES "masa"/"volumen".)
};

/** Alias adicionales solo válidos para Elemento (nombre de columna interno). */
const ALIAS_ELEMENTO: Record<string, string> = {
  masa: "masa_base",
  volumen: "volumen_base",
};

/**
 * Capa humana principal que se expone en modo Escritor (las 11 acordadas).
 * Se usa como lista blanca al FUSIONAR sobre las tarjetas: aunque la vista
 * traiga otras filas con `valor_mostrable = true` (ej. `resistencia`, que
 * todavía no está resuelta para la mayoría de entidades), no se pintan como
 * si fueran una escala real. Claves = las del frontend (ya con alias).
 */
export const PROPIEDADES_CAPA_HUMANA = new Set<string>([
  "masa", "masa_base",
  "volumen", "volumen_base",
  "densidad",
  "estabilidad",
  "rigidez",
  "flexibilidad",
  "dureza",
  "cohesion",
  "conductividad",
  "transparencia",
  "interaccion",
]);

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
 * Convierte las filas de la vista en el mapa por clave del frontend.
 * Pura y exportada para poder probarla sin red.
 *
 * Reglas:
 *  - `valor_mostrable !== true` → se descarta (incluye `resistencia` y
 *    `actividad_catalitica`, que hoy no están resueltas: no se inventa una
 *    escala falsa, la tarjeta cae al valor técnico como siempre).
 *  - sin `interpretacion_humana.nivel` → se descarta.
 *  - fuera de PROPIEDADES_CAPA_HUMANA (ej. `resistencia`) → se descarta.
 */
export function mapearInterpretaciones(
  filas: FilaVista[],
  entidad: EntidadInterpretable,
): InterpretacionesPorClave {
  const out: InterpretacionesPorClave = {};
  for (const f of filas) {
    if (f.valor_mostrable !== true) continue;
    const nivel = f.interpretacion_humana?.nivel;
    if (!nivel) continue;

    let clave = ALIAS_VISTA_A_FRONTEND[f.propiedad_clave] ?? f.propiedad_clave;
    if (entidad === "elemento") clave = ALIAS_ELEMENTO[clave] ?? clave;

    if (!PROPIEDADES_CAPA_HUMANA.has(clave)) continue;

    const n = f.valor === null || f.valor === undefined ? NaN : Number(f.valor);
    out[clave] = {
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
 * Si ambas fuentes fallan/están vacías, devuelve `{}`: los llamadores ya
 * caen al valor técnico cuando una propiedad no trae interpretación.
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
 * Fusiona las interpretaciones del motor en una lista de tarjetas
 * (PropiedadCalculada). Solo agrega `nivelHumano`/`significadoHumano`; nunca
 * toca el valor técnico ni lo recalcula, así que el modo Científico queda
 * idéntico. Las tarjetas sin interpretación se devuelven tal cual (en modo
 * Escritor caen al valor técnico, ver TarjetaPropiedad).
 */
export function fusionarInterpretaciones<
  T extends { clave: string; nivelHumano?: string; significadoHumano?: string },
>(propiedades: T[], interpretaciones: InterpretacionesPorClave): T[] {
  return propiedades.map((p) => {
    const h = interpretaciones[p.clave];
    if (!h) return p;
    return { ...p, nivelHumano: h.nivel, significadoHumano: h.significado ?? undefined };
  });
}

/**
 * Propiedades de la capa humana que NO existen como columna/tarjeta en el
 * frontend y por eso solo se pueden mostrar desde la vista. Hoy: Cohesión
 * (índice 0–1) en Compuesto y Material. Se agregan como tarjeta extra SOLO
 * si la vista la trae con `valor_mostrable = true`; el número y la
 * interpretación son los del motor, nada se calcula acá.
 */
const TARJETAS_SOLO_VISTA: {
  clave: string;
  label: string;
  descripcion: string;
  grupo: string;
}[] = [
  {
    clave: "cohesion",
    label: "Cohesión",
    descripcion: "Qué tan unido se mantiene internamente (índice 0–1 calculado por el motor).",
    grupo: "Propiedades físicas",
  },
];

/**
 * Igual que fusionarInterpretaciones, pero además agrega las tarjetas que
 * solo existen en la vista (Cohesión) cuando el motor las devolvió. Se usa
 * en Compuesto y Material, donde Cohesión está interpretada.
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
>(propiedades: T[], interpretaciones: InterpretacionesPorClave): T[] {
  const base = fusionarInterpretaciones(propiedades, interpretaciones);
  const claves = new Set(base.map((p) => p.clave));
  const extras: T[] = [];
  for (const t of TARJETAS_SOLO_VISTA) {
    const h = interpretaciones[t.clave];
    if (!h || claves.has(t.clave)) continue;
    extras.push({
      clave: t.clave,
      label: t.label,
      valor: h.valor === null ? null : h.valor.toFixed(3),
      proporcion: h.valor === null ? undefined : Math.max(0, Math.min(1, h.valor)),
      descripcion: t.descripcion,
      grupo: t.grupo,
      nivelHumano: h.nivel,
      significadoHumano: h.significado ?? undefined,
    } as unknown as T);
  }
  return [...base, ...extras];
}
