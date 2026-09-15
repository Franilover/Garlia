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
      className="flex items-center gap-1 flex-wrap"
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
            className="flex items-center justify-center transition-all"
            style={{
              width: 30,
              height: 30,
              borderRadius: "var(--radius-btn)",
              background: active
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : "transparent",
              color: active
                ? "var(--primary)"
                : "color-mix(in srgb, var(--primary) 40%, transparent)",
            }}
          >
            <Icon size={14} strokeWidth={active ? 2.5 : 2} />
          </Link>
        );
      })}
    </nav>
  );
}
