"use client";
import React from "react";
import {
  Hash, FileText, Plus, Trash2, UploadCloud,
  BookOpen, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ZoteroSource {
  title: string;
  author: string;
  year: string;
}

interface SidebarProps {
  ensayos: any[];
  ensayosFiltrados: any[];
  todosLosTags: string[];
  tagActivo: string | null;
  ensayoActivoId: string | null;
  searchTerm: string;
  sources: ZoteroSource[];
  onTagClick: (tag: string | null) => void;
  onEnsayoClick: (id: string) => void;
  onCrearEnsayo: () => void;
  onEliminarEnsayo: (id: string) => void;
  onSearchChange: (value: string) => void;
  onZoteroUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Sidebar({
  ensayosFiltrados,
  todosLosTags,
  tagActivo,
  ensayoActivoId,
  searchTerm,
  sources,
  onTagClick,
  onEnsayoClick,
  onCrearEnsayo,
  onEliminarEnsayo,
  onSearchChange,
  onZoteroUpload,
}: SidebarProps) {
  return (
    <aside className="h-full flex flex-col gap-7 overflow-y-auto px-5 py-7
                      border-r border-primary/10 bg-bg-main
                      scrollbar-thin scrollbar-thumb-primary/20">

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
        <input
          type="text"
          placeholder="Buscar notas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-brand pl-10 text-sm"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-3">
        <p className="sidebar-label"><Hash size={11} /> Etiquetas</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTagClick(null)}
            className={`tag-chip ${!tagActivo ? "tag-chip--on" : ""}`}
          >
            Todos
          </button>
          {todosLosTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag === tagActivo ? null : tag)}
              className={`tag-chip ${tagActivo === tag ? "tag-chip--accent" : ""}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="sidebar-label"><FileText size={11} /> Notas</p>
          <button onClick={onCrearEnsayo} className="btn-brand w-7 h-7 rounded-full p-0 shadow-none text-xs">
            <Plus size={13} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <AnimatePresence>
            {ensayosFiltrados.map((ens, i) => (
              <motion.div
                key={ens.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => onEnsayoClick(ens.id)}
                className={`group note-row ${ensayoActivoId === ens.id ? "note-row--active" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[12px] font-medium leading-snug truncate flex-1
                    ${ensayoActivoId === ens.id ? "text-accent" : "text-primary/80"}`}>
                    {ens.titulo || "Sin título"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400
                               text-primary/40 transition-all shrink-0 pt-0.5"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
                {ens.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ens.tags.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[9px] font-mono text-primary/30">#{t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bibliography */}
      <div className="flex flex-col gap-3 pt-5 border-t border-primary/10 mt-auto">
        <p className="sidebar-label"><BookOpen size={11} /> Bibliografía</p>

        <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed
                          border-primary/20 cursor-pointer hover:border-accent transition-colors
                          text-primary/40 hover:text-accent text-[10px] font-mono">
          <UploadCloud size={15} />
          Sync Zotero JSON
          <input type="file" className="hidden" onChange={onZoteroUpload} accept=".json" />
        </label>

        {sources.length > 0 && (
          <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1
                          scrollbar-thin scrollbar-thumb-primary/20">
            {sources.map((src, i) => (
              <div key={i} className="text-[10px] border-b border-primary/5 pb-2">
                <p className="font-medium text-primary/80 leading-snug">{src.title}</p>
                <p className="font-mono text-primary/30 mt-0.5">{src.author} · {src.year}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;