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
  const moradoOscuro = "#4a3d50";

  return (
    <aside style={{ background: moradoOscuro }} className="h-full flex flex-col gap-4 overflow-y-auto p-4
                      border-r border-black/20 scrollbar-thin scrollbar-thumb-white/10">

      {/* Search - Oscurecido para eliminar brillo lila */}
      <div className="relative">
        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="BUSCAR..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[11px] text-white/80 outline-none
                     placeholder:text-white/20 transition-colors uppercase tracking-widest"
          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}
        />
      </div>

      {/* Tags section */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5"
           style={{ background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          <Hash size={10} /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {/* Botón TODOS */}
          <button
            onClick={() => onTagClick(null)}
            className="px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wide transition-all"
            style={!tagActivo
              ? { background: "rgba(255,255,255,0.95)", color: moradoOscuro, fontWeight: "bold" }
              : { background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.4)" }}
          >
            Todos
          </button>
          
          {/* Botones de Etiquetas Individuales */}
          {todosLosTags.map((tag) => {
            const isActive = tagActivo === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? null : tag)}
                className="px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wide transition-all"
                style={isActive
                  ? { 
                      background: "rgba(255,255,255,0.25)", 
                      color: "white", 
                      border: "1px solid rgba(255,255,255,0.3)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }
                  : { 
                      background: "rgba(0,0,0,0.1)", 
                      color: "rgba(255,255,255,0.4)", 
                      border: "1px solid rgba(255,255,255,0.05)" 
                    }}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes section */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5 flex-1 min-h-0"
           style={{ background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
            <FileText size={10} /> Notas
          </p>
          <button
            onClick={onCrearEnsayo}
            className="w-7 h-7 rounded-full text-white flex items-center justify-center transition-all hover:bg-white/10"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 mt-2 pr-1">
          <AnimatePresence>
            {ensayosFiltrados.map((ens) => {
              const isActive = ensayoActivoId === ens.id;
              return (
                <motion.div
                  key={ens.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => onEnsayoClick(ens.id)}
                  className="group px-4 py-3 rounded-xl cursor-pointer transition-all border"
                  style={isActive
                    ? { background: "white", borderColor: "white", color: moradoOscuro }
                    : { background: "rgba(0,0,0,0.1)", borderColor: "transparent", color: "rgba(255,255,255,0.5)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate flex-1">
                      {ens.titulo || "Sin título"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                      className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 transition-all"
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

      {/* Bibliography - Simplificada */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5"
           style={{ background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          <BookOpen size={10} /> Bibliografía
        </p>
        <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl cursor-pointer 
                          text-white/20 hover:text-white/50 text-[9px] font-mono uppercase tracking-widest border border-dashed border-white/10">
          <UploadCloud size={14} />
          Sync Zotero
          <input type="file" className="hidden" onChange={onZoteroUpload} accept=".json" />
        </label>
      </div>
    </aside>
  );
}

export default Sidebar;