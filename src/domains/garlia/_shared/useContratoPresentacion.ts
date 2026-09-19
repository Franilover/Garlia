"use client";

/**
 * useContratoPresentacion.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Capa compartida de PRESENTACIÓN de propiedades. Regla única:
 *
 *   el frontend no sabe a qué grupo pertenece ninguna propiedad, ni cómo se
 *   llama, ni en qué orden va. Solo pinta lo que dice Supabase.
 *
 *   GRUPO / NOMBRE / ORDEN / VISIBILIDAD → v_frontend_contrato_presentacion_detalle
 *   VALOR                                → v_frontend_worldbuilder_propiedades_entidad
 *
 * Solo se usa el GRUPO (grupo / grupo_nombre / grupo_orden). La `categoria`
 * científica (Física básica / Mecánica) que trae la vista de valores NO se
 * usa para agrupar: sería un segundo eje visual que el contrato no pide.
 *
 * Nada acá inventa un nombre de grupo, una etiqueta, un alias de clave ni un
 * valor de respaldo. Si Supabase no devuelve algo, no se pinta.
 *
 * NULL ≠ 0: un valor ausente o `no_resuelta` llega como `null` y se
 * preserva. Nunca se convierte a 0 ni se formatea como número.
 */

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────

export type EntidadContrato = "elemento" | "compuesto" | "material" | "objeto";

/** `cientifico` = modo Científico / Worldbuilder. `escritor` = modo Escritor. */
export type ModoContrato = "cientifico" | "escritor";

/** Fila del contrato tal como la devuelve Supabase (solo lo que se usa). */
export interface FilaContrato {
  grupo: string;
  grupo_nombre: string;
  grupo_orden: number;
  grupo_descripcion: string | null;
  /** `null` cuando el grupo existe en el contrato pero no tiene propiedades
   *  genéricas (p. ej. `estructura` o `enlaces`, que viven en vistas
   *  especializadas). */
  propiedad_clave: string | null;
  propiedad_orden_contrato: number | null;
  propiedad_orden_catalogo: number | null;
  propiedad_nombre: string | null;
  nombre_escritor: string | null;
  descripcion_escritor: string | null;
  visible_escritor: boolean | null;
  visible_worldbuilder: boolean | null;
  condicional: boolean | null;
  fuentes_canonicas: string[] | null;
}

/** Una propiedad ya resuelta para pintar. */
export interface PropiedadContrato {
  clave: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  condicional: boolean;
}

/** Un grupo del contrato con sus propiedades, ya ordenado. */
export interface GrupoContrato {
  grupo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  propiedades: PropiedadContrato[];
}

// ─── Funciones puras (testeables sin red) ─────────────────────────────────

/** ¿Debe mostrarse esta fila en este modo? Sin lista blanca local: la
 *  decisión es la bandera de visibilidad que trae el contrato. */
export function filaVisibleParaModo(f: FilaContrato, modo: ModoContrato): boolean {
  if (f.propiedad_clave === null) return false;
  return modo === "escritor" ? f.visible_escritor === true : f.visible_worldbuilder === true;
}

/** Filas con propiedad que son visibles en el modo pedido. */
export function filasVisiblesParaModo(filas: FilaContrato[], modo: ModoContrato): FilaContrato[] {
  return filas.filter((f) => filaVisibleParaModo(f, modo));
}

function nombreDePropiedad(f: FilaContrato, modo: ModoContrato): string {
  // Modo Escritor: nombre pensado para escritor, si el contrato lo trae.
  // El contrato es la única autoridad de nombres: si no trae ninguno,
  // se usa la clave tal cual (dato faltante del contrato, visible y
  // corregible en Supabase — no se inventa una etiqueta local).
  if (modo === "escritor" && f.nombre_escritor) return f.nombre_escritor;
  return f.propiedad_nombre ?? f.propiedad_clave ?? "";
}

