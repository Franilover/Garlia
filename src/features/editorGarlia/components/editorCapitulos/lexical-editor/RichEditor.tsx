"use client";
/**
 * RichEditor.tsx
 * ──────────────
 * Reemplaza el MarkdownEditor.tsx basado en <textarea> + SnippetOverlay.
 *
 * Diferencias clave:
 *   - Los snippets son NODOS REALES del documento (DropNode, SoundNode, etc.)
 *     → el chip ocupa su espacio real, el texto fluye alrededor de verdad
 *     → ya no hay overlay ni "trampa" de tapar texto con un div encima
 *   - Mismo formato de guardado: [[drop|...]], [[sound|...]], etc.
 *     → parseContenido(), ContenidoInteractivo, SegmentRenderers: sin cambios
 *   - Markdown shortcuts preservados (**, *, #, ##, etc.)
 *   - Modo preview igual que antes (renderMarkdown sobre el raw serializado)
 *   - SnippetCommandPalette existente conectado sin cambios
 *
 * Props compatibles con las del MarkdownEditor anterior para simplificar
 * la migración en EditorCapitulos.tsx.
 */
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { EditorState } from "lexical";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { renderMarkdown } from "@/components/forms/Markdown/markdownRenderer";

import { DropNode } from "./nodes/DropNode";
import { SoundNode } from "./nodes/SoundNode";
import { ImgNode } from "./nodes/ImgNode";
import { ChoiceNode } from "./nodes/ChoiceNode";
import { UseNode } from "./nodes/UseNode";
import { GateNode } from "./nodes/GateNode";
import { SectionNode } from "./nodes/SectionNode";
import { snippetEditHandler, type SnippetEditRequest } from "./nodes/sharedTypes";
import { rawTextToLexicalTree, serializeRootToRaw, insertSnippetNode } from "./richTextSerializer";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = "edit" | "preview" | "split";

export interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number | string;
  maxHeight?: number | string;
  mode?: ViewMode;
  onModeChange?: (mode: ViewMode) => void;
  autoFocus?: boolean;
  /** Ref imperativo para insertar snippets desde EditorCapitulos */
  insertRef?: React.MutableRefObject<((raw: string) => void) | null>;
  /** Handler de edición de un snippet existente → abre SnippetCommandPalette */
  onSnippetEdit?: (req: SnippetEditRequest<any>) => void;
  /** Entidades para autocompletado de wikilinks (opcional) */
  wikiEntities?: { name: string; type: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Config del composer (nodos registrados)
// ─────────────────────────────────────────────────────────────────────────────

const RICH_EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  LinkNode,
  DropNode,
  SoundNode,
  ImgNode,
  ChoiceNode,
  UseNode,
  GateNode,
  SectionNode,
];

// ─────────────────────────────────────────────────────────────────────────────
// Plugin: carga el contenido inicial desde el raw string
// ─────────────────────────────────────────────────────────────────────────────

function InitialContentPlugin({ initialRaw }: { initialRaw: string }) {
  const [editor] = useLexicalComposerContext();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    editor.update(() => {
      rawTextToLexicalTree(initialRaw);
    });
  }, [editor, initialRaw]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin: expone insertRef para que EditorCapitulos pueda insertar snippets
// ─────────────────────────────────────────────────────────────────────────────

function InsertSnippetPlugin({
  insertRef,
}: {
  insertRef: React.MutableRefObject<((raw: string) => void) | null>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    insertRef.current = (raw: string) => {
      editor.update(() => insertSnippetNode(raw));
    };
  }, [editor, insertRef]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar
// ─────────────────────────────────────────────────────────────────────────────

function ToolbarPlugin({
  mode,
  onModeChange,
}: {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}) {
  const [editor] = useLexicalComposerContext();

  const formatBold = () => {
    editor.dispatchCommand(
      require("lexical").FORMAT_TEXT_COMMAND,
      "bold",
    );
  };

  const formatItalic = () => {
    editor.dispatchCommand(
      require("lexical").FORMAT_TEXT_COMMAND,
      "italic",
    );
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    background: active
      ? "color-mix(in srgb, var(--color-primary, var(--primary)) 15%, transparent)"
      : "none",
    border: "0.5px solid var(--border)",
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 600,
    color: active
      ? "var(--color-primary, var(--primary))"
      : "var(--foreground)",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  });

  const modeBtn = (m: ViewMode, label: string) => (
    <button
      key={m}
      style={btnStyle(mode === m)}
      type="button"
      onClick={() => onModeChange(m)}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderBottom: "0.5px solid var(--border)",
        flexWrap: "wrap",
      }}
    >
      <button style={btnStyle()} title="Negrita (Ctrl+B)" type="button" onClick={formatBold}>
        <strong>B</strong>
      </button>
      <button style={btnStyle()} title="Cursiva (Ctrl+I)" type="button" onClick={formatItalic}>
        <em>I</em>
      </button>

      <div
        style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }}
      />

      {modeBtn("edit", "Editar")}
      {modeBtn("split", "Split")}
      {modeBtn("preview", "Preview")}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RichEditor
