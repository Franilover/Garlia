import {
  FlaskConical,
  Lightbulb,
  Library,
  Network,
  Telescope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Secciones públicas de la Biblioteca.
 *
 * Fuente única de verdad: la usan el menú (`menuBiblioteca`), las páginas de
 * cada sección y el navbar (subLinks de "Biblioteca"). Para agregar una
 * sección nueva basta con sumar una entrada acá + crear su `page.tsx` en
 * `app/(public)/garlia/biblioteca/<slug>/`.
 *
 * IMPORTANTE: esto es sólo contenido PÚBLICO. Nada de acá lee tablas ni
 * vistas del editor admin (/myself/*). Cuando se conecte data real, debe
 * venir filtrada por el flag de "público" de cada elemento.
 */
export interface SeccionBiblioteca {
  slug: string;
  href: string;
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
  /** Clave para wiki_notifications (el puntito rojo del MenuCard). */
  pageKey: string;
}

export const SECCIONES_BIBLIOTECA: SeccionBiblioteca[] = [
  {
    slug: "descubrimientos",
    href: "/garlia/biblioteca/descubrimientos",
    titulo: "Descubrimientos",
    descripcion: "Hallazgos registrados por quienes exploran el mundo.",
    icon: Telescope,
    pageKey: "biblioteca_descubrimientos",
  },
  {
    slug: "teorias",
    href: "/garlia/biblioteca/teorias",
    titulo: "Teorías",
    descripcion: "Explicaciones propuestas, aún sin confirmar del todo.",
    icon: Lightbulb,
    pageKey: "biblioteca_teorias",
  },
  {
    slug: "compuestos",
    href: "/garlia/biblioteca/compuestos",
    titulo: "Compuestos",
    descripcion: "Elementos compuestos liberados al público.",
    icon: FlaskConical,
    pageKey: "biblioteca_compuestos",
  },
  {
    slug: "graficos",
    href: "/garlia/biblioteca/graficos",
    titulo: "Gráficos",
    descripcion: "Diagramas y relaciones visibles para todos.",
    icon: Network,
    pageKey: "biblioteca_graficos",
  },
];

export const ICONO_BIBLIOTECA = Library;

export function getSeccionBiblioteca(slug: string) {
  return SECCIONES_BIBLIOTECA.find((s) => s.slug === slug);
}
