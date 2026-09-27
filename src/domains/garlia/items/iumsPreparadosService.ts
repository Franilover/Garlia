/**
 * iumsPreparadosService.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Fetch directo (mismo criterio que laboratorioOrisService.ts) contra las
 * estructuras canónicas de IUMs preparados:
 *
 *   - almacenamientos_ium_v1   (+ soportes_almacenamiento_ium_v1)
 *   - preparaciones_ium_v1     (fuente de verdad de cada preparación)
 *   - v_proceso_configuracion_ium_v1 (para resolver proceso/config por id)
 *   - crear_preparacion_ium_v1(uuid,uuid,uuid,uuid,text,numeric,text) — RPC
 *     canónica con configuracion_id. La variante sin configuracion_id
 *     existe en Supabase pero solo devuelve
 *     {estado:'rechazada', razon:'configuracion_ium_requerida'} — nunca se
 *     usa desde acá.
 *   - activar_preparacion_ium_v1 / evaluar_preparacion_ium_v1 — runtime,
 *     el frontend solo invoca y muestra el resultado.
 *
 * Ningún número se recalcula localmente. Un NULL de Supabase se mapea a
 * `null`, nunca a 0 ni a un placeholder inventado.
 */

import { supabase } from "@/infra/supabase/supabase";

import type {
  AlmacenamientoIumObjeto,
  ConfiguracionIumDisponible,
  ConfiguracionSnapshot,
  PreparacionIum,
  ResultadoCrearPreparacionIum,
  ResultadoEvaluarPreparacionIum,
  SoporteAlmacenamientoIum,
} from "./iumsPreparados.types";

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function mapSoporte(r: any): SoporteAlmacenamientoIum {
  return {
    id: r.id as string,
    codigo: r.codigo as string,
    nombre: r.nombre as string,
    tipo: r.tipo as string,
    descripcion: r.descripcion as string,
    capacidadOrden: num(r.capacidad_orden),
    estabilidad: num(r.estabilidad),
    aislamiento: num(r.aislamiento),
    factorGeometria: num(r.factor_geometria),
    tasaDisolucionBaseH: num(r.tasa_disolucion_base_h),
    reutilizable: Boolean(r.reutilizable),
    activo: Boolean(r.activo),
  };
}

const SELECT_ALMACENAMIENTO = `
  id, soporte_tipo_id, nombre, ubicacion_tipo, ubicacion_id, personaje_id,
  capacidad_orden_override, estabilidad_override, aislamiento_override,
  factor_geometria_override, estado, propiedades, created_at, updated_at,
  soporte:soportes_almacenamiento_ium_v1(
    id, codigo, nombre, tipo, descripcion, capacidad_orden, estabilidad,
    aislamiento, factor_geometria, tasa_disolucion_base_h, reutilizable, activo
  )
`;

/** Almacenamientos IUM del objeto — respeta exactamente la relación
 *  canónica: ubicacion_tipo='objeto' AND ubicacion_id=itemId. No mantiene
 *  ninguna lista local paralela. */
