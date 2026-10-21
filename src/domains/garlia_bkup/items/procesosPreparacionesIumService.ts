/**
 * procesosPreparacionesIumService.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza el mezclador libre de IUMs. Todo sale de:
 *
 *   - v_item_editor_procesos_v1          (procesos que el objeto facilita)
 *   - v_item_editor_configuraciones_v1   (configuraciones por proceso)
 *   - obtener_iums_preparados_objeto_v1  (almacenamientos + preparaciones,
 *                                          ya resuelto y anidado en Supabase)
 *   - vincular_proceso_item_v1           (RPC canónica para vincular proceso)
 *   - crear_almacenamiento_ium_objeto_v1 (RPC canónica, valida el objeto)
 *   - crear_preparacion_ium_objeto_v1    (RPC canónica, valida que el
 *                                          almacenamiento pertenezca al
 *                                          objeto — nunca se puede usar uno
 *                                          de otro objeto por error)
 *   - evaluar_preparacion_ium_v1 / activar_preparacion_ium_v1 (runtime)
 *
 * Nada de esto se reimplementa en TypeScript: el frontend solo selecciona
 * y presenta lo que estas fuentes devuelven.
 */

import { supabase } from "@/infra/supabase/supabase";

import type {
  AlmacenamientoIumObjeto,
  ConfiguracionDeProceso,
  EnlaceDeConfiguracion,
  IumDeConfiguracion,
  PreparacionIumObjeto,
  ProcesoCatalogo,
  ProcesoDelObjeto,
  ResultadoCrearAlmacenamiento,
  ResultadoCrearPreparacion,
  ResultadoDesvincularProceso,
  ResultadoEliminarAlmacenamiento,
  ResultadoEvaluarPreparacion,
  RolProceso,
  SoporteAlmacenamientoIum,
} from "./procesosPreparacionesIum.types";

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

// ── 1. Procesos que el objeto facilita ─────────────────────────────────

export async function listarProcesosDelObjeto(itemId: string): Promise<ProcesoDelObjeto[]> {
  const { data, error } = await supabase
    .from("v_item_editor_procesos_v1")
    .select(
      "item_id, item_proceso_id, proceso_id, proceso_nombre, naturaleza_canonica, proceso_descripcion, regla_clave, rol, vinculo_descripcion, estado, configuraciones_disponibles",
    )
    .eq("item_id", itemId)
    .order("rol", { ascending: true });

  if (error) throw new Error(`listarProcesosDelObjeto: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    itemId: r.item_id as string,
    itemProcesoId: r.item_proceso_id as string,
    procesoId: r.proceso_id as string,
    procesoNombre: r.proceso_nombre as string,
    naturalezaCanonica: strOrNull(r.naturaleza_canonica),
    procesoDescripcion: strOrNull(r.proceso_descripcion),
    reglaClave: strOrNull(r.regla_clave),
    rol: r.rol as RolProceso,
    vinculoDescripcion: strOrNull(r.vinculo_descripcion),
    estado: r.estado as string,
    configuracionesDisponibles: num(r.configuraciones_disponibles),
  }));
}

/** Catálogo completo de procesos existentes en Supabase, para el selector
 *  de "+ Agregar proceso". No se crean procesos desde el editor. */
export async function listarCatalogoProcesos(): Promise<ProcesoCatalogo[]> {
  const { data, error } = await supabase
    .from("procesos")
    .select("id, nombre, tipo, descripcion, naturaleza_canonica")
    .order("nombre", { ascending: true });

  if (error) throw new Error(`listarCatalogoProcesos: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    nombre: r.nombre as string,
    tipo: strOrNull(r.tipo),
    descripcion: strOrNull(r.descripcion),
    naturalezaCanonica: strOrNull(r.naturaleza_canonica),
  }));
}

/** Vincula un proceso existente al objeto — única vía permitida
 *  (vincular_proceso_item_v1). La función valida el rol y que el objeto
 *  exista; hace upsert por (item_id, proceso_id), así que revincular con
 *  otro rol simplemente lo actualiza. */