// ─────────────────────────────────────────────────────────────────────────────

export function RichEditor({
  value,
  onChange,
  placeholder = "Escribe aquí…",
  minHeight = "12rem",
  maxHeight,
  mode: modeProp,
  onModeChange,
  autoFocus = false,
  insertRef,
  onSnippetEdit,
  wikiEntities,
}: RichEditorProps) {
  const [internalMode, setInternalMode] = useState<ViewMode>("edit");
  const mode = modeProp ?? internalMode;
  const handleModeChange = onModeChange ?? setInternalMode;

  // Conecta el handler global de edición de snippets con la callback del padre
  useEffect(() => {
    snippetEditHandler.current = onSnippetEdit ?? null;
  }, [onSnippetEdit]);

  // Ref interno para insertar snippets (si el padre no pasa el suyo)
  const internalInsertRef = useRef<((raw: string) => void) | null>(null);
  const activeInsertRef = insertRef ?? internalInsertRef;

  const initialConfig = useMemo(
    () => ({
      namespace: "agenda-next-rich-editor",
      nodes: RICH_EDITOR_NODES,
      onError(error: Error) {
        console.error("Lexical error:", error);
      },
      theme: {
        paragraph: "mb-[0.4em] leading-[1.7]",
        heading: {
          h1: "text-2xl font-bold mt-6 mb-2",
          h2: "text-xl font-bold mt-5 mb-2",
          h3: "text-lg font-semibold mt-4 mb-1",
          h4: "text-base font-semibold mt-3 mb-1",
        },
        quote: "border-l-2 border-primary/30 pl-4 italic opacity-75 my-4",
        code: "font-mono text-[0.875em] bg-surface-1 px-1.5 py-0.5 rounded",
        list: {
          ul: "list-disc pl-6 my-2",
          ol: "list-decimal pl-6 my-2",
          listitem: "my-1",
        },
        text: {
          bold: "font-bold",
          italic: "italic",
          underline: "underline",
          strikethrough: "line-through",
          code: "font-mono text-[0.875em] bg-surface-1 px-1 rounded",
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleChange = useCallback(
    (_state: EditorState, editor: import("lexical").LexicalEditor) => {
      editor.read(() => {
        const raw = serializeRootToRaw();
        onChange(raw);
      });
    },
    [onChange],
  );

  const previewHtml = useMemo(
    () => (mode !== "edit" ? renderMarkdown(value) : ""),
    [mode, value],
  );

  const editorStyle: React.CSSProperties = {
    minHeight,
    ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}),
    padding: "8px 12px",
    outline: "none",
    fontSize: 11,
    lineHeight: 1.7,
    fontFamily: "var(--font-mono)",
    color: "color-mix(in srgb, var(--foreground) 75%, transparent)",
  };

  return (
    <div
      style={{
        border: "0.5px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        // Expone el color de fondo del editor para eventuales overlays internos
        // @ts-expect-error custom property
        "--editor-bg": "var(--bg-main, var(--background))",
      }}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin mode={mode} onModeChange={handleModeChange} />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Panel de edición */}
          {mode !== "preview" && (
            <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    style={editorStyle}
                  />
                }
                placeholder={
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 12,
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      color: "color-mix(in srgb, var(--foreground) 25%, transparent)",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {placeholder}
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <HistoryPlugin />
              {autoFocus && <AutoFocusPlugin />}
              <InitialContentPlugin initialRaw={value} />
              <InsertSnippetPlugin insertRef={activeInsertRef} />
              <OnChangePlugin onChange={handleChange} />
            </div>
          )}

          {/* Separador split */}
          {mode === "split" && (
            <div style={{ width: 1, background: "var(--border)" }} />
          )}

          {/* Panel de preview */}
          {mode !== "edit" && (
            <div
              className="prose-mundo"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              style={{
                flex: 1,
                padding: "8px 12px",
                overflowY: "auto",
                fontSize: "clamp(0.9rem, 2vw, 1rem)",
                lineHeight: 1.8,
              }}
            />
          )}
        </div>
      </LexicalComposer>
    </div>
  );
}