export async function listarAlmacenamientosDelObjeto(
  itemId: string,
): Promise<AlmacenamientoIumObjeto[]> {
  const { data, error } = await supabase
    .from("almacenamientos_ium_v1")
    .select(SELECT_ALMACENAMIENTO)
    .eq("ubicacion_tipo", "objeto")
    .eq("ubicacion_id", itemId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`listarAlmacenamientosDelObjeto: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    soporteTipoId: r.soporte_tipo_id as string,
    soporte: r.soporte ? mapSoporte(r.soporte) : null,
    nombre: r.nombre as string,
    ubicacionTipo: r.ubicacion_tipo as string,
    ubicacionId: strOrNull(r.ubicacion_id),
    personajeId: strOrNull(r.personaje_id),
    capacidadOrdenOverride: numOrNull(r.capacidad_orden_override),
    estabilidadOverride: numOrNull(r.estabilidad_override),
    aislamientoOverride: numOrNull(r.aislamiento_override),
    factorGeometriaOverride: numOrNull(r.factor_geometria_override),
    estado: r.estado as string,
    propiedades: (r.propiedades as Record<string, unknown>) ?? {},
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }));
}

const SELECT_PREPARACION = `
  id, personaje_id, oris_id, almacenamiento_id, configuracion_id, nombre,
  modo_activacion, modo_acceso, ium_count, union_count, unidades_organizacion,
  calidad_preparacion, coherencia_inicial, coherencia_actual, umbral_disolucion,
  tasa_disolucion_h, perturbacion_acumulada, estado, origen_historico,
  conciencia_enlace_id, configuracion_snapshot, preparada_at,
  ultima_evaluacion_at, activada_at, activaciones_totales, ultima_activacion_at,
  created_at, updated_at,
  oris:oris_id(nombre)
`;

function mapConfiguracionSnapshot(raw: unknown): ConfiguracionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as any;
  return {
    configuracionId: s.configuracion_id,
    configuracionNombre: s.configuracion_nombre,
    configuracionVersion: s.configuracion_version,
    configuracionEstado: s.configuracion_estado,
    procesoId: s.proceso_id,
    procesoNombre: s.proceso_nombre,
    orisId: s.oris_id,
    orisNombre: s.oris_nombre,
    topologiaId: strOrNull(s.topologia_id),
    iums: Array.isArray(s.iums)
      ? s.iums.map((x: any) => ({
          componenteId: x.componente_id,
          iumId: x.ium_id,
          posicion: x.posicion,
          rol: strOrNull(x.rol),
          orden: num(x.orden),
          participacion: strOrNull(x.participacion),
          salidaFuncionalId: strOrNull(x.salida_funcional_id),
        }))
      : [],
    uniones: Array.isArray(s.uniones)
      ? s.uniones.map((x: any) => ({
          origenComponenteId: x.origen_componente_id,
          destinoComponenteId: x.destino_componente_id,
          tipoUnion: x.tipo_union,
          orden: num(x.orden),
          descripcion: strOrNull(x.descripcion),
        }))
      : [],
    concienciaEnlace: (s.conciencia_enlace as Record<string, unknown>) ?? null,
  };
}

/** Preparaciones IUM almacenadas en un almacenamiento del objeto. La
 *  información de IUMs/enlaces sale de configuracion_snapshot (grabado al
 *  crear la preparación), nunca se reconstruye desde oris_iums. proceso/
 *  configuracion se resuelven aparte contra v_proceso_configuracion_ium_v1
 *  por configuracion_id — no se inventa si configuracion_id es null (dato
 *  legado o preparación creada por la RPC sin configuración, si existiera). */
export async function listarPreparacionesDeAlmacenamiento(
  almacenamientoId: string,
): Promise<PreparacionIum[]> {
  const { data, error } = await supabase
    .from("preparaciones_ium_v1")
    .select(SELECT_PREPARACION)
    .eq("almacenamiento_id", almacenamientoId)
    .order("preparada_at", { ascending: false });

  if (error) throw new Error(`listarPreparacionesDeAlmacenamiento: ${error.message}`);

  const filas = (data ?? []) as any[];
  const configIds = Array.from(
    new Set(filas.map((r) => r.configuracion_id).filter((id): id is string => !!id)),
  );

  let configuraciones = new Map<string, { proceso: string; procesoId: string }>();
  if (configIds.length > 0) {
    const { data: configs, error: errConfigs } = await supabase
      .from("v_proceso_configuracion_ium_v1")
      .select("configuracion_id, proceso, proceso_id")
      .in("configuracion_id", configIds);
    if (errConfigs) {
      throw new Error(`listarPreparacionesDeAlmacenamiento (config): ${errConfigs.message}`);
    }
    configuraciones = new Map(
      (configs ?? []).map((c: any) => [
        c.configuracion_id as string,
        { proceso: c.proceso as string, procesoId: c.proceso_id as string },
      ]),
    );
  }

  return filas.map((r) => {
    const config = r.configuracion_id ? configuraciones.get(r.configuracion_id) : undefined;
    return {
      id: r.id as string,
      personajeId: strOrNull(r.personaje_id),
      orisId: r.oris_id as string,
      orisNombre: r.oris?.nombre ?? null,
      almacenamientoId: r.almacenamiento_id as string,
      configuracionId: strOrNull(r.configuracion_id),
      procesoId: config?.procesoId ?? null,
      procesoNombre: config?.proceso ?? null,
      nombre: r.nombre as string,
      modoActivacion: r.modo_activacion as string,
      modoAcceso: r.modo_acceso as string,
      iumCount: num(r.ium_count),
      unionCount: num(r.union_count),
      unidadesOrganizacion: numOrNull(r.unidades_organizacion),
      calidadPreparacion: num(r.calidad_preparacion),
      coherenciaInicial: num(r.coherencia_inicial),
      coherenciaActual: num(r.coherencia_actual),
      umbralDisolucion: num(r.umbral_disolucion),
      tasaDisolucionH: num(r.tasa_disolucion_h),
      perturbacionAcumulada: num(r.perturbacion_acumulada),
      estado: r.estado as string,
      origenHistorico: r.origen_historico as string,
      concienciaEnlaceId: strOrNull(r.conciencia_enlace_id),
      configuracionSnapshot: mapConfiguracionSnapshot(r.configuracion_snapshot),
      preparadaAt: r.preparada_at as string,
      ultimaEvaluacionAt: r.ultima_evaluacion_at as string,
      activadaAt: strOrNull(r.activada_at),
      activacionesTotales: num(r.activaciones_totales),
      ultimaActivacionAt: strOrNull(r.ultima_activacion_at),
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  });
}

/** Configuraciones IUM disponibles para un proceso+Oris concretos — sale de
 *  v_proceso_configuracion_ium_v1, que ya resuelve la compatibilidad real
 *  (proceso_configuracion_ium_oris_v1). No se hardcodea ninguna
 *  configuración: el selector de "Añadir preparación" solo puede elegir
 *  entre lo que esta función devuelve. */
export async function listarConfiguracionesDisponibles(params: {
  procesoId?: string;
  orisId?: string;
}): Promise<ConfiguracionIumDisponible[]> {
  let query = supabase
    .from("v_proceso_configuracion_ium_v1")
    .select(
      "configuracion_id, proceso_id, proceso, oris_principal_id, oris_principal, configuracion, version, estado, topologia_id, topologia, n_iums, n_uniones, demanda_eterium_organizacion, iums, oris_compatibles, descripcion, fundamento",
    );

  if (params.procesoId) query = query.eq("proceso_id", params.procesoId);
  if (params.orisId) query = query.eq("oris_principal_id", params.orisId);

  const { data, error } = await query.order("configuracion", { ascending: true });
  if (error) throw new Error(`listarConfiguracionesDisponibles: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    configuracionId: r.configuracion_id as string,
    proceso: r.proceso as string,
    procesoId: r.proceso_id as string,
    orisPrincipalId: strOrNull(r.oris_principal_id),
    orisPrincipal: strOrNull(r.oris_principal),
    configuracion: r.configuracion as string,
    version: r.version as string,
    estado: r.estado as string,
    topologiaId: strOrNull(r.topologia_id),
    topologia: strOrNull(r.topologia),
    nIums: num(r.n_iums),
    nUniones: num(r.n_uniones),
    demandaEteriumOrganizacion: numOrNull(r.demanda_eterium_organizacion),
    iums: strOrNull(r.iums),
    orisCompatibles: strOrNull(r.oris_compatibles),
    descripcion: strOrNull(r.descripcion),
    fundamento: strOrNull(r.fundamento),
  }));
}

