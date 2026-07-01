"use client";
/**
 * SlashCommandPlugin.tsx
 * ───────────────────────
 * Detecta "/" mientras el usuario escribe (estilo Notion) y delega la
 * apertura del menú de snippets al padre (EditorCapitulos), que ya
 * renderiza <SnippetCommandPalette/> fuera del árbol de Lexical.
 *
 * Este plugin NO dibuja ningún menú — solo:
 *   1. Detecta el patrón "/query" en el texto justo antes del cursor.
 *   2. Calcula el rect de pantalla donde debería anclarse el menú.
 *   3. Llama a onOpenPalette(anchorRect, query) para que el padre abra
 *      su propia UI (SnippetCommandPalette).
 *   4. Si el usuario seseleciona un comando (selectOption), borra el
 *      "/query" del documento antes de insertar el nodo correspondiente.
 *
 * Por qué un trigger fn manual y no <LexicalTypeaheadMenuPlugin> con su
 * menú propio: SnippetCommandPalette ya existe, tiene su propio look y
 * lógica de edición de snippets existentes (ver handleSnippetEdit en
 * EditorCapitulos) — no queremos dos implementaciones de menú distintas.
 */
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useRef } from "react";

export interface SlashMatch {
  /** Texto buscado después de "/" (sin la barra) */
  query: string;
  /** Posición de pantalla donde anclar el menú */
  anchorRect: { top: number; left: number };
}

interface SlashCommandPluginProps {
  /** Se llama cuando se detecta "/" + query válido. null para cerrar. */
  onMatch: (match: SlashMatch | null) => void;
  /**
   * Ref que el padre puede usar para pedirle al plugin que borre el
   * "/query" actual del documento (justo antes de insertar el snippet
   * elegido). Se setea automáticamente — el padre solo lo invoca.
   */
  removeMatchRef?: React.MutableRefObject<(() => void) | null>;
}

// Sólo dispara dentro de la palabra actual: "/" seguido de texto sin
// espacios, opcionalmente vacío (recién escrito el "/").
const SLASH_RE = /(?:^|\s)\/([a-zA-Z0-9áéíóúñ\-]*)$/;

export function SlashCommandPlugin({
  onMatch,
  removeMatchRef,
}: SlashCommandPluginProps) {
  const [editor] = useLexicalComposerContext();
  const activeRef = useRef(false);

  const checkForSlashMatch = useCallback(
    (editorState: import("lexical").EditorState) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          if (activeRef.current) {
            activeRef.current = false;
            onMatch(null);
          }
          return;
        }

        const node = selection.anchor.getNode();
        if (!$isTextNode(node)) {
          if (activeRef.current) {
            activeRef.current = false;
            onMatch(null);
          }
          return;
        }

        const offset = selection.anchor.offset;
        const textBeforeCursor = node.getTextContent().slice(0, offset);
        const match = SLASH_RE.exec(textBeforeCursor);

        if (!match) {
          if (activeRef.current) {
            activeRef.current = false;
            onMatch(null);
          }
          return;
        }

        const domSelection = window.getSelection();
        if (!domSelection || domSelection.rangeCount === 0) return;
        const range = domSelection.getRangeAt(0).cloneRange();
        const rect = range.getBoundingClientRect();

        activeRef.current = true;
        onMatch({
          query: match[1] ?? "",
          anchorRect: {
            top: rect.bottom + window.scrollY + 6,
            left: rect.left + window.scrollX,
          },
        });
      });
    },
    [onMatch],
  );

  // Expone al padre cómo borrar el "/query" actual del documento
  useEffect(() => {
    if (!removeMatchRef) return;
    removeMatchRef.current = () => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const node = selection.anchor.getNode();
        if (!$isTextNode(node)) return;

        const offset = selection.anchor.offset;
        const textBeforeCursor = node.getTextContent().slice(0, offset);
        const match = SLASH_RE.exec(textBeforeCursor);
        if (!match) return;

        const matchStart =
          offset - match[0].length + (match[0].startsWith(" ") ? 1 : 0);
        node.spliceText(matchStart, offset - matchStart, "", true);
      });
    };
    return () => {
      removeMatchRef.current = null;
    };
  }, [editor, removeMatchRef]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      checkForSlashMatch(editorState);
    });
  }, [editor, checkForSlashMatch]);

  // Escape cierra el menú si está abierto
  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (!activeRef.current) return false;
        activeRef.current = false;
        onMatch(null);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onMatch]);

  return null;
}
