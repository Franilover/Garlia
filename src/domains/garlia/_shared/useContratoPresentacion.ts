"use client";

/**
 * useContratoPresentacion.ts — FE-018
 * ───────────────────────────────────────────────────────────────────────────
 * Capa única de autoridad de presentación. Reemplaza los arrays hardcodeados
 * que antes decidían en el frontend qué propiedades existen, a qué grupo
 * pertenecen, en qué orden se muestran y cómo se llaman (ETIQUETAS_METRICA,
 * PROPIEDADES_CAPA_HUMANA, ALIAS_VISTA_A_FRONTEND, ALIAS_ELEMENTO,
 * TARJETAS_SOLO_VISTA, MAGNITUDES_OBJETO, GEOMETRIA_OBJETO,
 * PROPIEDADES_OBJETO — ver notas de migración en cada archivo).
 *
 * Regla central: Supabase define QUÉ mostrar (grupo, nombre, orden,
 * visibilidad). React decide CÓMO renderizarlo (grid, tarjeta, popover).
 *
 *   modo + entidad_tipo
 *        ↓
 *   v_frontend_contrato_presentacion_detalle   (grupos + propiedades + orden)
 *        ↓
 *   v_frontend_worldbuilder_propiedades_entidad   (valores, modo científico)
 *   v_frontend_escritor_propiedades_interpretadas (valores, modo escritor)
 *        ↓
 *   grupos ordenados → propiedades ordenadas → renderer
 *
 * No se duplica el contrato en TypeScript: los tipos de acá describen la
 * FORMA de la fila que entrega la vista, no su contenido (no hay listas de
 * grupos/propiedades hardcodeadas — eso lo decide Supabase en runtime).
 */

import { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";
import {
  guardarContratoCache,
  leerContratoCache,
  guardarValoresCientificosCache,
  leerValoresCientificosCache,
} from "@/infra/sync/syncEngine";

/** Los únicos dos modos de presentación en frontend. Worldbuilder consume
 *  "cientifico" — no existe un tercer modo "worldbuilder" en el contrato. */
export type ModoPresentacion = "cientifico" | "escritor";

/** Tipos de entidad cubiertos por el contrato (entidad_tipo en la vista). */
export type EntidadContrato = "elemento" | "compuesto" | "material" | "objeto";

/** Una fila cruda de `v_frontend_contrato_presentacion_detalle`. */
export interface FilaContratoPresentacion {
  contrato_id: string;
  grupo: string;
  grupo_nombre: string;
  entidad_tipo: string;
  modo: string;
  estrategia: string;
  grupo_orden: number | null;
  grupo_descripcion: string | null;
  /** null en grupos especializados (Identificación, Geometría, Enlaces,
   *  Análisis estructural…) — en ese caso el valor no sale del catálogo de
   *  propiedades sino de `fuentes_canonicas` + un renderer específico. */
  propiedad_clave: string | null;
  propiedad_orden_contrato: number | null;
  propiedad_nombre: string | null;
  nombre_escritor: string | null;
  descripcion_escritor: string | null;
  utilidad_narrativa: string | null;
  tipo_presentacion: string | null;
  modo_visualizacion: string | null;
  condicional: boolean | null;
  visible_escritor: boolean | null;
  visible_worldbuilder: boolean | null;
  propiedad_orden_catalogo: number | null;
  fuentes_canonicas: unknown;
  grupo_notas: string | null;
}

/** Un grupo del contrato con sus propiedades ya ordenadas — shape de
 *  consumo para los renderers (genérico o especializado). */
export interface GrupoContrato {
  grupo: string;
  grupo_nombre: string;
  grupo_descripcion: string | null;
  grupo_orden: number;
  grupo_notas: string | null;
  propiedades: FilaContratoPresentacion[];
}

/**
 * Agrupa+ordena las filas crudas de la vista por `grupo`, respetando
 * `grupo_orden` entre grupos y `propiedad_orden_contrato` (con fallback a
 * `propiedad_orden_catalogo`) dentro de cada grupo. Pura y exportada para
 * poder probarla sin red. No decide nombres ni pertenencia: eso ya viene
 * resuelto en cada fila.
 */
export function agruparContrato(filas: FilaContratoPresentacion[]): GrupoContrato[] {
  const porGrupo = new Map<string, GrupoContrato>();

  for (const f of filas) {
    let g = porGrupo.get(f.grupo);
    if (!g) {
      g = {
        grupo: f.grupo,
        grupo_nombre: f.grupo_nombre,
        grupo_descripcion: f.grupo_descripcion,
        grupo_orden: f.grupo_orden ?? Number.MAX_SAFE_INTEGER,
        grupo_notas: f.grupo_notas,
        propiedades: [],
      };
      porGrupo.set(f.grupo, g);
    }
    g.propiedades.push(f);
  }

  const grupos = Array.from(porGrupo.values());
  grupos.sort((a, b) => a.grupo_orden - b.grupo_orden);
  for (const g of grupos) {
    g.propiedades.sort((a, b) => {
      const oa = a.propiedad_orden_contrato ?? a.propiedad_orden_catalogo ?? Number.MAX_SAFE_INTEGER;
      const ob = b.propiedad_orden_contrato ?? b.propiedad_orden_catalogo ?? Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });
  }
  return grupos;
}

/**
 * Filtra las filas del contrato para un modo dado, respetando la
 * visibilidad que ya decidió Supabase (`visible_escritor` /
 * `visible_worldbuilder`) — nunca una lista blanca local.
 */
export function filasVisiblesParaModo(
  filas: FilaContratoPresentacion[],
  modo: ModoPresentacion,
): FilaContratoPresentacion[] {
  return filas.filter((f) => {
    if (f.modo !== modo) return false;
    if (modo === "escritor") return f.visible_escritor !== false;
    return f.visible_worldbuilder !== false;
  });
}

/**
 * Fila cruda de `v_frontend_worldbuilder_propiedades_entidad` — fuente de
 * VALORES canónicos en modo científico (ver Regla del Científico FE-018).
 * Representa las propiedades que el catálogo backend marcó como
 * aplicables/visibles para Worldbuilder en esta entidad puntual — NO "cada
 * columna existente en la base": si Supabase no trae una fila para una
 * clave, esa propiedad no aplica a esta entidad y no se muestra, no se
 * fuerza a 0/null.
 */
export interface FilaValorCientifico {
  entidad_tipo: string;
  entidad_id: string;
  propiedad_clave: string;
  /** Valor crudo tal como lo entrega la vista — puede ser numérico o
   *  textual según la propiedad (ej. clasificaciones). Se mantiene como
   *  string | null porque Postgres/PostgREST devuelve todo serializado; el
   *  caller decide si lo formatea como número. NULL nunca se convierte a
   *  0 acá ni en ningún consumidor — ver regla NULL ≠ 0. */
  valor: string | null;
}

/** Mapa `propiedad_clave → valor crudo`, tal como los entrega la vista. */
export type ValoresCientificosPorClave = Record<string, string | null>;

/**
 * Lee los valores canónicos de modo científico para UNA entidad desde
 * `v_frontend_worldbuilder_propiedades_entidad`. Es la contraparte de
 * useInterpretacionEscritor (modo escritor) para modo científico: el
 * frontend no lee columnas de elementos/compuestos/materiales/items
 * directamente para armar tarjetas de propiedades — pide los valores ya
 * resueltos acá, y el grupo/nombre/orden salen de
 * useContratoPresentacion. No se recalcula nada en React: si Supabase no
 * trae valor para una clave, esa propiedad simplemente no aparece.
 *
 * Cache-first vía Dexie (ver guardarValoresCientificosCache/
 * leerValoresCientificosCache en syncEngine.ts): al cambiar de entidad se
 * pinta primero lo que ya haya en Dexie (si hay, instantáneo y funciona
 * offline — esto es lo que resuelve la demora percibida al abrir un
 * editor), y SIEMPRE se dispara en paralelo la consulta a Supabase, que es
 * la fuente de verdad y reemplaza lo pintado cuando llega, reescribiendo
 * además la copia local para la próxima vez.
 */
export function useValoresCientificos(
  entidad: EntidadContrato,
  entidadId: string | null | undefined,
  activo = true,
): { valores: ValoresCientificosPorClave; loading: boolean; error: string | null } {
  const [valores, setValores] = useState<ValoresCientificosPorClave>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo || !entidadId) {
      setValores({});
      setLoading(false);
      setError(null);
      return;
    }

    let cancelado = false;
    let pintadoDesdeCache = false;
    setLoading(true);
    setError(null);

    const aMapa = (filas: { propiedad_clave: string; valor: string | null }[]) => {
      const out: ValoresCientificosPorClave = {};
      for (const f of filas) {
        // NULL se preserva tal cual — nunca se convierte a 0 ni se omite
        // la clave (una clave presente con valor null es distinta de una
        // clave ausente: la primera significa "aplicable pero sin dato
        // todavía", la segunda "no aplicable a esta entidad").
        out[f.propiedad_clave] = f.valor;
      }
      return out;
    };

    (async () => {
      // 1) Dexie primero: pinta al instante si hay algo cacheado.
      try {
        const local = await leerValoresCientificosCache(entidad, entidadId);
        if (cancelado) return;
        if (local.length > 0) {
          setValores(aMapa(local));
          setLoading(false);
          pintadoDesdeCache = true;
        }
      } catch {
        // sin cache local todavía, seguimos directo a Supabase
      }

      // 2) Supabase: fuente de verdad, siempre se consulta.
      try {
        const { data, error: err } = await (supabase as any)
          .from("v_frontend_worldbuilder_propiedades_entidad")
          .select("entidad_tipo, entidad_id, propiedad_clave, valor")
          .eq("entidad_tipo", entidad)
          .eq("entidad_id", entidadId);

        if (cancelado) return;
        if (err) {
          console.warn("[useValoresCientificos] no se pudo leer la vista:", err.message);
          if (!pintadoDesdeCache) {
            setValores({});
            setError(err.message);
          }
        } else {
          const filas = (data ?? []) as FilaValorCientifico[];
          setValores(aMapa(filas));
          void guardarValoresCientificosCache(entidad, entidadId, filas);
        }
      } catch (e) {
        if (!cancelado && !pintadoDesdeCache) {
          console.warn("[useValoresCientificos] error inesperado:", e);
          setValores({});
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [entidad, entidadId, activo]);

  return { valores, loading, error };
}

/**
 * FE-019: sustituye el `valor` de una lista de PropiedadCalculada por el
 * valor canónico de `v_frontend_worldbuilder_propiedades_entidad` cuando
 * la vista trae dato para esa clave, SIN tocar `propiedadesCalculadasDeX`
 * (fórmulas/cálculo intactos, fuera de alcance). Si la vista no trae la
 * clave todavía, se conserva el valor ya calculado desde la tabla base
 * (fallback seguro mientras la vista no cubra el 100% del catálogo) — así
 * no se rompe nada en vivo si la vista está incompleta o no disponible.
 * Si la vista trae explícitamente `null` para una clave presente, se
 * respeta ese `null` (no se sustituye por el valor de tabla base): NULL
 * significa "aplicable pero sin dato", que es distinto de "vista no
 * cubre esta clave todavía".
 */
export function aplicarValoresCientificos<T extends { clave: string; valor: string | null }>(
  propiedades: T[],
  valoresVista: ValoresCientificosPorClave,
): T[] {
  return propiedades.map((p) => {
    if (!(p.clave in valoresVista)) return p; // vista no cubre esta clave aún → conserva valor de tabla base
    const v = valoresVista[p.clave];
    return { ...p, valor: v };
  });
}

interface EstadoContrato {
  grupos: GrupoContrato[];
  filas: FilaContratoPresentacion[];
  loading: boolean;
  error: string | null;
}

/**
 * Lee el contrato de presentación para una entidad + modo, ya agrupado y
 * ordenado. Es la ÚNICA fuente de qué grupos/propiedades existen, cómo se
 * llaman y en qué orden van — ningún consumidor debe mantener su propia
 * lista de grupos o propiedades en paralelo (ver arquitectura recomendada
 * FE-018).
 *
 * Cache-first vía Dexie (ver guardarContratoCache/leerContratoCache en
 * syncEngine.ts): al cambiar de entidad+modo se pinta primero lo que ya
 * haya en Dexie (instantáneo, offline — el contrato cambia rara vez, así
 * que esto es lo que elimina la demora de "pantalla vacía" al abrir un
 * editor), y SIEMPRE se dispara en paralelo la consulta a Supabase, que es
 * la fuente de verdad y reemplaza lo pintado cuando llega, reescribiendo
 * además la copia local para la próxima vez.
 */
export function useContratoPresentacion(
  entidad: EntidadContrato,
  modo: ModoPresentacion,
  activo = true,
): EstadoContrato {
  const [filas, setFilas] = useState<FilaContratoPresentacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) {
      setFilas([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelado = false;
    let pintadoDesdeCache = false;
    setLoading(true);
    setError(null);

    (async () => {
      // 1) Dexie primero: pinta al instante si hay algo cacheado para esta
      //    combinación entidad+modo.
      try {
        const local = await leerContratoCache(entidad, modo);
        if (cancelado) return;
        if (local.length > 0) {
          setFilas(local as FilaContratoPresentacion[]);
          setLoading(false);
          pintadoDesdeCache = true;
        }
      } catch {
        // sin cache local todavía, seguimos directo a Supabase
      }

      // 2) Supabase: fuente de verdad, siempre se consulta.
      try {
        const { data, error: err } = await (supabase as any)
          .from("v_frontend_contrato_presentacion_detalle")
          .select(
            "contrato_id, grupo, grupo_nombre, entidad_tipo, modo, estrategia, grupo_orden, " +
              "grupo_descripcion, propiedad_clave, propiedad_orden_contrato, propiedad_nombre, " +
              "nombre_escritor, descripcion_escritor, utilidad_narrativa, tipo_presentacion, " +
              "modo_visualizacion, condicional, visible_escritor, visible_worldbuilder, " +
              "propiedad_orden_catalogo, fuentes_canonicas, grupo_notas",
          )
          .eq("entidad_tipo", entidad)
          .eq("modo", modo);

        if (cancelado) return;
        if (err) {
          console.warn("[useContratoPresentacion] no se pudo leer el contrato:", err.message);
          if (!pintadoDesdeCache) {
            setFilas([]);
            setError(err.message);
          }
        } else {
          const filasNuevas = (data ?? []) as FilaContratoPresentacion[];
          setFilas(filasNuevas);
          void guardarContratoCache(entidad, modo, filasNuevas);
        }
      } catch (e) {
        if (!cancelado && !pintadoDesdeCache) {
          console.warn("[useContratoPresentacion] error inesperado:", e);
          setFilas([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [entidad, modo, activo]);

  const filasDelModo = filasVisiblesParaModo(filas, modo);

  return {
    grupos: agruparContrato(filasDelModo),
    filas: filasDelModo,
    loading,
    error,
  };
}
