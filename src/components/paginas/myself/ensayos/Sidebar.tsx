"use client";
import React from "react";
import { Hash, FileText, Plus, Trash2, BookOpen, Search, RefreshCw, Link, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoteroSource } from "./page";

interface SidebarProps {
  ensayos: any[];
  ensayosFiltrados: any[];
  todosLosTags: string[];
  tagActivo: string | null;
  ensayoActivoId: string | null;
  searchTerm: string;
  sources: ZoteroSource[];
  zoteroConnected: boolean;
  onTagClick: (tag: string | null) => void;
  onEnsayoClick: (id: string) => void;
  onCrearEnsayo: () => void;
  onEliminarEnsayo: (id: string) => void;
  onSearchChange: (value: string) => void;
  onConnectZotero: () => void;
  onRefreshZotero: () => void;
  
  embedded?: boolean;
}

export default function Sidebar({
  ensayosFiltrados, todosLosTags, tagActivo, ensayoActivoId,
  searchTerm, sources, zoteroConnected,
  onTagClick, onEnsayoClick, onCrearEnsayo, onEliminarEnsayo,
  onSearchChange, onConnectZotero, onRefreshZotero,
  embedded = false,
}: SidebarProps) {
  const activeStyle = {
    background: "var(--accent)", color: "var(--white-custom)",
    border: "1px solid transparent", fontWeight: 700,
  } as React.CSSProperties;

  const inactiveStyle = {
    background: "color-mix(in srgb, var(--primary) 5%, transparent)",
    color: "color-mix(in srgb, var(--primary) 45%, transparent)",
    border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
    fontWeight: 400,
  } as React.CSSProperties;

  const sectionStyle = {
    background: "color-mix(in srgb, var(--primary) 3%, var(--white-custom))",
    border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
    borderRadius: "var(--radius-card)",
  } as React.CSSProperties;

  const labelStyle = { color: "color-mix(in srgb, var(--primary) 30%, transparent)" } as React.CSSProperties;

  return (
    <aside className={`flex flex-col gap-4 overflow-y-auto p-4 ${embedded ? "flex-1 min-h-0" : "h-full border-r"}`}
      style={{
        background: "var(--white-custom)",
        color: "color-mix(in srgb, var(--primary) 80%, transparent)",
        borderColor: "color-mix(in srgb, var(--accent) 18%, color-mix(in srgb, var(--primary) 8%, transparent))",
      }}
    >
      {}
      <div className="relative">
        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        />
        <input type="text" placeholder="BUSCAR NOTA..." value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full py-2.5 pl-9 pr-3 text-[11px] outline-none transition-all uppercase tracking-widest"
          style={{
            background: "color-mix(in srgb, var(--primary) 4%, var(--white-custom))",
            border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            borderRadius: "var(--radius-btn)",
            color: "color-mix(in srgb, var(--primary) 70%, transparent)",
          }}
        />
      </div>

      {}
      <div className="p-3 flex flex-col gap-2.5" style={sectionStyle}>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]" style={labelStyle}>
          <Hash size={10} /> Etiquetas
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => onTagClick(null)}
            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all"
            style={{ ...(!tagActivo ? activeStyle : inactiveStyle), borderRadius: "var(--radius-btn)" }}
          >
            Todos
          </button>
          {todosLosTags.map(tag => {
            const isActive = tagActivo === tag;
            return (
              <button key={tag} onClick={() => onTagClick(isActive ? null : tag)}
                className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all"
                style={{ ...(isActive ? activeStyle : inactiveStyle), borderRadius: "var(--radius-btn)" }}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {}
      <div className="p-3 flex flex-col gap-2.5 flex-1 min-h-0" style={sectionStyle}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]" style={labelStyle}>
            <FileText size={10} /> Notas
          </p>
          <button onClick={onCrearEnsayo}
            className="w-7 h-7 flex items-center justify-center transition-all"
            style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: "50%", color: "color-mix(in srgb, var(--primary) 50%, transparent)", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto mt-2 pr-1">
          <AnimatePresence>
            {ensayosFiltrados.map(ens => {
              const isActive = ensayoActivoId === ens.id;
              return (
                <motion.div key={ens.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => onEnsayoClick(ens.id)}
                  className="group px-4 py-3 cursor-pointer transition-all"
                  style={{ ...(isActive ? activeStyle : inactiveStyle), borderRadius: "var(--radius-btn)" }}
                  onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 9%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 75%, transparent)"; } }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 5%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 45%, transparent)"; } }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider truncate flex-1">
                      {ens.titulo || "Sin título"}
                    </span>
                    <button onClick={e => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                      className="transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      style={{ color: isActive ? "color-mix(in srgb, var(--white-custom) 60%, transparent)" : "color-mix(in srgb, var(--accent) 70%, red)" }}
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

      {}
      <div className="p-3 flex flex-col gap-2.5" style={sectionStyle}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em]" style={labelStyle}>
            <BookOpen size={10} /> Zotero
          </p>
          <div className="flex items-center gap-1.5">
            {sources.length > 0 && (
              <span className="font-mono text-[9px] px-2 py-0.5"
                style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
              >
                {sources.length}
              </span>
            )}
            {}
            {zoteroConnected && (
              <button onClick={onRefreshZotero} title="Actualizar fuentes"
                className="w-6 h-6 flex items-center justify-center transition-all opacity-50 hover:opacity-100"
                style={{ color: "var(--primary)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <RefreshCw size={11} />
              </button>
            )}
          </div>
        </div>

        {}
        {zoteroConnected ? (
          <div className="flex items-center gap-2 px-2 py-1.5"
            style={{ background: "color-mix(in srgb, oklch(0.6 0.15 145) 8%, transparent)", borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, oklch(0.6 0.15 145) 20%, transparent)" }}
          >
            <CheckCircle2 size={11} style={{ color: "oklch(0.6 0.15 145)", flexShrink: 0 }} />
            <p className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "oklch(0.6 0.15 145)" }}>
              Conectado · auto-sync
            </p>
            <button onClick={onConnectZotero} className="ml-auto font-mono text-[8px] uppercase opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
            >
              cambiar
            </button>
          </div>
        ) : (
          <button onClick={onConnectZotero}
            className="flex items-center justify-center gap-2 px-3 py-3 cursor-pointer text-[9px] font-mono uppercase transition-all"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", border: "1px dashed color-mix(in srgb, var(--primary) 10%, transparent)", borderRadius: "var(--radius-btn)", background: "transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 60%, transparent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 35%, transparent)"; }}
          >
            <Link size={12} />
            Conectar archivo Zotero
          </button>
        )}

        {}
        {sources.length > 0 && (
          <div className="flex flex-col gap-1 mt-1 max-h-36 overflow-y-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "color-mix(in srgb, var(--primary) 10%, transparent) transparent" }}
          >
            {sources.slice(0, 6).map((src, i) => (
              <div key={i} className="px-2 py-1.5 text-[9px] font-mono leading-tight"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)", borderRadius: "var(--radius-btn)", color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              >
                <span className="block truncate" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                  {src.title}
                </span>
                <span className="opacity-60">
                  {src.author}{src.year ? ` · ${src.year}` : ""}
                  {src.citekey ? ` · @${src.citekey}` : ""}
                </span>
              </div>
            ))}
            {sources.length > 6 && (
              <p className="text-center font-mono text-[8px] uppercase tracking-widest py-1"
                style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
              >
                +{sources.length - 6} más
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}