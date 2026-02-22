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
      className="card-main flex flex-col gap-0 min-h-[80vh]"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag size={12} className="text-primary/30 shrink-0" />
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
            className="font-mono text-[10px] tracking-widest text-primary/40 
                       bg-transparent outline-none border-none w-full uppercase
                       placeholder:text-primary/20"
            placeholder="ETIQUETAS, SEPARADAS, POR, COMA"
          />
        </div>

        <button
          onClick={onToggleEditMode}
          className="btn-brand py-2 px-4 text-[11px] rounded-xl gap-1.5"
          title={editMode ? "Vista previa (Ctrl+E)" : "Editar (Ctrl+E)"}
        >
          {editMode ? <><Eye size={13} /> Vista</> : <><Edit3 size={13} /> Editar</>}
        </button>
      </div>

      {/* Title */}
      <input
        type="text"
        value={ensayo.titulo}
        onChange={(e) => onUpdateField(ensayo.id, "titulo", e.target.value)}
        className="w-full bg-transparent outline-none border-none
                   text-4xl md:text-5xl font-serif italic text-primary
                   placeholder:text-primary/20 leading-tight"
        placeholder="Título del ensayo..."
      />

      <div className="h-px bg-primary/10 my-6" />

      {/* Content area */}
      <div className="flex-1">
        {editMode ? (
          <textarea
            value={ensayo.contenido}
            onChange={(e) => onUpdateField(ensayo.id, "contenido", e.target.value)}
            className="w-full min-h-[500px] bg-transparent outline-none border-none resize-none
                       text-[16px] leading-[1.9] font-light text-primary/80
                       placeholder:text-primary/20
                       scrollbar-thin scrollbar-thumb-primary/20"
            placeholder="Escribe en Markdown...&#10;&#10;## Subtítulos con ##&#10;**negrita**, *cursiva*&#10;> citas con >"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="prose-fran min-h-[500px]"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {ensayo.contenido || "*Empieza a escribir en el modo edición...*"}
            </ReactMarkdown>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 pt-5 mt-5 border-t border-primary/10">
        <span className="font-mono text-[9px] text-primary/30 uppercase tracking-widest">
          {wordCount} palabras
        </span>
        <span className="font-mono text-[9px] text-primary/30 uppercase tracking-widest">
          {charCount} chars
        </span>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[9px]
                        text-primary/30 uppercase tracking-widest">
          <Save size={10} />
          {new Date(ensayo.updated_at).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default Editor;