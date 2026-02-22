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
    <aside style={{ background: "#4a3d50" }} className="h-full flex flex-col gap-4 overflow-y-auto p-4
                      border-r border-black/20 scrollbar-thin scrollbar-thumb-white/10">

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Buscar notas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[12px] text-white/80 outline-none
                     placeholder:text-white/25 transition-colors"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
      </div>

      {/* Tags section */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5"
           style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.18)" }}>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <Hash size={10} /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onTagClick(null)}
            style={!tagActivo
              ? { background: "rgba(255,255,255,0.9)", color: "#4a3d50", border: "1px solid rgba(255,255,255,0.9)" }
              : { background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
            className="px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-wide transition-all hover:border-white/40 hover:text-white/80"
          >
            Todos
          </button>
          {todosLosTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag === tagActivo ? null : tag)}
              style={tagActivo === tag
                ? { background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.5)" }
                : { background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
              className="px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-wide transition-all hover:border-white/40 hover:text-white/80"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes section */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5 flex-1 min-h-0"
           style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.18)" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            <FileText size={10} /> Notas
          </p>
          <button
            onClick={onCrearEnsayo}
            className="w-6 h-6 rounded-full text-white flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            <Plus size={11} />
          </button>
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 -mx-1 px-1">
          <AnimatePresence>
            {ensayosFiltrados.map((ens, i) => (
              <motion.div
                key={ens.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => onEnsayoClick(ens.id)}
                className="group px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                style={ensayoActivoId === ens.id
                  ? { background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.3)" }
                  : { background: "transparent", border: "1px solid transparent" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12px] font-medium leading-snug truncate flex-1 transition-colors"
                        style={{ color: ensayoActivoId === ens.id ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.65)" }}>
                    {ens.titulo || "Sin título"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                    className="opacity-0 group-hover:opacity-50 hover:opacity-100! hover:text-red-400
                               text-white/30 transition-all shrink-0 pt-0.5"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
                {ens.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ens.tags.slice(0, 3).map((t: string) => (
                      <span key={t} className="font-mono text-[9px] text-white/30">#{t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bibliography section */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5"
           style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.18)" }}>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <BookOpen size={10} /> Bibliografía
        </p>

        <label className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors
                          text-white/35 hover:text-white/70 text-[10px] font-mono"
               style={{ border: "1px dashed rgba(255,255,255,0.2)" }}>
          <UploadCloud size={13} />
          Sync Zotero JSON
          <input type="file" className="hidden" onChange={onZoteroUpload} accept=".json" />
        </label>

        {sources.length > 0 && (
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {sources.map((src, i) => (
              <div key={i} className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] font-medium text-white/60 leading-snug">{src.title}</p>
                <p className="font-mono text-[9px] text-white/30 mt-0.5">{src.author} · {src.year}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;