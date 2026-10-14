// domains/garlia/culturas/types.ts

export type IdiomaRol = "nativo" | "comercio" | "ritual" | "extinto" | "aprendido";
export type IdiomaTipo = "natural" | "creado" | "muerto" | "pidgin" | "sign" | "ritual" | "secreto";
export type DireccionEscritura = "ltr" | "rtl" | "ttb" | "btt" | "boustrophedon";
export type FraseCategoria =
  | "saludo" | "despedida" | "pregunta" | "numero" | "color" | "tiempo"
  | "ritual" | "insulto" | "piropo" | "refrán" | "otro";
export type ReglaCategoria =
  | "fonologia" | "morfologia" | "sintaxis" | "semantica" | "pragmatica" | "escritura" | "otro";
export type NivelIdioma = "nativo" | "fluido" | "basico" | "rudimentario";

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
}
