"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { SECCIONES_BIBLIOTECA } from "./secciones";

/**
 * Hub de la Biblioteca (/garlia/biblioteca).
 *
 * Reemplaza el patrón de MenuBase (tiles grandes con texto) por una barra
 * angosta de accesos — mismo espíritu que el resto de vistas de escritorio
 * de la app (auditoría, tablas, paneles): chico, denso y usa todo el ancho
 * en vez de dejar espacio muerto a los costados.
 *
 * Cada sección es un botón cuadrado con solo el ícono (title = tooltip);
 * la sección activa queda resaltada. `BibliotecaTabBar` se reusa arriba de
 * cada página de sección (ver PaginaBibliotecaPlantilla) para no perder la
 * barra de navegación al entrar a una sección.
 */
export default function MenuBibliotecaPage() {
  return (
    <div className="p-3 md:p-4">
      <BibliotecaTabBar />
    </div>
  );
}

export function BibliotecaTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-stretch gap-1 w-full"
      aria-label="Secciones de la biblioteca"
    >
      {SECCIONES_BIBLIOTECA.map(({ href, slug, titulo, icon: Icon }) => {
        const active = pathname?.startsWith(href) ?? false;
        return (
          <Link
            key={slug}
            href={href}
            title={titulo}
            aria-label={titulo}
            aria-current={active ? "page" : undefined}
            className="flex items-center justify-center gap-1.5 flex-1 px-2 transition-all"
            style={{
              height: 24,
              borderRadius: "var(--radius-btn)",
              background: "transparent",
              borderBottom: active
                ? "1.5px solid var(--primary)"
                : "1.5px solid transparent",
              color: active
                ? "var(--primary)"
                : "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            <Icon size={12} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
            <span className="hidden sm:inline text-micro font-bold uppercase tracking-wide truncate">
              {titulo}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
