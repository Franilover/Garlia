/**
 * types.ts — domains/garlia/biologia
 * ───────────────────────────────────────────────────────────────────────────
 * Módulo self-contained de Biología: NO duplica criaturas (siguen viviendo
 * en domains/garlia/criaturas / tabla "criaturas"), solo las referencia por
 * id — mismo criterio que subsistemas_magia.criatura_ids.
 *
 * Piezas:
 *   1. Bioma — condición única del mundo (ligada a Oris/elementos), M:N con
 *      Reino. Contiene 0+ Ecosistemas (subzonas geográficas concretas).
 *   2. Clado (cladograma) — árbol SIN rangos fijos (nada de Reino/Filo/
 *      Clase). padre_id arma el árbol visual/jerárquico; profundidad libre.
 *      OJO: padre_id NO implica descendencia. Qué representa cada nodo lo
 *      dice `tipo_nodo` (filogenético, origen, ecológico, incertidumbre,
 *      ontológico, morfológico) y qué significa su vínculo con el padre lo
 *      dice `relacion_padre` (ascendencia, clasificación biológica, …).
 *      Los nodos filogenéticos siguen definidos por una sinapomorfía.
 *      Las conexiones que no son parentesco de árbol viven en la tabla
 *      `clado_relaciones` (afinidad, ecológica, origen, transformación,
 *      incertidumbre, asociación). Supabase es la fuente única: el
 *      frontend consume estas columnas, no infiere ni inventa relaciones.
 *      Cada clado puede tener 0+ criaturas asignadas (típicamente en las
 *      hojas, pero nada lo obliga).
 *   3. Ecosistema — subzona concreta dentro de un Bioma, con criaturas que
 *      la habitan (multi, mismo patrón que subsistemas_magia.criatura_ids).
 *   4. Cadena alimenticia — eslabones ordenados, cada uno con un rol
 *      (productor/herbívoro/carnívoro/omnívoro/descompositor) y 1+
 *      criaturas en ese rol.
 */

import { Compass, Dna, Leaf, Salad } from "lucide-react";

// ─── Biomas ─────────────────────────────────────────────────────────────────
// Nivel jerárquico por ENCIMA de Ecosistema: un Bioma es una condición única
// del mundo (ligada a la física/elementos de Oris), no un tipo climático
// intercambiable. Puede extenderse por varios Reinos, y un Reino puede tener
// territorio en varios Biomas — many-to-many en ambos sentidos.
//
//   Bioma "Desierto Mágico de Cristal"   ← único, propio del mundo
//     ↓ reino_ids (M:N)
//     Ecosistema "Dunas de Khazir"       ← subzona geográfica concreta
//     Ecosistema "Oasis de Vael"
//       ↓
//       Criaturas, Flora, Minerales

/** Fila cruda tal cual vive en Supabase (tabla "biomas"). */
export interface Bioma {
  id: string;
  nombre: string;
  descripcion: string;
  /** Afinidad simple con Oris/elementos del mundo (texto libre por ahora). */
  afinidad: string;
  orden: number;
  created_at: string;
  updated_at: string;
}

export type BiomaInput = Partial<Pick<Bioma, "nombre" | "descripcion" | "afinidad" | "orden">>;

// ─── Bioma ↔ Reino (tabla puente) ──────────────────────────────────────────
// Reemplaza a la antigua columna embebida `biomas.reino_ids` (jsonb/array,
// eliminada). Mismo criterio que ecosistema_criaturas: M:N puro, sin PK
// propia, se lee/escribe directo contra Supabase — ver useBiomaReinos().

/** Fila cruda tal cual vive en Supabase (tabla "bioma_reinos"). */
export interface BiomaReino {
  bioma_id: string;
  reino_id: string;
}

// ─── Cladística (cladograma / árbol filogenético) ──────────────────────────

// ── Contrato de `clados` (Supabase manda) ─────────────────────────────────
// `padre_id` es el padre VISUAL/JERÁRQUICO del árbol — NO implica por sí
// mismo descendencia. Qué significa cada nodo y qué significa su conexión
// con el padre lo dicen dos columnas aparte:
//
//   tipo_nodo       → qué REPRESENTA el nodo.
//   relacion_padre  → qué SIGNIFICA su conexión con `padre_id`.
//
// Ambas tienen un CHECK constraint en la base; los tipos generados de
// Supabase las emiten como `string | null` (no reflejan CHECKs), por eso
// acá se declaran las uniones literales exactas del CHECK.

