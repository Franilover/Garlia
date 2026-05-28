"use client";
/**
 * useSnippetEditHandler.tsx
 * ─────────────────────────
 * Hook para editar snippets existentes al hacer click en un chip del overlay.
 * Usa SnippetModalDispatcher directamente — sin duplicar el switch de modales.
 */
import React, { useState, useCallback } from "react";
import { SnippetModalDispatcher } from "./SnippetModals";
import type { ModalKind } from "./snippetDefs";
import { KIND_DEFS } from "./snippetDefs";

interface ActiveEdit {
  kind: ModalKind;
  raw:  string;
  replace: (next: string) => void;
}

export function useSnippetEditHandler() {
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>(null);

  const onEdit = useCallback((raw: string, replace: (next: string) => void) => {
    const kind = raw.slice(2, -2).split("|")[0].trim();
    const def  = KIND_DEFS[kind];
    const modal = def?.modal ?? null;
    if (!modal) return; // cita y desconocidos no tienen modal de edición
    setActiveEdit({ kind: modal, raw, replace });
  }, []);

  const close = useCallback(() => setActiveEdit(null), []);

  const SnippetEditModals = useCallback(() => {
    if (!activeEdit) return null;
    return (
      <SnippetModalDispatcher
        kind={activeEdit.kind}
        initialRaw={activeEdit.raw}
        onInsert={next => { activeEdit.replace(next); close(); }}
        onClose={close}
      />
    );
  }, [activeEdit, close]);

  return { onEdit, SnippetEditModals };
}