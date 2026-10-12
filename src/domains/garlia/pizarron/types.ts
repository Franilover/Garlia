// ── Tipos del Pizarrón ────────────────────────────────────────────────────

export type TipoEntidadPizarron =
  | "texto"
  | "personaje"
  | "criatura"
  | "reino"
  | "ciudad"
  | "item"
  | "compuesto"
  | "elemento"
  | "runa"
  | "material"
  | "organismo"
  | "celula"
  | "tejido"
  | "organo"
  | "ecosistema"
  | "bioma"
  | "mineral"
  | "flora"
  | "proceso";

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

// Nodo en runtime (con posición local, puede estar siendo arrastrado)
export interface NodoRuntime extends PizarronNodo {
  dragging?: boolean;
  selected?: boolean;
}

// Config de cada tipo de entidad para búsqueda
// icon: nombre del componente Lucide (se resuelve en PizarronSection)
// cssVar: CSS custom property que debe existir en el tema, ej: --color-personaje
//         Si el tema no la define, se puede usar un fallback con color-mix sobre --primary
export interface TipoEntidadConfig {
  tabla: string;
  label: string;
  icon: string; // nombre de ícono Lucide
  accentVar: string; // CSS variable de acento del tema, e.g. "var(--color-personaje)"
}

export const TIPO_ENTIDAD_CONFIG: Record<TipoEntidadPizarron, TipoEntidadConfig> = {
  texto:      { tabla: "",            label: "Texto libre", icon: "FileText",   accentVar: "color-mix(in srgb, var(--primary) 35%, transparent)" },
  personaje:  { tabla: "personajes",  label: "Personaje",   icon: "User",        accentVar: "var(--accent, color-mix(in srgb, var(--primary) 70%, #8b5cf6))" },
  criatura:   { tabla: "criaturas",   label: "Criatura",    icon: "Footprints",  accentVar: "color-mix(in srgb, var(--primary) 60%, #f59e0b)" },
  reino:      { tabla: "reinos",      label: "Reino",       icon: "Crown",       accentVar: "color-mix(in srgb, var(--primary) 60%, #3b82f6)" },
  ciudad:     { tabla: "ciudades",    label: "Ciudad",      icon: "Building2",   accentVar: "color-mix(in srgb, var(--primary) 60%, #06b6d4)" },
  item:       { tabla: "items",       label: "Ítem",        icon: "Sword",       accentVar: "color-mix(in srgb, var(--primary) 60%, #ef4444)" },
  compuesto:  { tabla: "compuestos",  label: "Compuesto",   icon: "FlaskConical",accentVar: "color-mix(in srgb, var(--primary) 60%, #10b981)" },
  elemento:   { tabla: "elementos",   label: "Elemento",    icon: "Atom",        accentVar: "color-mix(in srgb, var(--primary) 60%, #84cc16)" },
  runa:       { tabla: "runas",       label: "Runa",        icon: "Sparkles",    accentVar: "color-mix(in srgb, var(--primary) 60%, #ec4899)" },
  material:   { tabla: "materiales",  label: "Material",    icon: "Layers",      accentVar: "color-mix(in srgb, var(--primary) 60%, #78716c)" },
  organismo:  { tabla: "organismos",  label: "Organismo",   icon: "Dna",         accentVar: "color-mix(in srgb, var(--primary) 60%, #14b8a6)" },
  celula:     { tabla: "celulas",     label: "Célula",      icon: "Microscope",  accentVar: "color-mix(in srgb, var(--primary) 60%, #a78bfa)" },
  tejido:     { tabla: "tejidos",     label: "Tejido",      icon: "Activity",    accentVar: "color-mix(in srgb, var(--primary) 60%, #fb7185)" },
  organo:     { tabla: "organos",     label: "Órgano",      icon: "Heart",       accentVar: "color-mix(in srgb, var(--primary) 60%, #f97316)" },
  ecosistema: { tabla: "ecosistemas", label: "Ecosistema",  icon: "TreePine",    accentVar: "color-mix(in srgb, var(--primary) 60%, #22c55e)" },
  bioma:      { tabla: "biomas",      label: "Bioma",       icon: "Globe",       accentVar: "color-mix(in srgb, var(--primary) 60%, #16a34a)" },
  mineral:    { tabla: "minerales",   label: "Mineral",     icon: "Gem",         accentVar: "color-mix(in srgb, var(--primary) 60%, #60a5fa)" },
  flora:      { tabla: "organismos",  label: "Flora",       icon: "Flower2",     accentVar: "color-mix(in srgb, var(--primary) 60%, #f472b6)" },
  proceso:    { tabla: "procesos",    label: "Proceso",     icon: "Settings2",   accentVar: "color-mix(in srgb, var(--primary) 60%, #94a3b8)" },
};
