/**
 * procesosPreparacionesIum.types.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Sección "Procesos y preparaciones IUM" del Editor de Objetos. Reemplaza el
 * mezclador libre de IUMs por el flujo canónico:
 *
 *   OBJETO → PROCESOS QUE FACILITA → CONFIGURACIONES IUM DISPONIBLES
 *          → PREPARACIÓN IUM → ALMACENAMIENTO EN EL OBJETO
 *
 * Fuentes (auditadas contra Supabase, proyecto ftdxthnizdosaaavjhah):
 *   - v_item_editor_procesos_v1
 *   - v_item_editor_configuraciones_v1
 *   - obtener_iums_preparados_objeto_v1(item_id)  -- jsonb anidado completo
 *   - vincular_proceso_item_v1 / crear_preparacion_ium_objeto_v1
 *
 * Ningún campo se recalcula ni se inventa acá. Un NULL de Supabase se
 * representa como `null`, nunca como 0 o un placeholder.
 */

/** Un rol válido para item_procesos_v1 (vincular_proceso_item_v1 sólo
 *  acepta estos tres en minúscula; la UI los muestra capitalizados). */
export type RolProceso = "principal" | "compatible" | "secundario";

/** Un proceso que el objeto facilita (v_item_editor_procesos_v1). */
export interface ProcesoDelObjeto {
  itemId: string;
  itemProcesoId: string;
  procesoId: string;
  procesoNombre: string;
  naturalezaCanonica: string | null;
  procesoDescripcion: string | null;
  reglaClave: string | null;
  rol: RolProceso;
  vinculoDescripcion: string | null;
  estado: string;
  configuracionesDisponibles: number;
}

/** Una configuración IUM disponible para un proceso vinculado al objeto
 *  (v_item_editor_configuraciones_v1). */
export interface ConfiguracionDeProceso {
  itemId: string;
  procesoId: string;
  procesoNombre: string;
  procesoRol: RolProceso;
  configuracionId: string;
  configuracionNombre: string;
  configuracionDescripcion: string | null;
  orisId: string;
  orisNombre: string | null;
  topologiaId: string | null;
  configuracionEstado: string;
  configuracionVersion: string;
  fundamento: string | null;
  iumCount: number;
  enlaceCount: number;
}

/** Catálogo de procesos existentes en Supabase, para el selector de
 *  "+ Agregar proceso". No se hardcodea ninguno. */
export interface ProcesoCatalogo {
  id: string;
  nombre: string;
  tipo: string | null;
  descripcion: string | null;
  naturalezaCanonica: string | null;
}

/** Un IUM dentro del snapshot de una preparación. */
export interface IumDeConfiguracion {
  componenteId: string;
  iumId: string;
  posicion: string;
  rol: string | null;
  orden: number;
  participacion: string | null;
  salidaFuncionalId: string | null;
}

/** Un enlace dentro del snapshot de una preparación. */
export interface EnlaceDeConfiguracion {
  origenComponenteId: string;
  destinoComponenteId: string;
  tipoUnion: string;
  orden: number;
  descripcion: string | null;
}

/** Una preparación IUM, tal como la devuelve
 *  obtener_iums_preparados_objeto_v1 dentro de cada almacenamiento. */
export interface PreparacionIumObjeto {
  id: string;
  nombre: string;
  configuracionId: string | null;
  configuracionNombre: string | null;
  configuracionVersion: string | null;
  configuracionEstado: string | null;
  procesoId: string | null;
  procesoNombre: string | null;
  orisId: string;
  orisNombre: string | null;
  iumCount: number;
  unionCount: number;
  unidadesOrganizacion: number | null;
  modoActivacion: string;
  modoAcceso: string;
  calidadPreparacion: number;
  coherenciaInicial: number;
  coherenciaActual: number;
  umbralDisolucion: number;
  tasaDisolucionH: number;
  estado: string;
  preparadaAt: string;
  ultimaEvaluacionAt: string;
  activacionesTotales: number;
  ultimaActivacionAt: string | null;
  concienciaEnlaceId: string | null;
  iums: IumDeConfiguracion[];
  uniones: EnlaceDeConfiguracion[];
  topologiaId: string | null;
}

/** Soporte de almacenamiento IUM (soportes_almacenamiento_ium_v1). */
export interface SoporteAlmacenamientoIum {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  capacidadOrden: number;
  estabilidad: number;
  aislamiento: number;
  factorGeometria: number;
  tasaDisolucionBaseH: number;
  reutilizable: boolean;
  activo: boolean;
}

/** Un almacenamiento IUM del objeto, con sus preparaciones ya anidadas
 *  (obtener_iums_preparados_objeto_v1). */
export interface AlmacenamientoIumObjeto {
  id: string;
  nombre: string;
  estado: string;
  soporteTipoId: string;
  soporteCodigo: string | null;
  soporteNombre: string | null;
  capacidadOrden: number | null;
  estabilidad: number | null;
  aislamiento: number | null;
  factorGeometria: number | null;
  tasaDisolucionBaseH: number | null;
  preparaciones: PreparacionIumObjeto[];
}

/** Resultado crudo (jsonb) de crear_almacenamiento_ium_objeto_v1. */
export interface ResultadoCrearAlmacenamiento {
  estado: string;
  razon?: string;
  almacenamiento_id?: string;
  [key: string]: unknown;
}

/** Resultado crudo (jsonb) de crear_preparacion_ium_objeto_v1 — se
 *  presenta tal cual, sin traducir razones de rechazo a texto inventado. */
export interface ResultadoCrearPreparacion {
  estado: string;
  razon?: string;
  preparacion_id?: string;
  mensaje?: string;
  [key: string]: unknown;
}

/** Resultado crudo (jsonb) de evaluar_preparacion_ium_v1. */
export interface ResultadoEvaluarPreparacion {
  estado: string;
  razon?: string;
  coherencia_actual?: number;
  [key: string]: unknown;
}
