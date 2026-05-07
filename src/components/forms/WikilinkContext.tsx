"use client";

/**
 * WikilinkContext
 * ──────────────────────────────────────────────────────────────────────────────
 * Contexto React que conecta [[wikilinks]] con la navegación de editorEntidades.
 *
 * Expone DOS handlers:
 *
 *   onWikilink(target)      — para MarkdownPreview (nuevo componente liviano).
 *                             Recibe directamente el texto del wikilink y navega.
 *
 *   onSnippetAction(action) — legacy para MarkdownEditor cuando se usa en modo
 *                             split/preview con onSnippetAction. Solo procesa
 *                             { type: "wikilink" }, ignora el resto (esos son
 *                             responsabilidad del lector de ensayos).
 *
 * Uso:
 *   // En editorEntidades.tsx:
 *   <WikilinkProvider onWikilink={handleNavigate}>
 *     <EditorPersonaje ... />
 *   </WikilinkProvider>
 *
 *   // En cualquier editor hijo:
 *   const { onWikilink } = useWikilink();
 *   <MarkdownPreview value={texto} />   ← lo consume automáticamente
 */

import React, { createContext, useContext, useCallback } from "react";
import type { SnippetAction } from "./MarkdownEditor";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface WikilinkContextValue {
  /** Handler directo para MarkdownPreview — recibe el texto del wikilink */
  onWikilink: (target: string) => void;
  /** Handler legacy para MarkdownEditor.onSnippetAction */
  onSnippetAction: (action: SnippetAction) => void;
}

// ── Contexto ──────────────────────────────────────────────────────────────────
const WikilinkContext = createContext<WikilinkContextValue | null>(null);

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWikilink(): WikilinkContextValue {
  const ctx = useContext(WikilinkContext);
  if (!ctx) {
    // Fuera del provider: devolver noops para que no crashee
    return {
      onWikilink: () => {},
      onSnippetAction: () => {},
    };
  }
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
interface WikilinkProviderProps {
  /** Función de navegación provista por editorEntidades */
  onWikilink: (target: string) => void;
  children: React.ReactNode;
}

export function WikilinkProvider({ onWikilink, children }: WikilinkProviderProps) {
  // onSnippetAction legacy: solo manejar { type: "wikilink" }
  const onSnippetAction = useCallback((action: SnippetAction) => {
    if (action.type === "wikilink") {
      onWikilink(action.target);
    }
    // Los tipos "choice", "section", "use", "drop", "sound", "img", "float"
    // son exclusivos del lector de ensayos — se ignoran acá.
  }, [onWikilink]);

  const value: WikilinkContextValue = {
    onWikilink,
    onSnippetAction,
  };

  return (
    <WikilinkContext.Provider value={value}>
      {children}
    </WikilinkContext.Provider>
  );
}