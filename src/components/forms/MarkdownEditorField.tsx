"use client";

/**
 * MarkdownEditorField
 * ──────────────────────────────────────────────────────────────────────────────
 * Wrapper para usar en EditorPersonaje, EditorCriatura, EditorReino, etc.
 *
 * Combina:
 *   - MarkdownEditor en modo "edit" (textarea puro, sin preview propio)
 *   - MarkdownPreview debajo (solo lectura, con wikilinks clicables via WikilinkContext)
 *
 * El preview siempre visible permite hacer click en [[Entidad]] y navegar,
 * sin interferir con la lógica de snippets del lector de ensayos.
 *
 * Props:
 *   value, onChange     — estado del texto (igual que MarkdownEditor)
 *   placeholder         — placeholder del textarea
 *   rows                — alto del textarea (default 6)
 *   className           — clase extra del contenedor
 *   label               — etiqueta opcional sobre el campo
 *   previewMinHeight    — alto mínimo del preview (default "3rem")
 *   hidePreviewIfEmpty  — ocultar el preview cuando value está vacío (default true)
 *
 * Uso:
 *   import { MarkdownEditorField } from "./MarkdownEditorField";
 *
 *   <MarkdownEditorField
 *     value={personaje.lore}
 *     onChange={(v) => setPersonaje(p => ({ ...p, lore: v }))}
 *     placeholder="Historia del personaje…"
 *     rows={8}
 *   />
 */

import React from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { MarkdownPreview } from "./MarkdownPreview";

export interface MarkdownEditorFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  previewMinHeight?: string;
  hidePreviewIfEmpty?: boolean;
  /** Entidades disponibles para autocompletado de [[wikilinks]] */
  entities?: string[];
}

export function MarkdownEditorField({
  value,
  onChange,
  placeholder,
  rows = 6,
  className = "",
  label,
  previewMinHeight = "3rem",
  hidePreviewIfEmpty = true,
  entities = [],
}: MarkdownEditorFieldProps) {
  const showPreview = !hidePreviewIfEmpty || value?.trim().length > 0;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "color-mix(in srgb, var(--foreground) 50%, transparent)",
          marginBottom: "0.15rem",
        }}>
          {label}
        </label>
      )}

      {/* Editor (textarea puro, sin preview propio) */}
      <MarkdownEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        defaultMode="edit"
        toolbar={false}
        entities={entities}
        // Sin onSnippetAction — ese es exclusivo del lector de ensayos
      />

      {/* Preview liviano con soporte de wikilinks via WikilinkContext */}
      {showPreview && (
        <div style={{
          borderTop: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
          marginTop: "0.25rem",
          paddingTop: "0.5rem",
        }}>
          <div style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
            marginBottom: "0.35rem",
          }}>
            Vista previa
          </div>
          <MarkdownPreview
            value={value}
            placeholder={placeholder}
            minHeight={previewMinHeight}
          />
        </div>
      )}
    </div>
  );
}