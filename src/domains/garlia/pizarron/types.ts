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

// Config de cada tipo de entidad para búsqueda y color
export interface TipoEntidadConfig {
  tabla: string;
  label: string;
  emoji: string;
  color: string;
}

export const TIPO_ENTIDAD_CONFIG: Record<TipoEntidadPizarron, TipoEntidadConfig> = {
  texto:      { tabla: "",           label: "Texto libre",  emoji: "📝", color: "#6b7280" },
  personaje:  { tabla: "personajes", label: "Personaje",    emoji: "👤", color: "#8b5cf6" },
  criatura:   { tabla: "criaturas",  label: "Criatura",     emoji: "🐉", color: "#f59e0b" },
  reino:      { tabla: "reinos",     label: "Reino",        emoji: "🏰", color: "#3b82f6" },
  ciudad:     { tabla: "ciudades",   label: "Ciudad",       emoji: "🌆", color: "#06b6d4" },
  item:       { tabla: "items",      label: "Ítem",         emoji: "⚔️", color: "#ef4444" },
  compuesto:  { tabla: "compuestos", label: "Compuesto",    emoji: "🧪", color: "#10b981" },
  elemento:   { tabla: "elementos",  label: "Elemento",     emoji: "⚗️", color: "#84cc16" },
  runa:       { tabla: "runas",      label: "Runa",         emoji: "🔮", color: "#ec4899" },
  material:   { tabla: "materiales", label: "Material",     emoji: "🪨", color: "#78716c" },
  organismo:  { tabla: "organismos", label: "Organismo",    emoji: "🧬", color: "#14b8a6" },
  celula:     { tabla: "celulas",    label: "Célula",       emoji: "🔬", color: "#a78bfa" },
  tejido:     { tabla: "tejidos",    label: "Tejido",       emoji: "🫀", color: "#fb7185" },
  organo:     { tabla: "organos",    label: "Órgano",       emoji: "🫁", color: "#f97316" },
  ecosistema: { tabla: "ecosistemas",label: "Ecosistema",   emoji: "🌿", color: "#22c55e" },
  bioma:      { tabla: "biomas",     label: "Bioma",        emoji: "🌍", color: "#16a34a" },
  mineral:    { tabla: "minerales",  label: "Mineral",      emoji: "💎", color: "#60a5fa" },
  flora:      { tabla: "organismos", label: "Flora",        emoji: "🌸", color: "#f472b6" },
  proceso:    { tabla: "procesos",   label: "Proceso",      emoji: "⚙️", color: "#94a3b8" },
};
