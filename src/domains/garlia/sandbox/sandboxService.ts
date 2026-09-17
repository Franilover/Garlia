/**
 * sandboxService.ts — dominio Sandbox
 * ───────────────────────────────────────────────────────────────────────────
 * Capa fina sobre `supabase.rpc(...)`. NO contiene reglas de simulación:
 * eso vive enteramente en el backend (Supabase). Este archivo solo llama
 * a las RPCs ya existentes y hace fetch de las tablas relacionadas.
 *
 * Patrón de import calcado de AuthProvider.tsx / syncEngine.ts, que ya
 * usan `supabase.rpc()` directo en este mismo proyecto.
 *
 * RPCs cubiertas — control/estructura del Sandbox:
 *   - crear_sandbox, descartar_sandbox
 *   - agregar_entidad_sandbox, actualizar_estado_entidad_sandbox
 *   - encolar_evento_sandbox
 *   - control_sandbox   (Play / Pause / Step / Reset — orquestador único)
 *   - crear_snapshot_sandbox, restaurar_snapshot_sandbox
 *   - asignar_contexto_gravitacional_sandbox
 *
 * RPCs cubiertas — motor físico (fase 2026-09, acciones puntuales sobre una
 * entidad ya existente, más allá de "disparar evento" del catálogo):
 *   - establecer_temperatura_sandbox / aplicar_delta_temperatura_sandbox_v1
 *   - aplicar_danio_mecanico_sandbox_v1
 *   - aplicar_fuerza_sandbox
 *   - transferir_energia_sandbox / transferir_carga_sandbox
 *   - transmitir_informacion_sandbox
 *   - aplicar_eterium_sandbox
 *   - calcular_metricas_dinamicas_sandbox / calcular_energia_cinetica_sandbox_v1
 *     / resolver_peso_sandbox_v1 (solo lectura/cómputo, sin mutación)
 *
 * Deliberadamente NO se llaman directo desde el frontend (son piezas
 * internas que control_sandbox / avanzar_tiempo_sandbox / las RPC de arriba
 * ya orquestan, o requieren un tipo de entidad — "item" — que este Sandbox
 * de Elemento/Compuesto no usa):
 *   - avanzar_tiempo_sandbox, procesar_eventos_sandbox,
 *     evaluar_interaccion_sandbox, aplicar_efectos_interaccion_sandbox
 *   - resolver_fase_item_sandbox_v1, resolver_transicion_fase_item_sandbox_v1,
 *     obtener_contexto_item_sandbox, inicializar_fase_item_sandbox_v1
 *     (todas exigen entidad_tipo='item')
 *   - avanzar_movimiento_sandbox, resolver_aceleracion_dinamica_sandbox_v1
 *     (dependen de aplicar_fuerza_sandbox ya corrida, se orquestan juntas
 *     desde el hook, no son un botón aparte)
 *
 * Legado, no usar (confirmado en auditoría — operan sobre JSON suelto o
 * tablas paralelas, no sobre sandbox_entidades real):
 *   - simular_interaccion_sandbox, aplicar_efectos_sandbox,
 *     sandbox_simular_interaccion, aplicar_estado_sandbox
 */

import { supabase } from "@/infra/supabase/supabase";

import type {
  AccionControlSandbox,
  ContextoGravitacional,
  InteraccionEventoCatalogo,
  ResultadoAccionFisicaSandbox,
  RespuestaMotorSandbox,
  SandboxEntidad,
  SandboxEvento,
  SandboxSimulacion,
  SandboxSnapshot,
  Vector3,
} from "./types";

function assertNoError<T>(data: T, error: { message: string } | null, contexto: string): T {
  if (error) {
    throw new Error(`[sandboxService] ${contexto}: ${error.message}`);
  }
  return data;
}

// ─── Escritura vía RPC ──────────────────────────────────────────────────────

/** Crea una nueva simulación de Sandbox. Siempre pasa ambos parámetros
 *  explícitos para evitar cualquier ambigüedad de overload resolution
 *  en PostgREST (crear_sandbox tiene 2 firmas: con y sin p_contexto). */
