"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Save, Eye, Edit3, Tag, Bold, Italic, Quote, List, Heading2, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TagPanel } from "./tagPanel";
import { CitePopup } from "./citePopup";
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

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: <Bold size={12} />, label: "Negrita", prefix: "**", suffix: "**" },
  { icon: <Italic size={12} />, label: "Cursiva", prefix: "*", suffix: "*" },
  { icon: <Heading2 size={12} />, label: "Subtítulo", prefix: "## ", suffix: "", block: true },
  { icon: <Quote size={12} />, label: "Cita", prefix: "> ", suffix: "", block: true },
  { icon: <List size={12} />, label: "Lista", prefix: "- ", suffix: "", block: true },
  { icon: <Code size={12} />, label: "Código", prefix: "`", suffix: "`" },
];

export function Editor({ ensayo, ensayos, sources = [], editMode, onToggleEditMode, onUpdateField, onSelectEnsayo }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const wordCount = ensayo.contenido?.split(/\s+/).filter(Boolean).length || 0;
  const charCount = ensayo.contenido?.length || 0;

  const [tagInput, setTagInput] = useState<string>(ensayo.tags?.join(", ") || "");
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [tagPanelActivo, setTagPanelActivo] = useState<string | null>(null);

  
  const [citePopup, setCitePopup] = useState<{
    query: string;
    atStart: number; 
    position: { top: number; left: number };
  } | null>(null);
  const [citeActiveIdx, setCiteActiveIdx] = useState(0);

  useEffect(() => {
    setTagInput(ensayo.tags?.join(", ") || "");
  }, [ensayo.id]);

  
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onUpdateField(ensayo.id, "contenido", value);

    if (!sources.length) return;

    const cursor = e.target.selectionStart;
    const textToCursor = value.substring(0, cursor);
    const match = textToCursor.match(/@([\w\-.]*)$/);

    if (match) {
      
      const textarea = textareaRef.current;
      if (!textarea) return;

      
      const linesBefore = textToCursor.split("\n");
      const lineHeight = 28; 
      const linesCount = linesBefore.length;
      const top = Math.min(linesCount * lineHeight + 8, textarea.offsetHeight - 200);
      const left = 0;

      setCitePopup({
        query: match[1],
        atStart: cursor - match[0].length,
        position: { top, left },
      });
      setCiteActiveIdx(0);
    } else {
      setCitePopup(null);
    }
  }, [ensayo.id, onUpdateField, sources]);

  
  const insertCite = useCallback((src: ZoteroSource) => {
    if (!citePopup) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cite = src.citekey
      ? `[@${src.citekey}]`
      : `[@${src.author.split(",")[0].trim().toLowerCase()}${src.year}]`;

    const before = ensayo.contenido.substring(0, citePopup.atStart);
    const after = ensayo.contenido.substring(textarea.selectionStart);
    const newContent = before + cite + after;

    onUpdateField(ensayo.id, "contenido", newContent);
    setCitePopup(null);

    
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = citePopup.atStart + cite.length;
      textarea.setSelectionRange(pos, pos);
    });
  }, [citePopup, ensayo.id, ensayo.contenido, onUpdateField]);

  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!citePopup || !sources.length) return;

    const filtered = sources
      .filter(s =>
        !citePopup.query ||
        s.citekey?.toLowerCase().includes(citePopup.query.toLowerCase()) ||
        s.title.toLowerCase().includes(citePopup.query.toLowerCase()) ||
        s.author.toLowerCase().includes(citePopup.query.toLowerCase())
      )
      .slice(0, 8);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCiteActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCiteActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[citeActiveIdx]) {
      e.preventDefault();
      insertCite(filtered[citeActiveIdx]);
    } else if (e.key === "Escape") {
      setCitePopup(null);
    }
  }, [citePopup, sources, citeActiveIdx, insertCite]);

  
  const applyFormat = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    let newText: string, newCursorStart: number, newCursorEnd: number;
    if (action.block) {
      const lineStart = before.lastIndexOf("\n") + 1;
      const beforeLine = textarea.value.substring(0, lineStart);
      const currentLine = textarea.value.substring(lineStart, end);
      newText = beforeLine + action.prefix + currentLine + after;
      newCursorStart = lineStart + action.prefix.length;
      newCursorEnd = newCursorStart + currentLine.length;
    } else {
      const insertion = `${action.prefix}${selected || "texto"}${action.suffix}`;
      newText = before + insertion + after;
      newCursorStart = start + action.prefix.length;
      newCursorEnd = start + insertion.length - action.suffix.length;
    }
    onUpdateField(ensayo.id, "contenido", newText);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    });
  };

  const parsedTags: string[] = ensayo.tags || [];

  return (
    <div className="relative" ref={containerRef}>
      <motion.div
        key={ensayo.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-0 min-h-[80vh]"
      >
        {}
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
            <div className="flex flex-wrap gap-1.5 flex-1">
              {parsedTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagPanelActivo(tag)}
                  className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    color: "var(--accent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                    borderRadius: "var(--radius-btn)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 20%, transparent)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 10%, transparent)";
                    (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--accent) 25%, transparent)";
                  }}
                >
                  #{tag}
                </button>
              ))}
              <button
                onClick={() => setTagInputFocused(true)}
                className="font-mono text-[9px] uppercase tracking-wide px-2 py-1 transition-all"
                style={{
                  background: "transparent",
                  color: "color-mix(in srgb, var(--primary) 25%, transparent)",
                  border: "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
                  borderRadius: "var(--radius-btn)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)";
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 30%, transparent)";
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
              onChange={(e) => {
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
          <button
            onClick={onToggleEditMode}
            className="py-1.5 px-3 md:px-4 text-[10px] flex items-center gap-1.5 transition-all shrink-0"
            style={{ background: "var(--primary)", color: "var(--btn-text)", borderRadius: "var(--radius-btn)" }}
            title={editMode ? "Vista previa (Ctrl+E)" : "Editar (Ctrl+E)"}
          >
            {editMode
              ? <><Eye size={11} /><span className="hidden sm:inline">Vista</span></>
              : <><Edit3 size={11} /><span className="hidden sm:inline">Editar</span></>
            }
          </button>
        </div>

        {}
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 px-2 py-1.5 mb-3 overflow-x-auto"
            style={{
              background: "color-mix(in srgb, var(--white-custom) 40%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
              borderRadius: "var(--radius-btn)",
              scrollbarWidth: "none",
            }}
          >
            {TOOLBAR_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => applyFormat(action)}
                title={action.label}
                className="w-7 h-7 flex items-center justify-center transition-all shrink-0 rounded"
                style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 50%, transparent)";
                }}
              >
                {action.icon}
              </button>
            ))}
            <div className="ml-2 h-4 w-px shrink-0"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
            />
            <span className="ml-2 font-mono text-[9px] uppercase tracking-widest shrink-0"
              style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
            >
              Markdown
            </span>
            {}
            {sources.length > 0 && (
              <>
                <div className="ml-2 h-4 w-px shrink-0"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
                />
                <span className="ml-2 font-mono text-[9px] uppercase tracking-widest shrink-0"
                  style={{ color: "var(--accent)", opacity: 0.7 }}
                  title={`${sources.length} fuentes de Zotero — escribe @ para citar`}
                >
                  @ {sources.length} fuentes
                </span>
              </>
            )}
          </motion.div>
        )}

        {}
        <div
          className="flex flex-col gap-0 flex-1 p-5 md:p-8"
          style={{
            background: "var(--white-custom)",
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <input
            type="text"
            value={ensayo.titulo}
            onChange={(e) => onUpdateField(ensayo.id, "titulo", e.target.value)}
            className="w-full bg-transparent outline-none border-none text-3xl md:text-4xl lg:text-5xl font-serif italic leading-tight mb-5 md:mb-6"
            style={{ color: "var(--primary)" }}
            placeholder="Título del ensayo..."
          />
          <div className="h-px mb-5 md:mb-6"
            style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
          />

          {}
          <div className="flex-1 relative">
            {editMode ? (
              <>
                <textarea
                  ref={textareaRef}
                  value={ensayo.contenido}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  className="w-full min-h-[50vh] md:min-h-125 bg-transparent outline-none border-none resize-none text-[15px] md:text-[16px] leading-[1.9] font-light scrollbar-thin"
                  style={{ color: "color-mix(in srgb, var(--foreground) 75%, transparent)" }}
                  placeholder={sources.length
                    ? "Escribe en Markdown... Usa @ para citar fuentes de Zotero"
                    : "Escribe en Markdown...\n\n## Subtítulos con ##\n**negrita**, *cursiva*\n> citas con >"
                  }
                />
                {}
                <AnimatePresence>
                  {citePopup && (
                    <CitePopup
                      sources={sources}
                      query={citePopup.query}
                      position={citePopup.position}
                      onSelect={insertCite}
                      onClose={() => setCitePopup(null)}
                      activeIndex={citeActiveIdx}
                    />
                  )}
                </AnimatePresence>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose max-w-none min-h-[50vh] md:min-h-125"
                style={{ color: "var(--foreground)" } as React.CSSProperties}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {ensayo.contenido || "*Empieza a escribir en el modo edición...*"}
                </ReactMarkdown>
              </motion.div>
            )}
          </div>

          <div
            className="flex items-center gap-3 md:gap-4 pt-4 mt-4 flex-wrap"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
          >
            <span className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              {wordCount} palabras
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              {charCount} chars
            </span>
            <div className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <Save size={10} />
              {new Date(ensayo.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      </motion.div>

      {}
      <TagPanel
        tag={tagPanelActivo}
        ensayos={ensayos}
        onClose={() => setTagPanelActivo(null)}
        onSelectEnsayo={onSelectEnsayo}
        onTagClick={(t) => setTagPanelActivo(t)}
      />
    </div>
  );
}

export default Editor;