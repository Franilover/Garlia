"use client";
import React, { useState, useCallback } from "react";
import {
  ModalDrop,
  ModalSonido,
  ModalSection,
  ModalChoice,
  ModalUseItem,
  ModalGate,
  ModalImagen,
} from "./SnippetToolbar";

type SnippetKind =
  | "drop" | "img" | "float" | "choice" | "use" | "gate"
  | "section" | "sound" | "cita" | string;

interface ActiveEdit {
  kind: SnippetKind;
  raw: string;
  replace: (next: string) => void;
}

export function useSnippetEditHandler() {
  const [activeEdit, setActiveEdit] = useState<ActiveEdit | null>(null);

  const onEdit = useCallback((raw: string, replace: (next: string) => void) => {
    const inner = raw.slice(2, -2);
    const parts  = inner.split("|");
    const kind   = parts[0].trim() as SnippetKind;
    setActiveEdit({ kind, raw, replace });
  }, []);

  const close = useCallback(() => setActiveEdit(null), []);

  const handleInsert = useCallback((next: string) => {
    activeEdit?.replace(next);
    close();
  }, [activeEdit, close]);

  const SnippetEditModals = useCallback(() => {
    if (!activeEdit) return null;
    const { kind, raw } = activeEdit;

    const sharedProps = { onInsert: handleInsert, onClose: close, initialRaw: raw };

    switch (kind) {
      case "drop": return <ModalDrop {...sharedProps} />;
      case "sound": return <ModalSonido {...sharedProps} />;
      case "img":
      case "float": return <ModalImagen {...sharedProps} />;
      case "section": return <ModalSection {...sharedProps} />;
      case "choice": return <ModalChoice {...sharedProps} />;
      case "use": return <ModalUseItem {...sharedProps} />;
      case "gate": return <ModalGate {...sharedProps} />;
      default: return null;
    }
  }, [activeEdit, handleInsert, close]);

  return { onEdit, SnippetEditModals };
}