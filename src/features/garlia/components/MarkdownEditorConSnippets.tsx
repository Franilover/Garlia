"use client";

/**
 * MarkdownEditorConSnippets.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * `components/forms/Markdown/MarkdownEditor` es UI genérica: no conoce
 * `features/`. El parseo de snippets (wikilinks, choices, etc.) y su
 * renderizado SÍ son lógica de dominio de Garlia, así que viven aquí y se
 * inyectan al editor genérico vía props.
 *
 * Úsalo en vez de `MarkdownEditor` a secas en cualquier vista/formulario de
 * editorGarlia o garlia que necesite soportar snippets/wikilinks en el
 * preview (p. ej. notas de lore, capítulos, descripciones con [[wikilinks]]).
 */

import type { ComponentProps } from "react";

import {
  parseContenido,
  parseSections,
} from "@/features/editorGarlia/components/editorCapitulos/snippets/type";
import { RenderSegmentos } from "@/features/garlia/components/ContenidoInteractivo";

import { MarkdownEditor } from "@/components/forms/Markdown/MarkdownEditor";

type MarkdownEditorConSnippetsProps = Omit<
  ComponentProps<typeof MarkdownEditor>,
  "parseSnippets" | "parseSections" | "renderSnippetSegment"
>;

export function MarkdownEditorConSnippets(
  props: MarkdownEditorConSnippetsProps,
) {
  return (
    <MarkdownEditor
      {...props}
      parseSections={parseSections}
      parseSnippets={parseContenido}
      renderSnippetSegment={(seg, onNavigate) => (
        <RenderSegmentos segs={[seg as never]} onNavigate={onNavigate} />
      )}
    />
  );
}