/** Catálogo completo de Oris (para el selector de "Añadir preparación" —
 *  el ticket exige no hardcodear Oris; se listan tal cual la tabla real). */
export async function listarOrisCatalogo(): Promise<{ id: string; nombre: string }[]> {
  const { data, error } = await supabase.from("oris").select("id, nombre").order("orden");
  if (error) throw new Error(`listarOrisCatalogo: ${error.message}`);
  return (data ?? []).map((r: any) => ({ id: r.id as string, nombre: r.nombre as string }));
}

/** Crea la preparación usando exclusivamente la RPC canónica con
 *  configuracion_id — nunca la variante sin ella (que Supabase ya rechaza
 *  con 'configuracion_ium_requerida'). Devuelve el jsonb tal cual, sin
 *  traducir razones de rechazo a mensajes inventados. */
export async function crearPreparacionIum(params: {
  personajeId: string | null;
  orisId: string;
  almacenamientoId: string;
  configuracionId: string;
  nombre: string;
  calidadPreparacion: number;
  modoActivacion: "reutilizable" | "consumible";
}): Promise<ResultadoCrearPreparacionIum> {
  const { data, error } = await supabase.rpc("crear_preparacion_ium_v1", {
    p_personaje_id: params.personajeId,
    p_oris_id: params.orisId,
    p_almacenamiento_id: params.almacenamientoId,
    p_configuracion_id: params.configuracionId,
    p_nombre: params.nombre,
    p_calidad_preparacion: params.calidadPreparacion,
    p_modo_activacion: params.modoActivacion,
  });

  if (error) throw new Error(`crearPreparacionIum: ${error.message}`);
  return data as ResultadoCrearPreparacionIum;
}

/** Reevalúa coherencia/estado actual de una preparación contra el runtime
 *  real (evaluar_preparacion_ium_v1) — no se calcula ninguna disolución en
 *  React. Se usa para refrescar el detalle sin esperar a una activación. */
export async function evaluarPreparacionIum(
  preparacionId: string,
): Promise<ResultadoEvaluarPreparacionIum> {
  const { data, error } = await supabase.rpc("evaluar_preparacion_ium_v1", {
    p_preparacion_id: preparacionId,
  });
  if (error) throw new Error(`evaluarPreparacionIum: ${error.message}`);
  return data as ResultadoEvaluarPreparacionIum;
}

/** Activa una preparación contra una orden de Eterium ya existente
 *  (ordenes_eterium) — la activación pertenece al runtime de Supabase; acá
 *  solo se invoca y se presenta el resultado (estado/razon/motivos) tal
 *  cual, incluidos los rechazos: preparación disuelta, consumible ya
 *  utilizada, Oris incompatible, restringida al creador, sin conciencia de
 *  enlace, o Eterium insuficiente (resuelto dentro de la orden). */
export async function activarPreparacionIum(params: {
  preparacionId: string;
  ordenId: string;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("activar_preparacion_ium_v1", {
    p_preparacion_id: params.preparacionId,
    p_orden_id: params.ordenId,
  });
  if (error) throw new Error(`activarPreparacionIum: ${error.message}`);
  return data as Record<string, unknown>;
}
