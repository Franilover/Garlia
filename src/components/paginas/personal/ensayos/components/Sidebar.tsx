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

  // Estilo unificado para ACTIVO (Igual que el botón "Todos")
  const estiloActivo = {
    background: "#ffffff",
    color: moradoOscuro,
    border: "1px solid #ffffff",
    fontWeight: "700"
  };

  // Estilo unificado para INACTIVO
  const estiloInactivo = {
    background: "rgba(0, 0, 0, 0.2)",
    color: "rgba(255, 255, 255, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.05)"
  };

  return (
    <aside style={{ background: moradoOscuro }} className="h-full flex flex-col gap-4 overflow-y-auto p-4 border-r border-black/20 scrollbar-none">
      
      {/* Buscador */}
      <div className="relative">
        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="BUSCAR..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl py-2.5 pl-9 pr-3 text-[11px] text-white/80 outline-none placeholder:text-white/20 uppercase tracking-widest"
          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}
        />
      </div>

      {/* Etiquetas */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5" style={{ background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          <Hash size={10} /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onTagClick(null)}
            className="px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wide transition-all shadow-sm"
            style={!tagActivo ? estiloActivo : estiloInactivo}
          >
            Todos
          </button>
          {todosLosTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag === tagActivo ? null : tag)}
              className="px-3 py-1 rounded-lg font-mono text-[9px] uppercase tracking-wide transition-all shadow-sm"
              style={tagActivo === tag ? estiloActivo : estiloInactivo}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div className="rounded-2xl p-3 flex flex-col gap-2.5 flex-1 min-h-0" style={{ background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.08)" }}>
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

        <div className="flex flex-col gap-1.5 overflow-y-auto mt-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence>
            {ensayosFiltrados.map((ens) => {
              const isActive = ensayoActivoId === ens.id;
              return (
                <motion.div
                  key={ens.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => onEnsayoClick(ens.id)}
                  className="group px-4 py-3 rounded-xl cursor-pointer transition-all border shadow-sm"
                  style={isActive ? estiloActivo : estiloInactivo}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate flex-1">
                      {ens.titulo || "Sin título"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                      className={`transition-all ${isActive ? "text-[#4a3d50]/40 hover:text-red-500" : "opacity-0 group-hover:opacity-100 text-red-400/70"}`}
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
      <div className="rounded-2xl p-3 flex flex-col gap-2.5" style={{ background: "rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          <BookOpen size={10} /> Bibliografía
        </p>
        <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl cursor-pointer 
                          text-white/20 hover:text-white/50 text-[9px] font-mono uppercase tracking-widest border border-dashed border-white/10 transition-all hover:bg-white/5">
          <UploadCloud size={14} />
          Sync Zotero
          <input type="file" className="hidden" onChange={onZoteroUpload} accept=".json" />
        </label>
        
        {sources.length > 0 && (
          <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
            {sources.map((src, i) => (
              <div key={i} className="p-2 rounded-lg bg-black/10 border border-white/5">
                <p className="text-[10px] font-medium text-white/50 leading-tight">{src.title}</p>
                <p className="font-mono text-[8px] text-white/20 mt-1 uppercase">{src.author} · {src.year}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;