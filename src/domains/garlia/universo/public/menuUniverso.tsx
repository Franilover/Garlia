"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

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
 *
 * En móvil (< md) la barra horizontal colapsa a un dropdown: muestra la
 * sección activa con un chevron y despliega las demás como lista. Evita
 * que los labels se aprieten o se corten en pantallas angostas.
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
  const router = useRouter();
  const { adminVerificado } = useAuth() as { adminVerificado: boolean | null };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // La tab "explicación" es solo para admins, y la certeza tiene que ser
  // TOTAL: mientras el servidor no confirmó adminVerificado === true (es
  // decir, mientras es null/false, incluyendo el estado de carga inicial),
  // se excluye de la lista. Nada de mostrarla optimistamente con datos de
  // caché y ocultarla después si resulta que no era admin.
  const secciones = SECCIONES_UNIVERSO.filter(
    (s) => s.slug !== "explicacion" || adminVerificado === true,
  );

  const seccionActiva = secciones.find((s) => pathname?.startsWith(s.href));

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ── MÓVIL: dropdown ──────────────────────────────────────────── */}
      <div className="relative md:hidden" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-3 transition-colors"
          style={{
            height: 32,
            borderRadius: "var(--radius-btn)",
            background: "color-mix(in srgb, var(--primary) 6%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            color: "var(--primary)",
          }}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <span className="flex items-center gap-1.5">
            {seccionActiva && (
              <seccionActiva.icon
                size={12}
                strokeWidth={2.5}
                style={{ flexShrink: 0 }}
              />
            )}
            <span className="text-micro font-bold uppercase tracking-wide">
              {seccionActiva?.titulo ?? "Universo"}
            </span>
          </span>
          <ChevronDown
            size={12}
            strokeWidth={2.5}
            style={{
              flexShrink: 0,
              transition: "transform 0.15s",
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-[500] overflow-hidden"
            role="listbox"
            aria-label="Secciones del universo"
            style={{
              background: "var(--bg-main)",
              border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {secciones.map(({ href, slug, titulo, icon: Icon }) => {
              const active = pathname?.startsWith(href) ?? false;
              return (
                <Link
                  key={slug}
                  href={href}
                  role="option"
                  aria-selected={active}
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                  style={{
                    color: active
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 55%, transparent)",
                    background: active
                      ? "color-mix(in srgb, var(--primary) 7%, transparent)"
                      : "transparent",
                    fontWeight: active ? 700 : 600,
                  }}
                  onClick={() => setDropdownOpen(false)}
                >
                  <Icon size={13} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  <span className="text-micro font-bold uppercase tracking-wide">
                    {titulo}
                  </span>
                  {active && (
                    <span
                      className="ml-auto"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--primary)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DESKTOP: barra horizontal original ───────────────────────── */}
      <nav
        className="hidden md:flex items-stretch gap-1 w-full"
        aria-label="Secciones del universo"
      >
        {secciones.map(({ href, slug, titulo }) => {
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
              <span className="text-micro font-bold uppercase tracking-wide truncate">
                {titulo}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
