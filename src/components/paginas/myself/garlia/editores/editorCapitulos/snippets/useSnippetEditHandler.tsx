"use client";
/**
 * useSnippetEditHandler
 * ──────────────────────────────────────────────────────────────────────────────
 * Hook que conecta el botón ✎ de los chips de SnippetOverlay con los modales
 * reales (ModalDrop, ModalUseItem, ModalGate, ModalChoice, ModalSection,
 * ModalSonido, ModalImagen).
 *
 * USO en el componente padre (PanelEditor, EditorCapitulo, etc.):
 *
 *   import { useSnippetEditHandler } from "./useSnippetEditHandler";
 *   import { makeSnippetOverlay }    from "./SnippetOverlay";
 *
 *   const textareaRef = useRef<HTMLTextAreaElement>(null);
 *
 *   const { onEdit, SnippetEditModals } = useSnippetEditHandler({
 *     listaCapitulos,   // CapItem[] — requerido para choice/use
 *   });
 *
 *   const overlay = useMemo(
 *     () => makeSnippetOverlay({ taRef: textareaRef, onChange, onEdit }),
 *     [textareaRef, onChange, onEdit]
 *   );
 *
 *   return (
 *     <>
 *       <MarkdownEditor
 *         value={value}
 *         onChange={onChange}
 *         renderOverlay={overlay}
 *         // ...resto de props
 *       />
 *       <SnippetEditModals />   ← monta los modales (no ocupa espacio si no hay ninguno abierto)
 *     </>
 *   );
 *
 * NOTAS:
 *  - El hook parsea el `raw` del snippet para pre-poblar los modales cuando sea
 *    posible (ej: [[drop|a|item|<id>|<nombre>]] → abre EntidadPicker ya con esa
 *    selección). Los modales que no soportan pre-población simplemente abren en
 *    blanco para que el usuario elija la nueva opción.
 *  - Para el modal "drop" usamos directamente ModalDrop (= EntidadPicker), que
 *    ya incluye la UI de búsqueda y selección de ítems.
 *  - `onEdit` es estable (useCallback) — se puede pasar directo a useMemo del overlay
 *    sin generar re-renders innecesarios.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  ModalDrop,
  ModalSonido,
  ModalSection,
  ModalChoice,
  ModalUseItem,
  ModalGate,
  ModalImagen,
} from "./SnippetToolbar";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type SnippetKind =
  | "drop" | "img" | "float" | "choice" | "use" | "gate"
  | "section" | "sound" | "cita" | string;

interface ActiveEdit {
  kind: SnippetKind;
  raw: string;
  replace: (next: string) => void;
}

type CapItem = { id: string; orden: number; titulo_capitulo: string };

interface UseSnippetEditHandlerOptions {
  /** Lista de capítulos para los modales ModalChoice y ModalUseItem */
  listaCapitulos?: CapItem[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSnippetEditHandler({
  listaCapitulos = [],
}: UseSnippetEditHandlerOptions = {}) {
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>(null);

  /**
   * onEdit — se pasa como prop a makeSnippetOverlay.
   * Recibe el raw string del chip clickeado y un callback replace(next)
   * para reemplazarlo en el texto cuando el modal confirme.
   */
  const onEdit = useCallback((raw: string, replace: (next: string) => void) => {
    const inner = raw.slice(2, -2); // quitar [[ y ]]
    const parts  = inner.split("|");
    const kind   = parts[0].trim() as SnippetKind;
    setActiveEdit({ kind, raw, replace });
  }, []);

  /** Cierra el modal activo */
  const close = useCallback(() => setActiveEdit(null), []);

  /**
   * handleInsert — llamado por el modal cuando el usuario confirma.
   * Reemplaza el snippet viejo con el nuevo en el texto del editor.
   */
  const handleInsert = useCallback((next: string) => {
    activeEdit?.replace(next);
    close();
  }, [activeEdit, close]);

  // ── SnippetEditModals — componente que renderiza el modal activo ───────────

  const SnippetEditModals = useCallback(() => {
    if (!activeEdit) return null;
    const { kind } = activeEdit;

    // Los modales reciben onInsert (nuevo snippet) y onClose.
    const sharedProps = { onInsert: handleInsert, onClose: close };

    switch (kind) {
      case "drop":
        return <ModalDrop {...sharedProps} />;

      case "sound":
        return <ModalSonido {...sharedProps} />;

      case "img":
      case "float":
        return <ModalImagen {...sharedProps} />;

      case "section":
        return <ModalSection {...sharedProps} />;

      case "choice":
        return (
          <ModalChoice
            {...sharedProps}
            listaCapitulos={listaCapitulos}
          />
        );

      case "use":
        return (
          <ModalUseItem
            {...sharedProps}
            listaCapitulos={listaCapitulos}
          />
        );

      case "gate":
        return <ModalGate {...sharedProps} />;

      default:
        // kind desconocido: no abre nada
        return null;
    }
  }, [activeEdit, handleInsert, close, listaCapitulos]);

  return { onEdit, SnippetEditModals };
}
