import {
  Users,
  Bug,
  Package,
  Map,
  Mountain,
  ScrollText,
  Sparkles,
  Star,
  Wand2,
  Layers,
  BookOpen,
  Music,
} from "lucide-react";

export type Personaje = {
  id: string;
  nombre: string;
  img_url?: string;
  img_cuerpo_url?: string;
  sobre?: string;
  reino?: string;
  especie?: string;
  don?: string;
  caracteristicas?: string;
  variante_id?: string | null;
};

export type Criatura = {
  id: string;
  nombre: string;
  imagen_url?: string;
  descripcion?: string;
  habitat?: string;
  pensamiento?: string;
  alma?: string;
  biologia?: string;
  relacion?: string;
  comportamiento?: string;
  magia?: string;
};

export type CriaturaVariante = {
  id: string;
  criatura_id: string;
  tipo: string;
  descripcion?: string;
  imagen_url?: string;
  notas?: string;
};

export type Item = {
  id: string;
  nombre: string;
  imagen_url?: string;
  descripcion?: string;
  categoria?: string;
  origen?: "Natural" | "Artificial" | null;
  sub_origen?: "Planta" | "Criatura" | null;
  reino_ids?: string[];
};

export type Reino = {
  id: string;
  nombre: string;
  historia?: string;
  politica?: string;
  economia?: string;
  geografia?: string;
  cultura?: string;
  mapa_url?: string;
  coord_x?: number;
  coord_y?: number;
  oculto?: boolean;
};

export type ReinoDetalle = {
  id: string;
  reino_id: string;
  nombre: string;
  descripcion?: string;
  coord_x?: number;
  coord_y?: number;
  oculto?: boolean;
};

export type Ciudad = {
  id: string;
  nombre: string;
  tipo?: string | null;
  descripcion?: string | null;
  historia?: string | null;
  secretos?: string | null;
  imagen_url?: string | null;
  reino_id?: string | null;
  coord_x?: number | null;
  coord_y?: number | null;
  oculto?: boolean;
};

export type CapituloNarrado = {
  id: string;
  titulo_capitulo: string;
  orden: number;
  libro_id: string;
  libro_titulo?: string;
};

// ─── Hechizos y Dones ─────────────────────────────────────────────────────────
export type Hechizo = {
  id: string;
  nombre: string;
  explicacion?: string;
  criatura_id?: string | null;
  criatura?: { id: string; nombre: string; imagen_url?: string } | null;
  variante_id?: string | null;
  variante?: { id: string; tipo: string } | null;
};

export type Don = {
  id: string;
  nombre: string;
  explicacion?: string;
  criatura_id?: string | null;
  criatura?: { id: string; nombre: string; imagen_url?: string } | null;
  variante_id?: string | null;
  variante?: { id: string; tipo: string } | null;
};

export type Nota = {
  id: string;
  titulo: string;
  contenido?: string;
  etiquetas?: string | null; // JSON array string, ej: '["personaje","idea"]'
  created_at?: string;
  updated_at?: string;
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export type TabKey =
  | "personajes"
  | "criaturas"
  | "items"
  | "reinos"
  | "mundo"
  | "hechizos"
  | "dones"
  | "runas"
  | "grupos"
  | "capitulos"
  | "letras";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const TAB_CONFIG: Record<
  Exclude<TabKey, "mundo">,
  {
    emoji: string;
    label: string;
    tabla: string;
    Icon: React.ElementType;
    orderBy?: string;
    labelKey?: string;
  }
> = {
  personajes: {
    emoji: "🧑",
    label: "Personajes",
    tabla: "personajes",
    Icon: Users,
  },
  criaturas: { emoji: "🐛", label: "Criaturas", tabla: "criaturas", Icon: Bug },
  items: { emoji: "📦", label: "Items", tabla: "items", Icon: Package },
  reinos: { emoji: "🗺️", label: "Mapas", tabla: "reinos", Icon: Map },
  hechizos: { emoji: "✨", label: "Hechizos", tabla: "hechizos", Icon: Wand2 },
  dones: { emoji: "⭐", label: "Dones", tabla: "dones", Icon: Star },
  runas: { emoji: "ᚱ", label: "Runas", tabla: "runas", Icon: ScrollText },
  grupos: { emoji: "", label: "Grupos", tabla: "grupos_mundo", Icon: Layers },
  capitulos: {
    emoji: "📖",
    label: "Capítulos",
    tabla: "capitulos",
    Icon: BookOpen,
  },
  letras: {
    emoji: "🎵",
    label: "Letras",
    tabla: "canciones",
    Icon: Music,
    orderBy: "titulo",
    labelKey: "titulo",
  },
};

export const MUNDO_SECTIONS = [
  { key: "magia", label: "Magia", Icon: Sparkles },
  { key: "geografia", label: "Mundo", Icon: Mountain },
  { key: "historia", label: "Historia", Icon: ScrollText },
] as const;

export type MundoSectionKey = (typeof MUNDO_SECTIONS)[number]["key"];

export const INPUT_CLS =
  "w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-primary/40 placeholder:text-primary/25 transition-colors";
// ─── Runas (exportada para uso global) ───────────────────────────────────────
export type Runa = {
  id: string;
  nombre: string;
  explicacion?: string;
};
