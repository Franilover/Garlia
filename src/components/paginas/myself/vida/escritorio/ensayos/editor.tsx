"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Save, List } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CitePopup } from "./citePopup";
import { MarkdownEditor, WikiEntity } from "@/components/forms/MarkdownEditor";
import { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";

// ── TOC extractor ─────────────────────────────────────────────────────────────
function extractTOC(content: string): { level: number; text: string; id: string }[] {
  const lines = content.split("\n");
  const counter: Record<string, number> = {};
  const entries: { level: number; text: string; id: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const text  = m[2].trim();
    const base  = text.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
    counter[base] = (counter[base] || 0) + 1;
    const id = counter[base] > 1 ? `${base}-${counter[base]}` : base;
    entries.push({ level, text, id });
  }
  return entries;
}

interface EditorProps {
  ensayo: any;
  ensayos: any[];
  sources?: ZoteroSource[];
  editMode: boolean;
  onToggleEditMode: () => void;
  onUpdateField: (id: string, field: string, value: any) => void;
  onNavigateToPage: (name: string) => void;
  entities?: WikiEntity[];
  tocOpen?: boolean;
  onTocToggle?: () => void;
  onTocEntriesChange?: (entries: { level: number; text: string; id: string }[]) => void;
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
  tocOpen: tocOpenProp,
  onTocToggle,
  onTocEntriesChange,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [localTitulo, setLocalTitulo] = useState<string>(ensayo.titulo || "");
  const [localContenido, setLocalContenido] = useState<string>(ensayo.contenido || "");

  // Citation popup (@)
  const [tocOpenLocal, setTocOpenLocal] = useState(false);
  const tocOpen = tocOpenProp !== undefined ? tocOpenProp : tocOpenLocal;
  const setTocOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(tocOpen) : v;
    setTocOpenLocal(next);
    onTocToggle?.();
  };

  const tocEntries = useMemo(() => extractTOC(localContenido), [localContenido]);

  useEffect(() => {
    onTocEntriesChange?.(tocEntries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tocEntries]);

  const [citePopup, setCitePopup] = useState<{
    query: string;
    atStart: number;
    position: { top: number; left: number };
  } | null>(null);
  const [citeActiveIdx, setCiteActiveIdx] = useState(0);

  // Strip the old auto-generated tag-links section if it still exists in saved content
  const stripTagLinks = (c: string) => {
    const marker = "<!-- tag-links -->";
    const idx = c.indexOf(marker);
    if (idx === -1) return c;
    return c.slice(0, Math.max(0, c.lastIndexOf("\n\n", idx))).trimEnd();
  };

  useEffect(() => {
    setLocalTitulo(ensayo.titulo || "");
    const cleaned = stripTagLinks(ensayo.contenido || "");
    setLocalContenido(cleaned);
    if (cleaned !== (ensayo.contenido || "")) {
      onUpdateField(ensayo.id, "contenido", cleaned);
    }
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

  const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  // ── Backlinks: notas que mencionan esta página por [[título]] o por tag ──────
  const backlinks = useMemo(() => {
    const titulo = ensayo.titulo?.trim().toLowerCase();
    if (!titulo) return [];
    return ensayos.filter((e: any) => {
      if (e.id === ensayo.id) return false;
      // wikilink [[titulo]]
      const contenido = (e.contenido || "").toLowerCase();
      const wikilinkMatch = contenido.includes(`[[${titulo}]]`);
      // tag match
      const tagMatch = e.tags?.some((t: string) => t.toLowerCase() === titulo);
      return wikilinkMatch || tagMatch;
    });
  }, [ensayos, ensayo.id, ensayo.titulo]);

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
        <div className="shrink-0 px-8 pt-5 pb-2" style={{ background: "transparent" }}>
          <input
            type="text"
            value={localTitulo}
            onChange={e => {
              setLocalTitulo(e.target.value);
              onUpdateField(ensayo.id, "titulo", e.target.value);
            }}
            className="w-full bg-transparent outline-none border-none"
            style={{
              fontSize: "clamp(18px, 3vw, 26px)",
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
            className="flex items-center mt-1.5"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)", paddingBottom: 8 }}
          >
            {/* Stats — left */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", ...monoStyle }}>
                {wordCount} palabras · ~{readTime}min
              </span>
              {(ensayo.tags?.length > 0) && (
                <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", ...monoStyle }}>
                  {ensayo.tags.map((t: string) => `#${t}`).join(" ")}
                </span>
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

              {/* TOC button now lives in the top navbar */}

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
        <div className="flex-1 overflow-y-auto relative px-8 pb-8">
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
        {/* ── Backlinks bar ── */}
        <div
          className="shrink-0 px-8 py-2.5"
          style={{
            borderTop: "1px solid color-mix(in srgb, var(--foreground) 5%, transparent)",
            background: "color-mix(in srgb, var(--foreground) 1.5%, transparent)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{
            fontSize: 8,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
            flexShrink: 0,
          }}>
            menciones
          </span>
          <span style={{
            fontSize: 8,
            fontFamily: "var(--font-mono)",
            color: backlinks.length > 0
              ? "color-mix(in srgb, var(--accent) 60%, transparent)"
              : "color-mix(in srgb, var(--foreground) 12%, transparent)",
            background: backlinks.length > 0
              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
              : "color-mix(in srgb, var(--foreground) 5%, transparent)",
            padding: "1px 6px",
            borderRadius: 10,
            flexShrink: 0,
          }}>
            {backlinks.length}
          </span>

          {backlinks.length === 0 ? (
            <span style={{
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              color: "color-mix(in srgb, var(--foreground) 12%, transparent)",
              fontStyle: "italic",
            }}>
              ninguna nota menciona esta página aún
            </span>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {backlinks.map((b: any) => {
                const titulo = ensayo.titulo?.trim().toLowerCase() ?? "";
                const contenido = (b.contenido || "").toLowerCase();
                const viaWikilink = contenido.includes(`[[${titulo}]]`);
                const viaTag = b.tags?.some((t: string) => t.toLowerCase() === titulo);
                return (
                  <button
                    key={b.id}
                    onClick={() => onNavigateToPage(b.titulo)}
                    className="flex items-center gap-1.5"
                    style={{
                      background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
                      borderRadius: 4,
                      cursor: "pointer",
                      padding: "2px 8px 2px 6px",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 18%, transparent)";
                      (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 7%, transparent)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--foreground) 8%, transparent)";
                      (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--foreground) 4%, transparent)";
                    }}
                  >
                    <span style={{
                      fontSize: 7,
                      fontFamily: "var(--font-mono)",
                      color: "color-mix(in srgb, var(--foreground) 20%, transparent)",
                    }}>
                      {viaWikilink && viaTag ? "[[]]#" : viaWikilink ? "[[]]" : "#"}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      color: "color-mix(in srgb, var(--foreground) 55%, transparent)",
                    }}>
                      {b.titulo || "sin título"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </MotionDiv>

      {/* ── TOC panel lateral ── */}
      <AnimatePresence>
        {tocOpen && tocEntries.length > 0 && (
          <motion.div
            key="toc-panel"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 200,
              background: "color-mix(in srgb, var(--bg-menu) 97%, transparent)",
              borderLeft: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)",
              backdropFilter: "blur(12px)",
              zIndex: 30,
              overflowY: "auto",
              padding: "14px 12px",
              scrollbarWidth: "none",
            }}
          >
            <div style={{
              fontSize: 8,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--foreground) 22%, transparent)",
              marginBottom: 10,
            }}>
              índice
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {tocEntries.map((entry, i) => (
                <a
                  key={i}
                  href={`#${entry.id}`}
                  onClick={() => setTocOpen(false)}
                  style={{
                    display: "block",
                    paddingLeft: `${(entry.level - 1) * 10}px`,
                    paddingTop: 4,
                    paddingBottom: 4,
                    paddingRight: 4,
                    fontSize: entry.level === 1 ? 11 : entry.level === 2 ? 10 : 9,
                    fontFamily: entry.level === 1 ? "var(--font-serif)" : "var(--font-mono)",
                    fontStyle: entry.level === 1 ? "italic" : "normal",
                    fontWeight: entry.level <= 2 ? 600 : 400,
                    color: entry.level === 1
                      ? "color-mix(in srgb, var(--color-primary,#7c6af7) 80%, white)"
                      : entry.level === 2
                      ? "color-mix(in srgb, var(--foreground) 55%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 35%, transparent)",
                    textDecoration: "none",
                    borderRadius: 3,
                    transition: "all 0.1s",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--color-primary,#7c6af7) 8%, transparent)";
                    (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--color-primary,#7c6af7) 90%, white)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = entry.level === 1
                      ? "color-mix(in srgb, var(--color-primary,#7c6af7) 80%, white)"
                      : entry.level === 2
                      ? "color-mix(in srgb, var(--foreground) 55%, transparent)"
                      : "color-mix(in srgb, var(--foreground) 35%, transparent)";
                  }}
                >
                  {entry.text}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Editor;