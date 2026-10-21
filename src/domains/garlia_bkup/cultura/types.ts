// culturas/idiomas/types.ts
// v4 — mapeado 1:1 contra el schema real de Supabase (proyecto Franiloverart)
// Tablas usadas: idiomas, familias_linguisticas, idioma_familia,
//   relaciones_idiomas, variedades_linguisticas, comunidades_linguisticas,
//   comunidad_idioma, fonemas_idioma, patrones_silabicos, reglas_fonologicas,
//   prosodia_idioma, sistemas_escritura, idioma_escritura,
//   lexemas, sentidos_lexicos, formas_lexicas,
//   morfemas, reglas_morfologicas, construcciones_sintacticas,
//   perfiles_gramaticales, periodos_linguisticos, cambios_linguisticos,
//   prestamos_lexicos

// ── Valores de estado compartido ─────────────────────────────────────────
export type EstadoCanon = "borrador" | "canon" | "revision" | "descartado";

// ── idiomas ───────────────────────────────────────────────────────────────
export interface Idioma {
  id: string;
  nombre: string;
  endonimo?: string;
  descripcion?: string;
  es_protolengua: boolean;
  estado: EstadoCanon;
  fuente_canon?: string;
  notas_documentacion?: string;
  created_at: string;
  updated_at: string;
  // joins opcionales
  familias?: FamiliaLinguistica[];
  perfil_gramatical?: PerfilGramatical;
  prosodia?: ProsodiaIdioma;
}

