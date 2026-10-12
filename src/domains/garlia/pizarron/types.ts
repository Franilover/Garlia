// ── Tipos del Pizarrón ────────────────────────────────────────────────────

export type TipoEntidadPizarron =
  // Mundo físico
  | "sistema_solar"
  | "cuerpo_celeste"
  | "planeta"
  | "bioma"
  | "ecosistema"
  | "habitat"
  | "criatura"
  | "organismo"
  | "flora"
  // Biología
  | "organo"
  | "tejido"
  | "celula"
  // Física / Química
  | "polaridad"
  | "tasi"
  | "particula"
  | "elemento"
  | "compuesto"
  | "estructura"
  | "material"
  | "mineral"
  | "item"
  // Procesos / Magia
  | "proceso"
  | "reaccion"
  | "fenomeno"
  | "conjuro"
  | "ium"
  | "runa"
  // Narrativa
  | "personaje"
  | "ciudad"
  | "reino"
  | "capitulo"
  | "libro"
  | "cancion"
  | "evento_linea"
  | "evento_era"
  // Utilidad
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

export interface TipoEntidadConfig {
  tabla: string;        // tabla Supabase; "" = sin búsqueda (texto libre)
  label: string;
  icon: string;         // nombre de componente Lucide
  accentVar: string;    // color dinámico de tema
}