export async function vincularProcesoAlObjeto(params: {
  itemId: string;
  procesoId: string;
  rol: RolProceso;
  descripcion?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("vincular_proceso_item_v1", {
    p_item_id: params.itemId,
    p_proceso_id: params.procesoId,
    p_rol: params.rol,
    p_descripcion: params.descripcion ?? null,
  });
  if (error) throw new Error(`vincularProcesoAlObjeto: ${error.message}`);
}

// ── 2. Configuraciones IUM disponibles para un proceso del objeto ─────

export async function listarConfiguracionesDeProceso(params: {
  itemId: string;
  procesoId: string;
}): Promise<ConfiguracionDeProceso[]> {
  const { data, error } = await supabase
    .from("v_item_editor_configuraciones_v1")
    .select(
      "item_id, proceso_id, proceso_nombre, proceso_rol, configuracion_id, configuracion_nombre, configuracion_descripcion, oris_id, oris_nombre, topologia_id, configuracion_estado, configuracion_version, fundamento, ium_count, enlace_count",
    )
    .eq("item_id", params.itemId)
    .eq("proceso_id", params.procesoId)
    .order("configuracion_nombre", { ascending: true });

  if (error) throw new Error(`listarConfiguracionesDeProceso: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    itemId: r.item_id as string,
    procesoId: r.proceso_id as string,
    procesoNombre: r.proceso_nombre as string,
    procesoRol: r.proceso_rol as RolProceso,
    configuracionId: r.configuracion_id as string,
    configuracionNombre: r.configuracion_nombre as string,
    configuracionDescripcion: strOrNull(r.configuracion_descripcion),
    orisId: r.oris_id as string,
    orisNombre: strOrNull(r.oris_nombre),
    topologiaId: strOrNull(r.topologia_id),
    configuracionEstado: r.configuracion_estado as string,
    configuracionVersion: r.configuracion_version as string,
    fundamento: strOrNull(r.fundamento),
    iumCount: num(r.ium_count),
    enlaceCount: num(r.enlace_count),
  }));
}

// ── 3. Almacenamientos + preparaciones del objeto (todo en una llamada) ─

function mapIum(x: any): IumDeConfiguracion {
  return {
    componenteId: x.componente_id,
    iumId: x.ium_id,
    posicion: x.posicion,
    rol: strOrNull(x.rol),
    orden: num(x.orden),
    participacion: strOrNull(x.participacion),
    salidaFuncionalId: strOrNull(x.salida_funcional_id),
  };
}

function mapEnlace(x: any): EnlaceDeConfiguracion {
  return {
    origenComponenteId: x.origen_componente_id,
    destinoComponenteId: x.destino_componente_id,
    tipoUnion: x.tipo_union,
    orden: num(x.orden),
    descripcion: strOrNull(x.descripcion),
  };
}

function mapPreparacion(p: any): PreparacionIumObjeto {
  return {
    id: p.id,
    nombre: p.nombre,
    configuracionId: strOrNull(p.configuracion_id),
    configuracionNombre: strOrNull(p.configuracion_nombre),
    configuracionVersion: strOrNull(p.configuracion_version),
    configuracionEstado: strOrNull(p.configuracion_estado),
    procesoId: strOrNull(p.proceso_id),
    procesoNombre: strOrNull(p.proceso_nombre),
    orisId: p.oris_id,
    orisNombre: strOrNull(p.oris_nombre),
    iumCount: num(p.ium_count),
    unionCount: num(p.union_count),
    unidadesOrganizacion: numOrNull(p.unidades_organizacion),
    modoActivacion: p.modo_activacion,
    modoAcceso: p.modo_acceso,
    calidadPreparacion: num(p.calidad_preparacion),
    coherenciaInicial: num(p.coherencia_inicial),
    coherenciaActual: num(p.coherencia_actual),
    umbralDisolucion: num(p.umbral_disolucion),
    tasaDisolucionH: num(p.tasa_disolucion_h),
    estado: p.estado,
    preparadaAt: p.preparada_at,
    ultimaEvaluacionAt: p.ultima_evaluacion_at,
    activacionesTotales: num(p.activaciones_totales),
    ultimaActivacionAt: strOrNull(p.ultima_activacion_at),
    concienciaEnlaceId: strOrNull(p.conciencia_enlace_id),
    iums: Array.isArray(p.iums) ? p.iums.map(mapIum) : [],
    uniones: Array.isArray(p.uniones) ? p.uniones.map(mapEnlace) : [],
    topologiaId: strOrNull(p.topologia_id),
  };
}

/** Trae en una sola llamada los almacenamientos IUM del objeto con sus
 *  preparaciones ya anidadas (obtener_iums_preparados_objeto_v1). Reemplaza
 *  las dos consultas separadas del service anterior. */
export async function obtenerIumsPreparadosDelObjeto(
  itemId: string,
): Promise<AlmacenamientoIumObjeto[]> {
  const { data, error } = await supabase.rpc("obtener_iums_preparados_objeto_v1", {
    p_item_id: itemId,
  });
  if (error) throw new Error(`obtenerIumsPreparadosDelObjeto: ${error.message}`);

  const raw = data as { estado: string; razon?: string; almacenamientos?: any[] };
  if (raw.estado !== "ok") {
    throw new Error(`obtenerIumsPreparadosDelObjeto: ${raw.razon ?? raw.estado}`);
  }

  return (raw.almacenamientos ?? []).map((a: any) => ({
    id: a.id,
    nombre: a.nombre,
    estado: a.estado,
    soporteTipoId: a.soporte_tipo_id,
    soporteCodigo: strOrNull(a.soporte_codigo),
    soporteNombre: strOrNull(a.soporte_nombre),
    capacidadOrden: numOrNull(a.capacidad_orden),
    estabilidad: numOrNull(a.estabilidad),
    aislamiento: numOrNull(a.aislamiento),
    factorGeometria: numOrNull(a.factor_geometria),
    tasaDisolucionBaseH: numOrNull(a.tasa_disolucion_base_h),
    preparaciones: Array.isArray(a.preparaciones) ? a.preparaciones.map(mapPreparacion) : [],
  }));
}

// ── Almacenamiento: crear si el objeto todavía no tiene ────────────────

export async function listarSoportesAlmacenamiento(params?: {
  tipo?: string;
}): Promise<SoporteAlmacenamientoIum[]> {
  let query = supabase
    .from("soportes_almacenamiento_ium_v1")
    .select(
      "id, codigo, nombre, tipo, capacidad_orden, estabilidad, aislamiento, factor_geometria, tasa_disolucion_base_h, reutilizable, activo",
    )
    .eq("activo", true);

  if (params?.tipo) query = query.eq("tipo", params.tipo);

  const { data, error } = await query.order("nombre", { ascending: true });
  if (error) throw new Error(`listarSoportesAlmacenamiento: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    codigo: r.codigo as string,
    nombre: r.nombre as string,
    tipo: r.tipo as string,
    capacidadOrden: num(r.capacidad_orden),
    estabilidad: num(r.estabilidad),
    aislamiento: num(r.aislamiento),
    factorGeometria: num(r.factor_geometria),
    tasaDisolucionBaseH: num(r.tasa_disolucion_base_h),
    reutilizable: Boolean(r.reutilizable),
    activo: Boolean(r.activo),
  }));
}

