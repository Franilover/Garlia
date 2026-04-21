"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Save, Tag } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { TagPanel } from "./tagPanel";
import { CitePopup } from "./citePopup";
import { MarkdownEditor } from "@/components/paginas/myself/jardin/editorEntidades/MarkdownEditor";
import { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";

interface EditorProps {
  ensayo: any;
  ensayos: any[];
  sources?: ZoteroSource[];
  editMode: boolean;
  onToggleEditMode: () => void;
  onUpdateField: (id: string, field: string, value: any) => void;
  onSelectEnsayo: (id: string) => void;
}

export function Editor({
  ensayo,
  ensayos,
  sources = [],
  editMode,
  onToggleEditMode,
  onUpdateField,
  onSelectEnsayo,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [localTitulo,    setLocalTitulo]    = useState<string>(ensayo.titulo    || "");
  const [localContenido, setLocalContenido] = useState<string>(ensayo.contenido || "");
  const [tagInput,       setTagInput]       = useState<string>(ensayo.tags?.join(", ") || "");
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [tagPanelActivo, setTagPanelActivo] = useState<string | null>(null);

  const [citePopup, setCitePopup] = useState<{
    query: string;
    atStart: number;
    position: { top: number; left: number };
  } | null>(null);
  const [citeActiveIdx, setCiteActiveIdx] = useState(0);

  useEffect(() => {
    setLocalTitulo(ensayo.titulo    || "");
    setLocalContenido(ensayo.contenido || "");
    setTagInput(ensayo.tags?.join(", ") || "");
  }, [ensayo.id]);

  const wordCount = localContenido.split(/\s+/).filter(Boolean).length || 0;
  const charCount = localContenido.length || 0;

  // ── Detección de @citekey sin necesitar el ref del textarea ─────────────────
  const handleContenidoChange = useCallback((value: string) => {
    setLocalContenido(value);
    onUpdateField(ensayo.id, "contenido", value);

    if (!sources.length) return;

    // Estimamos posición del popup a partir del contenedor
    const match = value.match(/@([\w\-.]*)$/);
    if (match) {
      const rect = containerRef.current?.getBoundingClientRect();
      const top  = rect ? Math.min(rect.top + rect.height * 0.5, window.innerHeight - 320) : 200;
      const left = rect ? rect.left + 32 : 32;
      setCitePopup({ query: match[1], atStart: value.length - match[0].length, position: { top, left } });
      setCiteActiveIdx(0);
    } else {
      setCitePopup(null);
    }
  }, [ensayo.id, onUpdateField, sources]);

  const insertCite = useCallback((src: ZoteroSource) => {
    if (!citePopup) return;
    const cite = src.citekey
      ? `[@${src.citekey}]`
      : `[@${src.author.split(",")[0].trim().toLowerCase()}${src.year}]`;

    const before   = localContenido.substring(0, citePopup.atStart);
    const after    = localContenido.substring(citePopup.atStart + citePopup.query.length + 1); // +1 for @
    const newValue = before + cite + after;

    setLocalContenido(newValue);
    onUpdateField(ensayo.id, "contenido", newValue);
    setCitePopup(null);
  }, [citePopup, ensayo.id, localContenido, onUpdateField]);

  const parsedTags: string[] = tagInput
    .split(",")
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  return (
    <div className="relative" ref={containerRef}>
      <MotionDiv
        key={ensayo.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-0 min-h-[80vh]"
      >
        {/* ── Barra de tags ── */}
        <div
          className="flex items-center gap-2 px-3 md:px-4 py-2.5 mb-3"
          style={{
            background: "color-mix(in srgb, var(--white-custom) 50%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <Tag size={11} className="shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }} />

          {!tagInputFocused && parsedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {parsedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagPanelActivo(tag)}
                  className="font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    color: "var(--accent)",
                    borderRadius: "var(--radius-btn)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 20%, transparent)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
                >
                  #{tag}
                </button>
              ))}
              <button
                onClick={() => setTagInputFocused(true)}
                className="font-mono text-[9px] uppercase tracking-wide px-2 py-0.5 transition-all"
                style={{
                  color: "color-mix(in srgb, var(--primary) 25%, transparent)",
                  border: "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
                  borderRadius: "var(--radius-btn)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)";
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 25%, transparent)";
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 15%, transparent)";
                }}
              >
                + editar
              </button>
            </div>
          ) : (
            <input
              type="text"
              value={tagInput}
              autoFocus={tagInputFocused}
              onChange={e => {
                const raw = e.target.value;
                setTagInput(raw);
                const parsed = raw.split(",").map((t: string) => t.trim().toLowerCase()).filter((t: string) => t !== "");
                onUpdateField(ensayo.id, "tags", parsed);
              }}
              onFocus={() => setTagInputFocused(true)}
              onBlur={() => setTagInputFocused(false)}
              className="font-mono text-[10px] tracking-widest bg-transparent outline-none border-none flex-1 uppercase"
              style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
              placeholder="ETIQUETAS, SEPARADAS, POR, COMA"
            />
          )}

          {/* Toggle edit/preview */}
          <button
            onClick={onToggleEditMode}
            className="py-1.5 px-3 md:px-4 text-[10px] font-mono uppercase tracking-wide flex items-center gap-1.5 transition-all shrink-0"
            style={{ background: "var(--primary)", color: "var(--btn-text)", borderRadius: "var(--radius-btn)" }}
            title={editMode ? "Vista previa (Ctrl+E)" : "Editar (Ctrl+E)"}
          >
            {editMode ? "Vista" : "Editar"}
          </button>
        </div>

        {/* ── Card principal ── */}
        <div
          className="flex flex-col gap-0 flex-1 p-5 md:p-8"
          style={{
            background: "var(--white-custom)",
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Título */}
          <input
            type="text"
            value={localTitulo}
            onChange={e => {
              setLocalTitulo(e.target.value);
              onUpdateField(ensayo.id, "titulo", e.target.value);
            }}
            className="w-full bg-transparent outline-none border-none text-3xl md:text-4xl lg:text-5xl font-serif italic leading-tight mb-5 md:mb-6"
            style={{ color: "var(--primary)" }}
            placeholder="Título del ensayo..."
          />
          <div className="h-px mb-5 md:mb-6"
            style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
          />

          {/* ── MarkdownEditor ── */}
          <div className="flex-1 relative">
            <MarkdownEditor
              value={localContenido}
              onChange={handleContenidoChange}
              placeholder="Empieza a escribir..."
              rows={28}
              toolbar
              defaultMode={editMode ? "edit" : "preview"}
            />

            {/* CitePopup de Zotero */}
            <AnimatePresence>
              {citePopup && sources.length > 0 && (
                <div style={{ position: "fixed", top: citePopup.position.top + 25, left: citePopup.position.left, zIndex: 9999 }}>
                  <CitePopup
                    sources={sources}
                    query={citePopup.query}
                    position={{ top: 0, left: 0 }}
                    onSelect={insertCite}
                    onClose={() => setCitePopup(null)}
                    activeIndex={citeActiveIdx}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Footer stats ── */}
          <div
            className="flex items-center gap-3 md:gap-4 pt-4 mt-4 flex-wrap"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
          >
            <span className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              {wordCount} palabras
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              {charCount} chars
            </span>
            {sources.length > 0 && (
              <span className="font-mono text-[9px] uppercase tracking-widest"
                style={{ color: "var(--accent)", opacity: 0.6 }}
                title="Escribe @ para citar una fuente de Zotero">
                @ {sources.length} fuentes · escribe @ para citar
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              <Save size={10} />
              {new Date(ensayo.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* TagPanel lateral */}
      <TagPanel
        tag={tagPanelActivo}
        ensayos={ensayos}
        onClose={() => setTagPanelActivo(null)}
        onSelectEnsayo={onSelectEnsayo}
        onTagClick={t => setTagPanelActivo(t)}
      />
    </div>
  );
}

export default Editor;