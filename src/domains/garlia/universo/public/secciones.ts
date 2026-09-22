import {
  BookMarked,
  CircleUser,
  Compass,
  Sparkles,
  Sprout,
  Telescope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Secciones públicas del Universo (antes "Biblioteca").
 *
 * Fuente única de verdad: la usan el menú (`menuUniverso`), las páginas de
 * cada sección y el navbar (subLinks de "Universo"). Para agregar una
 * sección nueva basta con sumar una entrada acá + crear su `page.tsx` en
 * `app/(public)/garlia/universo/<slug>/`.
 *
 * IMPORTANTE: esto es sólo contenido PÚBLICO. Nada de acá lee tablas ni
 * vistas del editor admin (/myself/*). Cuando se conecte data real, debe
 * venir filtrada por el flag de "público" de cada elemento.
 *
 * "Mapa" y "Cuenta" (antes ítems propios del navbar) ahora viven acá como
 * tabs más — ver app/(public)/garlia/universo/mapa y .../cuenta.
 */
export interface SeccionUniverso {
  slug: string;
  href: string;
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
  /** Clave para wiki_notifications (el puntito rojo del MenuCard). */
  pageKey: string;
}

export const SECCIONES_UNIVERSO: SeccionUniverso[] = [
  {
    slug: "descubrimientos",
    href: "/garlia/universo/descubrimientos",
    titulo: "Descubrimientos",
    descripcion: "Hallazgos registrados por quienes exploran el mundo.",
    icon: Telescope,
    pageKey: "biblioteca_descubrimientos",
  },
  {
    slug: "explicacion",
    href: "/garlia/universo/explicacion",
    titulo: "Explicación",
    descripcion: "Cómo surge cada cosa: de Polaridades a Criaturas.",
    icon: Sparkles,
    pageKey: "universo_explicacion",
  },
  {
    slug: "libros",
    href: "/garlia/universo/libros",
    titulo: "Libros",
    descripcion: "Libros de conocimiento liberados al público.",
    icon: BookMarked,
    pageKey: "biblioteca_libros",
  },
  {
    slug: "mapa",
    href: "/garlia/universo/mapa",
    titulo: "Mapa",
    descripcion: "El mundo, explorado.",
    icon: Compass,
    pageKey: "universo_mapa",
  },
  {
    slug: "cuenta",
    href: "/garlia/universo/cuenta",
    titulo: "Cuenta",
    descripcion: "Tu perfil de jugador.",
    icon: CircleUser,
    pageKey: "universo_cuenta",
  },
];

export const ICONO_UNIVERSO = Sprout;

export function getSeccionUniverso(slug: string) {
  return SECCIONES_UNIVERSO.find((s) => s.slug === slug);
}
