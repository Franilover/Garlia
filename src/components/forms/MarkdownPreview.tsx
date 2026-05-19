"use client";

/**
 * MarkdownPreview
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
 *
 * Uso en editors de entidades:
 *   import { MarkdownPreview } from "./MarkdownPreview";
 *   <MarkdownPreview value={texto} placeholder="Escribe algo…" />
 */

import React, { useRef, useEffect, useCallback } from "react";
import { renderMarkdown, renderMathInElement, PROSE_STYLES } from "./MarkdownEditor";

// ── WikilinkContext — importar del contexto existente ────────────────────────
// Este import asume que WikilinkContext.tsx está en la misma carpeta.
// Si onWikilink no está disponible (fuera del provider), los clicks simplemente
// llaman e.preventDefault() sin navegar — sin crash.
import { useWikilink } from "./WikilinkContext";

// ── Inyección de estilos (una sola vez por página) ────────────────────────────
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const tag = document.createElement("style");
  tag.textContent = PROSE_STYLES;
  document.head.appendChild(tag);
}

// ── Componente ────────────────────────────────────────────────────────────────
export interface MarkdownPreviewProps {
  value: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  minHeight?: string;
}

export function MarkdownPreview({
  value,
  placeholder = "Vista previa…",
  className = "",
  style,
  minHeight = "4rem",
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Intentar obtener el handler de navegación del contexto.
  // Si estamos fuera del WikilinkProvider, useWikilink devuelve un noop.
  let onWikilink: ((target: string) => void) | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useWikilink();
    onWikilink = ctx.onWikilink;
  } catch {
    onWikilink = undefined;
  }

  // Inyectar estilos PROSE_STYLES al montar
  useEffect(() => { injectStyles(); }, []);

  // Renderizar KaTeX si hay fórmulas
  useEffect(() => {
    renderMathInElement(containerRef.current);
  }, [value]);

  // Listener nativo con capture:true para interceptar clicks en wikilinks
  // ANTES de que el browser navegue al href (javascript:void(0) ya lo evita,
  // pero el capture también previene cualquier bubbling problemático).
  const handleWikilinkClick = useCallback((e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[data-wikilink]");
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    const target = a.getAttribute("data-wikilink");
    if (target && onWikilink) {
      onWikilink(target);
    }
  }, [onWikilink]);

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