// ── familias_linguisticas ─────────────────────────────────────────────────
export interface FamiliaLinguistica {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

// ── idioma_familia ────────────────────────────────────────────────────────
export type TipoClasificacionFamilia = "principal" | "alternativa" | "propuesta";

export interface IdiomaFamilia {
  id: string;
  idioma_id: string;
  familia_id: string;
  tipo_clasificacion: TipoClasificacionFamilia;
  estado: EstadoCanon;
  justificacion?: string;
  fuente_canon?: string;
  created_at: string;
  // join opcional
  familia?: Pick<FamiliaLinguistica, "id" | "nombre">;
}

// ── relaciones_idiomas ────────────────────────────────────────────────────
export type TipoRelacionIdioma = "descendencia" | "prestamo" | "influencia" | "pidgin" | "creole" | "otro";

export interface RelacionIdioma {
  id: string;
  idioma_origen_id: string;
  idioma_destino_id: string;
  tipo: TipoRelacionIdioma;
  descripcion?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  // joins opcionales
  idioma_origen?: Pick<Idioma, "id" | "nombre">;
  idioma_destino?: Pick<Idioma, "id" | "nombre">;
}

// ── variedades_linguisticas ───────────────────────────────────────────────
export type TipoVariedad = "dialectal" | "sociolecto" | "registro" | "historica" | "otro";

export interface VariedadLinguistica {
  id: string;
  idioma_id: string;
  nombre: string;
  tipo: TipoVariedad;
  descripcion?: string;
  estado: EstadoCanon;
  periodo_descripcion?: string;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

// ── comunidades_linguisticas / comunidad_idioma ───────────────────────────
export interface ComunidadLinguistica {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

export type FuncionIdiomaComunidad =
  | "cotidiano" | "oficial" | "ritual" | "comercio" | "educacion" | "otro";

export interface ComunidadIdioma {
  id: string;
  comunidad_id: string;
  idioma_id: string;
  variedad_id?: string;
  funcion: FuncionIdiomaComunidad;
  nivel_uso?: string;
  periodo_descripcion?: string;
  estado: EstadoCanon;
  notas?: string;
  fuente_canon?: string;
  created_at: string;
  // joins opcionales
  comunidad?: Pick<ComunidadLinguistica, "id" | "nombre">;
}

// ── fonemas_idioma ────────────────────────────────────────────────────────
export type ClaseFonema = "consonante" | "vocal" | "semivocal" | "tono" | "otro";

export interface FonemaIdioma {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  simbolo: string;
  ipa: string;
  clase: ClaseFonema;
  sonoro?: boolean;
  // consonantes
  punto_articulacion?: string;
  modo_articulacion?: string;
  // vocales
  altura_vocal?: string;
  anterioridad_vocal?: string;
  redondeada?: boolean;
  es_fonema_distintivo: boolean;
  notas?: string;
  estado: EstadoCanon;
  created_at: string;
  updated_at: string;
}

// ── patrones_silabicos ────────────────────────────────────────────────────
export type TipoNucleoSilabico = "monoptongo" | "diptongo" | "triptongo";

export interface PatronSilabico {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  ataque_min: number;
  ataque_max: number;
  nucleo_tipo: TipoNucleoSilabico;
  coda_min: number;
  coda_max: number;
  descripcion?: string;
  estado: EstadoCanon;
  created_at: string;
  updated_at: string;
}

// ── reglas_fonologicas ────────────────────────────────────────────────────
export interface ReglaFonologica {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  nombre: string;
  tipo_regla: string;
  fonema_origen_id?: string;
  fonema_destino_id?: string;
  entorno_izquierda: Record<string, unknown>;
  entorno_derecha: Record<string, unknown>;
  orden_aplicacion: number;
  es_obligatoria: boolean;
  descripcion?: string;
  estado: EstadoCanon;
  created_at: string;
  updated_at: string;
}

// ── prosodia_idioma ───────────────────────────────────────────────────────
export interface ProsodiaIdioma {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  sistema_prosodico: string;
  posicion_acento?: string;
  tono_distintivo: boolean;
  duracion_distintiva: boolean;
  notas?: string;
  estado: EstadoCanon;
  created_at: string;
  updated_at: string;
}

// ── sistemas_escritura / idioma_escritura ─────────────────────────────────
export type TipoSistemaEscritura =
  | "alfabeto" | "silabario" | "abugida" | "abjad" | "logografico" | "mixto" | "otro";
export type DireccionEscritura =
  | "izquierda_derecha" | "derecha_izquierda" | "arriba_abajo" | "boustrophedon";

export interface SistemaEscritura {
  id: string;
  nombre: string;
  tipo: TipoSistemaEscritura;
  direccion: DireccionEscritura;
  descripcion?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

export type FuncionEscritura = "principal" | "alternativo" | "historico" | "liturgico";

export interface IdiomaEscritura {
  id: string;
  idioma_id: string;
  sistema_escritura_id: string;
  funcion: FuncionEscritura;
  periodo_descripcion?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  // join opcional
  sistema?: Pick<SistemaEscritura, "id" | "nombre" | "tipo" | "direccion">;
}

// ── lexemas / sentidos_lexicos / formas_lexicas ───────────────────────────
export type CategoriaGramatical =
  | "sustantivo" | "verbo" | "adjetivo" | "adverbio" | "pronombre"
  | "preposicion" | "conjuncion" | "interjeccion" | "articulo"
  | "numeral" | "particula" | "clasificador" | "otro";

export interface Lexema {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  lema: string;
  categoria_gramatical: CategoriaGramatical;
  transcripcion_ipa?: string;
  silabificacion?: string;
  definicion_breve?: string;
  registro?: string;
  periodo_descripcion?: string;
  estado: EstadoCanon;
  notas?: string;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
  // joins opcionales
  sentidos?: SentidoLexico[];
  formas?: FormaLexica[];
}

export interface SentidoLexico {
  id: string;
  lexema_id: string;
  concepto_id: string;
  numero_acepcion: number;
  definicion: string;
  uso_ejemplo?: string;
  restricciones_uso?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

export interface FormaLexica {
  id: string;
  lexema_id: string;
  forma: string;
  tipo_forma: string;
  rasgos_gramaticales: Record<string, unknown>;
  transcripcion_ipa?: string;
  periodo_descripcion?: string;
  estado: EstadoCanon;
  notas?: string;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

// ── morfemas ──────────────────────────────────────────────────────────────
export type TipoMorfema =
  | "raiz" | "prefijo" | "sufijo" | "infijo" | "circunfijo" | "clitico" | "otro";

export interface Morfema {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  forma: string;
  tipo: TipoMorfema;
  lexema_base_id?: string;
  concepto_id?: string;
  significado?: string;
  notas?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  forma_apertura?: string;
  forma_cierre?: string;
  created_at: string;
  updated_at: string;
}

// ── reglas_morfologicas ───────────────────────────────────────────────────
export interface ReglaMorfologica {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  nombre: string;
  tipo_operacion: string;
  morfema_id?: string;
  categoria_objetivo?: string;
  rasgos_entrada: Record<string, unknown>;
  rasgos_salida: Record<string, unknown>;
  orden_aplicacion: number;
  descripcion?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  contrato_operacional?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── construcciones_sintacticas ────────────────────────────────────────────
export interface ConstruccionSintactica {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  nombre: string;
  tipo: string;
  patron: Record<string, unknown>;
  contexto_uso?: string;
  ejemplos?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

// ── perfiles_gramaticales ─────────────────────────────────────────────────
export interface PerfilGramatical {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  orden_basico?: string;
  orden_adjetivo_sustantivo?: string;
  orden_poseedor_poseido?: string;
  tipo_adposicion?: string;
  estrategia_negacion?: string;
  estrategia_interrogacion?: string;
  genero_gramatical?: boolean;
  numero_gramatical?: boolean;
  caso_gramatical?: boolean;
  concordancia?: boolean;
  alineamiento?: string;
  notas?: string;
  estado: EstadoCanon;
  fuente_canon?: string;
  created_at: string;
  updated_at: string;
}

// ── periodos_linguisticos / cambios_linguisticos ──────────────────────────
export type UnidadTemporal = "anios" | "siglos" | "eras" | "sin_definir";

export interface PeriodoLinguistico {
  id: string;
  idioma_id: string;
  nombre: string;
  orden_cronologico: number;
  inicio_estimado?: number;
  fin_estimado?: number;
  unidad_temporal: UnidadTemporal;
  periodo_anterior_id?: string;
  descripcion?: string;
  fuente_canon?: string;
  estado: EstadoCanon;
  created_at: string;
  updated_at: string;
}

export interface CambioLinguistico {
  id: string;
  idioma_id: string;
  variedad_id?: string;
  periodo_origen_id?: string;
  periodo_destino_id?: string;
  dominio: string;
  nombre: string;
  descripcion: string;
  forma_anterior: Record<string, unknown>;
  forma_resultante: Record<string, unknown>;
  orden_aplicacion: number;
  evidencia?: string;
  fuente_canon?: string;
  estado: EstadoCanon;
  created_at: string;
  updated_at: string;
}

// ── prestamos_lexicos ─────────────────────────────────────────────────────
export interface PrestamoLexico {
  id: string;
  idioma_origen_id: string;
  idioma_receptor_id: string;
  lexema_origen_id: string;
  lexema_receptor_id?: string;
  concepto_id?: string;
  periodo_id?: string;
  forma_origen: string;
  forma_adaptada?: string;
  mecanismo_adaptacion?: string;
  via_transmision?: string;
  fecha_o_periodo?: string;
  contexto_contacto?: string;
  evidencia?: string;
  fuente_canon?: string;
  estado: EstadoCanon;
  created_at: string;
  updated_at: string;
  // joins opcionales
  idioma_origen?: Pick<Idioma, "id" | "nombre">;
  idioma_receptor?: Pick<Idioma, "id" | "nombre">;
}
