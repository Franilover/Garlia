// domains/garlia/culturas/types.ts
// v2 — añade IdiomaFonema, IdiomaLexema, IdiomaLexemaSignificado, PersonajeIdioma

// ── Enumeraciones ─────────────────────────────────────────────────────────

export type IdiomaRol = "nativo" | "comercio" | "ritual" | "extinto" | "aprendido";
export type IdiomaTipo = "natural" | "creado" | "muerto" | "pidgin" | "sign" | "ritual" | "secreto";
export type DireccionEscritura = "ltr" | "rtl" | "ttb" | "btt" | "boustrophedon";
export type FraseCategoria =
  | "saludo" | "despedida" | "pregunta" | "numero" | "color" | "tiempo"
  | "ritual" | "insulto" | "piropo" | "refrán" | "otro";
export type ReglaCategoria =
  | "fonologia" | "morfologia" | "sintaxis" | "semantica" | "pragmatica" | "escritura" | "otro";
export type NivelIdioma = "nativo" | "fluido" | "basico" | "rudimentario";

export type TipoFonema = "consonante" | "vocal" | "semivocal" | "tono" | "otro";
export type SonorididadFonema = "sonora" | "sorda" | "mixta";

export type CategoriaGramatical =
  | "sustantivo" | "verbo" | "adjetivo" | "adverbio" | "pronombre"
  | "preposicion" | "conjuncion" | "interjeccion" | "articulo"
  | "numeral" | "partícula" | "clasificador" | "otro";

// ── Entidades principales ─────────────────────────────────────────────────

export interface Cultura {
  id: string;
  nombre: string;
  descripcion?: string;
  region_origen?: string;
  reino_id?: string;
  color_emblema?: string;
  emblema_icono?: string;
  es_extinta: boolean;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Idioma {
  id: string;
  nombre: string;
  nombre_nativo?: string;
  descripcion?: string;
  familia_linguistica?: string;
  tipo: IdiomaTipo;
  idioma_padre_id?: string;
  sistema_escritura?: string;
  direccion_escritura: DireccionEscritura;
  tiene_escritura_propia: boolean;
  notas_fonologia?: string;
  vocabulario_muestra: { palabra: string; traduccion: string }[];
  rasgos_gramaticales: string[];
  cultura_principal_id?: string;
  num_hablantes_aprox?: string;
  es_extinto: boolean;
  visible: boolean;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  cultura_principal?: Pick<Cultura, "id" | "nombre" | "color_emblema">;
  idioma_padre?: Pick<Idioma, "id" | "nombre">;
}

export interface IdiomaFrase {
  id: string;
  idioma_id: string;
  frase_original: string;
  transliteracion?: string;
  traduccion?: string;
  contexto?: string;
  categoria: FraseCategoria;
  created_at: string;
}

export interface IdiomaRegla {
  id: string;
  idioma_id: string;
  titulo: string;
  descripcion?: string;
  ejemplo?: string;
  categoria: ReglaCategoria;
  orden: number;
  created_at: string;
}

export interface CulturaIdioma {
  cultura_id: string;
  idioma_id: string;
  rol: IdiomaRol;
  // Joins opcionales
  cultura?: Pick<Cultura, "id" | "nombre" | "color_emblema">;
}

// ── Fonología estructurada (NUEVA) ────────────────────────────────────────
// Tabla: idiomas_fonemas

export interface IdiomaFonema {
  id: string;
  idioma_id: string;
  /** Símbolo IPA o notación propia del mundo */
  simbolo: string;
  tipo: TipoFonema;
  // Articulación (consonantes)
  punto_articulacion?: string;   // bilabial, alveolar, palatal, velar, glotal…
  modo_articulacion?: string;    // oclusiva, fricativa, nasal, lateral, vibrante, aproximante…
  sonoridad?: SonorididadFonema;
  // Articulación (vocales)
  altura?: string;               // alta, media-alta, media, media-baja, baja
  posterioridad?: string;        // anterior, central, posterior
  redondeamiento?: boolean;
  // Distribución
  posicion?: string;             // inicial, medial, final, todos
  notas?: string;
  /** Si es alófono, apunta al fonema principal */
  alofono_de?: string;
  created_at: string;
}

// ── Léxico / Diccionario (NUEVO) ──────────────────────────────────────────
// Tablas: idiomas_lexemas + idiomas_lexemas_significados

export interface IdiomaLexema {
  id: string;
  idioma_id: string;
  /** Forma canónica / lema */
  lema: string;
  /** Forma escrita superficial si difiere del lema */
  forma_superficial?: string;
  /** Transcripción fonética */
  pronunciacion?: string;
  categoria_gramatical?: CategoriaGramatical;
  etimologia?: string;
  notas?: string;
  es_prestamo: boolean;
  idioma_origen_id?: string;
  validado: boolean;
  created_at: string;
  updated_at: string;
  // Joins opcionales
  significados?: IdiomaLexemaSignificado[];
  idioma_origen?: Pick<Idioma, "id" | "nombre">;
}

export interface IdiomaLexemaSignificado {
  id: string;
  lexema_id: string;
  significado: string;
  contexto?: string;
  ejemplo_uso?: string;
  ejemplo_traduccion?: string;
  orden: number;
  created_at: string;
}

// ── Personajes e idiomas (YA existía en SQL, ahora tipado) ───────────────

export interface PersonajeIdioma {
  personaje_id: string;
  idioma_id: string;
  nivel: NivelIdioma;
}
