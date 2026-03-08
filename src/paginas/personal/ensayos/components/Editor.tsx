"use client";
import React from "react";
import { Save, Eye, Edit3, Tag } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface EditorProps {
  ensayo: any;
  editMode: boolean;
  onToggleEditMode: () => void;
  onUpdateField: (id: string, field: string, value: any) => void;
}

export function Editor({ ensayo, editMode, onToggleEditMode, onUpdateField }: EditorProps) {
  const wordCount = ensayo.contenido?.split(/\s+/).filter(Boolean).length || 0;
  const charCount = ensayo.contenido?.length || 0;

  return (
    <motion.div
      key={ensayo.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-0 min-h-[80vh]"
    >
      {/* Tags bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 mb-3"
        style={{
          background: "color-mix(in srgb, var(--white-custom) 50%, transparent)",
          border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <Tag size={11} className="shrink-0" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }} />
        <input
          type="text"
          value={ensayo.tags?.join(", ") || ""}
          onChange={(e) => {
            const newTags = e.target.value
              .split(",")
              .map((t: string) => t.trim().toLowerCase())
              .filter((t: string) => t !== "");
            onUpdateField(ensayo.id, "tags", newTags);
          }}
          className="font-mono text-[10px] tracking-widest bg-transparent outline-none border-none w-full uppercase"
          style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
          placeholder="ETIQUETAS, SEPARADAS, POR, COMA"
        />
        <button
          onClick={onToggleEditMode}
          className="py-1.5 px-4 text-[10px] flex items-center gap-2 transition-all shrink-0"
          style={{
            background: "var(--primary)",
            color: "var(--btn-text)",
            borderRadius: "var(--radius-btn)",
          }}
          title={editMode ? "Vista previa (Ctrl+E)" : "Editar (Ctrl+E)"}
        >
          {editMode ? <><Eye size={11} /> Vista</> : <><Edit3 size={11} /> Editar</>}
        </button>
      </div>

      {/* Main editor card */}
      <div className="flex flex-col gap-0 flex-1 p-8"
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
          className="w-full bg-transparent outline-none border-none text-4xl md:text-5xl font-serif italic leading-tight mb-6"
          style={{ color: "var(--primary)" }}
          placeholder="Título del ensayo..."
        />

        <div className="h-px mb-6" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />

        {/* Content */}
        <div className="flex-1">
          {editMode ? (
            <textarea
              value={ensayo.contenido}
              onChange={(e) => onUpdateField(ensayo.id, "contenido", e.target.value)}
              className="w-full min-h-125 bg-transparent outline-none border-none resize-none text-[16px] leading-[1.9] font-light scrollbar-thin"
              style={{
                color: "color-mix(in srgb, var(--foreground) 75%, transparent)",
              }}
              placeholder={"Escribe en Markdown...\n\n## Subtítulos con ##\n**negrita**, *cursiva*\n> citas con >"}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="prose max-w-none min-h-125"
              style={{ color: "var(--foreground)" } as React.CSSProperties}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {ensayo.contenido || "*Empieza a escribir en el modo edición...*"}
              </ReactMarkdown>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 pt-4 mt-4"
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