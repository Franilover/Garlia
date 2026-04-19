// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Personaje = {
  id: string;
  nombre: string;
  img_url?: string;
  img_cuerpo_url?: string;
  sobre?: string;
  reino?: string;
  especie?: string;
  notas_creador?: string;
  deseo?: string;
  historia?: string;
  caracteristicas?: string;
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

export type CapituloNarrado = {
  id: string;
  titulo_capitulo: string;
  orden: number;
  libro_id: string;
  libro_titulo?: string;
};

export type TabKey = "personajes" | "criaturas" | "items" | "reinos" | "mundo";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Config ───────────────────────────────────────────────────────────────────

import { Users, Bug, Package, Map, Sparkles, Mountain, ScrollText } from "lucide-react";

export const TAB_CONFIG: Record<Exclude<TabKey, "mundo">, { emoji: string; label: string; tabla: string; Icon: React.ElementType }> = {
  personajes: { emoji: "🧑", label: "Personajes", tabla: "personajes", Icon: Users   },
  criaturas:  { emoji: "🐛", label: "Criaturas",  tabla: "criaturas",  Icon: Bug     },
  items:      { emoji: "📦", label: "Items",      tabla: "items",      Icon: Package },
  reinos:     { emoji: "🗺️", label: "Mapas",      tabla: "reinos",     Icon: Map     },
};

export const MUNDO_SECTIONS = [
  { key: "magia",     label: "Magia",     Icon: Sparkles   },
  { key: "geografia", label: "Geografía", Icon: Mountain   },
  { key: "historia",  label: "Historia",  Icon: ScrollText },
] as const;

export type MundoSectionKey = typeof MUNDO_SECTIONS[number]["key"];

export const INPUT_CLS = "w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-primary/40 placeholder:text-primary/25 transition-colors";