/** Qué representa un nodo del cladograma (CHECK `clados.tipo_nodo`). */
export type TipoNodoClado =
  | "filogenetico"
  | "origen"
  | "ecologico"
  | "incertidumbre"
  | "ontologico"
  | "morfologico";

export const TIPOS_NODO_CLADO: TipoNodoClado[] = [
  "filogenetico",
  "origen",
  "ecologico",
  "incertidumbre",
  "ontologico",
  "morfologico",
];

/** Qué significa la conexión de un nodo con su padre (CHECK `clados.relacion_padre`). */
export type RelacionPadreClado =
  | "ascendencia"
  | "clasificacion_biologica"
  | "origen"
  | "agrupacion_ecologica"
  | "agrupacion_morfologica"
  | "incertidumbre"
  | "clasificacion_ontologica";

export const RELACIONES_PADRE_CLADO: RelacionPadreClado[] = [
  "ascendencia",
  "clasificacion_biologica",
  "origen",
  "agrupacion_ecologica",
  "agrupacion_morfologica",
  "incertidumbre",
  "clasificacion_ontologica",
];

export const TIPO_NODO_CLADO_LABEL: Record<TipoNodoClado, string> = {
  filogenetico: "Filogenético",
  origen: "Origen",
  ecologico: "Ecológico",
  incertidumbre: "Incertidumbre",
  ontologico: "Ontológico",
  morfologico: "Morfológico",
};

export const RELACION_PADRE_CLADO_LABEL: Record<RelacionPadreClado, string> = {
  ascendencia: "Ascendencia",
  clasificacion_biologica: "Clasificación biológica",
  origen: "Origen",
  agrupacion_ecologica: "Agrupación ecológica",
  agrupacion_morfologica: "Agrupación morfológica",
  incertidumbre: "Incertidumbre",
  clasificacion_ontologica: "Clasificación ontológica",
};

// ─── Editor guiado de clados (v_clado_editor_opciones_v1 / v_clado_editor_reglas_v1) ──
// Fuente de verdad para lo que el escritor puede elegir en el editor: el
// catálogo de opciones por campo (tipo_nodo, relacion_padre, rango, estado)
// y la matriz de combinaciones válidas de tipo_nodo/relacion_padre según el
// tipo_nodo del padre. El frontend NUNCA hardcodea estas listas — las lee
// de estas dos vistas y respeta `activo`/`permitida` tal cual vienen.

/** Campos del editor de clados cubiertos por el catálogo (v_clado_editor_opciones_v1.campo). */
export type CampoEditorClado = "tipo_nodo" | "relacion_padre" | "rango" | "estado";

/** Fila de la vista v_clado_editor_opciones_v1: una opción seleccionable de un campo. */
export interface CladoEditorOpcion {
  id: string;
  campo: CampoEditorClado;
  /** Valor que se guarda en `clados`. */
  clave: string;
  /** Texto que se muestra en el dropdown. */
  etiqueta: string;
  descripcion: string | null;
  orden: number;
  /** Si es false, la opción no se ofrece para clados nuevos (ver `legado`). */
  activo: boolean;
  /** true = valor histórico que ya no se ofrece para elegir, pero que un
   *  registro existente puede seguir teniendo — se mantiene disponible al
   *  editar ESE registro para no forzar una migración de datos desde acá. */
  legado: boolean;
  metadata: Record<string, unknown>;
}

