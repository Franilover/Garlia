"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Save } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { CitePopup } from "./citePopup";
import { MarkdownEditor, WikiEntity } from "@/components/forms/MarkdownEditor";
import { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";

interface EditorProps {
  ensayo: any;
  ensayos: any[];
  sources?: ZoteroSource[];
  editMode: boolean;
  onToggleEditMode: () => void;
  onUpdateField: (id: string, field: string, value: any) => void;
  onNavigateToPage: (name: string) => void;
  entities?: WikiEntity[];
}

// ─── Editor principal ─────────────────────────────────────────────────────────

export function Editor({
  ensayo,
  ensayos,
  sources = [],
  editMode,
  onToggleEditMode,
  onUpdateField,
  onNavigateToPage,
  entities = [] as WikiEntity[],
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [localTitulo, setLocalTitulo] = useState<string>(ensayo.titulo || "");
  const [localContenido, setLocalContenido] = useState<string>(ensayo.contenido || "");
  const [tagInput, setTagInput] = useState<string>(ensayo.tags?.join(", ") || "");
  const [tagInputFocused, setTagInputFocused] = useState(false);

  // Citation popup (@)
  const [citePopup, setCitePopup] = useState<{
    query: string;
    atStart: number;
    position: { top: number; left: number };
  } | null>(null);
  const [citeActiveIdx, setCiteActiveIdx] = useState(0);

  useEffect(() => {
    setLocalTitulo(ensayo.titulo || "");
    setLocalContenido(ensayo.contenido || "");
    setTagInput(ensayo.tags?.join(", ") || "");
  }, [ensayo.id]);

  const wordCount = localContenido.split(/\s+/).filter(Boolean).length || 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const getPopupPosition = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const top = rect ? Math.min(rect.top + rect.height * 0.5, window.innerHeight - 320) : 200;
    const left = rect ? rect.left + 32 : 32;
    return { top, left };
  };

  const handleContenidoChange = useCallback((value: string) => {
    setLocalContenido(value);
    onUpdateField(ensayo.id, "contenido", value);

    if (!sources.length) return;
    const citeMatch = value.match(/@([\w\-.]*)$/);
    if (citeMatch) {
      setCitePopup({
        query: citeMatch[1],
        atStart: value.length - citeMatch[0].length,
        position: getPopupPosition(),
      });
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

    const before = localContenido.substring(0, citePopup.atStart);
    const after = localContenido.substring(citePopup.atStart + citePopup.query.length + 1);
    const newValue = before + cite + after;

    setLocalContenido(newValue);
    onUpdateField(ensayo.id, "contenido", newValue);
    setCitePopup(null);
  }, [citePopup, ensayo.id, localContenido, onUpdateField]);

  const parsedTags: string[] = tagInput
    .split(",")
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  return (
    <div className="relative h-full flex flex-col" ref={containerRef}>
      <MotionDiv
        key={ensayo.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* ── Title input ── */}
        <div className="shrink-0 px-8 pt-8 pb-4" style={{ background: "transparent" }}>
          <input
            type="text"
            value={localTitulo}
            onChange={e => {
              setLocalTitulo(e.target.value);
              onUpdateField(ensayo.id, "titulo", e.target.value);
            }}
            className="w-full bg-transparent outline-none border-none"
            style={{
              fontSize: "clamp(22px, 3vw, 36px)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "color-mix(in srgb, var(--foreground) 85%, transparent)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
            placeholder="título..."
          />

          {/* ── Meta row ── */}
          <div
            className="flex items-center mt-3"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)", paddingBottom: 16 }}
          >
            {/* Tags — left */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {!tagInputFocused && parsedTags.length > 0 ? (
                <>
                  {parsedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => onNavigateToPage(tag)}
                      title={`Ir a la página "${tag}"`}
                      style={{
                        fontSize: 9,
                        padding: "2px 7px",
                        borderRadius: 3,
                        border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
                        background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                        color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                        cursor: "pointer",
                        transition: "all 0.1s",
                        ...monoStyle,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--accent) 40%, transparent)";
                        (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--accent) 80%, transparent)";
                        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 8%, transparent)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 12%, transparent)";
                        (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 40%, transparent)";
                        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 5%, transparent)";
                      }}
                    >
                      #{tag}
                    </button>
                  ))}
                  <button
                    onClick={() => setTagInputFocused(true)}
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 3,
                      border: "1px dashed color-mix(in srgb, var(--foreground) 8%, transparent)",
                      background: "transparent",
                      color: "color-mix(in srgb, var(--foreground) 20%, transparent)",
                      cursor: "pointer",
                      ...monoStyle,
                    }}
                  >
                    +tag
                  </button>
                </>
              ) : (
                <input
                  type="text"
                  value={tagInput}
                  autoFocus={tagInputFocused}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const parsed = tagInput.split(",").map((t: string) => t.trim().toLowerCase()).filter((t: string) => t !== "");
                      onUpdateField(ensayo.id, "tags", parsed);
                      setTagInputFocused(false);
                    }
                    if (e.key === "Escape") setTagInputFocused(false);
                  }}
                  onFocus={() => setTagInputFocused(true)}
                  onBlur={() => {
                    const parsed = tagInput.split(",").map((t: string) => t.trim().toLowerCase()).filter((t: string) => t !== "");
                    onUpdateField(ensayo.id, "tags", parsed);
                    setTagInputFocused(false);
                  }}
                  placeholder="tag1, tag2, tag3"
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)",
                    background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
                    color: "color-mix(in srgb, var(--foreground) 60%, transparent)",
                    outline: "none",
                    width: 140,
                    ...monoStyle,
                  }}
                />
              )}
            </div>

            {/* Stats + GrafoEnsayos + save — right */}
            <div className="flex items-center gap-4 shrink-0">
              <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", ...monoStyle }}>
                {wordCount} palabras
              </span>
              <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 10%, transparent)", ...monoStyle }}>·</span>
              <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", ...monoStyle }}>
                ~{readTime}min lectura
              </span>
              {sources.length > 0 && (
                <>
                  <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 10%, transparent)", ...monoStyle }}>·</span>
                  <span
                    style={{ fontSize: 9, color: "color-mix(in srgb, var(--accent) 60%, transparent)", ...monoStyle }}
                    title="Escribe @ para citar · [[ para enlazar"
                  >
                    @ {sources.length} fuentes
                  </span>
                </>
              )}

              <div className="flex items-center gap-1.5">
                <Save size={9} style={{ color: "color-mix(in srgb, var(--foreground) 15%, transparent)" }} />
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", ...monoStyle }}>
                  {new Date(ensayo.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Editor content ── */}
        <div className="flex-1 min-h-0 relative overflow-auto px-8 pb-8">
          <MarkdownEditor
            value={localContenido}
            onChange={handleContenidoChange}
            placeholder="empieza a escribir... (usa @ para citar · [[ para enlazar notas)"
            rows={28}
            toolbar
            defaultMode={editMode ? "edit" : "preview"}
            entities={entities}
            onSnippetAction={(action) => {
              if (action.type === "wikilink") {
                onNavigateToPage(action.target);
              }
            }}
          />

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
      </MotionDiv>
    </div>
  );
}

export default Editor;