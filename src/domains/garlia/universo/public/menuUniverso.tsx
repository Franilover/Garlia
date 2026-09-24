"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { useAuth } from "@/providers/AuthProvider";

import { SECCIONES_UNIVERSO } from "./secciones";

/**
 * Hub del Universo (/garlia/universo).
 *
 * Reemplaza el patrón de MenuBase (tiles grandes con texto) por una barra
 * angosta de accesos — mismo espíritu que el resto de vistas de escritorio
 * de la app (auditoría, tablas, paneles): chico, denso y usa todo el ancho
 * en vez de dejar espacio muerto a los costados.
 *
 * Cada sección es un botón cuadrado con solo el ícono (title = tooltip);
 * la sección activa queda resaltada. `UniversoTabBar` se reusa arriba de
 * cada página de sección (ver PaginaUniversoPlantilla) para no perder la
 * barra de navegación al entrar a una sección.
 */
export default function MenuUniversoPage() {
  return (
    <div className="p-3 md:p-4">
      <UniversoTabBar />
    </div>
  );
}

export function UniversoTabBar() {
  const pathname = usePathname();
  const { adminVerificado } = useAuth() as { adminVerificado: boolean | null };

  // La tab "explicación" es solo para admins, y la certeza tiene que ser
  // TOTAL: mientras el servidor no confirmó adminVerificado === true (es
  // decir, mientras es null/false, incluyendo el estado de carga inicial),
  // se excluye de la lista. Nada de mostrarla optimistamente con datos de
  // caché y ocultarla después si resulta que no era admin.
  const secciones = SECCIONES_UNIVERSO.filter(
    (s) => s.slug !== "explicacion" || adminVerificado === true,
  );

  return (
    <nav
      className="flex items-stretch gap-1 w-full"
      aria-label="Secciones del universo"
    >
      {secciones.map(({ href, slug, titulo, icon: Icon }) => {
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
