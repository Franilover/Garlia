"use client";

import React, { useState } from "react";
import { Globe } from "lucide-react";
import { MUNDO_SECTIONS, type MundoSectionKey } from "./types";

// Placeholder content por sección — reemplazá con tu lógica real
const SECTION_PLACEHOLDERS: Record<MundoSectionKey, string> = {
  magia:     "Sistema de magia, reglas, fuentes de poder, limitaciones…",
  geografia: "Continentes, mares, climas, fronteras del mundo…",
  historia:  "Grandes eras, eventos fundacionales, cronología del mundo…",
};

export function EditorMundo() {
  const [activeSection, setActiveSection] = useState<MundoSectionKey>("magia");
  const [textos, setTextos] = useState<Record<MundoSectionKey, string>>({
    magia: "", geografia: "", historia: "",
  });

  const current = MUNDO_SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Sub-nav lateral */}
      <div className="w-36 shrink-0 border-r border-primary/10 flex flex-col pt-4 gap-0.5 px-2">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 px-2 mb-2">Secciones</p>
        {MUNDO_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-bold ${
              activeSection === s.key
                ? "bg-primary/15 text-primary border border-primary/20"
                : "text-primary/40 hover:text-primary/70 hover:bg-primary/5 border border-transparent"
            }`}
          >
            <span className="text-sm">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Editor de la sección activa */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{current.emoji}</span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">{current.label}</h2>
            <p className="text-[10px] text-primary/35">Worldbuilding · {current.label}</p>
          </div>
        </div>

        <textarea
          value={textos[activeSection]}
          onChange={e => setTextos(t => ({ ...t, [activeSection]: e.target.value }))}
          placeholder={SECTION_PLACEHOLDERS[activeSection]}
          className="flex-1 min-h-[400px] w-full bg-input-bg text-input-text border border-primary/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/40 placeholder:text-primary/20 resize-none transition-colors"
        />

        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
            <Globe size={11} /> Guardar {current.label}
          </button>
        </div>
      </div>
    </div>
  );
}
