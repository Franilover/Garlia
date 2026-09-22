"use client";

/**
 * TituloCategoria.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Título de categoría/sección dentro de un grid de chips, rediseño
 * 2026-09-20: CENTRADO y con una línea horizontal a cada lado que separa las
 * categorías entre sí:
 *
 *      ───────────────  MICRO 50  ───────────────
 *
 * Lo usan Estructuras (Micro / Macro / Patrones / Sin escala), Compuestos y
 * Materiales (categorías por propiedad) — un solo componente para que el
 * lenguaje visual sea idéntico en todas.
 *
 * Genérico: no sabe de ordenar ni de popovers. Si se pasa `onClick` el título
 * se vuelve un botón (Compuestos/Materiales lo usan para abrir "ordenar esta
 * sección por propiedad"); si no, es solo texto (Estructuras). `extra` es un
 * slot a la derecha del texto dentro del mismo grupo centrado (chip de orden
 * activo, ícono…).
 */

import React from "react";

export function TituloCategoria({
  titulo,
  total,
  onClick,
  title,
  activo = false,
  extra,
}: {
  titulo: string;
  /** Cantidad de entradas de la categoría; se muestra junto al título. */
  total?: number;
  /** Si se pasa, el título es clicable (abre el selector de orden). */
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Tooltip del título clicable. */
  title?: string;
  /** Resalta el título en acento (ej. categoría con orden activo). */
  activo?: boolean;
  /** Contenido extra a la derecha del texto (chip de orden, ícono…). */
  extra?: React.ReactNode;
}) {
  const color = activo
    ? "text-accent"
    : onClick
      ? "text-accent/70 hover:text-accent"
      : "text-accent/70";

  const contenido = (
    <>
      <span className="truncate">{titulo}</span>
      {total !== undefined && (
        <span className="shrink-0 tabular-nums font-bold tracking-normal opacity-60">{total}</span>
      )}
      {extra}
    </>
  );

  return (
    <div className="mb-1.5 flex items-center gap-2 px-1">
      <span aria-hidden className="h-px flex-1 bg-primary/15" />
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          title={title}
          className={`flex min-w-0 max-w-[80%] items-center gap-1.5 text-micro font-black uppercase tracking-[0.2em] transition-colors cursor-pointer ${color}`}
        >
          {contenido}
        </button>
      ) : (
        <span
          className={`flex min-w-0 max-w-[80%] items-center gap-1.5 text-micro font-black uppercase tracking-[0.2em] ${color}`}
        >
          {contenido}
        </span>
      )}
      <span aria-hidden className="h-px flex-1 bg-primary/15" />
    </div>
  );
}
