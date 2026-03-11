"use client";
import React, { useRef, useState, useEffect } from "react";
import { Save, Eye, Edit3, Tag, Bold, Italic, Quote, List, Heading2, Code } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface EditorProps {
  ensayo: any;
  editMode: boolean;
  onToggleEditMode: () => void;
  onUpdateField: (id: string, field: string, value: any) => void;
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

export function Editor({ ensayo, editMode, onToggleEditMode, onUpdateField }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wordCount = ensayo.contenido?.split(/\s+/).filter(Boolean).length || 0;
  const charCount = ensayo.contenido?.length || 0;

  // tagInput: string local que refleja exactamente lo que el usuario escribe,
  // incluyendo comas y espacios al final, para no perder el contexto de escritura.
  const [tagInput, setTagInput] = useState<string>(ensayo.tags?.join(", ") || "");

  // Sync desde afuera solo si el ensayo cambia (e.g. usuario selecciona otra nota)
  useEffect(() => {
    setTagInput(ensayo.tags?.join(", ") || "");
  }, [ensayo.id]);

  const applyFormat = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    let newText: string;
    let newCursorStart: number;
    let newCursorEnd: number;

    if (action.block) {
      // Insert at beginning of line
      const lineStart = before.lastIndexOf("\n") + 1;
      const beforeLine = textarea.value.substring(0, lineStart);
      const currentLine = textarea.value.substring(lineStart, end);
      newText = beforeLine + action.prefix + currentLine + after;
      newCursorStart = lineStart + action.prefix.length;
      newCursorEnd = newCursorStart + currentLine.length;
    } else {
      const insertion = `${action.prefix}${selected || "texto"}${action.suffix}`;
      newText = before + insertion + after;
      const offset = selected ? 0 : action.prefix.length;
      newCursorStart = start + action.prefix.length;
      newCursorEnd = selected ? start + insertion.length - action.suffix.length : start + insertion.length - action.suffix.length;
    }

    onUpdateField(ensayo.id, "contenido", newText);

    // Restore focus and selection
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    });
  };

  return (
    <motion.div
      key={ensayo.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-0 min-h-[80vh]"
    >
      {/* Tags bar */}
      <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 mb-3"
        style={{
          background: "color-mix(in srgb, var(--white-custom) 50%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <Tag size={11} className="shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }} />
        <input
          type="text"
          value={tagInput}
          onChange={(e) => {
            const raw = e.target.value;
            setTagInput(raw);
            // Solo persistir tags completos (no guardar el string vacío al final de "tag1, ")
            const parsed = raw
              .split(",")
              .map((t: string) => t.trim().toLowerCase())
              .filter((t: string) => t !== "");
            onUpdateField(ensayo.id, "tags", parsed);
          }}
          className="font-mono text-[10px] tracking-widest bg-transparent outline-none border-none w-full uppercase"
          style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
          placeholder="ETIQUETAS, SEPARADAS, POR, COMA"
        />
        <button
          onClick={onToggleEditMode}
          className="py-1.5 px-3 md:px-4 text-[10px] flex items-center gap-1.5 transition-all shrink-0"
          style={{
            background: "var(--primary)",
            color: "var(--btn-text)",
            borderRadius: "var(--radius-btn)",
          }}
          title={editMode ? "Vista previa (Ctrl+E)" : "Editar (Ctrl+E)"}
        >
          {editMode ? <><Eye size={11} /><span className="hidden sm:inline">Vista</span></> : <><Edit3 size={11} /><span className="hidden sm:inline">Editar</span></>}
        </button>
      </div>

      {/* Markdown toolbar — only in edit mode */}
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
              style={{
                color: "color-mix(in srgb, var(--primary) 50%, transparent)",
              }}
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
        </motion.div>
      )}

      {/* Main editor card */}
      <div className="flex flex-col gap-0 flex-1 p-5 md:p-8"
        style={{
          background: "var(--white-custom)",
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Title */}
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

        {/* Content */}
        <div className="flex-1">
          {editMode ? (
            <textarea
              ref={textareaRef}
              value={ensayo.contenido}
              onChange={(e) => onUpdateField(ensayo.id, "contenido", e.target.value)}
              className="w-full min-h-[50vh] md:min-h-125 bg-transparent outline-none border-none resize-none text-[15px] md:text-[16px] leading-[1.9] font-light scrollbar-thin"
              style={{
                color: "color-mix(in srgb, var(--foreground) 75%, transparent)",
              }}
              placeholder={"Escribe en Markdown...\n\n## Subtítulos con ##\n**negrita**, *cursiva*\n> citas con >"}
            />
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

        {/* Footer */}
        <div className="flex items-center gap-3 md:gap-4 pt-4 mt-4 flex-wrap"
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
            {new Date(ensayo.updated_at).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Editor;