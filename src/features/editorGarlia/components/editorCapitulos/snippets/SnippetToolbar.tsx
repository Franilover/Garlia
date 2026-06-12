"use client";
/**
 * SnippetToolbar.tsx
 * ──────────────────
 * Toolbar de snippets para el editor de capítulos.
 * Los modales viven en SnippetModals.tsx — este archivo solo maneja
 * el botón de cada tipo y delega la lógica de inserción.
 */
import React, { useState, useCallback } from "react";
import {
  Sword, Image, GitMerge, MousePointerClick,
  ChevronRight as ChevronR, Music2, GitFork,
} from "lucide-react";
import { SnippetModalDispatcher } from "./SnippetModals";
import type { ModalKind } from "./snippetDefs";

type ToolbarProps = {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value:       string;
  onChange:    (v: string) => void;
};

const BTNS: { key: ModalKind; label: string; icon: React.ReactNode }[] = [
  { key: "drop",    label: "Drop",      icon: <Sword size={11} /> },
  { key: "imagen",  label: "Imagen",    icon: <Image size={11} /> },
  { key: "choice",  label: "Choice",    icon: <GitMerge size={11} /> },
  { key: "use",     label: "Use Ítem",  icon: <MousePointerClick size={11} /> },
  { key: "gate",    label: "Gate Ítem", icon: <GitFork size={11} /> },
  { key: "section", label: "Sección",   icon: <ChevronR size={11} /> },
  { key: "sound",   label: "Sonido",    icon: <Music2 size={11} /> },
];

const btnCls = "flex items-center gap-1 px-2.5 py-1.5 rounded-btn text-[9px] font-black uppercase tracking-wide transition-all text-primary/50 hover:text-primary hover:bg-primary/8 border border-transparent hover:border-primary/10";

export function SnippetToolbar({ textareaRef, value, onChange }: ToolbarProps) {
  const [openModal, setOpenModal] = useState<ModalKind | null>(null);

  const insertAtCursor = useCallback((snippet: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + snippet); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    onChange(value.slice(0, s) + snippet + value.slice(e));
    setTimeout(() => { el.focus(); el.setSelectionRange(s + snippet.length, s + snippet.length); }, 0);
  }, [textareaRef, value, onChange]);

  return (
    <>
      <div
        className="flex items-center gap-1 flex-wrap px-8 py-2 border-b border-primary/5"
        style={{ background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}
      >
        <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 mr-2">Snippets</span>
        {BTNS.map(b => (
          <button key={b.key} onClick={() => setOpenModal(b.key)} className={btnCls}>
            {b.icon} {b.label}
          </button>
        ))}
        <div className="w-px h-4 bg-primary/10 mx-1" />
        <button onClick={() => insertAtCursor("[[cita|Texto de la cita — Fuente]]")} className={btnCls}>« Cita</button>
        <button onClick={() => insertAtCursor("\n\n")} className={btnCls}>¶ Párrafo</button>
      </div>

      <SnippetModalDispatcher
        kind={openModal}
        onInsert={insertAtCursor}
        onClose={() => setOpenModal(null)}
      />
    </>
  );
}

// Reexportar los modales individuales para compatibilidad con RichBlockEditor
export { ModalDrop, ModalSonido, ModalSection, ModalChoice, ModalUseItem, ModalGate, ModalImagen } from "./SnippetModals";