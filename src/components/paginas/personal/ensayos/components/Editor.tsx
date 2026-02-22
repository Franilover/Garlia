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
      {/* Tags bar — pill at the top */}
      <div className="flex items-center gap-2 bg-white/50 border border-[#4a3d50]/20
                      rounded-2xl px-4 py-2.5 mb-3">
        <Tag size={11} className="text-[#4a3d50]/60 shrink-0" />
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
          className="font-mono text-[10px] tracking-widest text-[#4a3d50]/60
                     bg-transparent outline-none border-none w-full uppercase
                     placeholder:text-[#4a3d50]/25"
          placeholder="ETIQUETAS, SEPARADAS, POR, COMA"
        />
        <button
          onClick={onToggleEditMode}
          className="bg-[#4a3d50] text-white py-1.5 px-4 text-[10px] rounded-xl gap-2 flex items-center transition-all hover:bg-[#3a3040] shrink-0"
          title={editMode ? "Vista previa (Ctrl+E)" : "Editar (Ctrl+E)"}
        >
          {editMode ? <><Eye size={11} /> Vista</> : <><Edit3 size={11} /> Editar</>}
        </button>
      </div>

      {/* Main editor card */}
      <div className="flex flex-col gap-0 flex-1 p-8 rounded-3xl
                      bg-white border border-[#4a3d50]/10 shadow-sm">

        {/* Title */}
        <input
          type="text"
          value={ensayo.titulo}
          onChange={(e) => onUpdateField(ensayo.id, "titulo", e.target.value)}
          className="w-full bg-transparent outline-none border-none
                     text-4xl md:text-5xl font-serif italic text-[#4a3d50]
                     placeholder:text-[#4a3d50]/20 leading-tight mb-6"
          placeholder="Título del ensayo..."
        />

        <div className="h-px bg-[#4a3d50]/10 mb-6" />

        {/* Content */}
        <div className="flex-1">
          {editMode ? (
            <textarea
              value={ensayo.contenido}
              onChange={(e) => onUpdateField(ensayo.id, "contenido", e.target.value)}
              className="w-full min-h-125 bg-transparent outline-none border-none resize-none
                         text-[16px] leading-[1.9] font-light text-[#4a3d50]/75
                         placeholder:text-[#4a3d50]/20
                         scrollbar-thin scrollbar-thumb-[#4a3d50]/20"
              placeholder={"Escribe en Markdown...\n\n## Subtítulos con ##\n**negrita**, *cursiva*\n> citas con >"}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="prose prose-stone max-w-none min-h-125
                         prose-headings:text-[#4a3d50] prose-p:text-[#4a3d50]/80 
                         prose-blockquote:border-[#4a3d50]/20 prose-blockquote:text-[#4a3d50]/60"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {ensayo.contenido || "*Empieza a escribir en el modo edición...*"}
              </ReactMarkdown>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 pt-4 mt-4 border-t border-[#4a3d50]/10">
          <span className="font-mono text-[9px] text-[#4a3d50]/30 uppercase tracking-widest">
            {wordCount} palabras
          </span>
          <span className="font-mono text-[9px] text-[#4a3d50]/30 uppercase tracking-widest">
            {charCount} chars
          </span>
          <div className="ml-auto flex items-center gap-1.5 font-mono text-[9px]
                          text-[#4a3d50]/30 uppercase tracking-widest">
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