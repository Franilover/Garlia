"use client";
import React, { useState } from "react";
import { Hash, FileText, Plus, Trash2, BookOpen, Search, RefreshCw, Link, CheckCircle2, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ZoteroSource } from "@/components/paginas/myself/vida/escritorio/ensayos/page";

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
  ensayosFiltrados,
  todosLosTags,
  tagActivo,
  ensayoActivoId,
  searchTerm,
  sources,
  zoteroConnected,
  onTagClick,
  onEnsayoClick,
  onCrearEnsayo,
  onEliminarEnsayo,
  onSearchChange,
  onConnectZotero,
  onRefreshZotero,
  embedded = false,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoteroExpanded, setZoteroExpanded] = useState(false);

  return (
    <aside
      className={`flex flex-col h-full overflow-hidden ${embedded ? "" : "border-r"}`}
      style={{
        background: "var(--sidebar-bg, var(--bg-menu))",
        color: "var(--sidebar-text, color-mix(in srgb, var(--foreground) 60%, transparent))",
        borderColor: "color-mix(in srgb, var(--foreground) 6%, transparent)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* ── Search bar ── */}
      <div
        className="relative shrink-0 px-3 pt-3 pb-2"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)" }}
      >
        <Search
          size={11}
          className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)", marginTop: 4 }}
        />
        <input
          type="text"
          placeholder="/ buscar..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full outline-none"
          style={{
            background: "color-mix(in srgb, var(--foreground) 5%, transparent)",
            border: "1px solid color-mix(in srgb, var(--foreground) 8%, transparent)",
            borderRadius: 6,
            padding: "6px 10px 6px 28px",
            fontSize: 11,
            color: "color-mix(in srgb, var(--foreground) 60%, transparent)",
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>

      {/* ── Tags ── */}
      <div
        className="shrink-0 px-3 py-2"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)" }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Hash size={9} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }} />
          <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            etiquetas
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onTagClick(null)}
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid",
              borderColor: !tagActivo ? "color-mix(in srgb, var(--foreground) 35%, transparent)" : "color-mix(in srgb, var(--foreground) 10%, transparent)",
              background: !tagActivo ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "transparent",
              color: !tagActivo ? "color-mix(in srgb, var(--foreground) 90%, transparent)" : "color-mix(in srgb, var(--foreground) 30%, transparent)",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              transition: "all 0.1s",
            }}
          >
            all
          </button>
          {todosLosTags.map(tag => {
            const isActive = tagActivo === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagClick(isActive ? null : tag)}
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: isActive ? "color-mix(in srgb, var(--foreground) 35%, transparent)" : "color-mix(in srgb, var(--foreground) 10%, transparent)",
                  background: isActive ? "color-mix(in srgb, var(--foreground) 8%, transparent)" : "transparent",
                  color: isActive ? "color-mix(in srgb, var(--foreground) 90%, transparent)" : "color-mix(in srgb, var(--foreground) 30%, transparent)",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  transition: "all 0.1s",
                }}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Notes list ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className="shrink-0 px-3 py-2 flex items-center justify-between"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)" }}
        >
          <div className="flex items-center gap-1.5">
            <FileText size={9} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }} />
            <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              notas · {ensayosFiltrados.length}
            </span>
          </div>
          <button
            onClick={onCrearEnsayo}
            title="Nueva nota (N)"
            style={{
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
              background: "transparent",
              color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
              cursor: "pointer",
            }}
          >
            <Plus size={11} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <AnimatePresence>
            {ensayosFiltrados.map(ens => {
              const isActive = ensayoActivoId === ens.id;
              const isHovered = hoveredId === ens.id;
              return (
                <motion.div
                  key={ens.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="group relative"
                  onClick={() => onEnsayoClick(ens.id)}
                  onMouseEnter={() => setHoveredId(ens.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: "7px 12px",
                    cursor: "pointer",
                    background: isActive
                      ? "color-mix(in srgb, var(--foreground) 7%, transparent)"
                      : isHovered
                      ? "color-mix(in srgb, var(--foreground) 3%, transparent)"
                      : "transparent",
                    borderLeft: `2px solid ${isActive ? "color-mix(in srgb, var(--foreground) 50%, transparent)" : "transparent"}`,
                    transition: "all 0.1s",
                  }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: "color-mix(in srgb, var(--foreground) 15%, transparent)",
                      }}
                    />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontSize: 12,
                          color: isActive ? "color-mix(in srgb, var(--foreground) 90%, transparent)" : "color-mix(in srgb, var(--foreground) 50%, transparent)",
                          fontFamily: "var(--font-mono)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          letterSpacing: "0.01em",
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {ens.titulo || "sin título"}
                      </p>
                      {ens.tags?.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {ens.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 9,
                                color: "color-mix(in srgb, var(--foreground) 20%, transparent)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onEliminarEnsayo(ens.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{
                        color: "color-mix(in srgb, var(--accent) 60%, transparent)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Zotero ── */}
      <div
        className="shrink-0"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--foreground) 6%, transparent)" }}
      >
        <button
          onClick={() => setZoteroExpanded(p => !p)}
          className="w-full flex items-center justify-between px-3 py-2"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <div className="flex items-center gap-1.5">
            <BookOpen size={9} style={{ color: "color-mix(in srgb, var(--foreground) 20%, transparent)" }} />
            <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              zotero
            </span>
            {sources.length > 0 && (
              <span
                style={{
                  fontSize: 9,
                  padding: "0 5px",
                  borderRadius: 3,
                  background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
                  color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {sources.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {zoteroConnected && (
              <button
                onClick={e => { e.stopPropagation(); onRefreshZotero(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "color-mix(in srgb, var(--foreground) 20%, transparent)", padding: 2 }}
              >
                <RefreshCw size={9} />
              </button>
            )}
            <ChevronRight
              size={10}
              style={{
                color: "color-mix(in srgb, var(--foreground) 20%, transparent)",
                transform: zoteroExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s",
              }}
            />
          </div>
        </button>

        <AnimatePresence>
          {zoteroExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div className="px-3 pb-3 flex flex-col gap-2">
                {zoteroConnected ? (
                  <div
                    className="flex items-center gap-2 px-2 py-1.5"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
                      borderRadius: 5,
                    }}
                  >
                    <CheckCircle2 size={9} style={{ color: "color-mix(in srgb, var(--accent) 80%, transparent)", flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: "color-mix(in srgb, var(--accent) 80%, transparent)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      conectado · auto-sync
                    </span>
                    <button
                      onClick={onConnectZotero}
                      style={{ marginLeft: "auto", fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                    >
                      cambiar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onConnectZotero}
                    className="flex items-center gap-2 w-full"
                    style={{
                      fontSize: 10,
                      padding: "8px 10px",
                      background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
                      border: "1px dashed color-mix(in srgb, var(--foreground) 10%, transparent)",
                      borderRadius: 5,
                      color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                      justifyContent: "center",
                    }}
                  >
                    <Link size={10} />
                    conectar archivo zotero
                  </button>
                )}

                {sources.length > 0 && (
                  <div
                    className="flex flex-col gap-0.5 max-h-28 overflow-y-auto"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {sources.slice(0, 8).map((src, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "4px 6px",
                          borderRadius: 4,
                          background: "color-mix(in srgb, var(--foreground) 2%, transparent)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            color: "color-mix(in srgb, var(--foreground) 45%, transparent)",
                            fontFamily: "var(--font-mono)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {src.title}
                        </p>
                        <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 20%, transparent)", fontFamily: "var(--font-mono)" }}>
                          {src.author}{src.year ? ` · ${src.year}` : ""}{src.citekey ? ` · @${src.citekey}` : ""}
                        </p>
                      </div>
                    ))}
                    {sources.length > 8 && (
                      <p style={{ fontSize: 9, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", textAlign: "center", padding: "4px 0", fontFamily: "var(--font-mono)" }}>
                        +{sources.length - 8} más
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Keyboard hint ── */}
      <div
        className="shrink-0 px-3 py-2 flex items-center gap-3"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--foreground) 4%, transparent)" }}
      >
        {[["N", "nueva"], ["⌘E", "modo"], ["Esc", "cerrar"]].map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <kbd
              style={{
                fontSize: 8,
                padding: "1px 4px",
                borderRadius: 3,
                background: "color-mix(in srgb, var(--foreground) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--foreground) 10%, transparent)",
                color: "color-mix(in srgb, var(--foreground) 30%, transparent)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {key}
            </kbd>
            <span style={{ fontSize: 8, color: "color-mix(in srgb, var(--foreground) 15%, transparent)", fontFamily: "var(--font-mono)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}