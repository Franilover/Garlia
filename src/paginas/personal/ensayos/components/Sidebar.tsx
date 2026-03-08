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
    <aside className="h-full flex flex-col gap-4 overflow-y-auto p-4 border-r bg-bg-menu text-white-custom"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
    >
      
      {/* Buscador */}
      <div className="relative">
        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "color-mix(in srgb, var(--white-custom) 30%, transparent)" }}
        />
        <input
          type="text"
          placeholder="BUSCAR NOTA..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full py-2.5 pl-9 pr-3 text-[11px] outline-none transition-all uppercase tracking-widest"
          style={{
            background: "color-mix(in srgb, var(--foreground) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--white-custom) 10%, transparent)",
            borderRadius: "var(--radius-btn)",
            color: "var(--white-custom)",
          }}
        />
      </div>

      {/* Etiquetas */}
      <div className="p-3 flex flex-col gap-2.5"
        style={{
          background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--white-custom) 5%, transparent)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ color: "color-mix(in srgb, var(--white-custom) 40%, transparent)" }}
        >
          <Hash size={10} /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onTagClick(null)}
            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all"
            style={{
              background: !tagActivo ? "var(--white-custom)" : "color-mix(in srgb, var(--foreground) 20%, transparent)",
              color: !tagActivo ? "var(--primary)" : "color-mix(in srgb, var(--white-custom) 50%, transparent)",
              border: `1px solid ${!tagActivo ? "var(--white-custom)" : "color-mix(in srgb, var(--white-custom) 10%, transparent)"}`,
              borderRadius: "var(--radius-btn)",
              fontWeight: !tagActivo ? 700 : 400,
            }}
          >
            Todos
          </button>
          
          {todosLosTags.map((tag) => {
            const isActive = tagActivo === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? null : tag)}
                className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all"
                style={{
                  background: isActive ? "var(--white-custom)" : "color-mix(in srgb, var(--foreground) 20%, transparent)",
                  color: isActive ? "var(--primary)" : "color-mix(in srgb, var(--white-custom) 50%, transparent)",
                  border: `1px solid ${isActive ? "var(--white-custom)" : "color-mix(in srgb, var(--white-custom) 10%, transparent)"}`,
                  borderRadius: "var(--radius-btn)",
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notas */}
      <div className="p-3 flex flex-col gap-2.5 flex-1 min-h-0"
        style={{
          background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--white-custom) 5%, transparent)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]"
            style={{ color: "color-mix(in srgb, var(--white-custom) 40%, transparent)" }}
          >
            <FileText size={10} /> Notas
          </p>
          <button
            onClick={onCrearEnsayo}
            className="w-7 h-7 flex items-center justify-center transition-all"
            style={{
              border: "1px solid color-mix(in srgb, var(--white-custom) 20%, transparent)",
              borderRadius: "50%",
              color: "var(--white-custom)",
            }}
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
                  className="group px-4 py-3 cursor-pointer transition-all"
                  style={{
                    background: isActive ? "var(--white-custom)" : "color-mix(in srgb, var(--foreground) 20%, transparent)",
                    color: isActive ? "var(--primary)" : "color-mix(in srgb, var(--white-custom) 50%, transparent)",
                    border: `1px solid ${isActive ? "var(--white-custom)" : "color-mix(in srgb, var(--white-custom) 10%, transparent)"}`,
                    borderRadius: "var(--radius-btn)",
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider truncate flex-1">
                      {ens.titulo || "Sin título"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                      className="transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: isActive ? "color-mix(in srgb, var(--primary) 40%, transparent)" : "rgb(248 113 113)" }}
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
      <div className="p-3 flex flex-col gap-2.5"
        style={{
          background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--white-custom) 5%, transparent)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ color: "color-mix(in srgb, var(--white-custom) 40%, transparent)" }}
        >
          <BookOpen size={10} /> Bibliografía
        </p>
        <label className="flex items-center justify-center gap-2 px-3 py-3 cursor-pointer 
                          text-[9px] font-mono uppercase transition-colors"
          style={{
            color: "color-mix(in srgb, var(--white-custom) 30%, transparent)",
            border: "1px dashed color-mix(in srgb, var(--white-custom) 10%, transparent)",
            borderRadius: "var(--radius-btn)",
          }}
        >
          <UploadCloud size={14} />
          Sync Zotero
          <input type="file" className="hidden" onChange={onZoteroUpload} accept=".json" />
        </label>
      </div>
    </aside>
  );
}