export const TIPO_ENTIDAD_CONFIG: Record<TipoEntidadPizarron, TipoEntidadConfig> = {
  // ── Mundo físico ──────────────────────────────────────────────────────
  sistema_solar:  { tabla: "sistemas_solares", label: "Sistema Solar", icon: "Sun",         accentVar: "color-mix(in srgb, var(--primary) 55%, #fbbf24)" },
  cuerpo_celeste: { tabla: "cuerpos_celestes", label: "Cuerpo Celeste",icon: "Circle",      accentVar: "color-mix(in srgb, var(--primary) 55%, #a78bfa)" },
  planeta:        { tabla: "planetas",         label: "Planeta",       icon: "Globe",       accentVar: "color-mix(in srgb, var(--primary) 55%, #3b82f6)" },
  bioma:          { tabla: "biomas",           label: "Bioma",         icon: "TreePine",    accentVar: "color-mix(in srgb, var(--primary) 55%, #16a34a)" },
  ecosistema:     { tabla: "ecosistemas",      label: "Ecosistema",    icon: "Leaf",        accentVar: "color-mix(in srgb, var(--primary) 55%, #22c55e)" },
  habitat:        { tabla: "habitats",         label: "Hábitat",       icon: "Mountain",    accentVar: "color-mix(in srgb, var(--primary) 55%, #65a30d)" },
  criatura:       { tabla: "criaturas",        label: "Criatura",      icon: "Footprints",  accentVar: "color-mix(in srgb, var(--primary) 55%, #f59e0b)" },
  organismo:      { tabla: "organismos",       label: "Organismo",     icon: "Dna",         accentVar: "color-mix(in srgb, var(--primary) 55%, #14b8a6)" },
  flora:          { tabla: "organismos",       label: "Flora",         icon: "Flower2",     accentVar: "color-mix(in srgb, var(--primary) 55%, #f472b6)" },
  // ── Biología ─────────────────────────────────────────────────────────
  organo:         { tabla: "organos",          label: "Órgano",        icon: "Heart",       accentVar: "color-mix(in srgb, var(--primary) 55%, #f97316)" },
  tejido:         { tabla: "tejidos",          label: "Tejido",        icon: "Activity",    accentVar: "color-mix(in srgb, var(--primary) 55%, #fb7185)" },
  celula:         { tabla: "celulas",          label: "Célula",        icon: "Microscope",  accentVar: "color-mix(in srgb, var(--primary) 55%, #a78bfa)" },
  // ── Física / Química ──────────────────────────────────────────────────
  polaridad:      { tabla: "polaridades",      label: "Polaridad",     icon: "Zap",         accentVar: "color-mix(in srgb, var(--primary) 55%, #facc15)" },
  tasi:           { tabla: "tasis",            label: "TASI",          icon: "LayoutGrid",  accentVar: "color-mix(in srgb, var(--primary) 55%, #8b5cf6)" },
  particula:      { tabla: "particulas",       label: "Partícula",     icon: "Dot",         accentVar: "color-mix(in srgb, var(--primary) 55%, #60a5fa)" },
  elemento:       { tabla: "elementos",        label: "Elemento",      icon: "Atom",        accentVar: "color-mix(in srgb, var(--primary) 55%, #84cc16)" },
  compuesto:      { tabla: "compuestos",       label: "Compuesto",     icon: "FlaskConical",accentVar: "color-mix(in srgb, var(--primary) 55%, #10b981)" },
  estructura:     { tabla: "estructuras",      label: "Estructura",    icon: "Boxes",       accentVar: "color-mix(in srgb, var(--primary) 55%, #94a3b8)" },
  material:       { tabla: "materiales",       label: "Material",      icon: "Layers",      accentVar: "color-mix(in srgb, var(--primary) 55%, #78716c)" },
  mineral:        { tabla: "minerales",        label: "Mineral",       icon: "Gem",         accentVar: "color-mix(in srgb, var(--primary) 55%, #60a5fa)" },
  item:           { tabla: "items",            label: "Objeto",        icon: "Package",     accentVar: "color-mix(in srgb, var(--primary) 55%, #ef4444)" },
  // ── Procesos / Magia ─────────────────────────────────────────────────
  proceso:        { tabla: "procesos",         label: "Proceso",       icon: "Workflow",    accentVar: "color-mix(in srgb, var(--primary) 55%, #94a3b8)" },
  reaccion:       { tabla: "reacciones",       label: "Reacción",      icon: "Zap",         accentVar: "color-mix(in srgb, var(--primary) 55%, #f59e0b)" },
  fenomeno:       { tabla: "fenomenos",        label: "Fenómeno",      icon: "Wind",        accentVar: "color-mix(in srgb, var(--primary) 55%, #38bdf8)" },
  conjuro:        { tabla: "conjuros",         label: "Conjuro",       icon: "Wand2",       accentVar: "color-mix(in srgb, var(--primary) 55%, #c084fc)" },
  ium:            { tabla: "iums",             label: "IUM",           icon: "Hexagon",     accentVar: "color-mix(in srgb, var(--primary) 55%, #ec4899)" },
  runa:           { tabla: "runas",            label: "ORIS",          icon: "Sparkles",    accentVar: "color-mix(in srgb, var(--primary) 55%, #f43f5e)" },
  // ── Narrativa ────────────────────────────────────────────────────────
  personaje:      { tabla: "personajes",       label: "Personaje",     icon: "User",        accentVar: "color-mix(in srgb, var(--primary) 55%, #8b5cf6)" },
  ciudad:         { tabla: "ciudades",         label: "Ciudad",        icon: "Building2",   accentVar: "color-mix(in srgb, var(--primary) 55%, #06b6d4)" },
  reino:          { tabla: "reinos",           label: "Reino",         icon: "Crown",       accentVar: "color-mix(in srgb, var(--primary) 55%, #3b82f6)" },
  capitulo:       { tabla: "capitulos",        label: "Capítulo",      icon: "BookOpen",    accentVar: "color-mix(in srgb, var(--primary) 55%, #a16207)" },
  libro:          { tabla: "libros",           label: "Libro",         icon: "Book",        accentVar: "color-mix(in srgb, var(--primary) 55%, #92400e)" },
  cancion:        { tabla: "canciones",        label: "Canción",       icon: "Music",       accentVar: "color-mix(in srgb, var(--primary) 55%, #db2777)" },
  evento_linea:   { tabla: "eventos",          label: "Evento línea",  icon: "CalendarDays",accentVar: "color-mix(in srgb, var(--primary) 55%, #0891b2)" },
  evento_era:     { tabla: "eventos_era",      label: "Evento era",    icon: "History",     accentVar: "color-mix(in srgb, var(--primary) 55%, #7c3aed)" },
  // ── Utilidad ─────────────────────────────────────────────────────────
  texto:          { tabla: "",                 label: "Texto libre",   icon: "FileText",    accentVar: "color-mix(in srgb, var(--primary) 35%, transparent)" },
};

// ── Secciones del selector ────────────────────────────────────────────────
export interface SeccionSelector {
  label: string;
  tipos: TipoEntidadPizarron[];
}

export const SECCIONES_SELECTOR: SeccionSelector[] = [
  {
    label: "Mundo",
    tipos: ["sistema_solar", "cuerpo_celeste", "planeta", "bioma", "ecosistema", "habitat", "criatura", "organismo", "organo", "tejido", "celula"],
  },
  {
    label: "Física y Química",
    tipos: ["polaridad", "tasi", "particula", "elemento", "compuesto", "estructura", "material", "mineral", "item"],
  },
  {
    label: "Procesos y Magia",
    tipos: ["proceso", "reaccion", "fenomeno", "conjuro", "ium", "runa"],
  },
  {
    label: "Narrativa",
    tipos: ["personaje", "ciudad", "reino", "capitulo", "libro", "cancion", "evento_linea", "evento_era"],
  },
  {
    label: "Utilidad",
    tipos: ["texto"],
  },
];