/**
 * Agrupa y ordena las filas del contrato. Orden de grupos: `grupo_orden`.
 * Orden dentro del grupo: `propiedad_orden_contrato`, con
 * `propiedad_orden_catalogo` como desempate/respaldo, y la clave como
 * último recurso para que el orden sea determinista.
 *
 * Solo devuelve grupos que tengan al menos una propiedad visible: un grupo
 * sin propiedades genéricas (Estructura, Enlaces…) no aparece acá — se
 * pinta desde su vista especializada, no desde este hook.
 */
export function agruparContrato(filas: FilaContrato[], modo: ModoContrato): GrupoContrato[] {
  const porGrupo = new Map<string, GrupoContrato>();

  for (const f of filasVisiblesParaModo(filas, modo)) {
    let g = porGrupo.get(f.grupo);
    if (!g) {
      g = {
        grupo: f.grupo,
        nombre: f.grupo_nombre,
        descripcion: f.grupo_descripcion ?? null,
        orden: f.grupo_orden,
        propiedades: [],
      };
      porGrupo.set(f.grupo, g);
    }
    g.propiedades.push({
      clave: f.propiedad_clave as string,
      nombre: nombreDePropiedad(f, modo),
      descripcion: modo === "escritor" ? f.descripcion_escritor : null,
      orden: f.propiedad_orden_contrato ?? f.propiedad_orden_catalogo ?? Number.MAX_SAFE_INTEGER,
      condicional: f.condicional === true,
    });
  }

  const grupos = Array.from(porGrupo.values());
  for (const g of grupos) {
    g.propiedades.sort((a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave));
  }
  grupos.sort((a, b) => a.orden - b.orden || a.grupo.localeCompare(b.grupo));
  return grupos;
}

// ─── Hook: contrato ───────────────────────────────────────────────────────

const COLUMNAS_CONTRATO = [
  "grupo",
  "grupo_nombre",
  "grupo_orden",
  "grupo_descripcion",
  "propiedad_clave",
  "propiedad_orden_contrato",
  "propiedad_orden_catalogo",
  "propiedad_nombre",
  "nombre_escritor",
  "descripcion_escritor",
  "visible_escritor",
  "visible_worldbuilder",
  "condicional",
  "fuentes_canonicas",
].join(", ");

// El contrato cambia rara vez y es idéntico para todas las instancias de una
// entidad: se lee una sola vez por (entidad, modo) y se comparte.
const cacheContrato = new Map<string, Promise<FilaContrato[]>>();

function cargarContrato(entidad: EntidadContrato, modo: ModoContrato): Promise<FilaContrato[]> {
  const clave = `${entidad}:${modo}`;
  const previo = cacheContrato.get(clave);
  if (previo) return previo;

  const p = (async () => {
    const { data, error } = await (supabase as any)
      .from("v_frontend_contrato_presentacion_detalle")
      .select(COLUMNAS_CONTRATO)
      .eq("entidad_tipo", entidad)
      .eq("modo", modo);
    if (error) throw new Error(error.message);
    return (data ?? []) as FilaContrato[];
  })();

  // Si falla, no se deja cacheada la promesa rota: el próximo montaje reintenta.
  p.catch(() => cacheContrato.delete(clave));
  cacheContrato.set(clave, p);
  return p;
}

export interface UseContratoResult {
  /** Grupos ya ordenados, con sus propiedades visibles en el modo pedido. */
  grupos: GrupoContrato[];
  /** Filas crudas del contrato (incluye grupos sin propiedades). */
  filas: FilaContrato[];
  /** `clave de propiedad → nombre` para el modo pedido. */
  nombres: Record<string, string>;
  loading: boolean;
  error: string | null;
}

/**
 * Lee de Supabase el contrato de presentación para una entidad y un modo.
 * No usa lista blanca local: qué propiedades y grupos existen lo decide el
 * contrato.
 */
