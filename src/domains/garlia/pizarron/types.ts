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
  },
  cuerpo_celeste: {
    tabla: "cuerpos_celestes_v1", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo_cuerpo,descripcion",
    previewChips: (r) => chips(chip("Tipo", r.tipo_cuerpo), chip("Desc.", r.descripcion)),
    panelKind: "planeta",
    label: "Cuerpo Celeste", icon: "Globe",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #3b82f6)",
  },
  bioma: {
    tabla: "biomas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "bioma",
    label: "Bioma", icon: "TreePine",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #16a34a)",
  },
  ecosistema: {
    tabla: "ecosistemas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "ecosistema",
    label: "Ecosistema", icon: "Leaf",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #22c55e)",
  },
  habitat: {
    tabla: "habitats", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "habitat",
    label: "Hábitat", icon: "Mountain",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #65a30d)",
  },
  criatura: {
    tabla: "criaturas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url,habitat,alma",
    previewChips: (r) => chips(chip("Hábitat", r.habitat), chip("Alma", r.alma), chip("Desc.", r.descripcion)),
    panelKind: "criatura",
    label: "Criatura", icon: "Footprints",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f59e0b)",
  },
  organismo: {
    tabla: "organismos", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Organismo", icon: "Dna",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #14b8a6)",
  },
  flora: {
    tabla: "organismos", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "flora",
    label: "Flora", icon: "Flower2",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f472b6)",
  },
  sistema_biologico: {
    tabla: "sistemas", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Sistema", icon: "Network",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f97316)",
  },
  organo: {
    tabla: "organos", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Órgano", icon: "Heart",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #fb923c)",
  },
  tejido: {
    tabla: "tejidos", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Tejido", icon: "Activity",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #fb7185)",
  },
  celula: {
    tabla: "celulas", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Célula", icon: "Microscope",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #a78bfa)",
  },
  polaridad: {
    tabla: "polaridades", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Polaridad", icon: "Zap",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #facc15)",
  },
  particula: {
    tabla: "particulas", campoNombre: "nombre",
    previewSelect: "id,nombre,formula,categoria,funcion_canonica",
    previewChips: (r) => chips(chip("Fórmula", r.formula), chip("Cat.", r.categoria), chip("Función", r.funcion_canonica)),
    panelKind: null,
    label: "Partícula / TASI", icon: "LayoutGrid",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #8b5cf6)",
  },
  elemento: {
    tabla: "elementos", campoNombre: "nombre",
    previewSelect: "id,nombre,simbolo,familia,estado_fisico,numero_atomico",
    previewChips: (r) => chips(chip("Símbolo", r.simbolo), chip("Familia", r.familia), chip("Estado", r.estado_fisico), chip("Nº", r.numero_atomico)),
    panelKind: null,
    label: "Elemento", icon: "Atom",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #84cc16)",
  },
  compuesto: {
    tabla: "compuestos", campoNombre: "nombre",
    previewSelect: "id,nombre,simbolo,formula_canonica,estado,categoria",
    previewChips: (r) => chips(chip("Símbolo", r.simbolo), chip("Fórmula", r.formula_canonica), chip("Estado", r.estado), chip("Cat.", r.categoria)),
    panelKind: null,
    label: "Compuesto", icon: "FlaskConical",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #10b981)",
  },
  estructura: {
    tabla: "estructuras", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo,descripcion",
    previewChips: (r) => chips(chip("Tipo", r.tipo), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Estructura", icon: "Boxes",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #94a3b8)",
  },
  material: {
    tabla: "materiales", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Material", icon: "Layers",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #78716c)",
  },
  recurso_geologico: {
    tabla: "recursos_geologicos_v1", campoNombre: "nombre",
    previewSelect: "id,nombre,clase_recurso,fuente_geologica",
    previewChips: (r) => chips(chip("Clase", r.clase_recurso), chip("Fuente", r.fuente_geologica)),
    panelKind: "mineral",
    label: "Mineral / Recurso", icon: "Gem",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #60a5fa)",
  },
  item: {
    tabla: "items", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "item",
    label: "Objeto", icon: "Package",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #ef4444)",
  },
  proceso: {
    tabla: "procesos", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo,descripcion",
    previewChips: (r) => chips(chip("Tipo", r.tipo), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Proceso", icon: "Workflow",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #94a3b8)",
  },
  reaccion: {
    tabla: "reacciones", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Reacción", icon: "Zap",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f59e0b)",
  },
  fenomeno: {
    tabla: "fenomenos", campoNombre: "nombre",
    previewSelect: "id,nombre",
    previewChips: () => [],
    panelKind: null,
    label: "Fenómeno", icon: "Wind",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #38bdf8)",
  },
  conjuro: {
    tabla: "conjuraciones", campoNombre: "nombre",
    previewSelect: "id,nombre,imagen_url",
    previewChips: () => [],
    panelKind: null,
    label: "Conjuro", icon: "Wand2",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #c084fc)",
  },
  ium: {
    tabla: "iums", campoNombre: "nombre",
    previewSelect: "id,nombre,detalle",
    previewChips: (r) => chips(chip("Detalle", r.detalle)),
    panelKind: null,
    label: "IUM", icon: "Hexagon",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #ec4899)",
  },
  runa: {
    tabla: "oris", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "ORIS", icon: "Sparkles",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #f43f5e)",
  },
  personaje: {
    tabla: "personajes", campoNombre: "nombre",
    previewSelect: "id,nombre,especie,reino,sobre,img_url",
    previewChips: (r) => chips(chip("Especie", r.especie), chip("Reino", r.reino), chip("Sobre", r.sobre)),
    panelKind: "personaje",
    label: "Personaje", icon: "User",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #8b5cf6)",
  },
  ciudad: {
    tabla: "ciudades", campoNombre: "nombre",
    previewSelect: "id,nombre,tipo,descripcion,imagen_url",
    previewChips: (r) => chips(chip("Tipo", r.tipo), chip("Desc.", r.descripcion)),
    panelKind: "ciudad",
    label: "Ciudad", icon: "Building2",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #06b6d4)",
  },
  reino: {
    tabla: "reinos", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion",
    previewChips: (r) => chips(chip("Desc.", r.descripcion)),
    panelKind: "reino",
    label: "Reino", icon: "Crown",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #3b82f6)",
  },
  capitulo: {
    tabla: "capitulos", campoNombre: "titulo_capitulo",
    previewSelect: "id,titulo_capitulo,orden,visibilidad,libro_id",
    previewChips: (r) => chips(chip("Cap.", r.orden), chip("Visib.", r.visibilidad)),
    panelKind: null,
    label: "Capítulo", icon: "BookOpen",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #a16207)",
  },
  libro: {
    tabla: "libros", campoNombre: "titulo",
    previewSelect: "id,titulo,estado,categoria,portada_url",
    previewChips: (r) => chips(chip("Estado", r.estado), chip("Cat.", r.categoria)),
    panelKind: null,
    label: "Libro", icon: "Book",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #92400e)",
  },
  cancion: {
    tabla: "canciones", campoNombre: "titulo",
    previewSelect: "id,titulo,cantante,tema,emocion,portada_url",
    previewChips: (r) => chips(chip("Cantante", r.cantante), chip("Tema", r.tema), chip("Emoción", r.emocion)),
    panelKind: null,
    label: "Canción", icon: "Music",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #db2777)",
  },
  evento_linea: {
    tabla: "eventos_mundo", campoNombre: "titulo",
    previewSelect: "id,titulo,descripcion,dia_absoluto",
    previewChips: (r) => chips(chip("Día", r.dia_absoluto), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Evento línea", icon: "CalendarDays",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #0891b2)",
  },
  era: {
    tabla: "eras_mundo", campoNombre: "nombre",
    previewSelect: "id,nombre,descripcion,anio_inicio,anio_fin",
    previewChips: (r) => chips(chip("Inicio", r.anio_inicio), chip("Fin", r.anio_fin), chip("Desc.", r.descripcion)),
    panelKind: null,
    label: "Era", icon: "History",
    accentVar: "color-mix(in srgb, var(--primary) 50%, #7c3aed)",
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
