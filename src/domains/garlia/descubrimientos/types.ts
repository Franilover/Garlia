import {
  Cat,
  FlaskConical,
  Gem,
  Box,
  Trees,
  Mountain,
  Crown,
  Newspaper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Tipos de entidad publicables en Descubrimientos.
 *
 * Corresponde 1:1 al check constraint de `descubrimientos_publicos.tipo_entidad`
 * (ver sql/descubrimientos_publicos.sql). "Elementos/Compuestos/Partículas"
 * pedido por el usuario son 3 tablas reales distintas en Supabase
 * (elementos, compuestos, particulas) — se agrupan bajo una sola categoría
 * visual ("Química") pero se guardan con su tipo_entidad real.
 */
export type TipoEntidadPublicable =
  | "criatura"
  | "elemento"
  | "compuesto"
  | "particula"
  | "material"
  | "item"
  | "ecosistema"
  | "bioma"
  | "reino";

export interface CategoriaDescubrimiento {
  /** Slug de la categoría visual (puede agrupar varios tipo_entidad). */
  slug: string;
  titulo: string;
  icon: LucideIcon;
  /** Tabla(s) de Supabase que puede incluir esta categoría, en orden. */
  tipos: TipoEntidadPublicable[];
}

export const CATEGORIAS_DESCUBRIMIENTOS: CategoriaDescubrimiento[] = [
  { slug: "criaturas", titulo: "Criaturas", icon: Cat, tipos: ["criatura"] },
  {
    slug: "quimica",
    titulo: "Elementos / Compuestos / Partículas",
    icon: FlaskConical,
    tipos: ["elemento", "compuesto", "particula"],
  },
  { slug: "materiales", titulo: "Materiales", icon: Gem, tipos: ["material"] },
  { slug: "objetos", titulo: "Objetos", icon: Box, tipos: ["item"] },
  {
    slug: "ecosistemas",
    titulo: "Ecosistemas",
    icon: Trees,
    tipos: ["ecosistema"],
  },
  { slug: "biomas", titulo: "Biomas", icon: Mountain, tipos: ["bioma"] },
  { slug: "reinos", titulo: "Reinos", icon: Crown, tipos: ["reino"] },
];

export const ICONO_NOVEDADES = Newspaper;

export function getCategoriaDescubrimiento(slug: string) {
  return CATEGORIAS_DESCUBRIMIENTOS.find((c) => c.slug === slug);
}

/** Nombre de tabla real en Supabase para cada tipo_entidad. */
export const TABLA_POR_TIPO: Record<TipoEntidadPublicable, string> = {
  criatura: "criaturas",
  elemento: "elementos",
  compuesto: "compuestos",
  particula: "particulas",
  material: "materiales",
  item: "items",
  ecosistema: "ecosistemas",
  bioma: "biomas",
  reino: "reinos",
};

/** Etiqueta legible de cada tipo_entidad, para el selector de tipo del formulario. */
export const LABEL_POR_TIPO: Record<TipoEntidadPublicable, string> = {
  criatura: "Criatura",
  elemento: "Elemento",
  compuesto: "Compuesto",
  particula: "Partícula",
  material: "Material",
  item: "Objeto",
  ecosistema: "Ecosistema",
  bioma: "Bioma",
  reino: "Reino",
};

export const TODOS_LOS_TIPOS: TipoEntidadPublicable[] = Object.keys(
  TABLA_POR_TIPO,
) as TipoEntidadPublicable[];

/**
 * Fila cruda de la tabla puente `descubrimientos_publicos`, incluyendo la
 * metadata que el admin completa a mano al publicar (título, descripción,
 * fecha, reino/ciudad opcionales).
 */
export interface DescubrimientoPublico {
  id: string;
  tipo_entidad: TipoEntidadPublicable;
  entidad_id: string;
  publicado_por: string | null;
  created_at: string;
  titulo: string | null;
  descripcion: string | null;
  fecha: string | null;
  reino_id: string | null;
  ciudad_id: string | null;
}

/** Payload para crear/editar un descubrimiento desde el formulario admin. */
export interface DescubrimientoInput {
  tipo_entidad: TipoEntidadPublicable;
  entidad_id: string;
  titulo: string;
  descripcion: string;
  fecha: string | null; // yyyy-mm-dd o null
  reino_id: string | null;
  ciudad_id: string | null;
}

/** Opción mínima para el selector "qué entidad publicar" del formulario. */
export interface EntidadMin {
  id: string;
  nombre: string;
}

/**
 * Forma normalizada de una entidad ya resuelta (join hecho en el hook de
 * lectura, ver useDescubrimientosPublicados) — lo mínimo que necesita
 * cualquier card de listado, sin importar de qué tabla vino.
 */
export interface EntidadDescubribleResuelta {
  id: string; // id de descubrimientos_publicos (para key de lista)
  tipo_entidad: TipoEntidadPublicable;
  entidad_id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  created_at: string;
  fecha: string | null;
  reino_id: string | null;
  ciudad_id: string | null;
}
