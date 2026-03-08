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

/*
  El sidebar SIEMPRE usa bg-menu (oscuro en todos los temas).
  Todos los colores usan variables CSS del tema para adaptarse
  automáticamente a cualquier combinación de tema + dark mode.

  Activo:   fondo = var(--accent) con opacidad alta + texto = var(--bg-menu)
  Inactivo: fondo semitransparente + texto semitransparente
*/

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
  // Estilos reutilizables via CSS vars — funcionan con cualquier tema
  const activeStyle = {
    background: "var(--accent)",
    color: "var(--bg-menu)",
    border: "1px solid transparent",
    fontWeight: 700,
  } as React.CSSProperties;

  const inactiveStyle = {
    background: "color-mix(in srgb, var(--menu-text) 8%, transparent)",
    color: "color-mix(in srgb, var(--menu-text) 55%, transparent)",
    border: "1px solid color-mix(in srgb, var(--menu-text) 12%, transparent)",
    fontWeight: 400,
  } as React.CSSProperties;

  const sectionStyle = {
    background: "color-mix(in srgb, var(--menu-text) 5%, var(--bg-menu))",
    border: "1px solid color-mix(in srgb, var(--menu-text) 12%, transparent)",
    borderRadius: "var(--radius-card)",
  } as React.CSSProperties;

  const labelStyle = {
    color: "color-mix(in srgb, var(--menu-text) 35%, transparent)",
  } as React.CSSProperties;

  return (
    <aside
      className="h-full flex flex-col gap-4 overflow-y-auto p-4 border-r"
      style={{
        background: "var(--bg-menu)",
        color: "color-mix(in srgb, var(--menu-text) 85%, transparent)",
        borderColor: "color-mix(in srgb, var(--menu-text) 8%, transparent)",
      }}
    >
      {/* Buscador */}
      <div className="relative">
        <Search
          size={12}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "color-mix(in srgb, var(--menu-text) 28%, transparent)" }}
        />
        <input
          type="text"
          placeholder="BUSCAR NOTA..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full py-2.5 pl-9 pr-3 text-[11px] outline-none transition-all uppercase tracking-widest"
          style={{
            background: "color-mix(in srgb, var(--bg-menu) 60%, black)",
            border: "1px solid color-mix(in srgb, var(--menu-text) 10%, transparent)",
            borderRadius: "var(--radius-btn)",
            color: "color-mix(in srgb, var(--menu-text) 80%, transparent)",
          }}
        />
      </div>

      {/* Etiquetas */}
      <div className="p-3 flex flex-col gap-2.5" style={sectionStyle}>
        <p
          className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]"
          style={labelStyle}
        >
          <Hash size={10} /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {/* Botón "Todos" — usa exactamente los mismos estilos que los tags */}
          <button
            onClick={() => onTagClick(null)}
            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all"
            style={{
              ...(!tagActivo ? activeStyle : inactiveStyle),
              borderRadius: "var(--radius-btn)",
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
                  ...(isActive ? activeStyle : inactiveStyle),
                  borderRadius: "var(--radius-btn)",
                }}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notas */}
      <div
        className="p-3 flex flex-col gap-2.5 flex-1 min-h-0"
        style={sectionStyle}
      >
        <div className="flex items-center justify-between">
          <p
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]"
            style={labelStyle}
          >
            <FileText size={10} /> Notas
          </p>
          <button
            onClick={onCrearEnsayo}
            className="w-7 h-7 flex items-center justify-center transition-all"
            style={{
              border: "1px solid color-mix(in srgb, var(--menu-text) 10%, transparent)",
              borderRadius: "50%",
              color: "color-mix(in srgb, var(--menu-text) 65%, transparent)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "color-mix(in srgb, var(--menu-text) 10%, transparent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
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
                    ...(isActive ? activeStyle : inactiveStyle),
                    borderRadius: "var(--radius-btn)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background =
                        "color-mix(in srgb, var(--menu-text) 13%, transparent)";
                      (e.currentTarget as HTMLElement).style.color =
                        "color-mix(in srgb, var(--menu-text) 85%, transparent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background =
                        "color-mix(in srgb, var(--menu-text) 7%, transparent)";
                      (e.currentTarget as HTMLElement).style.color =
                        "color-mix(in srgb, var(--menu-text) 55%, transparent)";
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider truncate flex-1">
                      {ens.titulo || "Sin título"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEliminarEnsayo(ens.id);
                      }}
                      className="transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      style={{
                        color: isActive
                          ? "color-mix(in srgb, var(--bg-menu) 50%, transparent)"
                          : "color-mix(in srgb, var(--accent) 80%, red)",
                      }}
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
      <div className="p-3 flex flex-col gap-2.5" style={sectionStyle}>
        <div className="flex items-center justify-between">
          <p
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]"
            style={labelStyle}
          >
            <BookOpen size={10} /> Bibliografía
          </p>
          {sources.length > 0 && (
            <span
              className="font-mono text-[9px] px-2 py-0.5"
              style={{
                background: "color-mix(in srgb, var(--accent) 20%, transparent)",
                color: "var(--accent)",
                borderRadius: "var(--radius-btn)",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              }}
            >
              {sources.length}
            </span>
          )}
        </div>

        <label
          className="flex items-center justify-center gap-2 px-3 py-3 cursor-pointer text-[9px] font-mono uppercase transition-all"
          style={{
            color: "color-mix(in srgb, var(--menu-text) 40%, transparent)",
            border: "1px dashed color-mix(in srgb, var(--menu-text) 12%, transparent)",
            borderRadius: "var(--radius-btn)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "color-mix(in srgb, var(--menu-text) 5%, transparent)";
            (e.currentTarget as HTMLElement).style.color =
              "color-mix(in srgb, var(--menu-text) 65%, transparent)";
            (e.currentTarget as HTMLElement).style.borderColor =
              "color-mix(in srgb, var(--menu-text) 20%, transparent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color =
              "color-mix(in srgb, var(--menu-text) 40%, transparent)";
            (e.currentTarget as HTMLElement).style.borderColor =
              "color-mix(in srgb, var(--menu-text) 12%, transparent)";
          }}
        >
          <UploadCloud size={14} />
          {sources.length > 0 ? "Re-sync Zotero" : "Sync Zotero"}
          <input type="file" className="hidden" onChange={onZoteroUpload} accept=".json" />
        </label>

        {/* Lista de fuentes si las hay */}
        {sources.length > 0 && (
          <div className="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto">
            {sources.slice(0, 5).map((src, i) => (
              <div
                key={i}
                className="px-2 py-1.5 text-[9px] font-mono leading-tight"
                style={{
                  background: "color-mix(in srgb, var(--menu-text) 4%, transparent)",
                  borderRadius: "var(--radius-btn)",
                  color: "color-mix(in srgb, var(--menu-text) 45%, transparent)",
                }}
              >
                <span className="block truncate" style={{ color: "color-mix(in srgb, var(--menu-text) 65%, transparent)" }}>
                  {src.title}
                </span>
                <span className="opacity-60">
                  {src.author}{src.year ? ` · ${src.year}` : ""}
                </span>
              </div>
            ))}
            {sources.length > 5 && (
              <p
                className="text-center font-mono text-[8px] uppercase tracking-widest py-1"
                style={{ color: "color-mix(in srgb, var(--menu-text) 25%, transparent)" }}
              >
                +{sources.length - 5} más
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}