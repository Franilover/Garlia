"use client";
import React from "react";
import { Hash, FileText, Plus, Trash2, UploadCloud, BookOpen, Search } from "lucide-react";
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

export default function Sidebar({
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
    <aside className="h-full flex flex-col gap-4 overflow-y-auto p-4 border-r border-black/10 bg-bg-menu text-white-custom">
      
      {/* Buscador */}
      <div className="relative">
        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="BUSCAR NOTA..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[11px] outline-none transition-all
                     bg-black/20 border border-white/10 placeholder:text-white/20 uppercase tracking-widest
                     focus:border-accent/40 focus:bg-black/30"
        />
      </div>

      {/* Etiquetas */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5 bg-black/10 border border-white/5">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <Hash size={10} /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onTagClick(null)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wide transition-all border
              ${!tagActivo 
                ? "bg-white-custom text-primary border-white-custom font-bold" 
                : "bg-black/20 text-white/50 border-white/10"}`}
          >
            Todos
          </button>
          
          {todosLosTags.map((tag) => {
            const isActive = tagActivo === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? null : tag)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wide transition-all border
                  ${isActive 
                    ? "bg-white-custom text-primary border-white-custom font-bold" 
                    : "bg-black/20 text-white/50 border-white/10"}`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notas */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5 flex-1 min-h-0 bg-black/10 border border-white/5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            <FileText size={10} /> Notas
          </p>
          <button
            onClick={onCrearEnsayo}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all border border-white/20 hover:bg-white/10 text-white"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto mt-2 pr-1">
          <AnimatePresence>
            {ensayosFiltrados.map((ens) => {
              const isActive = ensayoActivoId === ens.id;
              return (
                <motion.div
                  key={ens.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => onEnsayoClick(ens.id)}
                  className={`group px-4 py-3 rounded-xl cursor-pointer transition-all border shadow-sm
                    ${isActive 
                      ? "bg-white-custom text-primary border-white-custom font-bold" 
                      : "bg-black/20 text-white/50 border-white/10 hover:bg-black/30"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider truncate flex-1">
                      {ens.titulo || "Sin título"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                      className={`transition-all ${isActive ? "text-primary/40" : "opacity-0 group-hover:opacity-100 text-red-400"}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Bibliografía */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5 bg-black/10 border border-white/5">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          <BookOpen size={10} /> Bibliografía
        </p>
        <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl cursor-pointer 
                          text-white/30 hover:text-white/60 text-[9px] font-mono uppercase border border-dashed border-white/10 transition-colors">
          <UploadCloud size={14} />
          Sync Zotero
          <input type="file" className="hidden" onChange={onZoteroUpload} accept=".json" />
        </label>
      </div>
    </aside>
  );
}