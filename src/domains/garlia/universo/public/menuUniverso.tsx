"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
 * En móvil (< md) la barra se expande horizontalmente con scroll oculto;
 * sin bordes ni dropdown, misma estética minimalista que desktop.
 * Desktop (md+): sin cambios.
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

  // Las tabs "explicación" y "descubrimientos" son solo para admins, y la
  // certeza tiene que ser TOTAL: mientras el servidor no confirmó
  // adminVerificado === true (es decir, mientras es null/false, incluyendo
  // el estado de carga inicial), se excluyen de la lista. Nada de
  // mostrarlas optimistamente con datos de caché y ocultarlas después si
  // resulta que no era admin.
  const SLUGS_SOLO_ADMIN = new Set(["explicacion", "descubrimientos"]);
  const secciones = SECCIONES_UNIVERSO.filter(
    (s) => !SLUGS_SOLO_ADMIN.has(s.slug) || adminVerificado === true,
  );

  // Barra compartida móvil + desktop — misma lógica, distinto tamaño.
  // En móvil: scroll horizontal oculto, sin bordes.
  // En desktop: flex distribuido, sin scroll.
  const renderTabs = (mobile: boolean) =>
    secciones.map(({ href, slug, titulo }) => {
      const active = pathname?.startsWith(href) ?? false;
      return (
        <Link
          key={slug}
          href={href}
          aria-label={titulo}
          aria-current={active ? "page" : undefined}
          className="flex items-center justify-center transition-all shrink-0"
          style={{
            height: mobile ? 28 : 24,
            padding: mobile ? "0 10px" : "0 8px",
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
          <span
            className="font-bold uppercase tracking-wide"
            style={{ fontSize: mobile ? 11 : undefined }}
          >
            {titulo}
          </span>
        </Link>
      );
    });

  return (
    <>
      {/* ── MÓVIL: barra horizontal con scroll ───────────────────────── */}
      <nav
        className="flex md:hidden items-stretch w-full gap-0.5 overflow-x-auto"
        aria-label="Secciones del universo"
        style={{ scrollbarWidth: "none" }}
      >
        {renderTabs(true)}
      </nav>

      {/* ── DESKTOP: barra horizontal original ───────────────────────── */}
      <nav
        className="hidden md:flex items-stretch gap-1 w-full"
        aria-label="Secciones del universo"
      >
        {renderTabs(false)}
      </nav>
    </>
  );
}
