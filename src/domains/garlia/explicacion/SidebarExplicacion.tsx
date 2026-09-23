"use client";

/**
 * SidebarExplicacion.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Barra lateral derecha, fija (sticky), con el índice de secciones del
 * recorrido. Reemplaza a la fila de pills que antes iba arriba del todo.
 *
 * Resalta la sección visible actual con IntersectionObserver (scroll-spy
 * liviano) — solo sobre los ids realmente presentes en el body
 * (Polaridades/Elementos); los items sin bloque en el body (Compuestos en
 * adelante) nunca se resaltan porque no existe esa sección para observar.
 *
 * Oculto por defecto: el panel arranca cerrado y se muestra/oculta con un
 * botón toggle flotante (fixed) en la esquina superior derecha de la
 * pantalla, siempre visible sin importar el scroll.
 */

import { useEffect, useRef, useState } from "react";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

import { SIDEBAR_ITEMS } from "./sidebarItems";

export function SidebarExplicacion() {
  const [activo, setActivo] = useState<string>("polaridades");
  const [abierto, setAbierto] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const idsUnicos = Array.from(new Set(SIDEBAR_ITEMS.filter((i) => i.disponible).map((i) => i.href.slice(1))));
    const elementos = idsUnicos
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elementos.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Toma la entrada más visible entre las que están intersectando.
        const visibles = entries.filter((e) => e.isIntersecting);
        if (visibles.length === 0) return;
        const masVisible = visibles.reduce((a, b) => (a.intersectionRatio > b.intersectionRatio ? a : b));
        setActivo(masVisible.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    elementos.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <>
      {/* Botón toggle flotante — siempre visible, esquina superior derecha */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Ocultar índice" : "Mostrar índice"}
        aria-expanded={abierto}
        className="fixed right-4 top-4 z-50 hidden items-center justify-center rounded-full p-2 shadow-md transition-colors lg:flex"
        style={{
          background: "var(--card, #fff)",
          border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
          color: "var(--primary)",
        }}
      >
        {abierto ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </button>

      {abierto && (
        <nav
          aria-label="Índice del recorrido"
          className="fixed top-16 right-4 z-40 hidden shrink-0 flex-col gap-0.5 rounded-lg p-2 shadow-lg lg:flex"
          style={{
            width: 168,
            background: "var(--card, #fff)",
            border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
          }}
        >
          {SIDEBAR_ITEMS.map((item) => {
            const esActivo = item.disponible && item.href.slice(1) === activo;
            return (
              <a
                key={item.id}
                href={item.disponible ? item.href : undefined}
                aria-disabled={!item.disponible}
                className="rounded-md px-2.5 py-1.5 text-micro font-bold uppercase tracking-wide transition-colors"
                style={{
                  pointerEvents: item.disponible ? "auto" : "none",
                  cursor: item.disponible ? "pointer" : "default",
                  color: !item.disponible
                    ? "color-mix(in srgb, var(--primary) 22%, transparent)"
                    : esActivo
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 50%, transparent)",
                  background: esActivo ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                  borderLeft: `2px solid ${esActivo ? "var(--primary)" : "transparent"}`,
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      )}
    </>
  );
}