export async function crearSandbox(
  nombre: string,
  contexto: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await supabase.rpc("crear_sandbox", {
    p_nombre: nombre,
    p_contexto: contexto,
  });
  return assertNoError(data as string, error, "crearSandbox");
}

/** Agrega una entidad a una simulación existente. */
export async function agregarEntidadSandbox(params: {
  simulacionId: string;
  entidadTipo: string;
  entidadOrigenId?: string | null;
  estadoInicial?: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await supabase.rpc("agregar_entidad_sandbox", {
    p_simulacion_id: params.simulacionId,
    p_entidad_tipo: params.entidadTipo,
    p_entidad_origen_id: params.entidadOrigenId ?? null,
    p_estado_inicial: params.estadoInicial ?? {},
  });
  return assertNoError(data as string, error, "agregarEntidadSandbox");
}

/** Encola un evento ("disparar evento") sobre una entidad del sandbox. */
export async function encolarEventoSandbox(params: {
  simulacionId: string;
  eventoId: string;
  entidadId: string;
  tiempoProgramado?: number | null;
  datos?: Record<string, unknown>;
  eventoOrigenId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("encolar_evento_sandbox", {
    p_simulacion_id: params.simulacionId,
    p_evento_id: params.eventoId,
    p_entidad_id: params.entidadId,
    p_tiempo_programado: params.tiempoProgramado ?? null,
    p_datos: params.datos ?? {},
    p_evento_origen_id: params.eventoOrigenId ?? null,
  });
  return assertNoError(data as string, error, "encolarEventoSandbox");
}

/** Orquestador único de Play / Pause / Step / Reset.
 *  p_delta tiene DEFAULT 1 en el backend; solo se envía cuando aplica (step). */
export async function controlSandbox(
  simulacionId: string,
  accion: AccionControlSandbox,
  delta?: number,
): Promise<RespuestaMotorSandbox> {
  const params: Record<string, unknown> = {
    p_simulacion_id: simulacionId,
    p_accion: accion,
  };
  if (delta !== undefined) params.p_delta = delta;

  const { data, error } = await supabase.rpc("control_sandbox", params);
  return assertNoError(data as RespuestaMotorSandbox, error, `controlSandbox(${accion})`);
}

// ─── Lectura directa de tablas (solo-consulta, sin useSupabaseData/Dexie) ──

export async function obtenerSimulacion(simulacionId: string): Promise<SandboxSimulacion | null> {
  const { data, error } = await supabase
    .from("sandbox_simulaciones")
    .select("*")
    .eq("id", simulacionId)
    .maybeSingle();
  return assertNoError(data as SandboxSimulacion | null, error, "obtenerSimulacion");
}

export async function listarSimulaciones(): Promise<SandboxSimulacion[]> {
  const { data, error } = await supabase
    .from("sandbox_simulaciones")
    .select("*")
    .neq("estado", "descartada")
    .order("id", { ascending: false });
  return assertNoError(data as SandboxSimulacion[], error, "listarSimulaciones") ?? [];
}

export async function listarEntidades(simulacionId: string): Promise<SandboxEntidad[]> {
  const { data, error } = await supabase
    .from("sandbox_entidades")
    .select("*")
    .eq("simulacion_id", simulacionId);
  return assertNoError(data as SandboxEntidad[], error, "listarEntidades") ?? [];
}

export async function listarEventos(simulacionId: string): Promise<SandboxEvento[]> {
  const { data, error } = await supabase
    .from("sandbox_eventos")
    .select("*")
    .eq("simulacion_id", simulacionId)
    .order("tiempo_programado", { ascending: true });
  return assertNoError(data as SandboxEvento[], error, "listarEventos") ?? [];
}

export async function listarSnapshots(simulacionId: string): Promise<SandboxSnapshot[]> {
  const { data, error } = await supabase
    .from("sandbox_snapshots")
    .select("*")
    .eq("simulacion_id", simulacionId);
  return assertNoError(data as SandboxSnapshot[], error, "listarSnapshots") ?? [];
}

/** Catálogo de eventos disponibles, para poblar el selector de "disparar evento".
 *  Solo lectura — la tabla la administra el proceso de worldbuilding, no este frontend. */
export async function listarCatalogoEventos(): Promise<InteraccionEventoCatalogo[]> {
  const { data, error } = await supabase
    .from("interaccion_eventos")
    .select("*");
  return assertNoError(data as InteraccionEventoCatalogo[], error, "listarCatalogoEventos") ?? [];
}

// ─── Control/estructura del Sandbox — resto de RPC oficiales ───────────────

/** Marca una simulación como descartada (estado='descartada'). No borra
 *  filas — listarSimulaciones ya filtra `neq('estado','descartada')`, así
 *  que desaparece de la lista sin perder el histórico en la tabla. */
export async function descartarSandbox(simulacionId: string): Promise<void> {
  const { error } = await supabase.rpc("descartar_sandbox", {
    p_simulacion_id: simulacionId,
  });
  assertNoError(null, error, "descartarSandbox");
}

/** Guarda un snapshot del estado completo (entidades + eventos) de la
 *  simulación en el tiempo_simulado actual. Solo lectura sobre el estado
 *  existente — no avanza ni modifica nada, solo lo copia a sandbox_snapshots. */
export async function crearSnapshotSandbox(
  simulacionId: string,
  etiqueta?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("crear_snapshot_sandbox", {
    p_simulacion_id: simulacionId,
    p_etiqueta: etiqueta ?? null,
  });
  return assertNoError(data as string, error, "crearSnapshotSandbox");
}

/** Restaura entidades + eventos + tiempo_simulado de la simulación al
 *  momento exacto en que se tomó el snapshot. Reemplaza el estado actual
 *  por completo (el motor ya lo hace transaccionalmente). */
export async function restaurarSnapshotSandbox(
  snapshotId: string,
): Promise<RespuestaMotorSandbox> {
  const { data, error } = await supabase.rpc("restaurar_snapshot_sandbox", {
    p_snapshot_id: snapshotId,
  });
  return assertNoError(data as RespuestaMotorSandbox, error, "restaurarSnapshotSandbox");
}

/** Parcha estado_actual de una entidad a mano (merge superficial de
 *  `propiedades`/`estados`, el resto de claves top-level se reemplaza tal
 *  cual). Uso explícito y deliberado del usuario — el motor de eventos
 *  sigue siendo quien normalmente escribe estado_actual; esto es la
 *  vía manual equivalente a "editar en el inspector". */
export async function actualizarEstadoEntidadSandbox(params: {
  entidadId: string;
  patch: Record<string, unknown>;
  tiempo?: number | null;
}): Promise<RespuestaMotorSandbox> {
  const { data, error } = await supabase.rpc("actualizar_estado_entidad_sandbox", {
    p_entidad_id: params.entidadId,
    p_patch: params.patch,
    p_tiempo: params.tiempo ?? null,
  });
  return assertNoError(data as RespuestaMotorSandbox, error, "actualizarEstadoEntidadSandbox");
}

/** Catálogo de contextos gravitacionales activos (Tierra, Luna, gravedad
 *  cero, etc.) — solo lectura, para poblar el selector de "Gravedad" de la
 *  simulación. */
export async function listarContextosGravitacionales(): Promise<ContextoGravitacional[]> {
  const { data, error } = await supabase
    .from("contextos_gravitacionales")
    .select("id, nombre, descripcion, gravedad_local, unidad_gravedad_id, activo")
    .eq("activo", true)
    .order("nombre");
  return assertNoError(data as ContextoGravitacional[], error, "listarContextosGravitacionales") ?? [];
}

/** Asigna un contexto gravitacional a la simulación — necesario para que
 *  resolverPesoSandbox pueda calcular Peso = Masa × g más adelante. */
export async function asignarContextoGravitacionalSandbox(params: {
  simulacionId: string;
  contextoGravitacionalId: string;
}): Promise<RespuestaMotorSandbox> {
  const { data, error } = await supabase.rpc("asignar_contexto_gravitacional_sandbox", {
    p_simulacion_id: params.simulacionId,
    p_contexto_gravitacional_id: params.contextoGravitacionalId,
  });
  return assertNoError(data as RespuestaMotorSandbox, error, "asignarContextoGravitacionalSandbox");
}

// ─── Motor físico — acciones puntuales sobre una entidad ya existente ──────
// Todas devuelven el jsonb crudo de la RPC (ver ResultadoAccionFisicaSandbox
// en types.ts): cuando el motor no puede aplicar el efecto (masa no
// definida, energía insuficiente, etc.) NO se lanza excepción — es una
// respuesta válida que el caller debe mostrar tal cual.

/** Fija la temperatura de una entidad a un valor explícito (no deriva de
 *  energía — para eso está aplicarDeltaTemperaturaSandbox). */
export async function establecerTemperaturaSandbox(params: {
  entidadId: string;
  temperatura: number;
  tiempoActual?: number | null;
  origen?: string;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("establecer_temperatura_sandbox", {
    p_sandbox_entidad_id: params.entidadId,
    p_temperatura: params.temperatura,
    p_tiempo_actual: params.tiempoActual ?? null,
    p_origen: params.origen ?? "entorno",
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "establecerTemperaturaSandbox");
}

/** Aplica un delta de energía y deriva el nuevo valor de temperatura vía
 *  capacidad térmica — requiere que la entidad ya tenga `temperatura`
 *  definida en sus propiedades (si no, el motor devuelve
 *  estado:'informacion_insuficiente', no un error). */
export async function aplicarDeltaTemperaturaSandbox(params: {
  entidadId: string;
  deltaEnergia: number;
  tiempoActual?: number | null;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("aplicar_delta_temperatura_sandbox_v1", {
    p_sandbox_entidad_id: params.entidadId,
    p_delta_energia: params.deltaEnergia,
    p_tiempo_actual: params.tiempoActual ?? null,
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "aplicarDeltaTemperaturaSandbox");
}

/** Aplica daño mecánico como fracción [0,1] de la integridad estructural
 *  actual — el motor clampea la fracción y marca condicion_estructural
 *  (sano/danado/fracturado) según el resultado. */
export async function aplicarDanioMecanicoSandbox(params: {
  entidadId: string;
  fraccion: number;
  tiempoActual?: number | null;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("aplicar_danio_mecanico_sandbox_v1", {
    p_sandbox_entidad_id: params.entidadId,
    p_fraccion: params.fraccion,
    p_tiempo_actual: params.tiempoActual ?? null,
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "aplicarDanioMecanicoSandbox");
}

/** Aplica una fuerza (vector 3D) y deriva aceleracion = fuerza/masa —
 *  requiere `masa` > 0 ya definida en las propiedades de la entidad. */
export async function aplicarFuerzaSandbox(params: {
  entidadId: string;
  fuerza: Vector3;
  tiempoActual: number;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("aplicar_fuerza_sandbox", {
    p_sandbox_entidad_id: params.entidadId,
    p_fuerza: params.fuerza,
    p_tiempo_actual: params.tiempoActual,
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "aplicarFuerzaSandbox");
}

/** Transfiere una cantidad de `energia` de una entidad a otra — falla
 *  explícitamente (estado:'energia_insuficiente') si el origen no tiene
 *  suficiente, sin dejar la operación a medias. */
export async function transferirEnergiaSandbox(params: {
  origenId: string;
  destinoId: string;
  cantidad: number;
  tiempoActual?: number | null;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("transferir_energia_sandbox", {
    p_origen_id: params.origenId,
    p_destino_id: params.destinoId,
    p_cantidad: params.cantidad,
    p_tiempo_actual: params.tiempoActual ?? null,
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "transferirEnergiaSandbox");
}

/** Transfiere carga eléctrica entre dos entidades, moderado por la
 *  conductividad de cada una (evaluar_transferencia_electrica_sandbox
 *  interno) — requiere `carga` y conductividad ya definidas en ambas. */
export async function transferirCargaSandbox(params: {
  origenId: string;
  destinoId: string;
  cantidad: number;
  tiempoActual: number;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("transferir_carga_sandbox", {
    p_origen_id: params.origenId,
    p_destino_id: params.destinoId,
    p_cantidad: params.cantidad,
    p_tiempo_actual: params.tiempoActual,
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "transferirCargaSandbox");
}

/** Transmite información de una entidad a otra, atenuada por distancia
 *  real (requiere `posicion` {x,y,z} definida en ambas propiedades) según
 *  intensidad/fidelidad/alcance — deja el contenido recibido en
 *  estado_actual.informacion.ultimo_recibido de la entidad destino. */
export async function transmitirInformacionSandbox(params: {
  origenId: string;
  destinoId: string;
  contenido: Record<string, unknown>;
  intensidad?: number;
  fidelidad?: number;
  alcance?: number | null;
  modeloAtenuacion?: "lineal" | "inverso" | "cuadratico";
  tiempoActual?: number | null;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("transmitir_informacion_sandbox", {
    p_origen_id: params.origenId,
    p_destino_id: params.destinoId,
    p_contenido: params.contenido,
    p_intensidad: params.intensidad ?? 1,
    p_fidelidad: params.fidelidad ?? 1,
    p_alcance: params.alcance ?? null,
    p_modelo_atenuacion: params.modeloAtenuacion ?? "lineal",
    p_tiempo_actual: params.tiempoActual ?? null,
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "transmitirInformacionSandbox");
}

/** Suma intensidad de Eterium acumulada en la entidad — magnitud propia
 *  del mundo Garlia, aditiva sobre estado_actual.eterium.intensidad. */
export async function aplicarEteriumSandbox(params: {
  entidadId: string;
  intensidad: number;
  origen?: string;
  tiempoActual?: number | null;
}): Promise<ResultadoAccionFisicaSandbox> {
  const { data, error } = await supabase.rpc("aplicar_eterium_sandbox", {
    p_sandbox_entidad_id: params.entidadId,
    p_intensidad: params.intensidad,
    p_origen: params.origen ?? "proceso",
    p_tiempo_actual: params.tiempoActual ?? null,
  });
  return assertNoError(data as ResultadoAccionFisicaSandbox, error, "aplicarEteriumSandbox");
}

// ─── Motor físico — lecturas/cómputo (sin mutación) ────────────────────────

/** Métricas agregadas de actividad de una entidad (estados activos,
 *  eventos, persistencia promedio, respuesta temporal) — solo lectura,
 *  útil para un panel de diagnóstico por entidad. */
export async function calcularMetricasDinamicasSandbox(
  entidadId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("calcular_metricas_dinamicas_sandbox", {
    p_sandbox_entidad_id: entidadId,
  });
  return assertNoError(data as Record<string, unknown>, error, "calcularMetricasDinamicasSandbox");
}

/** Energía cinética actual (E = 1/2 m|v|²) — requiere `masa` y
 *  `velocidad` {x,y,z} ya definidas. Solo lectura. */
export async function calcularEnergiaCineticaSandbox(
  entidadId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("calcular_energia_cinetica_sandbox_v1", {
    p_sandbox_entidad_id: entidadId,
  });
  return assertNoError(data as Record<string, unknown>, error, "calcularEnergiaCineticaSandbox");
}

/** Peso = Masa × gravedad_local del contexto gravitacional asignado a la
 *  simulación — requiere que la simulación tenga contexto_gravitacional_id
 *  asignado (ver asignarContextoGravitacionalSandbox). Solo lectura. */
export async function resolverPesoSandbox(
  entidadId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("resolver_peso_sandbox_v1", {
    p_sandbox_entidad_id: entidadId,
  });
  return assertNoError(data as Record<string, unknown>, error, "resolverPesoSandbox");
}