export function useContratoPresentacion(
  entidad: EntidadContrato,
  modo: ModoContrato,
): UseContratoResult {
  const [filas, setFilas] = useState<FilaContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    cargarContrato(entidad, modo)
      .then((f) => {
        if (cancelado) return;
        setFilas(f);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setFilas([]);
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [entidad, modo]);

  const grupos = useMemo(() => agruparContrato(filas, modo), [filas, modo]);
  const nombres = useMemo(() => {
    const out: Record<string, string> = {};
    for (const g of grupos) for (const p of g.propiedades) out[p.clave] = p.nombre;
    return out;
  }, [grupos]);

  return { grupos, filas, nombres, loading, error };
}

// ─── Valores científicos ──────────────────────────────────────────────────

/** Estados que emite la vista para un valor. */
export type EstadoValor = "disponible" | "no_resuelta" | string;

/** Una propiedad con su valor, tal como la entrega Supabase. */
export interface ValorCientifico {
  clave: string;
  /** Preserva `null`. Un `no_resuelta` NUNCA se convierte en 0. */
  valor: number | null;
  /** Texto original de la vista (`valor` es `text` en Supabase). */
  valorTexto: string | null;
  estado: EstadoValor;
  mostrable: boolean;
  unidadSimbolo: string | null;
  unidadNombre: string | null;
  rangoMin: number | null;
  rangoMax: number | null;
  tipoValor: string | null;
  fuente: string | null;
}

interface FilaValorVista {
  propiedad_clave: string;
  valor: string | null;
  estado_valor: string | null;
  valor_mostrable: boolean | null;
  unidad_simbolo: string | null;
  unidad_nombre: string | null;
  rango_min: string | number | null;
  rango_max: string | number | null;
  tipo_valor: string | null;
  fuente_canonica: string | null;
}

/** `text|number|null → number|null`. Vacío o no numérico ⇒ `null`, nunca 0. */
export function aNumeroONull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Convierte las filas de la vista en un mapa por clave. Pura. */
export function mapearValores(filas: FilaValorVista[]): Record<string, ValorCientifico> {
  const out: Record<string, ValorCientifico> = {};
  for (const f of filas) {
    const mostrable = f.valor_mostrable === true;
    const valor = mostrable ? aNumeroONull(f.valor) : null;
    out[f.propiedad_clave] = {
      clave: f.propiedad_clave,
      valor,
      valorTexto: mostrable ? f.valor : null,
      estado: f.estado_valor ?? "no_resuelta",
      mostrable,
      unidadSimbolo: f.unidad_simbolo ?? null,
      unidadNombre: f.unidad_nombre ?? null,
      rangoMin: aNumeroONull(f.rango_min),
      rangoMax: aNumeroONull(f.rango_max),
      tipoValor: f.tipo_valor ?? null,
      fuente: f.fuente_canonica ?? null,
    };
  }
  return out;
}

export interface UseValoresResult {
  valores: Record<string, ValorCientifico>;
  loading: boolean;
  error: string | null;
  /** Vuelve a pedir los valores (p. ej. tras editar la composición). */
  refrescar: () => void;
}

/**
 * Valores científicos de UNA entidad, desde
 * `v_frontend_worldbuilder_propiedades_entidad`. Preserva `null`.
 */
export function useValoresCientificos(
  entidad: EntidadContrato,
  entidadId: string | null | undefined,
  /** Cambiar este valor fuerza una relectura (mismo patrón que un `refetchKey`). */
  version = 0,
): UseValoresResult {
  const [valores, setValores] = useState<Record<string, ValorCientifico>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!entidadId) {
      setValores({});
      setLoading(false);
      setError(null);
      return;
    }
    let cancelado = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: err } = await (supabase as any)
          .from("v_frontend_worldbuilder_propiedades_entidad")
          .select(
            "propiedad_clave, valor, estado_valor, valor_mostrable, unidad_simbolo, unidad_nombre, rango_min, rango_max, tipo_valor, fuente_canonica",
          )
          .eq("entidad_tipo", entidad)
          .eq("entidad_id", entidadId);
        if (cancelado) return;
        if (err) {
          setValores({});
          setError(err.message);
        } else {
          setValores(mapearValores((data ?? []) as FilaValorVista[]));
        }
      } catch (e) {
        if (cancelado) return;
        setValores({});
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [entidad, entidadId, version, tick]);

  return { valores, loading, error, refrescar: () => setTick((t) => t + 1) };
}
