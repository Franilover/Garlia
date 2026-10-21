// ── Tipos del Pizarrón ────────────────────────────────────────────────────

import type { PanelFlotanteKind } from "@/domains/garlia/_shared/usePanelFlotanteStore";

export type TipoEntidadPizarron =
  | "sistema_solar" | "cuerpo_celeste" | "bioma" | "ecosistema" | "habitat"
  | "criatura" | "organismo" | "flora"
  | "sistema_biologico" | "organo" | "tejido" | "celula"
  | "polaridad" | "particula" | "elemento" | "compuesto"
  | "estructura" | "material" | "recurso_geologico" | "item"
  | "proceso" | "reaccion" | "fenomeno" | "conjuro" | "ium" | "runa"
  | "personaje" | "ciudad" | "reino" | "capitulo" | "libro"
  | "cancion" | "evento_linea" | "era"
  | "texto";

export interface PizarronLienzo {
  id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
}

export interface PizarronNodo {
  id: string;
  lienzo_id: string;
  tipo_entidad: TipoEntidadPizarron;
  entidad_id: string | null;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
  icono: string | null;
  datos_extra: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PizarronArista {
  id: string;
  lienzo_id: string;
  origen_id: string;
  destino_id: string;
  label: string | null;
  tipo: string;
  color: string | null;
  created_at: string;
}

export interface NodoRuntime extends PizarronNodo {
  dragging?: boolean;
  selected?: boolean;
}

/** Datos de preview cargados por fetchPreviewEntidad */
export interface EntidadPreview {
  id: string;
  nombre: string;
  /** Chips secundarios según el tipo (descripcion corta, tipo, formula, etc.) */
  chips: { label: string; value: string }[];
  /** URL de imagen si la tabla la tiene */
  imagenUrl?: string | null;
}

export interface TipoEntidadConfig {
  tabla: string;
  campoNombre: string;
  /** Columnas extra para preview (además de id y campoNombre) */
  previewSelect: string;
  /** Función que extrae chips del row crudo */
  previewChips: (row: Record<string, unknown>) => { label: string; value: string }[];
  /** PanelFlotanteKind para abrir el editor flotante; null = sin editor */
  panelKind: PanelFlotanteKind | null;
  label: string;
  icon: string;
  accentVar: string;
  /** Columna de imagen en la tabla principal (null = no tiene imagen) */
  campoImagen?: string | null;
  /** Campos opcionales que el usuario puede activar para mostrar en el nodo */
  camposOpcionales?: CampoOpcional[];
}

/**
 * Campo opcional que el usuario puede activar en un nodo del pizarrón.
 * Puede ser:
 *  - tipo "columna": campo directo en la misma tabla (ej: descripcion, tipo)
 *  - tipo "relacion": tabla relacionada via FK o tabla puente (ej: canciones de un personaje)
 */
export interface CampoOpcional {
  /** Identificador único dentro del tipo (snake_case) */
  id: string;
  /** Etiqueta visible para el usuario */
  label: string;
  /** "columna" = campo directo en la tabla principal; "relacion" = requiere query aparte */
  tipo: "columna" | "relacion";
  /** Para tipo "columna": nombre de la columna en la tabla principal */
  columna?: string;
  /** Para tipo "relacion": tabla relacionada */
  tablaRelacion?: string;
  /** Para tipo "relacion": columna FK que apunta a la entidad (ej: "personaje_id") */
  fkColumna?: string;
  /** Para tipo "relacion": columna de nombre a mostrar en la tabla relacionada */
  campoNombreRelacion?: string;
  /** Para tipo "relacion": tabla puente (ej: "personaje_canciones") */
  tablaPuente?: string;
  /** Para tipo "relacion" con tabla puente: FK en la tabla puente */
  fkPuente?: string;
}

/** Campos activos guardados en datos_extra del nodo */
export interface CamposActivosNodo {
  camposActivos?: string[]; // array de CampoOpcional.id
  valoresCampos?: Record<string, string[]>; // id -> valores cargados
  mostrarImagen?: boolean; // si el nodo muestra la imagen grande
}

// ── Helper ────────────────────────────────────────────────────────────────
function chip(label: string, value: unknown): { label: string; value: string } | null {
  if (value === null || value === undefined || value === "") return null;
  return { label, value: String(value) };
}
function chips(...pairs: Array<{ label: string; value: string } | null>): { label: string; value: string }[] {
  return pairs.filter((p): p is { label: string; value: string } => p !== null);
}

// ── Config ────────────────────────────────────────────────────────────────
export const TIPO_ENTIDAD_CONFIG: Record<TipoEntidadPizarron, TipoEntidadConfig> = {
  sistema_solar: {
    tabla: "sistemas_solares_v1", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo,descripcion",
    previewChips: (r) => chips(chip("Tipo", r.tipo), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Sistema Solar", icon: "Sun",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #fbbf24)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "tipo", label: "Tipo", tipo: "columna", columna: "tipo" },
      { id: "cuerpos_celestes", label: "Cuerpos celestes", tipo: "relacion", tablaRelacion: "cuerpos_celestes_v1", fkColumna: "sistema_solar_id", campoNombreRelacion: "nombre" },
    ],
  },
  cuerpo_celeste: {
    tabla: "cuerpos_celestes_v1", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo_cuerpo,descripcion",
    previewChips: (r) => chips(chip("Tipo", r.tipo_cuerpo), chip("Desc.", r.descripcion)),
    panelKind: "planeta",
    label: "Cuerpo Celeste", icon: "Globe",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #3b82f6)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "tipo_cuerpo", label: "Tipo de cuerpo", tipo: "columna", columna: "tipo_cuerpo" },
      { id: "biomas", label: "Biomas", tipo: "relacion", tablaRelacion: "biomas", fkColumna: "cuerpo_celeste_id", campoNombreRelacion: "nombre" },
    ],
  },
  bioma: {
    tabla: "biomas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "bioma",
    label: "Bioma", icon: "TreePine",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #16a34a)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "ecosistemas", label: "Ecosistemas", tipo: "relacion", tablaRelacion: "ecosistemas", fkColumna: "bioma_id", campoNombreRelacion: "nombre" },
      { id: "criaturas", label: "Criaturas", tipo: "relacion", tablaRelacion: "criaturas", fkColumna: "habitat", campoNombreRelacion: "nombre" },
    ],
  },
  ecosistema: {
    tabla: "ecosistemas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "ecosistema",
    label: "Ecosistema", icon: "Leaf",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #22c55e)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "habitats", label: "Hábitats", tipo: "relacion", tablaRelacion: "habitats", fkColumna: "ecosistema_id", campoNombreRelacion: "nombre" },
    ],
  },
  habitat: {
    tabla: "habitats", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "habitat",
    label: "Hábitat", icon: "Mountain",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #65a30d)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "criaturas", label: "Criaturas", tipo: "relacion", tablaRelacion: "criaturas", fkColumna: "habitat", campoNombreRelacion: "nombre" },
      { id: "flora", label: "Flora", tipo: "relacion", tablaRelacion: "organismos", fkColumna: "habitat_id", campoNombreRelacion: "nombre" },
    ],
  },
  criatura: {
    tabla: "criaturas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url,habitat,alma",
    previewChips: (r) => chips(chip("Hábitat", r.habitat), chip("Alma", r.alma), chip("Desc.", r.descripcion)),
    panelKind: "criatura",
    label: "Criatura", icon: "Footprints",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f59e0b)",
    campoImagen: "imagen_url",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "habitat", label: "Hábitat", tipo: "columna", columna: "habitat" },
      { id: "alma", label: "Alma", tipo: "columna", columna: "alma" },
      { id: "items", label: "Objetos asociados", tipo: "relacion", tablaRelacion: "items", fkColumna: "criatura_id", campoNombreRelacion: "nombre" },
    ],
  },
  organismo: {
    tabla: "organismos", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Organismo", icon: "Dna",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #14b8a6)",
    campoImagen: "imagen_url",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  flora: {
    tabla: "organismos", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "flora",
    label: "Flora", icon: "Flower2",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f472b6)",
    campoImagen: "imagen_url",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  sistema_biologico: {
    tabla: "sistemas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Sistema", icon: "Network",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f97316)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "organos", label: "Órganos", tipo: "relacion", tablaRelacion: "organos", fkColumna: "sistema_id", campoNombreRelacion: "nombre" },
    ],
  },
  organo: {
    tabla: "organos", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Órgano", icon: "Heart",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #fb923c)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "tejidos", label: "Tejidos", tipo: "relacion", tablaRelacion: "tejidos", fkColumna: "organo_id", campoNombreRelacion: "nombre" },
    ],
  },
  tejido: {
    tabla: "tejidos", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Tejido", icon: "Activity",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #fb7185)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "celulas", label: "Células", tipo: "relacion", tablaRelacion: "celulas", fkColumna: "tejido_id", campoNombreRelacion: "nombre" },
    ],
  },
  celula: {
    tabla: "celulas", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Célula", icon: "Microscope",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #a78bfa)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  polaridad: {
    tabla: "polaridades", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Polaridad", icon: "Zap",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #facc15)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "particulas", label: "Partículas", tipo: "relacion", tablaRelacion: "particulas", fkColumna: "polaridad_id", campoNombreRelacion: "nombre" },
    ],
  },
  particula: {
    tabla: "particulas", campoNombre: "nombre",
    previewSelect: "id,nombre,formula,categoria,funcion_canonica",
    previewChips: (r) => chips(chip("Fórmula", r.formula), chip("Cat.", r.categoria), chip("Función", r.funcion_canonica)),
    panelKind: null,
    label: "Partícula / TASI", icon: "LayoutGrid",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #8b5cf6)",

    camposOpcionales: [
      { id: "formula", label: "Fórmula", tipo: "columna", columna: "formula" },
      { id: "categoria", label: "Categoría", tipo: "columna", columna: "categoria" },
      { id: "funcion_canonica", label: "Función canónica", tipo: "columna", columna: "funcion_canonica" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "elementos", label: "Elementos", tipo: "relacion", tablaRelacion: "elementos", fkColumna: "particula_id", campoNombreRelacion: "nombre" },
    ],
  },
  elemento: {
    tabla: "elementos", campoNombre: "nombre",
    previewSelect: "id,nombre,simbolo,familia,estado_fisico,numero_atomico",
    previewChips: (r) => chips(chip("Símbolo", r.simbolo), chip("Familia", r.familia), chip("Estado", r.estado_fisico), chip("Nº", r.numero_atomico)),
    panelKind: null,
    label: "Elemento", icon: "Atom",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #84cc16)",

    camposOpcionales: [
      { id: "simbolo", label: "Símbolo", tipo: "columna", columna: "simbolo" },
      { id: "familia", label: "Familia", tipo: "columna", columna: "familia" },
      { id: "estado_fisico", label: "Estado físico", tipo: "columna", columna: "estado_fisico" },
      { id: "numero_atomico", label: "Nº Atómico", tipo: "columna", columna: "numero_atomico" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "compuestos", label: "Compuestos", tipo: "relacion", tablaRelacion: "compuestos", fkColumna: "elemento_id", campoNombreRelacion: "nombre" },
    ],
  },
  compuesto: {
    tabla: "compuestos", campoNombre: "nombre",
    previewSelect: "id,nombre,simbolo,formula_canonica,estado,categoria",
    previewChips: (r) => chips(chip("Símbolo", r.simbolo), chip("Fórmula", r.formula_canonica), chip("Estado", r.estado), chip("Cat.", r.categoria)),
    panelKind: null,
    label: "Compuesto", icon: "FlaskConical",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #10b981)",

    camposOpcionales: [
      { id: "simbolo", label: "Símbolo", tipo: "columna", columna: "simbolo" },
      { id: "formula_canonica", label: "Fórmula", tipo: "columna", columna: "formula_canonica" },
      { id: "estado", label: "Estado", tipo: "columna", columna: "estado" },
      { id: "categoria", label: "Categoría", tipo: "columna", columna: "categoria" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  estructura: {
    tabla: "estructuras", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo,descripcion",
    previewChips: (r) => chips(chip("Tipo", r.tipo), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Estructura", icon: "Boxes",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #94a3b8)",

    camposOpcionales: [
      { id: "tipo", label: "Tipo", tipo: "columna", columna: "tipo" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  material: {
    tabla: "materiales", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Material", icon: "Layers",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #78716c)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  recurso_geologico: {
    tabla: "recursos_geologicos_v1", campoNombre: "nombre",
    previewSelect: "id,nombre,clase_recurso,fuente_geologica",
    previewChips: (r) => chips(chip("Clase", r.clase_recurso), chip("Fuente", r.fuente_geologica)),
    panelKind: "mineral",
    label: "Mineral / Recurso", icon: "Gem",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #60a5fa)",

    camposOpcionales: [
      { id: "clase_recurso", label: "Clase", tipo: "columna", columna: "clase_recurso" },
      { id: "fuente_geologica", label: "Fuente geológica", tipo: "columna", columna: "fuente_geologica" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  item: {
    tabla: "items", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "item",
    label: "Objeto", icon: "Package",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #ef4444)",
    campoImagen: "imagen_url",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "categoria", label: "Categoría", tipo: "columna", columna: "categoria" },
      { id: "origen", label: "Origen", tipo: "columna", columna: "origen" },
      { id: "es_arma", label: "¿Es arma?", tipo: "columna", columna: "es_arma" },
      { id: "dado_dano", label: "Dado de daño", tipo: "columna", columna: "dado_dano" },
      { id: "es_armadura", label: "¿Es armadura?", tipo: "columna", columna: "es_armadura" },
    ],
  },
  proceso: {
    tabla: "procesos", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo,descripcion",
    previewChips: (r) => chips(chip("Tipo", r.tipo), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Proceso", icon: "Workflow",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #94a3b8)",

    camposOpcionales: [
      { id: "tipo", label: "Tipo", tipo: "columna", columna: "tipo" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  reaccion: {
    tabla: "reacciones", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Reacción", icon: "Zap",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f59e0b)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "reactivos", label: "Reactivos", tipo: "relacion", tablaRelacion: "elementos", fkColumna: "reaccion_id", campoNombreRelacion: "nombre" },
    ],
  },
  fenomeno: {
    tabla: "fenomenos", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Fenómeno", icon: "Wind",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #38bdf8)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  conjuro: {
    tabla: "conjuraciones", campoNombre: "nombre",
    previewSelect: "id,nombre,imagen_url",
    previewChips: () => [],
    panelKind: null,
    label: "Conjuro", icon: "Wand2",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #c084fc)",
    campoImagen: "imagen_url",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  ium: {
    tabla: "iums", campoNombre: "nombre",
    previewSelect: "id,nombre,detalle",
    previewChips: (r) => chips(chip("Detalle", r.detalle)),
    panelKind: null,
    label: "IUM", icon: "Hexagon",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #ec4899)",

    camposOpcionales: [
      { id: "detalle", label: "Detalle", tipo: "columna", columna: "detalle" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  runa: {
    tabla: "oris", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "ORIS", icon: "Sparkles",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f43f5e)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
    ],
  },
  personaje: {
    tabla: "personajes", campoNombre: "nombre",
    previewSelect: "id,nombre,especie,reino,sobre,img_url",
    previewChips: (r) => chips(chip("Especie", r.especie), chip("Reino", r.reino), chip("Sobre", r.sobre)),
    panelKind: "personaje",
    label: "Personaje", icon: "User",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #8b5cf6)",
    campoImagen: "img_url",

    camposOpcionales: [
      { id: "especie", label: "Especie", tipo: "columna", columna: "especie" },
      { id: "reino", label: "Reino", tipo: "columna", columna: "reino" },
      { id: "sobre", label: "Descripción", tipo: "columna", columna: "sobre" },
      { id: "canciones", label: "Canciones", tipo: "relacion", tablaPuente: "personaje_canciones", fkPuente: "personaje_id", tablaRelacion: "canciones", fkColumna: "cancion_id", campoNombreRelacion: "titulo" },
      { id: "capitulos", label: "Capítulos", tipo: "relacion", tablaPuente: "personaje_capitulos", fkPuente: "personaje_id", tablaRelacion: "capitulos", fkColumna: "capitulo_id", campoNombreRelacion: "titulo_capitulo" },
      { id: "eras", label: "Eras", tipo: "relacion", tablaPuente: "personaje_eras", fkPuente: "personaje_id", tablaRelacion: "eras_mundo", fkColumna: "era_id", campoNombreRelacion: "nombre" },
      { id: "reinos", label: "Reinos", tipo: "relacion", tablaPuente: "personaje_reinos", fkPuente: "personaje_id", tablaRelacion: "reinos", fkColumna: "reino_id", campoNombreRelacion: "nombre" },
      { id: "items", label: "Objetos", tipo: "relacion", tablaPuente: "personaje_items", fkPuente: "personaje_id", tablaRelacion: "items", fkColumna: "item_id", campoNombreRelacion: "nombre" },
    ],
  },
  ciudad: {
    tabla: "ciudades", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Tipo", r.tipo), chip("Desc.", r.descripcion)),
    panelKind: "ciudad",
    label: "Ciudad", icon: "Building2",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #06b6d4)",
    campoImagen: "imagen_url",

    camposOpcionales: [
      { id: "tipo", label: "Tipo", tipo: "columna", columna: "tipo" },
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "personajes", label: "Personajes", tipo: "relacion", tablaRelacion: "personajes", fkColumna: "ciudad_id", campoNombreRelacion: "nombre" },
      { id: "reinos", label: "Reinos", tipo: "relacion", tablaPuente: "ciudad_reinos", fkPuente: "ciudad_id", tablaRelacion: "reinos", fkColumna: "reino_id", campoNombreRelacion: "nombre" },
    ],
  },
  reino: {
    tabla: "reinos", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "reino",
    label: "Reino", icon: "Crown",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #3b82f6)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "ciudades", label: "Ciudades", tipo: "relacion", tablaRelacion: "ciudades", fkColumna: "reino_id", campoNombreRelacion: "nombre" },
      { id: "personajes", label: "Personajes", tipo: "relacion", tablaRelacion: "personajes", fkColumna: "reino", campoNombreRelacion: "nombre" },
      { id: "eventos", label: "Eventos", tipo: "relacion", tablaRelacion: "eventos_mundo", fkColumna: "reino_id", campoNombreRelacion: "titulo" },
    ],
  },
  capitulo: {
    tabla: "capitulos", campoNombre: "titulo_capitulo",
    previewSelect: "id,titulo_capitulo,orden,visibilidad,libro_id",
    previewChips: (r) => chips(chip("Cap.", r.orden), chip("Visib.", r.visibilidad)),
    panelKind: null,
    label: "Capítulo", icon: "BookOpen",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #a16207)",

    camposOpcionales: [
      { id: "orden", label: "Orden", tipo: "columna", columna: "orden" },
      { id: "visibilidad", label: "Visibilidad", tipo: "columna", columna: "visibilidad" },
      { id: "personajes", label: "Personajes", tipo: "relacion", tablaPuente: "personaje_capitulos", fkPuente: "capitulo_id", tablaRelacion: "personajes", fkColumna: "personaje_id", campoNombreRelacion: "nombre" },
    ],
  },
  libro: {
    tabla: "libros", campoNombre: "titulo",
    previewSelect: "id,titulo,estado,categoria,portada_url",
    previewChips: (r) => chips(chip("Estado", r.estado), chip("Cat.", r.categoria)),
    panelKind: null,
    label: "Libro", icon: "Book",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #92400e)",
    campoImagen: "portada_url",

    camposOpcionales: [
      { id: "estado", label: "Estado", tipo: "columna", columna: "estado" },
      { id: "categoria", label: "Categoría", tipo: "columna", columna: "categoria" },
      { id: "capitulos", label: "Capítulos", tipo: "relacion", tablaRelacion: "capitulos", fkColumna: "libro_id", campoNombreRelacion: "titulo_capitulo" },
    ],
  },
  cancion: {
    tabla: "canciones", campoNombre: "titulo",
    previewSelect: "id,titulo,cantante,tema,emocion,portada_url",
    previewChips: (r) => chips(chip("Cantante", r.cantante), chip("Tema", r.tema), chip("Emoción", r.emocion)),
    panelKind: null,
    label: "Canción", icon: "Music",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #db2777)",
    campoImagen: "portada_url",

    camposOpcionales: [
      { id: "cantante", label: "Cantante", tipo: "columna", columna: "cantante" },
      { id: "tema", label: "Tema", tipo: "columna", columna: "tema" },
      { id: "emocion", label: "Emoción", tipo: "columna", columna: "emocion" },
      { id: "personajes", label: "Personajes", tipo: "relacion", tablaPuente: "personaje_canciones", fkPuente: "cancion_id", tablaRelacion: "personajes", fkColumna: "personaje_id", campoNombreRelacion: "nombre" },
    ],
  },
  evento_linea: {
    tabla: "eventos_mundo", campoNombre: "titulo",
    previewSelect: "id,titulo,descripcion,dia_absoluto",
    previewChips: (r) => chips(chip("Día", r.dia_absoluto), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Evento línea", icon: "CalendarDays",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #0891b2)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "dia_absoluto", label: "Día absoluto", tipo: "columna", columna: "dia_absoluto" },
      { id: "personajes", label: "Personajes", tipo: "relacion", tablaPuente: "evento_personajes", fkPuente: "evento_id", tablaRelacion: "personajes", fkColumna: "personaje_id", campoNombreRelacion: "nombre" },
    ],
  },
  era: {
    tabla: "eras_mundo", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,anio_inicio,anio_fin",
    previewChips: (r) => chips(chip("Inicio", r.anio_inicio), chip("Fin", r.anio_fin), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Era", icon: "History",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #7c3aed)",

    camposOpcionales: [
      { id: "descripcion", label: "Descripción", tipo: "columna", columna: "descripcion" },
      { id: "anio_inicio", label: "Año inicio", tipo: "columna", columna: "anio_inicio" },
      { id: "anio_fin", label: "Año fin", tipo: "columna", columna: "anio_fin" },
      { id: "eventos", label: "Eventos", tipo: "relacion", tablaRelacion: "eventos_mundo", fkColumna: "era_id", campoNombreRelacion: "titulo" },
      { id: "personajes", label: "Personajes", tipo: "relacion", tablaPuente: "personaje_eras", fkPuente: "era_id", tablaRelacion: "personajes", fkColumna: "personaje_id", campoNombreRelacion: "nombre" },
    ],
  },
  texto: {
    tabla: "", campoNombre: "nombre",
    previewSelect: "",
    previewChips: () => [],
    panelKind: null,
    label: "Texto libre", icon: "FileText",
    accentVar: "color-mix(in srgb, var(--primary) 35%, transparent)",
  },
};

// ── Secciones del selector ────────────────────────────────────────────────
export interface SeccionSelector { label: string; tipos: TipoEntidadPizarron[] }

export const SECCIONES_SELECTOR: SeccionSelector[] = [
  { label: "Mundo",           tipos: ["sistema_solar","cuerpo_celeste","bioma","ecosistema","habitat","criatura","organismo","flora"] },
  { label: "Biología",        tipos: ["sistema_biologico","organo","tejido","celula"] },
  { label: "Física y Química",tipos: ["polaridad","particula","elemento","compuesto","estructura","material","recurso_geologico","item"] },
  { label: "Procesos y Magia",tipos: ["proceso","reaccion","fenomeno","conjuro","ium","runa"] },
  { label: "Narrativa",       tipos: ["personaje","ciudad","reino","capitulo","libro","cancion","evento_linea","era"] },
  { label: "Utilidad",        tipos: ["texto"] },
];
