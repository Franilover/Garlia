"use client";

import React, { useState } from "react";
import { Globe } from "lucide-react";
import { MUNDO_SECTIONS, type MundoSectionKey, type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";

const SECTION_PLACEHOLDERS: Record<MundoSectionKey, string> = {
  magia:     "Sistema de magia, reglas, fuentes de poder, limitaciones…",
  geografia: "Continentes, mares, climas, fronteras del mundo…",
  historia:  "Grandes eras, eventos fundacionales, cronología del mundo…",
};

export function EditorMundo({
  activeSection,
  textos,
  onTextoChange,
  onSave,
}: {
  activeSection: MundoSectionKey;
  textos: Record<MundoSectionKey, string>;
  onTextoChange: (section: MundoSectionKey, value: string) => void;
  onSave: (section: MundoSectionKey) => Promise<void>;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const current     = MUNDO_SECTIONS.find(s => s.key === activeSection)!;
  const SectionIcon = current.Icon;

  const handleSave = async () => {
    setStatus("saving");
    try {
      await onSave(activeSection);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error("[EditorMundo] Error al guardar:", e);
      setStatus("error");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 gap-4">

      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/8 border border-primary/15">
          <SectionIcon size={18} className="text-primary/60" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">{current.label}</h2>
          <p className="text-[10px] text-primary/35">Worldbuilding · {current.label}</p>
        </div>
      </div>

      {/* Editor */}
      <MarkdownEditor
        value={textos[activeSection]}
        onChange={v => onTextoChange(activeSection, v)}
        placeholder={SECTION_PLACEHOLDERS[activeSection]}
        rows={24}
        toolbar
        defaultMode="split"
      />

      {/* Pie: guardar */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <SaveIndicator status={status} />
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
        >
          <Globe size={11} /> Guardar {current.label}
        </button>
      </div>

    </div>
  );
}