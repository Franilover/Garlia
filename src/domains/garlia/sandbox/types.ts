/**
 * types.ts — dominio Sandbox
 * ───────────────────────────────────────────────────────────────────────────
 * Tipos que reflejan EXACTAMENTE el shape real verificado en Supabase
 * (proyecto ftdxthnizdosaaavjhah), no un diseño ideal aparte.
 *
 * Fuente de verdad: tablas `sandbox_simulaciones`, `sandbox_entidades`,
 * `sandbox_eventos`, `sandbox_snapshots`, y el shape de `estado_actual`
 * confirmado con datos reales de prueba ("Prueba fuego 2").
 *
 * Estos tipos NO deben crecer con lógica de negocio: el motor de reglas
 * vive en Supabase. Este archivo solo describe la forma de los datos.
 */

// ─── sandbox_simulaciones ───────────────────────────────────────────────────

export type EstadoSimulacion = "activa" | "pausada" | "descartada";

export interface SandboxSimulacion {
  id: string; // uuid
  nombre: string;
  estado: EstadoSimulacion;
  contexto: Record<string, unknown>;
  tiempo_simulado: number;
  velocidad_tiempo: number;
  ultimo_tick_at: string | null; // timestamptz
  contexto_gravitacional_id: string | null;
}

// ─── estado_actual (jsonb) — shape confirmado con datos reales ─────────────

export interface EstadoTemporalEntidad {
  activo: boolean;
  iniciado_en: number | null; // tiempo_simulado en que empezó
  expira_en: number | null;   // tiempo_simulado en que expira, null = no expira
  intensidad: number | null;
  datos: Record<string, unknown>;
}

export interface EstadoActualEntidad {
  estados: Record<string, EstadoTemporalEntidad>;
  propiedades: Record<string, unknown>;
}

// ─── sandbox_entidades ──────────────────────────────────────────────────────

export interface SandboxEntidad {
  id: string; // uuid
  simulacion_id: string;
  entidad_tipo: string;
  entidad_origen_id: string | null;
  estado_inicial: EstadoActualEntidad;
  estado_actual: EstadoActualEntidad;
  tiempo_estado_actualizado: number | null;
}

// ─── sandbox_eventos ────────────────────────────────────────────────────────

export type EstadoEvento = "pendiente" | "procesado";

export interface SandboxEvento {
  id: string; // uuid
  simulacion_id: string;
  evento_id: string; // FK a catálogo `interaccion_eventos`
  sujeto_sandbox_id: string;
  objetivo_sandbox_id: string | null;
  contexto: Record<string, unknown>;
  estado: EstadoEvento;
  tiempo_programado: number;
  evento_origen_id: string | null; // evento que disparó este (cadena causal)
  ejecutado_at: string | null; // timestamptz
}

// ─── sandbox_snapshots ──────────────────────────────────────────────────────

export interface SandboxSnapshot {
  id: string; // uuid
  simulacion_id: string;
  etiqueta: string | null;
  tiempo_simulado: number;
  entidades: SandboxEntidad[];
  eventos: SandboxEvento[];
}

// ─── catálogo (solo lectura, para poblar UI de "disparar evento") ──────────

export interface InteraccionEventoCatalogo {
  id: string; // uuid
  clave?: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  [key: string]: unknown;
}

// ─── contextos_gravitacionales (catálogo, solo lectura) ────────────────────
// Fuente de verdad: tabla `contextos_gravitacionales`. Se asigna a una
// simulación vía asignar_contexto_gravitacional_sandbox — necesario para
// que resolver_peso_sandbox_v1 pueda calcular Peso = Masa × g.

export interface ContextoGravitacional {
  id: string; // uuid
  nombre: string;
  descripcion: string | null;
  gravedad_local: number;
  unidad_gravedad_id: string;
  activo: boolean;
}

// ─── acciones válidas para control_sandbox ─────────────────────────────────

export type AccionControlSandbox = "play" | "pause" | "step" | "reset";

/** Respuesta genérica jsonb de las RPCs de control/proceso.
 *  El shape interno lo define el motor en Supabase; el frontend NO debe
 *  asumir campos que no haya confirmado explícitamente contra el backend. */
export type RespuestaMotorSandbox = Record<string, unknown>;

// ─── Motor físico del Sandbox (fase 2026-09) ───────────────────────────────
// Acciones puntuales sobre una entidad (o par de entidades) ya existente en
// el Sandbox, más allá de "disparar evento" del catálogo. Cada una envuelve
// tal cual una RPC ya confirmada en Supabase — este archivo solo describe
// el shape del jsonb de respuesta, no reinterpreta ningún campo.
//
// Todas devuelven al menos `estado`/`aplicado` — cuando el motor no pudo
// aplicar el efecto (p. ej. "masa_no_definida_o_invalida",
// "informacion_insuficiente", "energia_insuficiente") NO es un error de
// red: es una respuesta válida que la UI debe mostrar tal cual, nunca
// reintentar en silencio ni inventar un valor.

/** Vector 3D genérico — mismo shape que usan aplicar_fuerza_sandbox
 *  (p_fuerza) y las posiciones/velocidades que ya vive en estado_actual. */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type EstadoAccionFisica =
  | "aplicado"
  | "calculado"
  | "resuelto"
  | "informacion_insuficiente"
  | "energia_insuficiente"
  | "carga_insuficiente"
  | "datos_invalidos"
  | "entidad_no_encontrada"
  | "no_resuelta"
  | "fuera_alcance";

/** Respuesta común a las RPC de acción física — superset laxo, cada RPC
 *  agrega sus propios campos (ver RespuestaMotorSandbox, se mantiene como
 *  Record<string, unknown> subyacente). */
export interface ResultadoAccionFisicaSandbox extends RespuestaMotorSandbox {
  estado?: EstadoAccionFisica | string;
  aplicado?: boolean;
  razon?: string;
}
