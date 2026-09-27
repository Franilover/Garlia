/**
 * iumsPreparados.types.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Sección "IUMs preparados" del Editor de Objetos — gestiona lo que ya está
 * canónicamente en Supabase:
 *
 *   items (objeto)
 *   → almacenamientos_ium_v1  (ubicacion_tipo='objeto', ubicacion_id=items.id)
 *   → preparaciones_ium_v1    (configuracion_id + almacenamiento_id + oris_id)
 *   → proceso_configuraciones_ium_v1 (+ _componentes_v1 / _enlaces_v1 / _oris_v1)
 *   → oris
 *   → procesos
 *
 * Ningún campo se recalcula ni se inventa acá: todo viene tal cual de las
 * tablas/vistas reales (ver auditoría en la conversación: proyecto
 * ftdxthnizdosaaavjhah). Un campo ausente en Supabase (NULL) se representa
 * como `null`, nunca como 0 o un placeholder.
 */

/** Soporte físico de almacenamiento (soportes_almacenamiento_ium_v1). */
export interface SoporteAlmacenamientoIum {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  capacidadOrden: number;
  estabilidad: number;
  aislamiento: number;
  factorGeometria: number;
  tasaDisolucionBaseH: number;
  reutilizable: boolean;
  activo: boolean;
}

/** Almacenamiento IUM concreto del objeto (almacenamientos_ium_v1, filtrado
 *  por ubicacion_tipo='objeto' y ubicacion_id=items.id). */
export interface AlmacenamientoIumObjeto {
  id: string;
  soporteTipoId: string;
  soporte: SoporteAlmacenamientoIum | null;
  nombre: string;
  ubicacionTipo: string;
  ubicacionId: string | null;
  personajeId: string | null;
  capacidadOrdenOverride: number | null;
  estabilidadOverride: number | null;
  aislamientoOverride: number | null;
  factorGeometriaOverride: number | null;
  estado: string;
  propiedades: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Configuración IUM (proceso_configuraciones_ium_v1), tal como la expone
 *  v_proceso_configuracion_ium_v1 — unidad funcional real que se puede
 *  seleccionar al crear una preparación, ya resuelta contra el proceso y
 *  el/los Oris compatibles. */
export interface ConfiguracionIumDisponible {
  configuracionId: string;
  proceso: string;
  procesoId: string;
  orisPrincipalId: string | null;
  orisPrincipal: string | null;
  configuracion: string;
  version: string;
  estado: string;
  topologiaId: string | null;
  topologia: string | null;
  nIums: number;
  nUniones: number;
  demandaEteriumOrganizacion: number | null;
  iums: string | null;
  orisCompatibles: string | null;
  descripcion: string | null;
  fundamento: string | null;
}

/** Un IUM dentro de la configuración concreta de una preparación (viene de
 *  configuracion_snapshot.iums, no reconstruido desde oris_iums). */
export interface IumDeConfiguracion {
  componenteId: string;
  iumId: string;
  posicion: string;
  rol: string | null;
  orden: number;
  participacion: string | null;
  salidaFuncionalId: string | null;
}

/** Un enlace dentro de la configuración concreta de una preparación (viene
 *  de configuracion_snapshot.uniones). */
export interface EnlaceDeConfiguracion {
  origenComponenteId: string;
  destinoComponenteId: string;
  tipoUnion: string;
  orden: number;
  descripcion: string | null;
}

/** Snapshot completo de la configuración tal como quedó grabado en
 *  preparaciones_ium_v1.configuracion_snapshot al crear la preparación. */
export interface ConfiguracionSnapshot {
  configuracionId: string;
  configuracionNombre: string;
  configuracionVersion: string;
  configuracionEstado: string;
  procesoId: string;
  procesoNombre: string;
  orisId: string;
  orisNombre: string;
  topologiaId: string | null;
  iums: IumDeConfiguracion[];
  uniones: EnlaceDeConfiguracion[];
  concienciaEnlace: Record<string, unknown> | null;
}

/** Una preparación IUM almacenada en el objeto (preparaciones_ium_v1). */
export interface PreparacionIum {
  id: string;
  personajeId: string | null;
  orisId: string;
  orisNombre: string | null;
  almacenamientoId: string;
  configuracionId: string | null;
  procesoId: string | null;
  procesoNombre: string | null;
  nombre: string;
  modoActivacion: string;
  modoAcceso: string;
  iumCount: number;
  unionCount: number;
  unidadesOrganizacion: number | null;
  calidadPreparacion: number;
  coherenciaInicial: number;
  coherenciaActual: number;
  umbralDisolucion: number;
  tasaDisolucionH: number;
  perturbacionAcumulada: number;
  estado: string;
  origenHistorico: string;
  concienciaEnlaceId: string | null;
  configuracionSnapshot: ConfiguracionSnapshot | null;
  preparadaAt: string;
  ultimaEvaluacionAt: string;
  activadaAt: string | null;
  activacionesTotales: number;
  ultimaActivacionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Resultado crudo (jsonb) de crear_preparacion_ium_v1 — se presenta tal
 *  cual, sin traducir "razon"/"estado" a texto inventado. */
export interface ResultadoCrearPreparacionIum {
  estado: string;
  razon?: string;
  preparacion_id?: string;
  configuracion_id?: string;
  oris_id?: string;
  proceso_id?: string;
  unidades_organizacion?: number;
  capacidad_soporte?: number;
  coherencia_inicial?: number;
  tasa_disolucion_h?: number;
  conciencia_enlace_id?: string | null;
  principio?: string;
  mensaje?: string;
  [key: string]: unknown;
}

/** Resultado crudo (jsonb) de evaluar_preparacion_ium_v1. */
export interface ResultadoEvaluarPreparacionIum {
  estado: string;
  razon?: string;
  preparacion_id?: string;
  soporte?: string;
  unidades_organizacion?: number;
  carga_relativa?: number;
  tasa_disolucion_efectiva_h?: number;
  horas_desde_preparacion?: number;
  coherencia_actual?: number;
  umbral_disolucion?: number;
  estado_actual?: string;
  horas_totales_estimadas?: number;
  horas_restantes_estimadas?: number;
  [key: string]: unknown;
}
