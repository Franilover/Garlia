"use client";

/**
 * MarkdownEditorConSnippets.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * `components/forms/Markdown/MarkdownEditor` es UI genérica: no conoce
 * `features/`. El parseo de snippets (wikilinks, choices, etc.) y su
 * renderizado SÍ son lógica de dominio de Garlia, así que viven aquí y se
 * inyectan al editor genérico vía props, con los tipos reales de `Segment`
 * (sin castear a `never` ni asumir formas que no existen).
 *
 * Úsalo en vez de `MarkdownEditor` a secas en cualquier vista/formulario de
 * editorGarlia o garlia que necesite soportar snippets/wikilinks en el
 * preview (p. ej. notas de lore, capítulos, descripciones con [[wikilinks]]).
 */

import type { ComponentProps } from "react";

import {
  parseContenido,
  parseSections,
  type Segment,
} from "@/features/editorGarlia/components/editorCapitulos/snippets/type";
import { RenderSegmentos } from "@/features/garlia/components/ContenidoInteractivo";

import { MarkdownEditor } from "@/components/forms/Markdown/MarkdownEditor";

type MarkdownEditorConSnippetsProps = Omit<
  ComponentProps<typeof MarkdownEditor<Segment>>,
  "parseSnippets" | "parseSections" | "renderSnippetSegment" | "isTextSegment"
>;

function isTextSegment(seg: Segment): seg is Segment & { value: string } {
  return seg.type === "text";
}

export function MarkdownEditorConSnippets(
  props: MarkdownEditorConSnippetsProps,
) {
  return (
    <MarkdownEditor<Segment>
      {...props}
      isTextSegment={isTextSegment}
      parseSections={parseSections}
      parseSnippets={parseContenido}
      renderSnippetSegment={(seg, onNavigate) => (
        <RenderSegmentos segs={[seg]} onNavigate={onNavigate} />
      )}
    />
  );
}