/** Crea el almacenamiento IUM del objeto — crear_almacenamiento_ium_objeto_v1
 *  ya valida que el objeto exista; el frontend siempre pasa el item_id
 *  actual, así que no puede crearse "para otro objeto" por error. */
export async function crearAlmacenamientoDelObjeto(params: {
  itemId: string;
  soporteTipoId: string;
  nombre?: string;
  personajeId?: string | null;
}): Promise<ResultadoCrearAlmacenamiento> {
  const { data, error } = await supabase.rpc("crear_almacenamiento_ium_objeto_v1", {
    p_item_id: params.itemId,
    p_soporte_tipo_id: params.soporteTipoId,
    p_nombre: params.nombre ?? null,
    p_personaje_id: params.personajeId ?? null,
  });
  if (error) throw new Error(`crearAlmacenamientoDelObjeto: ${error.message}`);
  return data as ResultadoCrearAlmacenamiento;
}

// ── 4-6. Preparar la configuración seleccionada en el objeto ───────────

/** Crea la preparación con la variante "objeto" de la RPC canónica: valida
 *  que item_id exista Y que el almacenamiento pertenezca a ese mismo
 *  objeto (rechaza con 'almacenamiento_no_pertenece_al_objeto' si no).
 *  oris_id se toma siempre de la configuración seleccionada — el frontend
 *  nunca deja elegir un Oris aparte. */
