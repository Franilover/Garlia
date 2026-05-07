/**
 * Uso:
 *
 * En el editor padre:
 *   const { onSnippetAction } = useWikilink();
 *
 * Luego se pasa como prop:
 *   <FormularioPersonaje onSnippetAction={onSnippetAction} />
 *
 * Y finalmente:
 *   <MarkdownEditor onSnippetAction={onSnippetAction} />
 */
"use client";


import React, { createContext, useContext, useCallback } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SnippetAction =
  | { type: "wikilink"; target: string }
  | { type: "section";  id: string }
  | { type: "choice";   target: string };

type WikilinkContextValue = {
  /** Handler listo para pasarle a <MarkdownEditor onSnippetAction={...} /> */
  onSnippetAction: (action: SnippetAction) => void;
};

// ─── Contexto ─────────────────────────────────────────────────────────────────

const WikilinkContext = createContext<WikilinkContextValue>({
  onSnippetAction: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WikilinkProvider({
  children,
  navigateTo,
}: {
  children: React.ReactNode;
  /**
   * Función que recibe el target del wikilink (el texto dentro de [[...]]) y
   * navega a la entidad correspondiente dentro del editor de entidades.
   */
  navigateTo: (target: string) => void;
}) {
  const onSnippetAction = useCallback(
    (action: SnippetAction) => {
      if (action.type === "wikilink") {
        navigateTo(action.target);
      }
      // Las acciones "section" y "choice" las ignora este contexto;
      // el MarkdownEditor ya las maneja internamente si se le pasa onSnippetAction.
    },
    [navigateTo]
  );

  return (
    <WikilinkContext.Provider value={{ onSnippetAction }}>
      {children}
    </WikilinkContext.Provider>
  );
}

// ─── Hook de consumo ──────────────────────────────────────────────────────────

export function useWikilink(): WikilinkContextValue {
  return useContext(WikilinkContext);
}
