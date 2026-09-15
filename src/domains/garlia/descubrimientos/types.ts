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

/**
 * Categorías pedidas: Criaturas, Elementos/Compuestos/Partículas,
 * Materiales, Objetos (= tabla "items"), Ecosistemas, Biomas, Reinos.
 * "Noticias" NO es una categoría de esta lista — es su propia sección
 * (ver domains/garlia/descubrimientos/novedades.ts), porque no pasa por
 * descubrimientos_publicos: son posts propios, no "otra entidad publicada".
 */
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

/**
 * Fila cruda de la tabla puente `descubrimientos_publicos`.
 */
export interface DescubrimientoPublico {
  id: string;
  tipo_entidad: TipoEntidadPublicable;
  entidad_id: string;
  publicado_por: string | null;
  created_at: string;
}

/**
 * Forma normalizada de una entidad ya resuelta (join hecho en el hook de
 * lectura, ver useDescubrimientosPublicos) — lo mínimo que necesita
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
}