export async function crearPreparacionEnObjeto(params: {
  itemId: string;
  personajeId: string | null;
  orisId: string;
  almacenamientoId: string;
  configuracionId: string;
  nombre: string;
  calidadPreparacion: number;
  modoActivacion: "reutilizable" | "consumible";
}): Promise<ResultadoCrearPreparacion> {
  const { data, error } = await supabase.rpc("crear_preparacion_ium_objeto_v1", {
    p_item_id: params.itemId,
    p_personaje_id: params.personajeId,
    p_oris_id: params.orisId,
    p_almacenamiento_id: params.almacenamientoId,
    p_configuracion_id: params.configuracionId,
    p_nombre: params.nombre,
    p_calidad_preparacion: params.calidadPreparacion,
    p_modo_activacion: params.modoActivacion,
  });
  if (error) throw new Error(`crearPreparacionEnObjeto: ${error.message}`);
  return data as ResultadoCrearPreparacion;
}

export async function evaluarPreparacion(preparacionId: string): Promise<ResultadoEvaluarPreparacion> {
  const { data, error } = await supabase.rpc("evaluar_preparacion_ium_v1", {
    p_preparacion_id: preparacionId,
  });
  if (error) throw new Error(`evaluarPreparacion: ${error.message}`);
  return data as ResultadoEvaluarPreparacion;
}

/** Activa una preparación contra una orden de Eterium ya existente. La
 *  activación pertenece al runtime de Supabase; acá solo se invoca y se
 *  presenta el resultado tal cual (incluidos los rechazos). */
export async function activarPreparacion(params: {
  preparacionId: string;
  ordenId: string;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("activar_preparacion_ium_v1", {
    p_preparacion_id: params.preparacionId,
    p_orden_id: params.ordenId,
  });
  if (error) throw new Error(`activarPreparacion: ${error.message}`);
  return data as Record<string, unknown>;
}

// ── 7. Eliminar / desvincular ──────────────────────────────────────────

/** Desvincula (soft-delete, estado='inactivo') un proceso del objeto.
 *  v_item_editor_procesos_v1 filtra por estado='activo', así que esto
 *  basta para que desaparezca de la lista sin borrar historial. */
export async function desvincularProcesoDelObjeto(
  itemProcesoId: string,
): Promise<ResultadoDesvincularProceso> {
  const { data, error } = await supabase.rpc("desvincular_proceso_item_v1", {
    p_item_proceso_id: itemProcesoId,
  });
  if (error) throw new Error(`desvincularProcesoDelObjeto: ${error.message}`);
  return data as ResultadoDesvincularProceso;
}

/** Elimina (hard-delete) un almacenamiento IUM. Por defecto rechaza si
 *  tiene preparaciones dependientes (razon: "tiene_preparaciones"); pasar
 *  forzarCascada=true para borrarlas también — la UI debe confirmar
 *  explícitamente con el usuario antes de reintentar así. */
export async function eliminarAlmacenamientoDelObjeto(params: {
  almacenamientoId: string;
  forzarCascada?: boolean;
}): Promise<ResultadoEliminarAlmacenamiento> {
  const { data, error } = await supabase.rpc("eliminar_almacenamiento_ium_v1", {
    p_almacenamiento_id: params.almacenamientoId,
    p_forzar_cascada: params.forzarCascada ?? false,
  });
  if (error) throw new Error(`eliminarAlmacenamientoDelObjeto: ${error.message}`);
  return data as ResultadoEliminarAlmacenamiento;
}
