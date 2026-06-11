"use client";

/**
 * MarkdownPreview.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Componente de SOLO LECTURA. Renderiza markdown con los mismos estilos que
 * MarkdownEditor, pero sin ninguna lógica de snippets, secciones ni ensayos.
 *
 * Los [[wikilinks]] se resuelven vía WikilinkContext (editorEntidades).
 * Si el contexto no está disponible, los wikilinks simplemente no hacen nada.
 *
 * Props:
 *   value       — texto markdown a renderizar
 *   placeholder — texto a mostrar cuando value está vacío
 *   className   — clase extra del contenedor
 *   style       — estilos inline del contenedor
 *   minHeight   — altura mínima del contenedor
 */

import React, { useRef, useEffect, useCallback } from "react";
import { renderMarkdown, renderMathInElement, PROSE_STYLES } from "./markdownRenderer";
import { useWikilink } from "@/features/myself/garlia/components/WikilinkContext";

// ── Inyección de estilos (una sola vez por página) ────────────────────────────
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const tag = document.createElement("style");
  tag.textContent = PROSE_STYLES;
  document.head.appendChild(tag);
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface MarkdownPreviewProps {
  value: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  minHeight?: string;
}

// ── Componente ────────────────────────────────────────────────────────────────
export function MarkdownPreview({
  value,
  placeholder = "Vista previa…",
  className = "",
  style,
  minHeight = "4rem",
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Intentar obtener el handler de navegación del contexto.
  // Si estamos fuera del WikilinkProvider, useWikilink lanza → noop.
  let onWikilink: ((target: string) => void) | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useWikilink();
    onWikilink = ctx.onWikilink;
  } catch {
    onWikilink = undefined;
  }

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    renderMathInElement(containerRef.current);
  }, [value]);

  const handleWikilinkClick = useCallback(
    (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[data-wikilink]");
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const target = a.getAttribute("data-wikilink");
      if (target && onWikilink) onWikilink(target);
    },
    [onWikilink],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("click", handleWikilinkClick, { capture: true });
    return () => el.removeEventListener("click", handleWikilinkClick, { capture: true });
  }, [handleWikilinkClick]);

  if (!value?.trim()) {
    return (
      <div
        ref={containerRef}
        className={`prose-mundo ${className}`}
        style={{ minHeight, ...style }}
      >
        <p className="placeholder">{placeholder}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`prose-mundo ${className}`}
      style={{ minHeight, ...style }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
    />
  );
}
