"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Save, Network, X, FileText } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
  onSelectEnsayo: (id: string) => void;
  onNavigateToPage: (name: string) => void;
  entities?: WikiEntity[];
}

// ─── Panel de ensayos relacionados por tag ────────────────────────────────────

function RelacionadosPanel({
  ensayo,
  ensayos,
  onSelectEnsayo,
  onClose,
  anchorRef,
}: {
  ensayo: any;
  ensayos: any[];
  onSelectEnsayo: (id: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}) {
  const tags: string[] = ensayo.tags ?? [];

  // Agrupar otros ensayos por cuántos tags comparten, de más a menos
  const relacionados = ensayos
    .filter(e => e.id !== ensayo.id)
    .map(e => {
      const comunes = (e.tags ?? []).filter((t: string) => tags.includes(t)) as string[];
      return { ...e, comunes };
    })
    .filter(e => e.comunes.length > 0)
    .sort((a, b) => b.comunes.length - a.comunes.length);

  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        zIndex: 200,
        width: 280,
        background: "var(--bg-menu, var(--bg-main))",
        border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
        borderRadius: 10,
        boxShadow: "0 12px 40px color-mix(in srgb, var(--foreground) 12%, transparent)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
          background: "color-mix(in srgb, var(--foreground) 2%, transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Network size={10} style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "color-mix(in srgb, var(--foreground) 30%, transparent)", ...monoStyle }}>
            relacionados por tag
          </span>
          {relacionados.length > 0 && (
            <span style={{ fontSize: 9, padding: "0 5px", borderRadius: 3, background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "color-mix(in srgb, var(--foreground) 35%, transparent)", ...monoStyle }}>
              {relacionados.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", display: "flex" }}
        >
          <X size={11} />
        </button>
      </div>

      {/* Tags activos del ensayo */}
      <div style={{ padding: "6px 12px", borderBottom: "1px solid color-mix(in srgb, var(--foreground) 5%, transparent)", display: "flex", flexWrap: "wrap", gap: 4 }}>
        {tags.map(tag => (
          <span
            key={tag}
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 3,
              border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
              background: "color-mix(in srgb, var(--accent) 6%, transparent)",
              color: "color-mix(in srgb, var(--accent) 70%, transparent)",
              ...monoStyle,
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Lista */}
      <div style={{ maxHeight: 320, overflowY: "auto", scrollbarWidth: "none" }}>
        {relacionados.length === 0 ? (
          <div style={{ padding: "24px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", fontStyle: "italic", ...monoStyle }}>
              ningún otro ensayo comparte estos tags
            </p>
          </div>
        ) : (
          relacionados.map(e => (
            <button
              key={e.id}
              onClick={() => { onSelectEnsayo(e.id); onClose(); }}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                padding: "9px 12px",
                background: "none",
                border: "none",
                borderBottom: "1px solid color-mix(in srgb, var(--foreground) 4%, transparent)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={el => (el.currentTarget.style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)")}
              onMouseLeave={el => (el.currentTarget.style.background = "none")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                <FileText size={10} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)", flexShrink: 0 }} />
                <span style={{
                  fontSize: 12,
                  fontFamily: "var(--font-serif, serif)",
                  fontStyle: "italic",
                  color: "color-mix(in srgb, var(--foreground) 70%, transparent)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {e.titulo || "Sin título"}
                </span>
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 18%, transparent)", flexShrink: 0, ...monoStyle }}>
                  {new Date(e.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </span>
              </div>
              {/* Tags compartidos */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, paddingLeft: 16 }}>
                {e.comunes.map((tag: string) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 8,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
                      color: "color-mix(in srgb, var(--foreground) 35%, transparent)",
                      ...monoStyle,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
                {/* Tags propios no compartidos, más tenues */}
                {(e.tags ?? []).filter((t: string) => !tags.includes(t)).map((tag: string) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 8,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: "transparent",
                      color: "color-mix(in srgb, var(--foreground) 18%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                      ...monoStyle,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ─── Editor principal ─────────────────────────────────────────────────────────

export function Editor({
  ensayo,
  ensayos,
  sources = [],
  editMode,
  onToggleEditMode,
  onUpdateField,
  onSelectEnsayo,
  onNavigateToPage,
  entities = [] as WikiEntity[],
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const relacionadosBtnRef = useRef<HTMLButtonElement>(null);

  const [localTitulo, setLocalTitulo] = useState<string>(ensayo.titulo || "");
  const [localContenido, setLocalContenido] = useState<string>(ensayo.contenido || "");
  const [tagInput, setTagInput] = useState<string>(ensayo.tags?.join(", ") || "");
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [relacionadosOpen, setRelacionadosOpen] = useState(false);

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
    setRelacionadosOpen(false);
  }, [ensayo.id]);

  // Cerrar panel relacionados al hacer click fuera
  useEffect(() => {
    if (!relacionadosOpen) return;
    const handler = (e: MouseEvent) => {
      const panel = document.getElementById("relacionados-panel");
      const btn = relacionadosBtnRef.current;
      if (panel && !panel.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setRelacionadosOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [relacionadosOpen]);

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

  // Cuántos ensayos relacionados hay (para badge)
  const nRelacionados = ensayos.filter(e =>
    e.id !== ensayo.id &&
    (e.tags ?? []).some((t: string) => parsedTags.includes(t))
  ).length;

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

            {/* Stats + relacionados + save — right */}
            <div className="flex items-center gap-4 shrink-0" style={{ position: "relative" }}>
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

              {/* ── Botón relacionados ── */}
              {parsedTags.length > 0 && (
                <button
                  ref={relacionadosBtnRef}
                  onClick={() => setRelacionadosOpen(v => !v)}
                  title="Ensayos con tags en común"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 9,
                    padding: "3px 8px",
                    borderRadius: 5,
                    border: "1px solid",
                    borderColor: relacionadosOpen
                      ? "color-mix(in srgb, var(--foreground) 20%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 10%, transparent)",
                    background: relacionadosOpen
                      ? "color-mix(in srgb, var(--foreground) 6%, transparent)"
                      : "transparent",
                    color: relacionadosOpen
                      ? "color-mix(in srgb, var(--foreground) 55%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    ...monoStyle,
                  }}
                  onMouseEnter={e => {
                    if (!relacionadosOpen) {
                      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 20%, transparent)";
                      (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 50%, transparent)";
                      (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!relacionadosOpen) {
                      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 10%, transparent)";
                      (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--foreground) 25%, transparent)";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  <Network size={9} />
                  relacionados
                  {nRelacionados > 0 && (
                    <span style={{
                      fontSize: 8,
                      padding: "0 4px",
                      borderRadius: 3,
                      background: "color-mix(in srgb, var(--foreground) 10%, transparent)",
                      color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
                    }}>
                      {nRelacionados}
                    </span>
                  )}
                </button>
              )}

              <div className="flex items-center gap-1.5">
                <Save size={9} style={{ color: "color-mix(in srgb, var(--foreground) 15%, transparent)" }} />
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", ...monoStyle }}>
                  {new Date(ensayo.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Panel flotante */}
              <AnimatePresence>
                {relacionadosOpen && (
                  <div id="relacionados-panel">
                    <RelacionadosPanel
                      ensayo={{ ...ensayo, tags: parsedTags }}
                      ensayos={ensayos}
                      onSelectEnsayo={onSelectEnsayo}
                      onClose={() => setRelacionadosOpen(false)}
                      anchorRef={relacionadosBtnRef}
                    />
                  </div>
                )}
              </AnimatePresence>
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