/** Fila de la vista v_clado_editor_reglas_v1: una combinación tipo_nodo/relacion_padre válida. */
export interface CladoEditorRegla {
  id: string;
  tipo_nodo: TipoNodoClado;
  relacion_padre: RelacionPadreClado;
  /** Tipo de nodo que debe tener el padre para que esta regla aplique.
   *  null = la regla no restringe el tipo del padre (cualquier tipo vale). */
  tipo_nodo_padre: TipoNodoClado | null;
  permitida: boolean;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

/** Fila cruda tal cual vive en Supabase (tabla "clados"). */
export interface Clado {
  id: string;
  nombre: string;
  /**
   * Sinapomorfía: el carácter derivado compartido por todos los
   * descendientes de este clado, lo que lo define como grupo monofilético
   * (ej. "Presencia de vejiga de veneno dorsal"). Es el corazón del
   * criterio cladístico — a diferencia de un "rango" linneano, no es una
   * etiqueta de nivel sino la evidencia evolutiva del agrupamiento.
   */
  sinapomorfia: string;
  /**
   * Padre visual/jerárquico en el árbol — null si es raíz. NO implica
   * descendencia: leer `relacion_padre` para saber qué significa el vínculo.
   */
  padre_id: string | null;
  descripcion: string;
  /**
   * @deprecated LEGACY/DERIVADO. NO usar como fuente de datos nueva ni para
   * construir clado → criatura. La navegación canónica es
   *   clado → organismos.clado_id → organismo → criatura_organismos
   * (ver useOrganismosDeClado / v_clados_organismos_criaturas_v1).
   * La columna sigue en la fila cruda y por eso queda tipada, pero el
   * frontend ya no la lee ni la escribe.
   */
  criatura_ids: string[];
  orden: number;
  /** Qué representa este nodo. null = sin clasificar todavía (no se infiere). */
  tipo_nodo: TipoNodoClado | null;
  /** Qué significa la conexión con `padre_id`. null = sin clasificar (no se infiere). */
  relacion_padre: RelacionPadreClado | null;
  /** Etiqueta libre de nivel (ej. "linaje", "rama_ecologica") — texto libre en la base. */
  rango: string | null;
  /** Estado del nodo ("activo" por defecto) — texto libre en la base. */
  estado: string;
  created_at: string;
  updated_at: string;
}

export type CladoInput = Partial<
  Pick<
    Clado,
    | "nombre"
    | "sinapomorfia"
    | "padre_id"
    | "descripcion"
    | "orden"
    | "tipo_nodo"
    | "relacion_padre"
    | "rango"
    | "estado"
  >
>;

// ─── Clado ↔ Clado (tabla "clado_relaciones") ──────────────────────────────
// Conexiones que NO deben convertirse en hijos del árbol: el nodo destino
// vive en otra rama (su `padre_id` no cambia) pero está vinculado a este por
// una relación con significado propio. Por ejemplo, "Primate" tiene
// `afinidad` con "Humanidad de Garlia" sin que uno sea hijo del otro.
// Solo se LEEN y se muestran — el frontend nunca las convierte en aristas
// padre→hijo ni las inventa a partir de otros datos.

/** Tipo de relación lateral (CHECK `clado_relaciones.tipo`). */
export type TipoRelacionClado =
  | "afinidad"
  | "ecologica"
  | "origen"
  | "transformacion"
  | "incertidumbre"
  | "asociacion";

export const TIPOS_RELACION_CLADO: TipoRelacionClado[] = [
  "afinidad",
  "ecologica",
  "origen",
  "transformacion",
  "incertidumbre",
  "asociacion",
];

export const TIPO_RELACION_CLADO_LABEL: Record<TipoRelacionClado, string> = {
  afinidad: "Afinidad",
  ecologica: "Ecológica",
  origen: "Origen",
  transformacion: "Transformación",
  incertidumbre: "Incertidumbre",
  asociacion: "Asociación",
};

/** Fila cruda tal cual vive en Supabase (tabla "clado_relaciones"). */
export interface CladoRelacion {
  id: string;
  clado_origen_id: string;
  clado_destino_id: string;
  tipo: TipoRelacionClado;
  descripcion: string;
  created_at: string;
}

// ─── Modelo biológico canónico: Clado → Organismo → Criatura ───────────────
// La biología se define en el ORGANISMO y se hereda a través de su CLADO
// (organismos.clado_id). La criatura es la entidad narrativa que usa uno o
// más organismos (criatura_organismos). Un clado puede tener VARIOS
// organismos: 1 clado ≠ 1 organismo.
//
// Estas filas vienen tal cual de las vistas de Supabase (que resuelven el
// join) — el frontend no reconstruye la relación ni la herencia.

/** Fila de la vista v_clados_organismos_v1 (un organismo de un clado). */
export interface CladoOrganismo {
  clado_id: string;
  clado: string;
  tipo_nodo: TipoNodoClado | null;
  relacion_padre: RelacionPadreClado | null;
  rango: string | null;
  estado: string | null;
  organismo_id: string;
  organismo: string;
  tipo_organismo: string | null;
  categoria: string | null;
  variante_tipo: string | null;
  sexo_biologico: string | null;
  organismo_base_id: string | null;
}

/** Fila de la vista v_organismos_criaturas_v1 (una criatura que usa un organismo). */
export interface OrganismoCriatura {
  organismo_id: string;
  organismo: string;
  clado_id: string | null;
  criatura_id: string;
  criatura: string;
  es_principal: boolean;
  rol: string | null;
  cantidad: number | null;
}

// ─── Ecosistemas ────────────────────────────────────────────────────────────

/** Fila cruda tal cual vive en Supabase (tabla "ecosistemas"). */
export interface Ecosistema {
  id: string;
  nombre: string;
  /** FK a Bioma (biologia/types.ts → Bioma) — null si no está asignado a ninguno. */
  bioma_id: string | null;
  clima: string;
  descripcion: string;
  /** Minerales (por id) presentes como recursos de este ecosistema. */
  mineral_ids: string[];
  orden: number;
  created_at: string;
  updated_at: string;
}

export type EcosistemaInput = Partial<
  Pick<Ecosistema, "nombre" | "bioma_id" | "clima" | "descripcion" | "mineral_ids" | "orden">
>;

// ─── Ecosistema ↔ Flora (tabla puente) ─────────────────────────────────────
// Reemplaza a la antigua columna embebida `ecosistemas.flora_ids` (jsonb/
// array, eliminada). Mismo criterio que ecosistema_criaturas/bioma_reinos:
// M:N puro, sin PK propia — ver useEcosistemaFlora().

/** Fila cruda tal cual vive en Supabase (tabla "ecosistema_flora"). */
export interface EcosistemaFlora {
  ecosistema_id: string;
  flora_id: string;
}

// ─── Ecosistema ↔ Criatura (tabla puente) ──────────────────────────────────
// Ruta canónica (migración v226) para la relación M:N entre Ecosistema y
// Criatura — reemplaza la antigua columna embebida `ecosistemas.criatura_ids`
// (retirada por duplicar la misma relación). Vive en la tabla
// "ecosistema_criaturas", con atributos propios de la asociación.

/** Fila cruda tal cual vive en Supabase (tabla "ecosistema_criaturas"). */
export interface EcosistemaCriatura {
  ecosistema_id: string;
  criatura_id: string;
  /** Rol de la criatura dentro de ese ecosistema — semántica libre. */
  rol: string | null;
  /** Abundancia de la criatura dentro de ese ecosistema — semántica libre. */
  abundancia: string | null;
}

// ─── Cadenas alimenticias ───────────────────────────────────────────────────

export type RolTrofico =
  | "productor"
  | "herbivoro"
  | "carnivoro"
  | "omnivoro"
  | "descompositor";

export const ROL_TROFICO_LABEL: Record<RolTrofico, string> = {
  productor: "Productor",
  herbivoro: "Herbívoro",
  carnivoro: "Carnívoro",
  omnivoro: "Omnívoro",
  descompositor: "Descomponedor",
};

export const ROLES_TROFICOS: RolTrofico[] = [
  "productor",
  "herbivoro",
  "carnivoro",
  "omnivoro",
  "descompositor",
];

/** Un eslabón de la cadena: un rol trófico con 1+ criaturas que lo ocupan. */
export interface EslabonTrofico {
  id: string;
  rol: RolTrofico;
  criatura_ids: string[];
  /** Flora (por id) que ocupa este eslabón — típicamente rol "productor". */
  flora_ids?: string[];
  nota?: string;
}

/** Fila cruda tal cual vive en Supabase (tabla "cadenas_alimenticias"). */
export interface CadenaAlimenticia {
  id: string;
  nombre: string;
  ecosistema_id: string | null;
  descripcion: string;
  eslabones: EslabonTrofico[];
  orden: number;
  created_at: string;
  updated_at: string;
}

export type CadenaAlimenticiaInput = Partial<
  Pick<
    CadenaAlimenticia,
    "nombre" | "ecosistema_id" | "descripcion" | "eslabones" | "orden"
  >
>;

// Nota: el bloque "Perfil de criatura" (RasgoEvolutivo,
// TIPO_RASGO_EVOLUTIVO_LABEL, PerfilAtomicoCriatura) se quitó entero —
// dependía de la tabla "perfiles_atomicos_criatura", que nunca existió en
// Supabase.

// Nota: PerfilAtomicoCriatura / PerfilAtomicoCriaturaInput (tabla
// "perfiles_atomicos_criatura") se quitaron — esa tabla nunca existió en
// Supabase, el bloque "Rasgos evolutivos" del editor de criatura solo
// tiraba 404 en loop.

// ─── Sub-tabs de Biología ───────────────────────────────────────────────────

export type SeccionBiologia = "cladistica" | "ecosistemas";

export const SECCIONES_BIOLOGIA: {
  key: SeccionBiologia;
  label: string;
  Icon: React.ElementType;
}[] = [
  { key: "cladistica", label: "Cladística", Icon: Dna },
  { key: "ecosistemas", label: "Ecosistemas", Icon: Leaf },
];

export const CADENA_ICON = Salad;
export const BIOMA_ICON = Compass;
